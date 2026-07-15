"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const installer = require("../bin/install.js");
const packageRoot = path.resolve(__dirname, "..");
const cli = path.join(packageRoot, "bin", "install.js");

function temporaryDirectory(t, label) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true, maxRetries: 3 }));
  return directory;
}

function countText(buffer, text) {
  let count = 0;
  let offset = 0;
  const needle = Buffer.from(text);
  while (true) {
    const found = buffer.indexOf(needle, offset);
    if (found < 0) return count;
    count += 1;
    offset = found + needle.length;
  }
}

test("CLI parsing rejects ambiguous and unknown input", () => {
  assert.throws(() => installer.parseArgs(["--unknown"]), /Unknown option/);
  assert.throws(() => installer.parseArgs(["project"]), /Unexpected positional/);
  assert.throws(() => installer.parseArgs(["--project"]), /requires a value/);
  assert.throws(() => installer.parseArgs(["--project", "--no-adapters"]), /another option/);
  assert.throws(() => installer.parseArgs(["--targets", "--global"]), /another option/);
  assert.throws(() => installer.parseArgs(["--targets", "invalid", "--global"]), /Unknown target/);
  assert.throws(() => installer.parseArgs(["--targets", "claude,claude", "--global"]), /Duplicate target/);
  assert.throws(() => installer.parseArgs(["--targets", "claude,", "--global"]), /without empty entries/);
  assert.throws(() => installer.parseArgs(["--targets", "claude"]), /requires --global/);
  assert.throws(() => installer.parseArgs(["--no-adapters"]), /requires --project/);
  assert.throws(() => installer.parseArgs(["--yes"]), /does not select/);
  assert.throws(() => installer.parseArgs(["--help", "--global"]), /cannot be combined/);
  assert.deepEqual(installer.parseArgs(["--global", "--targets", "claude,codex"]), {
    global: true,
    project: null,
    targets: ["claude", "codex"],
    adapters: true,
    printPaths: false,
    help: false,
    yes: false
  });
});

test("noninteractive no-argument execution fails without side effects", async (t) => {
  const home = temporaryDirectory(t, "web-auditor-home");
  const cwd = temporaryDirectory(t, "web-auditor-cwd");
  await assert.rejects(
    installer.run([], {
      homeDir: home,
      cwd,
      stdinTTY: false,
      stdoutTTY: false,
      log() {},
      errorLog() {}
    }),
    /requires --global and\/or --project/
  );
  assert.deepEqual(fs.readdirSync(home), []);
  assert.deepEqual(fs.readdirSync(cwd), []);

  const child = spawnSync(process.execPath, [cli], { cwd, encoding: "utf8" });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /No files were changed/);
  assert.deepEqual(fs.readdirSync(cwd), []);
});

test("print-paths is explicit and read-only", async (t) => {
  const home = temporaryDirectory(t, "web-auditor-print-home");
  const logs = [];
  await installer.run(["--print-paths", "--targets", "claude"], {
    homeDir: home,
    stdinTTY: false,
    stdoutTTY: false,
    log(value) { logs.push(value); }
  });
  assert.deepEqual(logs, [path.join(home, ".claude", "skills")]);
  assert.deepEqual(fs.readdirSync(home), []);
});

