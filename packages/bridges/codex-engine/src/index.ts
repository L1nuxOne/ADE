import type {
  ApplyOpts,
  ApplyResult,
  Engine,
  EngineCaps,
  ExecEvent,
  ExecInput,
  TaskDetail,
  TaskInfo,
} from "@ade/engine";

import {
  createAdeCloudClient,
  probeEngineCapabilities,
  spawnJsonlProcess,
} from "@ade/bridge-shared";

const CODEX_ENGINE_BIN = process.env.CODEX_ENGINE_BIN ?? "codex";

export class CodexEngine implements Engine {
  private readonly cloudClient = createAdeCloudClient();

  async *exec(input: ExecInput): AsyncIterable<ExecEvent> {
    for await (const event of spawnJsonlProcess({
      bin: CODEX_ENGINE_BIN,
      baseArgs: ["exec", "--jsonl"],
      input,
      missingCliMessage: "The `codex` CLI is not installed. Install it or set ADE_ENGINE=stub.",
      commandLabel: "codex exec",
    })) {
      yield event;
    }
  }

  async capabilities(): Promise<EngineCaps> {
    return probeEngineCapabilities({
      bin: CODEX_ENGINE_BIN,
      detectCloud: () => this.cloudClient.hasCli(),
    });
  }

  readonly cloud = {
    list: (): Promise<TaskInfo[]> => this.cloudClient.list(),
    show: (id: string): Promise<TaskDetail> => this.cloudClient.show(id),
    diff: (id: string): Promise<string> => this.cloudClient.diff(id),
    apply: (id: string, opts?: ApplyOpts): Promise<ApplyResult> =>
      this.cloudClient.apply(id, opts),
  };
}

export function createEngine(): Engine {
  return new CodexEngine();
}
