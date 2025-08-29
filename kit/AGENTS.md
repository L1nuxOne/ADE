# Agent House Rules (template)

## Shell
- Windows Git Bash: "C:\Program Files\Git\bin\bash.exe" -lc "<cmd>"

## Branch & PR
- Branch: `feat/<agent>/<NN>-<topic>`
- Rebase tracks on `origin/main`; push with `--force-with-lease`

## CI
- GitHub Actions: never duplicate `if:`; combine with `&&`

## Tests
- Fast: `pytest -q -m "not slow"`
- Full: `pytest -q`

## Proof
- After significant changes: run `scripts/prove.sh` and attach the receipt path

## Commits
- Conventional commits; ≤ 72 chars subject
