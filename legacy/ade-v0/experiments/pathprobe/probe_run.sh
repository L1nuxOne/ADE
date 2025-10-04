#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"; cd "$ROOT"

for D in */; do
  [[ "$D" == "template/" ]] && continue
  [[ ! -d "$D" ]] && continue
  cd "$D"

  # Per-probe venv
  python -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  python -m pip -q install -U pip >/dev/null
  pip -q install pytest pytest-json-report ruff radon >/dev/null
  [[ -f requirements.txt ]] && pip -q install -r requirements.txt >/dev/null

  mkdir -p .probe

  # Ensure local package imports (e.g., `import impl`) resolve
  export PYTHONPATH=.:${PYTHONPATH:-}

  # Tests
  pytest -q --maxfail=1 --disable-warnings \
    --json-report --json-report-file=.probe/pytest.json || true

  # tests_pass
  PASS=$(python - <<'PY'
import json
try:
  j=json.load(open(".probe/pytest.json"))
  s=j.get("summary",{})
  print(int(s.get("total",0)>0 and s.get("failed",0)==0))
except: print(0)
PY
)

  # Lint (ruff)
  LINT_JSON=".probe/ruff.json"
  ruff check --output-format=json impl tests > "$LINT_JSON" 2>/dev/null || true
  LINT_ERRORS=$(python - <<'PY'
import json
try: print(len(json.load(open(".probe/ruff.json"))))
except: print(0)
PY
)

  # Complexity (radon)
  CC_SUMMARY=$(python - <<'PY'
import subprocess,json
out=subprocess.getoutput("radon cc -s -a impl 2>/dev/null")
grade,avg="na","na"
for line in out.splitlines():
  if "Average complexity:" in line:
    frag=line.split(":")[-1].strip()
    try:
      grade=frag.split()[0]; avg=frag.split("(")[1].split(")")[0]
    except: pass
print(json.dumps({"grade":grade,"avg":avg}))
PY
)

  # Optional micro-bench
  PERF="na"; [[ -f probe_bench.py ]] && PERF=$(python probe_bench.py || echo "na")

  # Merge into probe_report.json (create if missing)
  PASS="$PASS" PERF="$PERF" LINT_ERRORS="$LINT_ERRORS" CC_SUMMARY="$CC_SUMMARY" \
  python - <<'PY'
import os,json,pathlib
rid=pathlib.Path.cwd().name
report={}
if os.path.exists("probe_report.json"):
  try: report=json.load(open("probe_report.json"))
  except: report={}
report.setdefault("id",rid)
report["tests_pass"]=int(os.environ["PASS"])
report["perf"]=os.environ["PERF"]
report["lint_errors"]=int(os.environ["LINT_ERRORS"])
cc=json.loads(os.environ["CC_SUMMARY"])
report["cyclomatic_complexity"]=f'{cc.get("grade","na")} (avg {cc.get("avg","na")})'
json.dump(report,open("probe_report.json","w"),indent=2)
PY

  deactivate || true
  cd ..
done
