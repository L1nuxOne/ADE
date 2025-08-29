#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
mkdir -p "$ROOT/.agents/receipts" "$ROOT/.agents/logs" "$ROOT/.agents/status"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HEAD_BEFORE="$(git rev-parse --verify HEAD || echo 'NONE')"

LOG="$ROOT/.agents/logs/pytest-$STAMP.log"
EXIT=0
pytest -q | tee "$LOG" || EXIT=$?

STATUS="fail"
[[ $EXIT -eq 0 || $EXIT -eq 5 ]] && STATUS="pass"   # 5 = no tests collected

git add -A >/dev/null 2>&1 || true
DIFF_SHA="$(git diff --staged | sha256sum | awk '{print $1}')"
HEAD_AFTER="$(git rev-parse --verify HEAD || echo 'NONE')"

RECEIPT="$ROOT/.agents/receipts/receipt-$STAMP.json"
cat > "$RECEIPT" <<JSON
{"timestamp_utc":"$STAMP","status":"$STATUS","pytest_exit":$EXIT,
"log_path":".agents/logs/pytest-$STAMP.log",
"head_before":"$HEAD_BEFORE","head_after":"$HEAD_AFTER",
"staged_diff_sha256":"$DIFF_SHA"}
JSON

cp "$RECEIPT" "$ROOT/.agents/status/current.json" || true
echo "✅ $RECEIPT"

[[ "$STATUS" == "pass" ]] || { echo "❌ tests did not pass"; exit 1; }
