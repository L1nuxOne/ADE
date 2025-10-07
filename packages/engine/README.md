# @ade/engine

The `@ade/engine` package defines the ADE engine abstraction used by IDE plugins and tools. It exposes a minimal, typed surface that supports streaming execution, capability probing, and optional cloud task interactions.

## Usage

```ts
import { createEngineFromEnv, ExecInput } from "@ade/engine";

const engine = createEngineFromEnv();
const input: ExecInput = { prompt: "Summarize README" };

for await (const event of engine.exec(input)) {
  console.log(event);
}
```

Set `ADE_ENGINE=code|codex|stub` to choose an implementation. The stub engine is safe for local development and emits a short heartbeat stream.

## API

See [`src/Engine.ts`](./src/Engine.ts) for the full type definitions.
