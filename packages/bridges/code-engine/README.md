# @ade/code-engine

Adapter that shells out to the `code` CLI (the just-every fork) and exposes it through the `@ade/engine` interface.

## Capabilities detection

`capabilities()` invokes `code --help` to check for Chrome/CDP (`--chrome`/`--browser`) and MCP support. Cloud availability is derived from the `ade-cloud` sidecar – if the CLI cannot be executed the adapter reports `hasCloud = false`.

## Cloud integration

The adapter executes the `ade-cloud` CLI for `list|show|diff|apply`. Ensure `@ade/cloud-shim` is installed or provide your own compatible binary on `PATH`. Set `ADE_CLOUD_BIN` if the binary lives elsewhere.

## Configuration

* `CODE_ENGINE_BIN` – override the `code` binary name/path.
* `ADE_CLOUD_BIN` – override the `ade-cloud` helper path.
* `ADE_ENGINE=code` – select this adapter through `createEngineFromEnv()`.
