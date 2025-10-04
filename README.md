# ADE — Agentic Dev Environment

`L1nuxOne/ade` is the bootstrap monorepo for the Agentic Dev Environment, providing a pnpm workspace, placeholder package scaffolding, starter docs, and green-by-default CI so future engines can land smoothly.

## Local development
- `pnpm install` – installs workspace dependencies once packages arrive.
- `pnpm build` – runs workspace builds (prints `no-build` until packages add scripts).
- `pnpm test` – runs workspace tests (prints `no-tests` until suites exist).

## Layout
- `apps/ade-tauri` – TODO: wire Tauri shell when the desktop app lands.
- `packages/*` – placeholders for engines, bridges, detectors, workflows, and cloud shim code.
- `docs/` – seed for ade.l1nux.one documentation (CNAME + landing page).

## TODOs
- TODO: add workspace packages and link real build/test scripts.
- TODO: publish detailed docs once components are implemented.
