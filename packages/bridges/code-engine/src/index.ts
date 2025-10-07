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

const CODE_ENGINE_BIN = process.env.CODE_ENGINE_BIN ?? "code";

export class CodeEngine implements Engine {
  private readonly cloudClient = createAdeCloudClient();

  async *exec(input: ExecInput): AsyncIterable<ExecEvent> {
    for await (const event of spawnJsonlProcess({
      bin: CODE_ENGINE_BIN,
      baseArgs: ["exec", "--jsonl"],
      input,
      missingCliMessage: "The `code` CLI is not installed. Install it or set ADE_ENGINE=stub.",
      commandLabel: "code exec",
    })) {
      yield event;
    }
  }

  async capabilities(): Promise<EngineCaps> {
    return probeEngineCapabilities({
      bin: CODE_ENGINE_BIN,
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
  return new CodeEngine();
}
