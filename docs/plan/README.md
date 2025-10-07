# ADE Orchestrator Plan (Source of Truth)

This file set makes the **CLI the orchestrator** for ADE:
- Cloud runs **Best-of-4** using a standard prompt (`bo4.implement.variant`).
- CLI performs **meta-review** and **transplant/graft**.
- Tasks are defined once in `docs/plan/ade.plan.yaml` and driven by the `bo4` pipeline.

## Files
- `docs/plan/ade.plan.yaml` — the plan (tasks, pipelines, defaults).
- `docs/plan/plan.schema.json` — JSON Schema for basic validation.
- `docs/design_intent/*.yaml` — task-specific Design Intent files.

## How the CLI should execute a task of kind `bo4_pipeline`
1. Read `meta` and `pipelines.bo4` to get command templates.
2. Fill templates with task fields (`design_intent`, `out_dir`, `finalize_branch`) and meta fields (prompts, best_of, etc.).
3. Execute steps in order:
   - cloud.create_task → cloud.fetch_artifacts → local.apply_patches → local.meta_review → local.transplant → local.verify
4. Update a state file `.codex-orchestrator/state.json` (CLI-owned) with the task status.

## Conventions
- Artifacts land under `.codex-cloud/<task-id-with-dashes>/…` (e.g. `m1-01-terminals/var1/report.json`).
- Local worktrees land under `../_bo4/<task>/var{1..4}`.
- Winner branch name lives in each task's `finalize_branch`.

Update `status` fields in `docs/plan/ade.plan.yaml` to reflect reality (or let the CLI do it automatically).
