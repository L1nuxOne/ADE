#!/usr/bin/env tsx
import process from "node:process";

import { createEngineFromEnv, type ExecEvent } from "@ade/engine";

async function main() {
  const engine = createEngineFromEnv();
  const events = engine.exec({ prompt: "hello" });
  let lastEvent: ExecEvent | undefined;

  try {
    for await (const event of events) {
      process.stdout.write(`${JSON.stringify(event)}\n`);
      lastEvent = event;
    }
    if (lastEvent) {
      const maybeId = (lastEvent as { id?: string }).id;
      const label = maybeId ? `${lastEvent.type}:${maybeId}` : lastEvent.type;
      process.stderr.write(`Final event: ${label}\n`);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

void main();
