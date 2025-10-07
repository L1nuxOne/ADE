import { spawn } from "node:child_process";

import {
  ApplyOpts,
  ApplyResult,
  Engine,
  EngineCaps,
  ExecEvent,
  ExecInput,
  TaskDetail,
  TaskInfo,
  createJsonlParser,
} from "@ade/engine";

import {
  AdeCloudMissingError,
  applyTask,
  diffTask,
  hasAdeCloud,
  listTasks,
  showTask,
} from "./cloud";

const CODEX_ENGINE_BIN = process.env.CODEX_ENGINE_BIN ?? "codex";

export class CodexEngine implements Engine {
  async *exec(input: ExecInput): AsyncIterable<ExecEvent> {
    const args = ["exec", "--jsonl", ...(input.args ?? [])];
    const child = spawn(CODEX_ENGINE_BIN, args, {
      cwd: input.cwd,
      env: { ...process.env, ...input.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stderr: string[] = [];
    child.stderr?.on("data", (chunk) => stderr.push(chunk.toString()));

    child.stdin?.write(input.prompt);
    child.stdin?.end();

    const exitPromise = new Promise<number>((resolve, reject) => {
      child.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          reject(
            new Error(
              "The `codex` CLI is not installed. Install it or set ADE_ENGINE=stub.",
            ),
          );
          return;
        }
        reject(error);
      });
      child.once("close", (code) => resolve(code ?? 0));
    });

    const queue: ExecEvent[] = [];
    const parser = createJsonlParser<ExecEvent>((event) => queue.push(event));

    const stdout = child.stdout;
    if (!stdout) {
      child.kill();
      throw new Error("codex exec did not provide stdout stream");
    }

    for await (const chunk of stdout) {
      try {
        parser(chunk);
      } catch (error) {
        child.kill();
        throw error;
      }
      while (queue.length > 0) {
        yield queue.shift()!;
      }
    }

    try {
      parser.flush();
    } catch (error) {
      child.kill();
      throw error;
    }
    while (queue.length > 0) {
      yield queue.shift()!;
    }

    const exitCode = await exitPromise;
    if (exitCode !== 0) {
      throw new Error(`codex exec exited with code ${exitCode}: ${stderr.join("")}`);
    }
  }

  async capabilities(): Promise<EngineCaps> {
    const helpOutput = await probeCommand(["--help"]);
    const hasCDP = /cdp|chrome|browser/i.test(helpOutput);
    const hasMCP = /mcp/i.test(helpOutput);
    let hasCloudSupport = false;
    try {
      hasCloudSupport = await hasAdeCloud();
    } catch (error) {
      if (error instanceof AdeCloudMissingError) {
        hasCloudSupport = false;
      } else {
        throw error;
      }
    }

    return {
      hasCDP,
      hasMCP,
      hasCloud: hasCloudSupport,
    };
  }

  readonly cloud = {
    list: (): Promise<TaskInfo[]> => listTasks(),
    show: (id: string): Promise<TaskDetail> => showTask(id),
    diff: (id: string): Promise<string> => diffTask(id),
    apply: (id: string, opts?: ApplyOpts): Promise<ApplyResult> => applyTask(id, opts),
  };
}

export function createEngine(): Engine {
  return new CodexEngine();
}

async function probeCommand(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(CODEX_ENGINE_BIN, args, {
      stdio: ["ignore", "pipe", "ignore"],
    });

    const stdout: string[] = [];

    child.stdout?.on("data", (chunk) => stdout.push(chunk.toString()));
    child.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        resolve("");
        return;
      }
      resolve("");
    });
    child.once("close", () => {
      resolve(stdout.join(""));
    });
  });
}
