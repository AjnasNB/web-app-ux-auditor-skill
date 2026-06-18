# Web UX Audit Reference

Use this reference when auditing or improving web apps across React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Solid, Remix, Astro, or plain HTML/CSS/JavaScript.

## Current Research Anchors

Prefer current official docs when the user's request depends on latest browser, accessibility, or framework behavior.

- W3C WCAG 2.2: use the most current stable WCAG recommendation for accessibility review. Watch especially focus not obscured, target size, dragging alternatives, consistent help, redundant entry, accessible authentication, text alternatives, contrast, keyboard, labels, and status messages.
- WAI-ARIA Authoring Practices Guide: use for custom widgets such as dialogs, menus, tabs, comboboxes, listboxes, trees, grids, accordions, and toolbars. Native HTML remains the first choice.
- W3C WAI accessibility principles: all mouse functionality must be available by keyboard, focus must not trap unexpectedly, and navigation must support different user strategies.
- web.dev/Core Web Vitals: evaluate LCP, INP, and CLS using field data when available and lab data when field data is unavailable.
- MDN accessibility and forms: use visible labels, semantic elements, correct control names, frame titles, and predictable focus behavior.
- web.dev forms: use `autocomplete`, standard controls, password-manager-friendly auth, one-time-code support, and autofill-friendly field names.
- GOV.UK Design System: use field-specific errors, error summaries, clear labels, and service-design-grade form patterns when applicable.
- Baymard: for ecommerce/checkout, reduce unnecessary fields, avoid forced account creation, preserve data, support recovery, and avoid mid-flow distractions.
- Public agent-skill patterns such as UI/UX Pro Max and Taste Skill show a useful structure: concise `SKILL.md`, deeper reference files, search/scanner scripts, anti-generic design constraints, and explicit quality gates. Use the structure, not copied prose or persona imitation.

## Cross-Agent Compatibility

This skill is portable when it stays inside the open skill shape:

- `SKILL.md` with YAML frontmatter and Markdown instructions.
- Optional `references/`, `scripts/`, and `assets/`.
- Optional `agents/openai.yaml` for Codex UI metadata; Claude Code ignores it.
- Install locations:
  - Codex: `~/.codex/skills/web-app-ux-auditor/`
  - Claude Code personal: `~/.claude/skills/web-app-ux-auditor/`
  - Project-local Claude Code: `<repo>/.claude/skills/web-app-ux-auditor/`

Avoid relying on platform-specific frontmatter unless the skill is intentionally platform-specific. Put platform-specific execution notes in the body.

## UX Engineer Operating Model

Use this order before proposing changes:

1. **Design read**: category, audience, job, usage environment, trust level, density, maturity, visual register, constraints.
2. **User journey**: first value, primary task, recovery, re-entry, expansion, cancellation/delete.
3. **Evidence capture**: code scan, route map, screenshots, browser walkthrough, keyboard walkthrough, performance data, accessibility signals.
4. **Friction diagnosis**: confusion, too many choices, too many fields, hidden state, slow feedback, inaccessible control, broken recovery, trust gap.
5. **Design response**: remove, reorder, relabel, disclose progressively, add feedback, make state visible, improve defaults, strengthen affordance.
6. **Implementation response**: smallest code changes that improve completion and preserve architecture.
7. **Verification**: prove the new flow works with at least one realistic path and one failure path.

Do not invent a celebrity-designer persona. Adopt the discipline: evidence, taste, consistency, accessibility, and verification.

## Scorecard

Score each area from 0 to 5. A production app should have no area below 3 and critical flows should average 4+.

