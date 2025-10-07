# @ade/cloud-shim

CLI and client utilities for ADE Cloud integration. When no environment configuration is provided it falls back to local fixtures so development environments remain usable.

## Environment variables

* `ADE_CLOUD_ENDPOINT` – base URL for the ADE Cloud API.
* `ADE_CLOUD_API_KEY` – bearer token used to authenticate requests.
* `ADE_CLOUD_BIN` – optional override for consumers that spawn the CLI.

## CLI

```
ade-cloud list --json
ade-cloud show <id> --json
ade-cloud diff <id>
ade-cloud apply <id> [--branch <name>] [--three-way]
```

## Fixture mode

If either `ADE_CLOUD_ENDPOINT` or `ADE_CLOUD_API_KEY` is missing, the CLI serves data from JSON fixtures under `packages/cloud-shim/fixtures`. This keeps the engine adapters functional without a network connection.
