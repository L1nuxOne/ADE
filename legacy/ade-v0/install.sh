#!/usr/bin/env bash
set -euo pipefail

KIT_SRC="${KIT_SRC:-https://raw.githubusercontent.com/l1nuxone/agentic-kit/main/kit}"
ROOT="$(pwd)"

say(){ printf "\033[1;32m==>\033[0m %s\n" "$*"; }
fetch(){ curl -fsSL "$1"; }
ensure_dir(){ mkdir -p "$ROOT/$1"; }

say "Installing l1nuxone/agentic-kit into $(basename "$ROOT")"

# 1) AGENT rules & scripts
ensure_dir "."
fetch "$KIT_SRC/AGENTS.md" > "$ROOT/AGENTS.md"
fetch "$KIT_SRC/.aiexclude" > "$ROOT/.aiexclude"

ensure_dir "scripts"
fetch "$KIT_SRC/scripts/prove.sh" > "$ROOT/scripts/prove.sh"
chmod +x "$ROOT/scripts/prove.sh"

# 2) Baseline-First (PR template + gate)
ensure_dir ".github"; ensure_dir ".github/workflows"
fetch "$KIT_SRC/.github/pull_request_template.md" > "$ROOT/.github/pull_request_template.md"
fetch "$KIT_SRC/.github/workflows/baseline-gate.yml" > "$ROOT/.github/workflows/baseline-gate.yml"

# 3) PathProbe v0.2
ensure_dir "experiments/pathprobe"
fetch "$KIT_SRC/experiments/pathprobe/README.md" > "$ROOT/experiments/pathprobe/README.md"
fetch "$KIT_SRC/experiments/pathprobe/probe_run.sh" > "$ROOT/experiments/pathprobe/probe_run.sh"
chmod +x "$ROOT/experiments/pathprobe/probe_run.sh"

# 3a) Probe template
ensure_dir "experiments/pathprobe/template/impl"
ensure_dir "experiments/pathprobe/template/tests/fixtures"
fetch "$KIT_SRC/experiments/pathprobe/template/impl/__init__.py" > "$ROOT/experiments/pathprobe/template/impl/__init__.py"
fetch "$KIT_SRC/experiments/pathprobe/template/tests/test_sample.py" > "$ROOT/experiments/pathprobe/template/tests/test_sample.py"
fetch "$KIT_SRC/experiments/pathprobe/template/tests/fixtures/sample.json" > "$ROOT/experiments/pathprobe/template/tests/fixtures/sample.json"

# 4) Project .gitignore additions (idempotent)
if ! grep -q "experiments/pathprobe/**/.venv/" "$ROOT/.gitignore" 2>/dev/null; then
  cat >> "$ROOT/.gitignore" <<'IGNORE'
experiments/pathprobe/**/.venv/
experiments/pathprobe/**/.probe/
IGNORE
fi

# 5) Drop a PathProbe CI that calls the reusable action
cat > "$ROOT/.github/workflows/probe-ci.yml" <<'YAML'
name: PathProbe CI
on:
  push: { branches: ['lab/pp-*'] }
  pull_request: { branches: ['lab/pp-*'] }
permissions: { contents: read }
jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: l1nuxone/agentic-kit/actions/probe-ci@v1
YAML

say "Done. Next:"
echo "  git add -A && git commit -m 'chore: add l1nuxone agentic-kit (v1.0)'"
echo "  git push -u origin $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