| Area | 0-1 | 3 | 5 |
| --- | --- | --- | --- |
| Task success | User cannot finish or loses data | Main path works with friction | Main, edge, and recovery paths are clear |
| Orientation | User cannot tell where they are | Headings/nav mostly work | Location, state, and next action are always obvious |
| Information architecture | Routes mirror org chart or implementation | Usable but uneven depth | Routes match user jobs and mental models |
| Forms | Placeholder labels, late errors, repeated entry | Basic labels/errors | Autofill, inline recovery, persistence, clear summaries |
| Accessibility | Mouse-only or unlabeled controls | Basic semantics | Keyboard, screen reader, contrast, focus, motion all verified |
| Responsive behavior | Breaks on mobile/zoom | Common breakpoints pass | Mobile, tablet, desktop, zoom, RTL/long text considered |
| Performance | Slow, jumpy, blocked interactions | Acceptable lab scores | Field-informed LCP/INP/CLS and perceived speed optimized |
| System states | Only happy path designed | Loading/error exist | Empty, loading, error, offline, partial, disabled, success are complete |
| Design consistency | Random styles and components | Repeated components | Tokens, spacing, radius, type, color, and motion are coherent |
| Trust and retention | Dark patterns or unclear consequences | Honest but minimal | Clear value, privacy, pricing, cancellation, and useful return loops |

## Design Consistency Gates

Before calling a redesign good, check:

- **Typography**: one scale, readable line lengths, clear hierarchy, no clipped text, no tiny disabled-looking body copy.
- **Spacing**: a repeated rhythm with intentional density; no random gaps or card padding.
- **Color**: one semantic palette with accessible contrast; color is not the only signal.
- **Shape**: one radius system; buttons, inputs, cards, dialogs, and tags follow a rule.
- **Elevation**: shadows, borders, surfaces, and overlays communicate hierarchy rather than decoration.
- **Iconography**: one icon family and consistent stroke/fill logic; ambiguous icons have labels.
- **Motion**: purposeful transitions with reduced-motion fallback; no animation that delays task completion.
- **Copy**: labels are specific, buttons say what happens, errors tell users how to fix the problem.
- **Data display**: units, dates, freshness, comparison baseline, empty values, and filters are visible.
- **Aesthetic fit**: style follows audience and product job, not generic AI gradients, repeated cards, or trend imitation.

## Discovery Pass

Inspect before judging. Search for:

```bash
rg -n "BrowserRouter|Routes|Route|createBrowserRouter|Link|NavLink|useNavigate|next/link|app/|pages/|router|redirect|loader|action|layout" .
rg -n "form|Formik|React Hook Form|useForm|zod|yup|valibot|schema|input|select|textarea|label|autocomplete|aria-|role=|tabIndex|onKeyDown|dialog|modal|popover|toast" .
rg -n "button|a href|div.*onClick|span.*onClick|preventDefault|stopPropagation|focus\\(|autoFocus|inert|aria-hidden|VisuallyHidden|sr-only|Skip" .
rg -n "loading|skeleton|spinner|empty|error|offline|retry|toast|alert|notification|permission|onboarding|signup|sign-up|login|auth|checkout|subscribe|paywall" .
rg -n "analytics|track|posthog|segment|amplitude|gtag|dataLayer|plausible|sentry|datadog|web-vitals|reportWebVitals" .
rg -n "theme|tokens|tailwind|styles|css|scss|container|breakpoint|media query|prefers-reduced-motion|prefers-color-scheme" .
```

Run the bundled scanner when available:

```bash
python scripts/web_ux_static_scan.py .
```

Then produce:

- App type, audience, and primary user jobs.
- Route inventory, top-level navigation, protected routes, and nested layouts.
- First-visit flow from landing/open to first value.
- Primary task flow with click count, waits, account gates, permissions, payment gates, and error paths.
- Return flow: bookmark, reload, browser back/forward, deep link, email link, notification, expired session.

## Audit Checklist

### Information Architecture and Navigation

- Make top-level destinations match user jobs, not internal org structure.
- Use persistent global navigation for broad apps; use local navigation/tabs for sibling content within a route.
- Keep current location visible with route-aware active states, headings, breadcrumbs where depth requires them, and page titles.
- Browser back/forward, reload, deep links, and copied URLs must preserve meaningful state or recover gracefully.
- Search should be available when navigation cannot reasonably expose all content; filters and sorting should be understandable and persistent when useful.
- Avoid nesting dashboards, settings, and admin areas so deeply that users cannot predict where to go next.
- Provide obvious exits from modals, setup, full-screen flows, checkout, and auth.

