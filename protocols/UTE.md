# UTE (Universal Task Envelope) v0

A single JSON envelope that can be posted to local bridges or cloud agents to execute a task.

```json
{
  "id": "pp-001-a",
  "repo": "owner/name",
  "branch": "lab/pp-001-a",
  "targets": ["gemini.local", "codex.cloud"],
  "goals": ["Implement approach A under experiments/pathprobe/pp-001-a/; add tests; emit probe_report.json; open PR"],
  "policy": {
    "commit_style": "conventional",
    "shell_windows": "C:\\\Program Files\\Git\\bin\\bash.exe -lc"
  },
  "artifacts": {
    "status_file": ".agents/status/pp-001-a.json"
  }
}
```

Usage: include a UTE in comments/chats to drive local or cloud agents via our bridge or GH command bus.

