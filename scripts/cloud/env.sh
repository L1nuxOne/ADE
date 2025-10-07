#!/usr/bin/env bash
set -euo pipefail
# Placeholder env loader for smoke tests. Source optional .env.cloud if present.
if [ -f "scripts/cloud/.env.cloud" ]; then
  # shellcheck disable=SC1091
  source "scripts/cloud/.env.cloud"
fi
