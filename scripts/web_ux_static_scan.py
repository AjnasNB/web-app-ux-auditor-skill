#!/usr/bin/env python3
"""Static web UX signal scanner.

This script is intentionally conservative: it finds review signals, not final
verdicts. Use the output to decide where to inspect manually.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


EXCLUDE_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    ".next",
    ".nuxt",
    ".svelte-kit",
    "dist",
    "build",
    "coverage",
    ".vercel",
    ".turbo",
    ".cache",
}

EXTENSIONS = {
    ".html",
    ".htm",
    ".jsx",
    ".tsx",
    ".js",
    ".ts",
    ".vue",
    ".svelte",
    ".astro",
    ".css",
    ".scss",
    ".sass",
}


@dataclass
class Finding:
    severity: str
    category: str
    title: str
    path: str
    line: int
    evidence: str
    fix: str


PATTERNS = [
    (
        "P1",
        "Accessibility",
        "Non-semantic clickable element",
        re.compile(r"<(div|span)[^>\n]+onClick\s*=", re.I),
        "Use a real button for actions or a real anchor for navigation, then style it.",
    ),
    (
        "P1",
        "Keyboard",
        "Positive tabindex changes natural focus order",
        re.compile(r"tabIndex\s*=\s*[{\"']?\s*[1-9]", re.I),
        "Use DOM order and tabindex 0 or -1 only when focus management requires it.",
    ),
    (
        "P1",
        "Accessibility",
        "Focus outline removed",
        re.compile(r"\boutline\s*:\s*none\b|\boutline-none\b", re.I),
        "Replace removed outlines with visible focus styles that pass contrast.",
    ),
    (
        "P1",
        "Images",
        "Image likely missing alt text",
        re.compile(r"<(?:img|Image)\b(?![^>\n]*\balt\s*=)", re.I),
        "Add useful alt text for meaningful images or alt=\"\" for decorative images.",
    ),
    (
        "P1",
        "Forms",
        "Input likely missing autocomplete",
        re.compile(r"<input\b(?![^>\n]*type\s*=\s*[\"']?(?:button|submit|reset|hidden))(?![^>\n]*\bautoComplete\s*=)(?![^>\n]*\bautocomplete\s*=)", re.I),
        "Add autocomplete/name/type values that work with browser autofill and password managers.",
    ),
    (
        "P2",
        "Forms",
        "Placeholder-only label risk",
        re.compile(r"<(?:input|textarea)\b[^>\n]*placeholder\s*=", re.I),
        "Verify there is a persistent visible label associated with this field.",
    ),
    (
        "P1",
        "Dialogs",
        "Dialog role without aria-modal",
        re.compile(r"role\s*=\s*[\"']dialog[\"'](?![^>\n]*aria-modal)", re.I),
        "Use native dialog or add aria-modal, focus trap, inert background, close, and focus return.",
    ),
    (
        "P2",
        "Motion",
        "Transition-all can hurt performance and predictability",
        re.compile(r"\btransition-all\b|transition\s*:\s*all\b", re.I),
        "Animate specific transform, opacity, color, or shadow properties.",
    ),
    (
        "P2",
        "Responsive",
        "100vh or h-screen can jump on mobile browsers",
        re.compile(r"\bh-screen\b|height\s*:\s*100vh\b", re.I),
        "Prefer min-height: 100dvh or framework equivalent for viewport-height sections.",
    ),
    (
        "P2",
        "Links",
        "Placeholder or empty hash link",
        re.compile(r"<a\b[^>\n]*href\s*=\s*[\"']#(?:[\"'])", re.I),
        "Use a real destination, button semantics, or remove the fake link.",
    ),
    (
        "P2",
        "Forms",
        "Button missing explicit type",
        re.compile(r"<button\b(?![^>\n]*\btype\s*=)", re.I),
        "Set type=\"button\" for non-submit actions and type=\"submit\" for form submits.",
    ),
    (
        "P2",
        "Copy",
        "Generic action label",
        re.compile(r">\s*(Click here|Learn more|Submit|OK)\s*<", re.I),
        "Use verb-object labels such as \"Save changes\" or \"View pricing plans\".",
    ),
]


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        if path.suffix.lower() not in EXTENSIONS:
            continue
        if path.stat().st_size > 1_000_000:
            continue
        yield path


def detect_stack(root: Path) -> list[str]:
    stack: list[str] = []
    package_json = root / "package.json"
    if package_json.exists():
        try:
            data = json.loads(package_json.read_text(encoding="utf-8"))
            deps = " ".join(
                list((data.get("dependencies") or {}).keys())
                + list((data.get("devDependencies") or {}).keys())
            )
            checks = [
                ("Next.js", "next"),
                ("React", "react"),
                ("Vue", "vue"),
                ("Nuxt", "nuxt"),
                ("Svelte", "svelte"),
                ("SvelteKit", "@sveltejs/kit"),
                ("Angular", "@angular/core"),
                ("Remix", "@remix-run"),
                ("Astro", "astro"),
                ("Solid", "solid-js"),
                ("Tailwind", "tailwindcss"),
                ("Playwright", "@playwright/test"),
                ("axe", "axe-core"),
            ]
            for label, token in checks:
                if token in deps:
                    stack.append(label)
        except Exception:
            stack.append("package.json present, unreadable")
    for marker, label in [
        ("app", "App Router or app directory"),
        ("pages", "Pages directory"),
        ("src", "src directory"),
    ]:
        if (root / marker).exists():
            stack.append(label)
    return sorted(set(stack)) or ["Unknown web stack"]


def scan(root: Path) -> tuple[list[str], list[Finding], int]:
    findings: list[Finding] = []
    files = list(iter_files(root))
    for file_path in files:
        rel = file_path.relative_to(root).as_posix()
        try:
            lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception:
            continue
        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            for severity, category, title, pattern, fix in PATTERNS:
                if pattern.search(stripped):
                    findings.append(
                        Finding(
                            severity=severity,
                            category=category,
                            title=title,
                            path=rel,
                            line=idx,
                            evidence=stripped[:180],
                            fix=fix,
                        )
                    )
    return detect_stack(root), findings, len(files)


def render_markdown(root: Path, stack: list[str], findings: list[Finding], file_count: int) -> str:
    counts = {key: sum(1 for item in findings if item.severity == key) for key in ("P0", "P1", "P2", "P3")}
    out = [
        "# Web UX Static Scan",
        "",
        f"Root: `{root}`",
        f"Files scanned: `{file_count}`",
        f"Detected stack: {', '.join(stack)}",
        f"Findings: P0={counts['P0']} P1={counts['P1']} P2={counts['P2']} P3={counts['P3']}",
        "",
        "> Static scan output is a triage signal. Confirm every finding in the UI or code before changing behavior.",
        "",
    ]
    if not findings:
        out.append("No matching static UX signals found.")
        return "\n".join(out)

    out.extend(["| Severity | Category | Location | Signal | Evidence | Fix |", "| --- | --- | --- | --- | --- | --- |"])
    for item in findings[:120]:
        evidence = item.evidence.replace("|", "\\|")
        out.append(
            f"| {item.severity} | {item.category} | `{item.path}:{item.line}` | {item.title} | `{evidence}` | {item.fix} |"
        )
    if len(findings) > 120:
        out.append(f"\nTruncated to 120 findings out of {len(findings)}. Narrow the scan path for more detail.")
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan a web app for static UX review signals.")
    parser.add_argument("root", nargs="?", default=".", help="Project root or subdirectory to scan")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        raise SystemExit(f"Path does not exist: {root}")
    stack, findings, file_count = scan(root)
    print(render_markdown(root, stack, findings, file_count))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