test("explicit project CLI installs both skill copies without adapters", (t) => {
  const project = temporaryDirectory(t, "web-auditor-cli-project");
  const child = spawnSync(process.execPath, [cli, "--project", project, "--no-adapters"], {
    cwd: project,
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(fs.existsSync(path.join(project, ".claude", "skills", installer.SKILL_NAME, "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(project, ".agents", "skills", installer.SKILL_NAME, "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(project, "AGENTS.md")), false);
});

test("project adapters preserve bytes, replace stale managed content, and are idempotent", (t) => {
  const project = temporaryDirectory(t, "web-auditor-project");
  const openCodeDirectory = path.join(project, ".opencode");
  fs.mkdirSync(openCodeDirectory);
  const openCodeFile = path.join(openCodeDirectory, "AGENTS.md");
  const userPrefix = Buffer.from([0x55, 0x53, 0x45, 0x52, 0x0d, 0x0a, 0xff, 0x00, 0x41]);
  fs.writeFileSync(openCodeFile, userPrefix);

  installer.installProject(project, true);
  const first = fs.readFileSync(openCodeFile);
  assert.deepEqual(first.subarray(0, userPrefix.length), userPrefix);
  assert.equal(countText(first, installer.START_MARKER), 1);
  assert.equal(countText(first, installer.END_MARKER), 1);

  installer.installProject(project, true);
  assert.deepEqual(fs.readFileSync(openCodeFile), first);

  const before = Buffer.from("user-before\r\n");
  const after = Buffer.from([0x0a, 0x75, 0x73, 0x65, 0x72, 0x2d, 0x61, 0x66, 0x74, 0x65, 0x72, 0x00]);
  const stale = Buffer.from(`${installer.START_MARKER}\nstale managed text\n${installer.END_MARKER}`);
  fs.writeFileSync(openCodeFile, Buffer.concat([before, stale, after]));

  installer.installProject(project, true);
  const upgraded = fs.readFileSync(openCodeFile);
  assert.deepEqual(upgraded.subarray(0, before.length), before);
  assert.deepEqual(upgraded.subarray(upgraded.length - after.length), after);
  assert.equal(upgraded.includes(Buffer.from("stale managed text")), false);
  assert.equal(countText(upgraded, installer.START_MARKER), 1);
  assert.equal(countText(upgraded, installer.END_MARKER), 1);

  installer.installProject(project, true);
  assert.deepEqual(fs.readFileSync(openCodeFile), upgraded);
});

test("malformed managed markers fail closed and preserve the file", (t) => {
  const project = temporaryDirectory(t, "web-auditor-markers");
  const file = path.join(project, "AGENTS.md");
  const original = Buffer.from(`user data\n${installer.START_MARKER}\nunterminated`);
  fs.writeFileSync(file, original);
  assert.throws(() => installer.installProject(project, true), /ambiguous managed markers/);
  assert.deepEqual(fs.readFileSync(file), original);
  assert.equal(fs.existsSync(path.join(project, ".claude")), false);
});

test("project link escape is rejected before any install write", (t) => {
  const project = temporaryDirectory(t, "web-auditor-link-project");
  const outside = temporaryDirectory(t, "web-auditor-link-outside");
  const link = path.join(project, ".agents");
  try {
    fs.symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && (error.code === "EPERM" || error.code === "EACCES")) {
      t.skip(`Symbolic links are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  assert.throws(() => installer.installProject(project, true), /symbolic link|junction|reparse point/i);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(fs.existsSync(path.join(project, ".claude")), false);
});

test("dangling destination links fail closed", (t) => {
  const container = temporaryDirectory(t, "web-auditor-dangling-link");
  const project = path.join(container, "project");
  const outside = path.join(container, "removed-target");
  fs.mkdirSync(project);
  fs.mkdirSync(outside);
  const link = path.join(project, ".agents");
  try {
    fs.symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && (error.code === "EPERM" || error.code === "EACCES")) {
      t.skip(`Symbolic links are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  fs.rmSync(outside, { recursive: true, force: true });
  assert.throws(() => installer.installProject(project, false), /symbolic link|junction|reparse point/i);
  assert.equal(fs.existsSync(path.join(project, ".claude")), false);
});

test("linked project roots are rejected", (t) => {
  const container = temporaryDirectory(t, "web-auditor-root-link");
  const realProject = path.join(container, "real");
  const linkedProject = path.join(container, "linked");
  fs.mkdirSync(realProject);
  try {
    fs.symlinkSync(realProject, linkedProject, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && (error.code === "EPERM" || error.code === "EACCES")) {
      t.skip(`Symbolic links are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  assert.throws(() => installer.installProject(linkedProject, false), /cannot be a symbolic link or junction/);
  assert.deepEqual(fs.readdirSync(realProject), []);
});

test("explicit global targets install only below the supplied real home", (t) => {
  const home = temporaryDirectory(t, "web-auditor-global");
  const installed = installer.installGlobal(home, ["claude", "agents", "codex-legacy"]);
  assert.equal(installed.length, 3);
  for (const target of installed) {
    assert.equal(path.relative(home, target).startsWith(".."), false);
    assert.equal(fs.existsSync(path.join(target, "SKILL.md")), true);
  }
});

test("global target links cannot escape the supplied home", (t) => {
  const home = temporaryDirectory(t, "web-auditor-global-link-home");
  const outside = temporaryDirectory(t, "web-auditor-global-link-outside");
  const link = path.join(home, ".codex");
  try {
    fs.symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && (error.code === "EPERM" || error.code === "EACCES")) {
      t.skip(`Symbolic links are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  assert.throws(() => installer.installGlobal(home, ["codex-legacy"]), /symbolic link|junction|reparse point/i);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test("top-level and nested skill payloads stay byte-identical", () => {
  const nested = path.join(packageRoot, "skills", installer.SKILL_NAME);
  for (const relative of [
    "SKILL.md",
    path.join("agents", "openai.yaml"),
    path.join("references", "web-ux-audit-reference.md"),
    path.join("scripts", "web_ux_static_scan.py")
  ]) {
    assert.deepEqual(fs.readFileSync(path.join(packageRoot, relative)), fs.readFileSync(path.join(nested, relative)));
  }
  const skillText = fs.readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
  const agentText = fs.readFileSync(path.join(packageRoot, "agents", "openai.yaml"), "utf8");
  assert.match(skillText, /^---\r?\nname: web-app-ux-auditor\r?\ndescription: .+\r?\n---/);
  assert.match(agentText, /display_name: "Web App UX Auditor"/);
  assert.match(agentText, /default_prompt: "Use \$web-app-ux-auditor /);
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  const codexPlugin = JSON.parse(fs.readFileSync(path.join(packageRoot, ".codex-plugin", "plugin.json"), "utf8"));
  const claudePlugin = JSON.parse(fs.readFileSync(path.join(packageRoot, ".claude-plugin", "plugin.json"), "utf8"));
  assert.equal(packageJson.author.name, "Ajnas NB");
  assert.equal(codexPlugin.author.name, "Ajnas NB");
  assert.equal(codexPlugin.interface.developerName, "Ajnas NB");
  assert.equal(claudePlugin.author.name, "Ajnas NB");
  assert.equal(codexPlugin.version, packageJson.version);
  assert.equal(claudePlugin.version, packageJson.version);
});

test("static scanner runs against a fixture", (t) => {
  const fixture = temporaryDirectory(t, "web-auditor-scanner");
  const outside = temporaryDirectory(t, "web-auditor-scanner-outside");
  fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({ dependencies: { react: "19.0.0" } }));
  fs.writeFileSync(path.join(fixture, "index.jsx"), "<button onClick={() => save()}>Save</button>\n");
  fs.writeFileSync(path.join(outside, "secret.jsx"), "<div onClick={leak}>LEAK_SENTINEL</div>\n");
  let linked = false;
  try {
    fs.symlinkSync(outside, path.join(fixture, "linked-outside"), process.platform === "win32" ? "junction" : "dir");
    linked = true;
  } catch (error) {
    if (!error || (error.code !== "EPERM" && error.code !== "EACCES")) throw error;
  }
  const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
  const result = spawnSync(python, [path.join(packageRoot, "scripts", "web_ux_static_scan.py"), fixture], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /# Web UX Static Scan/);
  assert.match(result.stdout, /Detected stack: React/);
  if (linked) assert.doesNotMatch(result.stdout, /LEAK_SENTINEL/);
});

test("dry package contains only the intended lean payload", () => {
  const npmCli = process.env.npm_execpath;
  const npmArgs = ["pack", "--dry-run", "--json", "--ignore-scripts"];
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...npmArgs], { cwd: packageRoot, encoding: "utf8" })
    : spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", npmArgs, {
        cwd: packageRoot,
        encoding: "utf8",
        shell: process.platform === "win32"
      });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const paths = report[0].files.map((entry) => entry.path).sort();
  assert.deepEqual(paths, [
    ".claude-plugin/plugin.json",
    ".codex-plugin/plugin.json",
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "SECURITY.md",
    "SKILL.md",
    "agents/openai.yaml",
    "bin/install.js",
    "package.json",
    "references/web-ux-audit-reference.md",
    "scripts/web_ux_static_scan.py",
    "skills/web-app-ux-auditor/SKILL.md",
    "skills/web-app-ux-auditor/agents/openai.yaml",
    "skills/web-app-ux-auditor/references/web-ux-audit-reference.md",
    "skills/web-app-ux-auditor/scripts/web_ux_static_scan.py"
  ].sort());
  assert.equal(paths.some((item) => item.startsWith("test/") || item.startsWith(".github/") || item === "RELEASING.md"), false);
});
