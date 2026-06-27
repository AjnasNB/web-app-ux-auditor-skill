#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const SKILL_NAME = "web-app-ux-auditor";
const DISPLAY_NAME = "Web App UX Auditor";
const DESCRIPTION =
  "Audit and improve web app UI/UX flows across React, Next.js, Vue, Svelte, Angular, and plain web stacks.";

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const COPY_ENTRIES = ["SKILL.md", "agents", "references", "scripts"];

function usage() {
  console.log(`
${DISPLAY_NAME}

Usage:
  npx web-app-ux-auditor-skill
  web-app-ux-auditor --global
  web-app-ux-auditor --project <path>
  web-app-ux-auditor --targets claude,codex,agents

Default:
  In an interactive terminal, asks where to install. In non-interactive shells, installs globally.

Options:
  --global             Install to current-user global skill folders. Default when no mode is passed.
  --project <path>     Install project-local skills and adapter rule files for popular coding agents.
  --targets <list>     Comma-separated global targets: claude,codex,agents,codex-legacy.
  --yes                Skip prompts and install globally.
  --no-adapters        With --project, skip non-skill adapter files.
  --print-paths        Print install locations and exit.
  --help               Show this help.
`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmIfExists(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyEntry(entry, targetDir) {
  const source = path.join(PACKAGE_ROOT, entry);
  if (!fs.existsSync(source)) return;
  const target = path.join(targetDir, entry);
  rmIfExists(target);
  fs.cpSync(source, target, { recursive: true });
}

function copySkillTo(root) {
  const targetDir = path.join(root, SKILL_NAME);
  ensureDir(targetDir);
  for (const entry of COPY_ENTRIES) copyEntry(entry, targetDir);
  return targetDir;
}

function globalTargets(selected) {
  const home = os.homedir();
  const all = {
    claude: path.join(home, ".claude", "skills"),
    agents: path.join(home, ".agents", "skills"),
    codex: path.join(home, ".agents", "skills"),
    "codex-legacy": path.join(home, ".codex", "skills")
  };
  const names = selected || ["claude", "agents", "codex-legacy"];
  return [...new Set(names.map((name) => all[name]).filter(Boolean))];
}

function appendBlock(file, marker, body) {
  ensureDir(path.dirname(file));
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (existing.includes(marker)) return false;
  const prefix = existing.trim().length ? `${existing.trimEnd()}\n\n` : "";
  fs.writeFileSync(file, `${prefix}${body.trimEnd()}\n`, "utf8");
  return true;
}

function writeFile(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
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

function installProject(projectRoot, withAdapters) {
  const root = path.resolve(projectRoot);
  const claudeSkill = copySkillTo(path.join(root, ".claude", "skills"));
  const agentsSkill = copySkillTo(path.join(root, ".agents", "skills"));

  if (!withAdapters) return [claudeSkill, agentsSkill];

  const marker = `<!-- ${SKILL_NAME}:start -->`;
  const block = `${marker}
${adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`)}
<!-- ${SKILL_NAME}:end -->`;

  writeFile(
    path.join(root, ".cursor", "rules", `${SKILL_NAME}.mdc`),
    `---
description: ${DESCRIPTION}
globs: **/*
alwaysApply: false
---

${adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`)}`
  );
  writeFile(path.join(root, ".windsurf", "rules", `${SKILL_NAME}.md`), adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`));
  writeFile(path.join(root, ".continue", "rules", `${SKILL_NAME}.md`), adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`));
  writeFile(path.join(root, ".clinerules", `${SKILL_NAME}.md`), adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`));
  writeFile(path.join(root, ".roo", "rules", `${SKILL_NAME}.md`), adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`));
  writeFile(path.join(root, ".kiro", "steering", `${SKILL_NAME}.md`), adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`));
  writeFile(path.join(root, ".trae", "rules", `${SKILL_NAME}.md`), adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`));
  writeFile(path.join(root, ".opencode", "AGENTS.md"), adapterText(`.agents/skills/${SKILL_NAME}/SKILL.md`));

  appendBlock(path.join(root, "AGENTS.md"), marker, block);
  appendBlock(path.join(root, ".gemini", "GEMINI.md"), marker, block);
  appendBlock(path.join(root, ".github", "copilot-instructions.md"), marker, block);

  return [claudeSkill, agentsSkill];
}

function parseArgs(argv) {
  const result = {
    global: false,
    project: null,
    targets: null,
    adapters: true,
    printPaths: false,
    help: false,
    yes: false,
    explicitMode: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--global") {
      result.global = true;
      result.explicitMode = true;
    }
    else if (arg === "--project") {
      result.project = argv[++i] || ".";
      result.explicitMode = true;
    }
    else if (arg.startsWith("--project=")) {
      result.project = arg.split("=")[1] || ".";
      result.explicitMode = true;
    }
    else if (arg === "--targets") result.targets = (argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith("--targets=")) result.targets = arg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean);
    else if (arg === "--no-adapters") result.adapters = false;
    else if (arg === "--print-paths") result.printPaths = true;
    else if (arg === "--yes" || arg === "-y") result.yes = true;
  }
  if (result.yes && !result.explicitMode) result.global = true;
  if (!result.global && !result.project && !process.stdin.isTTY) result.global = true;
  return result;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function chooseInstallMode(args) {
  if (args.global || args.project || args.printPaths || args.help) return args;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    args.global = true;
    return args;
  }

  console.log(`${DISPLAY_NAME}`);
  console.log("");
  console.log("Where should this skill be installed?");
  console.log("1. Global current user: Claude Code, Codex, and shared Agent Skills");
  console.log("2. Current project: .claude/.agents skills plus adapters for Cursor, Windsurf, Copilot, Gemini, Continue, Cline, Roo, Kiro, Trae, OpenCode");
  console.log("3. Both global current user and current project");
  console.log("4. Custom project path");
  console.log("");

  const choice = await ask("Choose 1, 2, 3, or 4 [1]: ");
  const selected = choice || "1";
  if (selected === "2") args.project = process.cwd();
  else if (selected === "3") {
    args.global = true;
    args.project = process.cwd();
  } else if (selected === "4") {
    const customPath = await ask("Project path: ");
    args.project = customPath || process.cwd();
  } else {
    args.global = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await chooseInstallMode(args);
  if (args.help) {
    usage();
    return;
  }

  if (args.printPaths) {
    console.log(globalTargets(args.targets).join("\n"));
    return;
  }

  const installed = [];
  if (args.global) {
    for (const target of globalTargets(args.targets)) {
      installed.push(copySkillTo(target));
    }
  }
  if (args.project) {
    installed.push(...installProject(args.project, args.adapters));
  }

  console.log(`${DISPLAY_NAME} installed:`);
  for (const target of installed) console.log(`- ${target}`);
  console.log("");
  console.log("Claude Code: invoke with /web-app-ux-auditor");
  console.log("Codex: invoke with $web-app-ux-auditor or let Codex choose it automatically.");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
