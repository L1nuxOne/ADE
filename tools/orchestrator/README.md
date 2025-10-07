# ADE Orchestrator (plan-run)

This script executes BO4 tasks from the plan lock file.

## Requirements
- `docs/plan/ade.plan.json` (machine-friendly copy of your plan)
- `codex` CLI available in PATH
- Node 20+, pnpm (for the final verify step)

## Usage
List tasks:
```
node tools/orchestrator/plan-run.mjs list
```

Run a task end-to-end (creates Cloud BO4, fetches artifacts, applies patches, runs meta-review + transplant, then verifies):
```
node tools/orchestrator/plan-run.mjs run m1-01.terminals
```

Options:
- `--dry-run` (print plan info only)
- `--best-of N` (override plan default)
- `--base BRANCH` (override base branch)
- `--reuse-task <id>` (skip create-task; reuse an existing Cloud task id)

Artifacts:
- Cloud outputs: `<plan.meta.out_root>/<taskId>/var{1..4}/{report.json,diff.patch}`
- Worktrees: `<plan.meta.worktrees_root>/<taskId>/var{1..4}`
- Meta-review & winner artifacts are written under the task out dir.

State:
- `.codex-orchestrator/state.json` tracks last successful run info per task.