### First Visit, Onboarding, and Activation

- Let users understand value before account creation, payment, permissions, or integrations when possible.
- Keep onboarding tied to the first meaningful task; replace generic tours with progressive guidance in context.
- Let users skip nonessential setup and return later.
- Preserve progress across auth, SSO, email verification, payment, failed validation, reload, and expired sessions.
- Use sample data or templates when an empty app would otherwise feel broken.
- Ask for browser permissions only when the user initiates a feature that needs them.

### Dashboards and Data-Dense Apps

- Start with the user decision or action the dashboard supports, not just available metrics.
- Put high-priority status, exceptions, and next actions above secondary charts.
- Make filters, date ranges, comparisons, units, and data freshness visible.
- Empty, loading, stale, partial, and error states must be explicit.
- Avoid decorative chart density. Prefer tables for exact comparison and charts for trends, distribution, or anomaly detection.
- Support saved views, column controls, bulk actions, undo, and export only when the workflow needs them.

### Forms, Auth, Checkout, and Complex Tasks

- Use native form controls and visible labels. Do not rely on placeholder-only labels.
- Use correct `type`, `inputmode`, `autocomplete`, `name`, `id`, `for`, validation attributes, and password-manager-friendly markup.
- Reduce fields before reducing steps. Hide optional or rare fields behind disclosure, and infer values where reliable.
- Use inline validation for fixable field errors and an error summary for long forms or submit failures.
- Error messages should name the field/question and tell the user how to fix it.
- Preserve entered data after errors, reloads, auth redirects, and network failures.
- Avoid forced account creation during checkout or high-intent conversion unless legally/product-critical.
- Make cancellation, refund, subscription, plan limits, and billing consequences clear before commitment.

### Accessibility and Keyboard UX

- Validate semantic structure: one useful page title, logical headings, landmarks, lists, tables, buttons, links, and form labels.
- All interactive functionality must work by keyboard. Tab order must preserve meaning and operation.
- Focus indicators must be visible and not obscured by sticky headers, cookie banners, drawers, or overlays.
- Modals/dialogs must move focus inside on open, trap focus while modal, make background inert, close predictably, and return focus to the trigger.
- Dynamic updates such as validation errors, search result counts, save status, loading completion, and destructive confirmations need appropriate announcements.
- Do not put `aria-hidden` on focusable content or create nested interactive controls.
- Use ARIA only when native HTML cannot express the control; match APG keyboard patterns for custom widgets.
- Test with keyboard, browser zoom, screen reader spot-checks, reduced motion, high contrast/forced colors, and at least one automated accessibility checker.

### Responsive Layout and Cross-Browser Behavior

- Audit mobile, tablet, desktop, narrow sidebars, zoomed text, and browser font-size changes.
- Use responsive constraints, container queries/media queries, and stable dimensions so content does not overlap or cause layout jumps.
- Make hit targets large enough and spaced enough for touch, pointer, and coarse input.
- Avoid hover-only affordances. Anything revealed on hover must also work by keyboard and touch.
- Keep sticky headers, sidebars, toasts, and banners from covering focused controls, errors, or primary actions.
- Support long words, translated strings, RTL when localized, and user zoom up to common accessibility levels.

### Feedback, Loading, Empty, Error, and Offline States

- Show immediate feedback for clicks, saves, uploads, deletes, payments, and async actions.
- Use optimistic updates only when rollback and error recovery are clear.
- Skeletons should reserve final layout space; spinners need context if the wait matters.
- Empty states should explain why content is missing and offer the next useful action.
- Error states should say what happened, what the user can do, and whether data is safe.
- Offline or degraded network states should preserve user input and support retry/resume where feasible.
- Toasts should not be the only place important information appears.

### Performance and Core Web Vitals

