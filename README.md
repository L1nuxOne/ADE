# l1nuxone / agentic-kit (v1.0)

A self-contained **Agentic Development Environment (ADE)** kit you can import into any repo and one-click boot on a fresh machine.

Included:
- **PathProbe v0.2** (cloud pathfinding with per-probe venv, fixtures, metrics)
- **Baseline-First** (PR template + baseline gate + proof receipts)
- **Reusable CI action** for probes
- **Protocols**: UTE (Universal Task Envelope), SCP (Shared Context Protocol)
- **Installer** `install.sh` to import kit into any target repo

## Quick use (import into any target repo)
```bash
curl -fsSL https://raw.githubusercontent.com/l1nuxone/agentic-kit/main/install.sh | bash
git add -A && git commit -m "chore: add l1nuxone agentic-kit (v1.0)" && git push
```

Then create branches `lab/pp-001-a`, `lab/pp-001-b` from the template under `experiments/pathprobe/template/`, push, and let CI compare `probe_report.json`. Implement the winner locally with real tests & `scripts/prove.sh`.

```
