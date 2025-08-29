# PathProbe Kit (v0.2)

**Goal:** Cloud agents (Codex/Jules) explore alternatives safely, comparably, and *in-vitro*, while production changes are implemented *in-vivo* by Codex CLI in WSL.

## Contract (`experiments/pathprobe/<id>/`)
```

impl/                 # your implementation (pure Python)
tests/                # pytest tests for correctness
tests/fixtures/       # optional mock data files (json/csv/ndjson/parquet)
requirements.txt      # optional deps (scoped in a per-probe venv)
probe\_bench.py        # optional micro-bench (prints one-line summary)
probe\_report.json     # REQUIRED scorecard (the harness augments)

```

**Rules**
- **No DB / No network.** Use fixtures for realistic data. Keep interfaces simple and explicit.

**Scorecard fields auto-added** by the harness:
- `tests_pass` (from pytest)
- `lint_errors` (ruff)
- `cyclomatic_complexity` (radon grade + average)
- `perf` (optional bench)
```
