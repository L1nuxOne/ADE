# @ade/codex-engine

Adapter for the upstream `codex` CLI that implements the `@ade/engine` surface.

## Capability probing

`capabilities()` shells to `codex --help` to infer Chrome/CDP (`--chrome`, `--browser`) and MCP support. Cloud capability is true only when the `ade-cloud` helper executes successfully; missing helpers yield `hasCloud = false` with a friendly message on demand.

## Cloud commands

`cloud.list/show/diff/apply` delegate to the `ade-cloud` CLI. Install `@ade/cloud-shim` (or provide a compatible binary) so the adapter can orchestrate ADE Cloud tasks. Override the helper with `ADE_CLOUD_BIN` if necessary.

## Configuration

* `CODEX_ENGINE_BIN` – override the `codex` binary.
* `ADE_CLOUD_BIN` – override the cloud helper path.
* `ADE_ENGINE=codex` – select this adapter via `createEngineFromEnv()`.
