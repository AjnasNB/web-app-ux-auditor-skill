#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");

const SKILL_NAME = "web-app-ux-auditor";
const DISPLAY_NAME = "Web App UX Auditor";
const DESCRIPTION =
  "Audit and improve web app UI/UX flows across React, Next.js, Vue, Svelte, Angular, and plain web stacks.";
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const COPY_ENTRIES = Object.freeze(["SKILL.md", "agents", "references", "scripts"]);
const TARGET_NAMES = Object.freeze(["claude", "codex", "agents", "codex-legacy"]);
const DEFAULT_TARGETS = Object.freeze(["claude", "agents", "codex-legacy"]);
const START_MARKER = `<!-- ${SKILL_NAME}:start -->`;
const END_MARKER = `<!-- ${SKILL_NAME}:end -->`;

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

function usage() {
  return `${DISPLAY_NAME}

Usage:
  web-app-ux-auditor --global [--targets claude,agents,codex-legacy]
  web-app-ux-auditor --project <existing-path> [--no-adapters]
  web-app-ux-auditor --global --project <existing-path>
  web-app-ux-auditor --print-paths [--targets <list>]

Interactive terminals may run the command without arguments and choose a mode. Noninteractive
use must explicitly pass --global and/or --project; no-argument automation makes no changes.

Options:
  --global             Install to selected current-user skill folders.
  --project <path>     Install into an existing, real project directory.
  --targets <list>     Global targets: claude,codex,agents,codex-legacy.
  --no-adapters        With --project, install skills without adapter rule files.
  --yes                Skip prompting; still requires --global and/or --project.
  --print-paths        Print selected global install locations and exit.
  --help               Show this help.
`;
}

function failUsage(message) {
  throw new UsageError(message);
}

function takeValue(argv, index, option) {
  if (index + 1 >= argv.length) failUsage(`${option} requires a value.`);
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    failUsage(`${option} requires a value; another option cannot be used as its value.`);
  }
  return value;
}

function parseTargetList(value) {
  const values = value.split(",").map((item) => item.trim());
  if (values.length === 0 || values.some((item) => item.length === 0)) {
    failUsage("--targets requires a comma-separated list without empty entries.");
  }
  const unique = new Set();
  for (const target of values) {
    if (!TARGET_NAMES.includes(target)) {
      failUsage(`Unknown target \"${target}\". Expected one of: ${TARGET_NAMES.join(", ")}.`);
    }
    if (unique.has(target)) failUsage(`Duplicate target \"${target}\".`);
    unique.add(target);
  }
  return values;
}

function parseArgs(argv) {
  const result = {
    global: false,
    project: null,
    targets: null,
    adapters: true,
    printPaths: false,
    help: false,
    yes: false
  };
  const seen = new Set();
  const once = (name) => {
    if (seen.has(name)) failUsage(`${name} may only be provided once.`);
    seen.add(name);
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      once("--help");
      result.help = true;
    } else if (arg === "--global") {
      once("--global");
      result.global = true;
    } else if (arg === "--project") {
      once("--project");
      result.project = takeValue(argv, index, "--project");
      index += 1;
    } else if (arg.startsWith("--project=")) {
      once("--project");
      result.project = arg.slice("--project=".length);
      if (!result.project || result.project.startsWith("-")) failUsage("--project requires a path value.");
    } else if (arg === "--targets") {
      once("--targets");
      result.targets = parseTargetList(takeValue(argv, index, "--targets"));
      index += 1;
    } else if (arg.startsWith("--targets=")) {
      once("--targets");
      result.targets = parseTargetList(arg.slice("--targets=".length));
    } else if (arg === "--no-adapters") {
      once("--no-adapters");
      result.adapters = false;
    } else if (arg === "--print-paths") {
      once("--print-paths");
      result.printPaths = true;
    } else if (arg === "--yes" || arg === "-y") {
      once("--yes");
      result.yes = true;
    } else if (arg === "--") {
      failUsage("Positional arguments are not supported.");
    } else if (arg.startsWith("-")) {
      failUsage(`Unknown option \"${arg}\".`);
    } else {
      failUsage(`Unexpected positional argument \"${arg}\".`);
    }
  }

  if (result.help && seen.size > 1) failUsage("--help cannot be combined with install options.");
  if (result.printPaths && (result.global || result.project || !result.adapters || result.yes)) {
    failUsage("--print-paths can only be combined with --targets.");
  }
  if (result.targets && !result.global && !result.printPaths) {
    failUsage("--targets requires --global.");
  }
  if (!result.adapters && !result.project) failUsage("--no-adapters requires --project.");
  if (result.yes && !result.global && !result.project) {
    failUsage("--yes does not select an install destination; pass --global and/or --project.");
  }
  return result;
}

