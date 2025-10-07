# ADE Agents Guide

This page captures the personas and surfaces involved in the ADE Best-of-4 (BO4) workflow so every agent (human or automated) knows what artifacts to expect and emit.

## Instances (Execution Surfaces)

| Instance        | Description                                                                 | Typical Commands |
|-----------------|-----------------------------------------------------------------------------|------------------|
| `codex-cloud`   | Hosted Codex environment that runs the BO4 variant prompt asynchronously.   | `codex cloud create-task`, `codex cloud fetch` |
| `codex-cli`     | Local Codex CLI (headless friendly) used for meta-review and transplant.     | `codex exec --prompt …` |
| `pnpm + git`    | Local toolchain used by the orchestrator for applying diffs, running tests.  | `git worktree add`, `pnpm build`, `pnpm test` |

## Roles (Personas)

### Variant Implementer (Cloud)
- **Instance:** `codex-cloud`
- **Prompt:** `bo4.implement.variant`
- **Inputs:** `design_intent_path`, `base_branch`, `work_branch_prefix`, `out_dir`
- **Outputs:**
  - `{{out_dir}}/{{variant_label}}/report.json` (schema: `docs/bo4/schemas/variant_report.schema.json`)
  - Diff is captured automatically via `codex cloud fetch` (`diff.patch` per variant)
  - Short chat summary (≤5 bullets)
- **Constraints:** No inline diffs, respect design intent touch_scope/budgets.

### Meta Reviewer (Local)
- **Instance:** `codex-cli`
- **Prompt:** `bo4.meta.review`
- **Inputs:**
  - `variants_dir` (expects `var{1..4}/report.json` + `diff.patch`)
  - `local_worktrees_dir` (worktrees created by orchestrator)
  - `design_intent_path`
- **Outputs:**
  - `{{variants_dir}}/meta_review.md`
  - `{{variants_dir}}/meta_report.json` (schema: `docs/bo4/schemas/meta_report.schema.json`)

### Transplant Coder (Local)
- **Instance:** `codex-cli`
- **Prompt:** `bo4.transplant.coder`
- **Inputs:** `meta_report_path`, `finalize_branch`
- **Outputs:** writes alongside the meta report directory:
  - `winner.diff`
  - `winner.report.json` (schema: `docs/bo4/schemas/winner_report.schema.json`)
  - `winner.md`
- **Steps:** Check out base branch, create winner branch, apply graft plan, run tests/oracles, document results.

### Orchestrator Script (Local automation)
- **Instance:** `node tools/orchestrator/plan-run.mjs`
- **Responsibilities:**
  - Reads `docs/plan/ade.plan.json`
  - Runs `codex cloud create-task/fetch`
  - Applies patches into worktrees (`../_bo4/<run-id>/var*`)
  - Invokes meta-review and transplant prompts
  - Runs `pnpm build && pnpm test`
  - Records state in `.codex-orchestrator/state.json`

## Artifact Layout
```
.codex-cloud/
  m0-01-engine/
    var1/report.json
    var1/diff.patch
    var2/…
    meta/meta_review.md
    meta/meta_report.json
    winner/winner.diff
    winner/winner.report.json
    winner/winner.md
    raw/… (optional Codex Cloud payloads)
  m1-01-terminals/
  …
```
Naming pattern: `<milestone>-<sequence>-<tag>` (e.g. `m1-02-files`).

For each task, the plan (`docs/plan/*.yaml|json`) specifies the design intent and out directory. The orchestrator passes these values into the prompts so agents don’t need to guess paths.

## References
- Prompts: `docs/bo4/prompts/*.yaml`
- Schemas: `docs/bo4/schemas/*.json`
- Templates: `docs/bo4/templates/`
- Plan lock: `docs/plan/ade.plan.json`