- Check LCP, INP, and CLS. Prefer field data from Chrome UX Report, RUM, Search Console, or analytics; use Lighthouse/PageSpeed/DevTools for lab diagnosis.
- LCP risks: unoptimized hero/content images, blocked fonts, slow server/rendering, unnecessary client-side waterfalls, late CSS, and no preloading for critical assets.
- INP risks: long JavaScript tasks, expensive hydration, heavy event handlers, large client bundles, synchronous validation, and blocking third-party scripts.
- CLS risks: images/media without dimensions, ads/embeds without reserved space, late banners, web font swaps, skeleton mismatch, and inserted content above current viewport.
- Audit route transitions, data fetching, caching, suspense/loading states, and bundle splitting.
- Performance recommendations must preserve UX and accessibility; do not remove useful labels, focus states, or content just to improve a score.

### Trust, Privacy, and Ethical Retention

- State clearly what data is needed, why, and what happens next.
- Make destructive actions reversible where possible, or require explicit confirmation where not.
- Keep pricing, plan limits, trial end, renewal, cancellation, and data deletion clear.
- Use notifications, email, and nudges only for user-valued return reasons.
- Treat retention as repeated successful value: faster re-entry, saved work, useful reminders, collaboration signals, new relevant content, and clear progress.
- Avoid dark patterns: hidden cancellation, forced continuity, fake scarcity, guilt copy, preselected consent, disguised ads, confirmshaming, and broken back paths.

## Framework-Specific Fix Map

### React, Next.js, Remix, and Astro

- Prefer semantic JSX and framework routing primitives (`Link`, loaders/actions/server actions where applicable) over click handlers on non-interactive elements.
- Check route titles, metadata, active navigation, focus restoration, route announcements, suspense/loading boundaries, and error boundaries.
- Use `eslint-plugin-jsx-a11y`, TypeScript, component tests, Playwright, axe, and framework linting where available.
- Watch for hydration-heavy widgets, client components where server rendering would work, unstable layout from late data, and forms that bypass native browser behavior.

### Vue, Nuxt, Svelte, SvelteKit, Solid, and Angular

- Preserve native semantics in templates. Use router links, route guards, layouts, and form actions consistently with the framework.
- Check focus behavior on route change, dialogs, drawers, and client-side transitions.
- Use built-in or ecosystem a11y linting and component testing where the project already has it.
- Avoid custom stores/effects that reset user input, scroll, focus, filters, or form state unexpectedly.

### Plain HTML/CSS/JavaScript

- Use real anchors for navigation and real buttons for actions.
- Use labels, fieldsets, legends, headings, landmarks, lists, and tables according to meaning.
- Keep custom widgets small and follow APG patterns if they cannot be native.
- Use progressive enhancement: critical flows should remain understandable when JavaScript is slow, delayed, or partially failed.

## Report Template

```markdown
## Findings

| Severity | Route/Flow | Evidence | User Impact | Fix |
| --- | --- | --- | --- | --- |
| P1 | `/checkout/shipping` | `src/routes/checkout.tsx:88`, keyboard walkthrough | Users re-enter address after validation failure | Persist form state, add visible labels, add error summary and field-level errors |

## Flow Map

Current: Home -> sign up wall -> empty dashboard -> settings -> connect integration -> first value
Recommended: Home -> sample value preview -> connect integration -> first useful result -> account save prompt

## Implementation Notes

- Framework-specific files/components to change.
- Native HTML, ARIA/APG, routing, or performance APIs to use.
- Analytics/events to inspect or add.

## Verification

- What was run.
- What could not be run.
- Remaining UX risks.
```

## Common Failure Modes

- Auditing only the homepage and missing app states after login.
- Treating a web app like a landing page instead of a task surface.
- Replacing semantic controls with styled `div`s.
- Ignoring keyboard users, focus order, route changes, and modal focus management.
- Making desktop dashboards unusable on narrow screens or zoomed text.
- Optimizing visual polish while leaving forms, errors, loading, empty states, and performance broken.
- Treating retention as more notifications instead of clearer value and easier return paths.
