---
name: web-app-ux-auditor
description: Use when reviewing, redesigning, or implementing web app UI/UX flows in React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Solid, Remix, Astro, or plain HTML/CSS/JavaScript; especially for navigation, onboarding, dashboards, forms, checkout, accessibility, keyboard focus, responsive behavior, Core Web Vitals, retention, or conversion.
---

# Web App UX Auditor

## Overview

Audit web apps by tracing real user flows, finding friction with code and runtime evidence, and proposing or implementing improvements that are accessible, responsive, fast, and easy to navigate. Optimize for users completing valuable tasks and returning because the app works well, not because the interface traps or manipulates them.

## Workflow

1. State the design read: app type, audience, job-to-be-done, product maturity, visual register, and risk level. For redesigns, preserve working IA, copy, analytics names, and accessibility wins unless there is evidence they cause harm.
2. If code is available, run the static signal scan before judging:
   ```bash
   python scripts/web_ux_static_scan.py <project-root>
   ```
   In Claude Code, use `python ${CLAUDE_SKILL_DIR}/scripts/web_ux_static_scan.py <project-root>` when the skill is installed. Treat the script as evidence-gathering, not a replacement for expert review.
3. Inspect routing, layouts, components, forms, design tokens, analytics events, accessibility tooling, tests, screenshots, and runtime behavior before recommending changes.
4. Build a compact route and flow map: first visit, onboarding, sign-in/sign-up, home/dashboard, primary task, search/discovery, form submission, settings, empty/error/loading/offline states, checkout/paywall if present, and return/deep-link flows.
5. Audit against clarity, information architecture, accessibility, keyboard/focus behavior, forms, responsive layout, performance, trust, feedback, and ethical retention. Load `references/web-ux-audit-reference.md` for the detailed checklist and framework-specific code signals.
6. Rank findings by user impact:
   - P0: Blocks a critical task, causes data loss, breaks auth/payment, or creates severe accessibility failure.
   - P1: Breaks navigation, comprehension, trust, keyboard access, or completion for many users.
   - P2: Adds avoidable friction, inconsistency, poor responsive behavior, or weak performance.
   - P3: Polish, content clarity, delight, or instrumentation improvement.
7. When editing code, preserve the app's architecture and design system. Prefer semantic HTML, native controls, accessible framework primitives, and existing component patterns over custom widgets.
8. Verify with the best available evidence: local browser walkthrough, Playwright, screenshots, keyboard-only test, screen reader spot-check, Lighthouse/PageSpeed/Core Web Vitals, axe/accessibility checks, unit/component tests, or static inspection. State anything that could not be verified.

## Quality Bar

Hold the output to a senior product design engineer standard:

- The primary user can understand where they are, what changed, what to do next, and how to recover from mistakes.
- Core flows handle loading, empty, error, partial, disabled, offline, slow-network, auth-expired, and permission-denied states.
- The UI has one coherent design system: typography scale, spacing rhythm, radius rules, color roles, interaction states, motion, density, and responsive behavior.
- Accessibility is built into semantics, keyboard behavior, focus management, contrast, target size, status announcements, and reduced-motion behavior.
- Performance is part of UX: LCP, INP, CLS, route transitions, hydration, bundle size, and perceived latency all matter.
- Retention comes from saved progress, useful reminders, reduced effort, trust, and repeated value. Do not optimize for addiction.

## Output Format

Start with findings, not praise. Include:

- A prioritized findings table: severity, route/flow, evidence, user impact, recommended fix.
- A before/after flow summary when IA, onboarding, forms, or checkout changes.
- Framework-specific implementation notes for React/Next, Vue/Nuxt, Svelte/SvelteKit, Angular, or plain web as applicable.
- Static scan findings from `scripts/web_ux_static_scan.py` when code is available.
- Accessibility, keyboard, responsive, and performance checks.
- Verification performed and remaining risks.

When asked to improve the app directly, implement the smallest high-impact changes first, then report changed files and validation.

## Non-Negotiables

- Do not recommend dark patterns: hidden cancellation, forced continuity, disguised ads, trick opt-ins, guilt copy, confirmshaming, fake scarcity, notification spam, or broken back/close paths.
- Do not replace semantic HTML with generic `div`/`span` controls unless the accessible behavior is fully implemented and tested.
- Do not audit only visual polish when code or a runnable app is available.
- Do not give generic advice like "improve navigation" without naming the exact route, user problem, and change.
