# Web App UX Auditor Skill

Agent Skill for auditing and improving web app UI/UX flows across React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Solid, Remix, Astro, and plain HTML/CSS/JavaScript.

## Install globally

```bash
npx web-app-ux-auditor-skill
```

This installs the skill for the current user into:

- `~/.claude/skills/web-app-ux-auditor`
- `~/.agents/skills/web-app-ux-auditor`
- `~/.codex/skills/web-app-ux-auditor`

Claude Code can then invoke it as:

```text
/web-app-ux-auditor
```

Codex can invoke it as:

```text
$web-app-ux-auditor
```

Codex can also choose it automatically when the request matches the skill description.

## Install into a project

```bash
npx web-app-ux-auditor-skill --project .
```

Project install copies the canonical skill into `.claude/skills/` and `.agents/skills/`, then writes adapter rule files for common tools such as Cursor, Windsurf, GitHub Copilot, Gemini, Continue, Cline, Roo Code, Kiro, Trae, and OpenCode.

Use `--no-adapters` to copy only the skill folders:

```bash
npx web-app-ux-auditor-skill --project . --no-adapters
```

## Static scanner

The skill includes a Python scanner for static UX signals:

```bash
python scripts/web_ux_static_scan.py /path/to/web-app
```

The scanner is a triage tool. Confirm every finding in code, browser, screenshots, accessibility tooling, performance traces, or tests before changing behavior.

## Publish to GitHub

```bash
git init
git add .
git commit -m "Initial web app UX auditor skill"
gh repo create ajnasnb/web-app-ux-auditor-skill --public --source . --remote origin --push
```

## Publish to npm

```bash
npm adduser
npm publish --access public
```

If you want a scoped package, change `package.json` from `web-app-ux-auditor-skill` to `@your-scope/web-app-ux-auditor-skill`, then publish with `npm publish --access public`.

## Compatibility

- Claude Code: personal skills folder supports slash invocation with `/web-app-ux-auditor`.
- Codex: user skills folder supports `$web-app-ux-auditor` and implicit invocation.
- Other tools: project adapters are installed through `--project` because global rule locations vary by tool and operating system.