function samePath(left, right) {
  return path.relative(left, right) === "" && path.relative(right, left) === "";
}

function pathEntryExists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

function assertWithin(root, target, label = "path") {
  const relative = path.relative(root, target);
  if (relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`))) {
    return;
  }
  throw new Error(`Refusing ${label} outside the trusted root: ${target}`);
}

function resolveAuthorityRoot(rootPath, label) {
  const resolved = path.resolve(rootPath);
  let stats;
  try {
    stats = fs.lstatSync(resolved);
  } catch (error) {
    if (error && error.code === "ENOENT") throw new Error(`${label} must already exist: ${resolved}`);
    throw error;
  }
  if (stats.isSymbolicLink()) throw new Error(`${label} cannot be a symbolic link or junction: ${resolved}`);
  if (!stats.isDirectory()) throw new Error(`${label} must be a directory: ${resolved}`);
  const real = fs.realpathSync.native(resolved);
  if (!samePath(resolved, real)) {
    throw new Error(`${label} resolves through a link or reparse point: ${resolved}`);
  }
  return real;
}

function inspectExistingNode(root, target, expectedDirectory = null) {
  const stats = fs.lstatSync(target);
  if (stats.isSymbolicLink()) throw new Error(`Refusing symbolic link or junction in install path: ${target}`);
  const real = fs.realpathSync.native(target);
  assertWithin(root, real, "resolved path");
  if (!samePath(target, real)) throw new Error(`Refusing link or reparse point in install path: ${target}`);
  if (expectedDirectory === true && !stats.isDirectory()) throw new Error(`Expected a directory: ${target}`);
  if (expectedDirectory === false && !stats.isFile()) throw new Error(`Expected a regular file: ${target}`);
  return stats;
}

function preflightPath(root, target, deep = false) {
  const resolved = path.resolve(target);
  assertWithin(root, resolved, "install path");
  const relative = path.relative(root, resolved);
  if (relative === "") return inspectExistingNode(root, root, true);
  const parts = relative.split(path.sep).filter(Boolean);
  let current = root;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    if (!pathEntryExists(current)) return null;
    const stats = inspectExistingNode(root, current, index < parts.length - 1 ? true : null);
    if (index === parts.length - 1 && deep && stats.isDirectory()) assertSafeTree(root, current);
  }
  return fs.lstatSync(resolved);
}

function ensureSafeDirectory(root, directory) {
  const resolved = path.resolve(directory);
  assertWithin(root, resolved, "directory");
  const relative = path.relative(root, resolved);
  if (relative === "") return root;
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (pathEntryExists(current)) {
      inspectExistingNode(root, current, true);
    } else {
      fs.mkdirSync(current);
      inspectExistingNode(root, current, true);
    }
  }
  return resolved;
}

function assertSafeTree(root, target) {
  const stats = inspectExistingNode(root, target, null);
  if (!stats.isDirectory()) return;
  for (const name of fs.readdirSync(target)) {
    assertSafeTree(root, path.join(target, name));
  }
}

function assertSafeSource(source) {
  const packageReal = fs.realpathSync.native(PACKAGE_ROOT);
  const sourceReal = fs.realpathSync.native(source);
  assertWithin(packageReal, sourceReal, "package source");
  const visit = (item) => {
    const stats = fs.lstatSync(item);
    if (stats.isSymbolicLink()) throw new Error(`Packaged skill payload cannot contain links: ${item}`);
    const real = fs.realpathSync.native(item);
    assertWithin(packageReal, real, "package source");
    if (stats.isDirectory()) {
      for (const name of fs.readdirSync(item)) visit(path.join(item, name));
    }
  };
  visit(source);
}

function uniqueSibling(parent, base, suffix) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = path.join(parent, `.${base}.${suffix}-${process.pid}-${crypto.randomUUID()}`);
    if (!pathEntryExists(candidate)) return candidate;
  }
  throw new Error(`Could not allocate a safe temporary path under ${parent}`);
}

function cleanupOwnedPath(root, target) {
  if (!pathEntryExists(target)) return;
  assertSafeTree(root, target);
  fs.rmSync(target, { recursive: true, force: false });
}

function replaceManagedEntry(root, target, source) {
  const parent = path.dirname(target);
  preflightPath(root, target, true);
  ensureSafeDirectory(root, parent);
  assertSafeSource(source);

  const stageRoot = uniqueSibling(parent, path.basename(target), "stage");
  const staged = path.join(stageRoot, path.basename(target));
  try {
    fs.mkdirSync(stageRoot);
    inspectExistingNode(root, stageRoot, true);
    fs.cpSync(source, staged, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    assertSafeTree(root, staged);
  } catch (error) {
    try {
      if (pathEntryExists(stageRoot)) cleanupOwnedPath(root, stageRoot);
    } catch (recoveryError) {
      error.message += `; staging cleanup also failed: ${recoveryError.message}`;
    }
    throw error;
  }

  let backup = null;
  try {
    preflightPath(root, target, true);
    inspectExistingNode(root, parent, true);
    if (pathEntryExists(target)) {
      backup = uniqueSibling(parent, path.basename(target), "backup");
      fs.renameSync(target, backup);
      assertSafeTree(root, backup);
    }
    fs.renameSync(staged, target);
    assertSafeTree(root, target);
    cleanupOwnedPath(root, stageRoot);
    if (backup) cleanupOwnedPath(root, backup);
  } catch (error) {
    try {
      if (!pathEntryExists(target) && backup && pathEntryExists(backup)) fs.renameSync(backup, target);
      if (pathEntryExists(stageRoot)) cleanupOwnedPath(root, stageRoot);
    } catch (recoveryError) {
      error.message += `; recovery also failed: ${recoveryError.message}`;
    }
    throw error;
  }
}

function safeReadFile(root, file) {
  preflightPath(root, file);
  if (!pathEntryExists(file)) return Buffer.alloc(0);
  inspectExistingNode(root, file, false);
  return fs.readFileSync(file);
}

function atomicWriteFile(root, file, content) {
  const parent = path.dirname(file);
  preflightPath(root, file);
  ensureSafeDirectory(root, parent);
  if (pathEntryExists(file)) inspectExistingNode(root, file, false);

  const temporary = uniqueSibling(parent, path.basename(file), "write");
  try {
    const descriptor = fs.openSync(temporary, "wx", 0o644);
    try {
      fs.writeFileSync(descriptor, content);
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    inspectExistingNode(root, temporary, false);
  } catch (error) {
    try {
      if (pathEntryExists(temporary)) cleanupOwnedPath(root, temporary);
    } catch (recoveryError) {
      error.message += `; temporary-file cleanup also failed: ${recoveryError.message}`;
    }
    throw error;
  }

  try {
    preflightPath(root, file);
    inspectExistingNode(root, parent, true);
    if (pathEntryExists(file)) inspectExistingNode(root, file, false);
    fs.renameSync(temporary, file);
    inspectExistingNode(root, file, false);
  } catch (error) {
    try {
      if (pathEntryExists(temporary)) cleanupOwnedPath(root, temporary);
    } catch (recoveryError) {
      error.message += `; recovery also failed: ${recoveryError.message}`;
    }
    throw error;
  }
}

function markerCount(buffer, marker) {
  const needle = Buffer.from(marker, "utf8");
  let count = 0;
  let offset = 0;
  while (offset <= buffer.length - needle.length) {
    const found = buffer.indexOf(needle, offset);
    if (found === -1) break;
    count += 1;
    offset = found + needle.length;
  }
  return count;
}

function managedBlockUpdate(existing, file, body, legacyContent = null) {
  const start = Buffer.from(START_MARKER, "utf8");
  const end = Buffer.from(END_MARKER, "utf8");
  const normalizedBody = String(body).trimEnd();
  const block = Buffer.from(`${START_MARKER}\n${normalizedBody}\n${END_MARKER}`, "utf8");
  const starts = markerCount(existing, START_MARKER);
  const ends = markerCount(existing, END_MARKER);
  let next;

  if (starts === 0 && ends === 0) {
    const legacy = legacyContent === null ? null : Buffer.from(String(legacyContent), "utf8");
    if (legacy && existing.equals(legacy)) {
      const newline = existing.length > 0 && existing[existing.length - 1] === 0x0a ? Buffer.alloc(0) : Buffer.from("\n");
      next = Buffer.concat([start, Buffer.from("\n"), existing, newline, end, Buffer.from("\n")]);
    } else {
      const separator = existing.length === 0
        ? Buffer.alloc(0)
        : Buffer.from(existing[existing.length - 1] === 0x0a ? "\n" : "\n\n");
      next = Buffer.concat([existing, separator, block, Buffer.from("\n")]);
    }
  } else {
    if (starts !== 1 || ends !== 1) {
      throw new Error(`Refusing ambiguous managed markers in ${file}`);
    }
    const startIndex = existing.indexOf(start);
    const endIndex = existing.indexOf(end);
    if (startIndex < 0 || endIndex < startIndex + start.length) {
      throw new Error(`Refusing malformed managed markers in ${file}`);
    }
    next = Buffer.concat([
      existing.subarray(0, startIndex),
      block,
      existing.subarray(endIndex + end.length)
    ]);
  }

  return next;
}

function upsertManagedBlock(root, file, body, legacyContent = null) {
  const existing = safeReadFile(root, file);
  const next = managedBlockUpdate(existing, file, body, legacyContent);
  if (!existing.equals(next)) atomicWriteFile(root, file, next);
  return file;
}

function copySkillTo(authorityRoot, skillsRoot) {
  const targetDir = path.join(skillsRoot, SKILL_NAME);
  preflightPath(authorityRoot, targetDir, true);
  ensureSafeDirectory(authorityRoot, targetDir);
  for (const entry of COPY_ENTRIES) {
    const source = path.join(PACKAGE_ROOT, entry);
    if (!pathEntryExists(source)) throw new Error(`Packaged skill entry is missing: ${entry}`);
    replaceManagedEntry(authorityRoot, path.join(targetDir, entry), source);
  }
  return targetDir;
}

function globalTargetPaths(selected = null, homeDir = os.homedir()) {
  const names = selected || DEFAULT_TARGETS;
  const home = path.resolve(homeDir);
  const all = {
    claude: path.join(home, ".claude", "skills"),
    agents: path.join(home, ".agents", "skills"),
    codex: path.join(home, ".agents", "skills"),
    "codex-legacy": path.join(home, ".codex", "skills")
  };
  const paths = [];
  for (const name of names) {
    if (!TARGET_NAMES.includes(name)) throw new Error(`Unknown global target: ${name}`);
    if (!paths.some((item) => samePath(item, all[name]))) paths.push(all[name]);
  }
  if (paths.length === 0) throw new Error("No global install targets were selected.");
  return paths;
}

function installGlobal(homeDir = os.homedir(), selected = null) {
  const home = resolveAuthorityRoot(homeDir, "Home directory");
  const targets = globalTargetPaths(selected, home);
  for (const target of targets) preflightPath(home, path.join(target, SKILL_NAME), true);
  return targets.map((target) => copySkillTo(home, target));
}

function adapterText(skillPath) {
  return `# ${DISPLAY_NAME}

Use the ${SKILL_NAME} Agent Skill for web app UI/UX reviews, redesigns, navigation audits, onboarding, forms, accessibility, keyboard/focus behavior, Core Web Vitals, retention, and conversion improvements.

Canonical skill path in this project: ${skillPath}

Follow the skill workflow before recommending changes:
- inspect code, routes, layouts, components, forms, design tokens, states, accessibility tooling, and runtime behavior;
- run the bundled static scanner when code is available;
- rank findings by user impact;
- verify with browser walkthroughs, keyboard checks, screenshots, performance data, tests, or static evidence.
`;
}

function adapterSpecs(root) {
  const skillPath = `.agents/skills/${SKILL_NAME}/SKILL.md`;
  const standard = adapterText(skillPath);
  const cursor = `---
description: ${DESCRIPTION}
globs: **/*
alwaysApply: false
---

${standard}`;
  return [
    [path.join(root, ".cursor", "rules", `${SKILL_NAME}.mdc`), cursor, cursor],
    [path.join(root, ".windsurf", "rules", `${SKILL_NAME}.md`), standard, standard],
    [path.join(root, ".continue", "rules", `${SKILL_NAME}.md`), standard, standard],
    [path.join(root, ".clinerules", `${SKILL_NAME}.md`), standard, standard],
    [path.join(root, ".roo", "rules", `${SKILL_NAME}.md`), standard, standard],
    [path.join(root, ".kiro", "steering", `${SKILL_NAME}.md`), standard, standard],
    [path.join(root, ".trae", "rules", `${SKILL_NAME}.md`), standard, standard],
    [path.join(root, ".opencode", "AGENTS.md"), standard, standard],
    [path.join(root, "AGENTS.md"), standard, null],
    [path.join(root, ".gemini", "GEMINI.md"), standard, null],
    [path.join(root, ".github", "copilot-instructions.md"), standard, null]
  ];
}

function installProject(projectRoot, withAdapters = true) {
  const root = resolveAuthorityRoot(projectRoot, "Project directory");
  const claudeSkill = path.join(root, ".claude", "skills", SKILL_NAME);
  const agentsSkill = path.join(root, ".agents", "skills", SKILL_NAME);
  const specs = withAdapters ? adapterSpecs(root) : [];

  preflightPath(root, claudeSkill, true);
  preflightPath(root, agentsSkill, true);
  for (const [file, body, legacy] of specs) {
    preflightPath(root, file);
    managedBlockUpdate(safeReadFile(root, file), file, body, legacy);
  }

  const installed = [
    copySkillTo(root, path.join(root, ".claude", "skills")),
    copySkillTo(root, path.join(root, ".agents", "skills"))
  ];
  for (const [file, body, legacy] of specs) upsertManagedBlock(root, file, body, legacy);
  return installed;
}

function askWithReadline(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function chooseInstallMode(args, ask, cwd) {
  console.log(DISPLAY_NAME);
  console.log("");
  console.log("Where should this skill be installed?");
  console.log("1. Global current user: Claude Code, Codex, and shared Agent Skills");
  console.log("2. Current project: local skills and managed adapter blocks");
  console.log("3. Both global current user and current project");
  console.log("4. Custom existing project path");
  console.log("");

  const selected = (await ask("Choose 1, 2, 3, or 4 [1]: ")) || "1";
  if (selected === "1") args.global = true;
  else if (selected === "2") args.project = cwd;
  else if (selected === "3") {
    args.global = true;
    args.project = cwd;
  } else if (selected === "4") {
    const customPath = await ask("Existing project path: ");
    if (!customPath || customPath.startsWith("-")) failUsage("A valid existing project path is required.");
    args.project = customPath;
  } else {
    failUsage(`Invalid install choice \"${selected}\".`);
  }
  return args;
}

async function run(argv, options = {}) {
  const log = options.log || console.log;
  const ask = options.ask || askWithReadline;
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || os.homedir();
  const stdinTTY = options.stdinTTY ?? Boolean(process.stdin.isTTY);
  const stdoutTTY = options.stdoutTTY ?? Boolean(process.stdout.isTTY);
  const args = parseArgs(argv);

  if (args.help) {
    log(usage());
    return [];
  }
  if (args.printPaths) {
    for (const target of globalTargetPaths(args.targets, homeDir)) log(target);
    return [];
  }
  if (!args.global && !args.project) {
    if (!stdinTTY || !stdoutTTY) {
      failUsage("Noninteractive installation requires --global and/or --project. No files were changed.");
    }
    await chooseInstallMode(args, ask, cwd);
  }

  const installed = [];
  if (args.global) installed.push(...installGlobal(homeDir, args.targets));
  if (args.project) installed.push(...installProject(args.project, args.adapters));
  if (installed.length === 0) throw new Error("No install destinations were produced.");

  log(`${DISPLAY_NAME} installed:`);
  for (const target of installed) log(`- ${target}`);
  log("");
  log("Claude Code: invoke with /web-app-ux-auditor");
  log("Codex: invoke with $web-app-ux-auditor or let Codex choose it automatically.");
  return installed;
}

async function main() {
  try {
    await run(process.argv.slice(2));
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    if (error instanceof UsageError) console.error(`\n${usage()}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  COPY_ENTRIES,
  DEFAULT_TARGETS,
  END_MARKER,
  SKILL_NAME,
  START_MARKER,
  UsageError,
  adapterText,
  globalTargetPaths,
  installGlobal,
  installProject,
  parseArgs,
  run,
  upsertManagedBlock,
  usage
};
