# ADE BO4 Progress Tracker

This file lists the current status of BO4 tasks so every agent knows what is in flight.

| Task ID            | Title                                  | Stage        | Notes |
|--------------------|----------------------------------------|--------------|-------|
| m0-01.engine        | M0 — Engine Abstraction                | ✅ done       | Meta report: `.codex-cloud/m0-01-engine/meta/meta_report.json`
| m1-01.terminals     | M1-01 — Terminals (Me + Engine)        | ✅ done       | Winner merged; meta: `.codex-cloud/m1-01-terminals/meta/winner.report.json` |
| m1-02.files         | M1-02 — File Explorer                  | ⏳ pending    | Prompt ready: `.codex-cloud/m1-02-files/meta/coder_prompt.yaml` |
| m1-03.concepts      | M1-03 — Concept Explorer (bootstrap)   | ⏳ queued     | |
| m1-04.layout        | M1-04 — Settings & Layout              | ⏳ queued     | |
| m2-01.detectors     | M2-01 — L1 Detectors (6 kinds)         | ⏳ queued     | depends on m1-03 |
| m2-02.crosswalk     | M2-02 — Crosswalk & Reconciliation     | ⏳ queued     | depends on m2-01 |
| m2-03.l1-suite      | M2-03 — L1 Suite Runner                | ⏳ queued     | |
| m2-04.oracles       | M2-04 — TF-Lang Oracles                | ⏳ queued     | |
| m3-01.conceptual-diff | M3-01 — Conceptual Diff              | ⏳ queued     | |
| m3-02.github-mcp    | M3-02 — GitHub MCP (read-only)         | ⏳ queued     | |
| m3-03.workflow-runner | M3-03 — Workflow Runner (YAML)      | ⏳ queued     | |
| m3-04.cloud-bridge  | M3-04 — Cloud BO4 Bridge + Apply       | ⏳ queued     | |
| m3-05.worktrees-matrix | M3-05 — Worktrees + Test Matrix     | ⏳ queued     | |
| m4-01.guardrails    | M4-01 — Guardrails Panel               | ⏳ queued     | |
| m4-02.cdp-safety    | M4-02 — CDP Safety Defaults            | ⏳ queued     | |
| m4-03.cards-from-evidence | M4-03 — Add L2 Card from Evidence | ⏳ queued     | |
| m4-04.pr-concept-health | M4-04 — PR Concept Health Comment  | ⏳ queued     | |

Stages: `pending` (not started), `in-flight`, `meta-review`, `transplant`, `done`.

Update this table as we progress through the plan.
