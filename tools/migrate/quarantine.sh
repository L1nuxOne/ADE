#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

mkdir -p legacy/ade-v0

keep=(
  "apps"
  "packages"
  "docs"
  ".github"
  "pnpm-workspace.yaml"
  "package.json"
  "LICENSE"
  "README.md"
  ".editorconfig"
  ".gitattributes"
  ".gitignore"
  "legacy"
  "tools"
  ".git"
)

should_keep() {
  local target="$1"
  for item in "${keep[@]}"; do
    if [[ "$item" == "$target" ]]; then
      return 0
    fi
  done
  return 1
}

while IFS= read -r entry; do
  [[ -z "$entry" ]] && continue
  [[ "$entry" == "." || "$entry" == ".." ]] && continue
  entry="${entry#./}"

  if should_keep "$entry"; then
    continue
  fi

  if [[ "$entry" == *.tmp || "$entry" == node_modules ]]; then
    continue
  fi

  if [[ "$entry" == .eslintrc.* ]]; then
    continue
  fi

  if [[ "$entry" == legacy* ]]; then
    continue
  fi

  if [[ ! -e "$entry" ]]; then
    continue
  fi

  dest="legacy/ade-v0/$entry"
  if [[ -e "$dest" ]]; then
    continue
  fi

  echo "Quarantining $entry -> $dest" >&2
  git mv "$entry" "$dest"
done < <(find . -maxdepth 1 -mindepth 1 -printf '%P\n')
