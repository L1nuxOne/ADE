# AGENTS.md — Operator Handbook (Not for Cloud Coders)

## Roles & Boundaries
- **Architect (chat):** writes Design Intent; accepts outcomes.
- **Orchestrator (CLI):** translates intent → concrete coder prompt; runs BO4; meta-review; graft.
- **Coder (Cloud):** follows the prompt only; produces code + report.json artifact.

## Global Rules (inform CLI prompt crafting)
- No lockfile changes (list deps in report).
- Respect `touch_scope.include/avoid`.
- Minimal, composable diffs; small, focused tests.
- If blocked, implement nearest viable subset + document gap.

## Lessons (examples)
- **M1/terminals:** handle PTY resize; surface spawn errors; throttle xterm writes.
- **M2/detectors:** negative ripgrep guards; emit byte spans + reason.
(Add more here—CLI mirrors salient ones into `docs/prompt_meta/lessons.json`.)

## Outputs by Role
- **Coder (Cloud):** code + `.codex-cloud/report.json` (architecture choices, checklist status, tests, metrics).
- **CLI:** meta_review.md, meta_report.json, composite winner branch.

*(CLI consumes this doc to update `docs/prompt_meta/*.json`. Cloud coders ignore this file.)*
