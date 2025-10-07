import type { Engine } from "./Engine";
import { createStubEngine } from "./stub";

export * from "./Engine";
export * from "./jsonl";
export { createStubEngine, StubEngine } from "./stub";

export function createEngineFromEnv(): Engine {
  const engine = (process.env.ADE_ENGINE ?? "stub").toLowerCase();
  switch (engine) {
    case "code":
      return loadEngine("@ade/code-engine");
    case "codex":
      return loadEngine("@ade/codex-engine");
    case "stub":
    default:
      return createStubEngine();
  }
}

function loadEngine(packageName: string): Engine {
  try {
    const mod = require(packageName) as { createEngine: () => Engine };
    if (typeof mod.createEngine === "function") {
      return mod.createEngine();
    }
    throw new Error(`Engine package "${packageName}" does not export createEngine()`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
      throw new Error(
        `Engine package "${packageName}" is not installed. ` +
          `Install the CLI or set ADE_ENGINE=stub.`,
      );
    }
    throw error;
  }
}
