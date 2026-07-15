# Releasing

This is a repository-only maintainer document and is intentionally excluded from the npm tarball.

1. Use a clean worktree and confirm the intended version is identical in `package.json`,
   `package-lock.json`, `.codex-plugin/plugin.json`, and `.claude-plugin/plugin.json`.
2. Confirm the root and nested skill payload copies are byte-identical.
3. Run the Skill Creator `quick_validate.py` against `skills/web-app-ux-auditor`.
4. Run `npm ci` followed by `npm run release:check` on supported Node.js versions.
5. Review `npm pack --dry-run --json --ignore-scripts` and verify only the intended payload and
   consumer documentation are included.
6. Review the diff and scan it for credentials before committing, tagging, or publishing.
7. Publish from the tagged, CI-green commit with npm provenance when the release environment
   supports it. Verify registry metadata and a fresh `npx` install afterward.

Never place npm credentials in this repository or in a committed npm configuration file.
