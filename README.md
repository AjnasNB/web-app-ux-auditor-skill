# Web App UX Auditor Skill

A portable Agent Skill for auditing and improving web app UI/UX flows across React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Solid, Remix, Astro, and plain HTML/CSS/JavaScript.

Use it when you want an AI coding agent to inspect a web app, map real user flows, find UX friction, and propose or implement improvements with evidence instead of generic "make it cleaner" advice.

## What it helps with

- Navigation, information architecture, route state, browser back/forward, deep links, and re-entry flows.
- First visit, onboarding, sign-in/sign-up, dashboards, search, checkout, settings, and conversion flows.
- Forms, validation, autofill, password-manager support, empty/loading/error/offline states.
- Accessibility: semantic HTML, labels, landmarks, keyboard access, focus management, dialogs, contrast, reduced motion, and screen reader announcements.
- Responsive behavior across mobile, tablet, desktop, zoomed text, long strings, and RTL/localized content.
- Performance as UX: Core Web Vitals, LCP, INP, CLS, route transitions, hydration, bundles, and perceived latency.
- Ethical retention through saved progress, useful reminders, trust, and repeated value.
- Static code triage with a bundled Python scanner.

## Install globally

After the npm package is published:

```bash
npx web-app-ux-auditor-skill
```

This installs the skill for the current user into:

- `~/.claude/skills/web-app-ux-auditor`
- `~/.agents/skills/web-app-ux-auditor`
- `~/.codex/skills/web-app-ux-auditor`

Restart your agent app after installing.

## Use it

Claude Code:

```text
/web-app-ux-auditor
```

Codex:

```text
$web-app-ux-auditor
```

Example prompts:

```text
/web-app-ux-auditor audit the signup and dashboard flow in this Next.js app
```

```text
$web-app-ux-auditor review this checkout flow for accessibility, keyboard UX, and Core Web Vitals
```

## Install into one project

```bash
npx web-app-ux-auditor-skill --project .
```

Project install copies the canonical skill into `.claude/skills/` and `.agents/skills/`, then writes adapter rule files for common coding agents:

- Cursor
- Windsurf
- GitHub Copilot
- Gemini
- Continue
- Cline
- Roo Code
- Kiro
- Trae
- OpenCode

Copy only the skill folders and skip adapter files:

```bash
npx web-app-ux-auditor-skill --project . --no-adapters
```

## Static scanner

The skill includes a Python scanner for static web UX signals:

```bash
python scripts/web_ux_static_scan.py /path/to/web-app
```

The scanner detects review signals such as non-semantic click targets, missing image alt text, placeholder-label risks, missing button types, focus-outline removal, dialog risks, and mobile viewport issues.

It is a triage tool, not a replacement for expert review. Confirm every finding in code, browser, screenshots, accessibility tooling, performance traces, or tests before changing behavior.

## Package layout

```text
web-app-ux-auditor/
  SKILL.md
  agents/openai.yaml
  references/web-ux-audit-reference.md
  scripts/web_ux_static_scan.py
  skills/web-app-ux-auditor/
  .codex-plugin/plugin.json
  .claude-plugin/plugin.json
  bin/install.js
  package.json
```

The root `SKILL.md` supports direct skill installation. The `skills/web-app-ux-auditor/` copy supports plugin-style discovery.

## Publish to GitHub

```bash
gh auth login
gh repo create AjnasNB/web-app-ux-auditor-skill --public --source . --remote origin --push
```

If the repo already exists:

```bash
git remote add origin https://github.com/AjnasNB/web-app-ux-auditor-skill.git
git push -u origin main
```

## Publish to npm

Log in once:

```bash
npm adduser
```

Check the package:

```bash
npm publish --dry-run --access public
```

Publish:

```bash
npm publish --access public
```

After publishing, users install it with:

```bash
npx web-app-ux-auditor-skill
```

Or install the CLI globally:

```bash
npm install -g web-app-ux-auditor-skill
web-app-ux-auditor --global
```

## License

MIT
