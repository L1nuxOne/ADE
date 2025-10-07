import { spawn } from "node:child_process";

import type { ExecEvent, ExecInput } from "@ade/engine";

import { createExecEventParser } from "./jsonl";

export interface SpawnJsonlOptions {
  bin: string;
  baseArgs: string[];
  input: ExecInput;
  missingCliMessage: string;
  commandLabel?: string;
}

export async function* spawnJsonlProcess({
  bin,
  baseArgs,
  input,
  missingCliMessage,
  commandLabel,
}: SpawnJsonlOptions): AsyncIterable<ExecEvent> {
  const args = [...baseArgs, ...(input.args ?? [])];
  const child = spawn(bin, args, {
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
        reject(new Error(missingCliMessage));
        return;
      }
      reject(error);
    });
    child.once("close", (code) => resolve(code ?? 0));
  });

  const queue: ExecEvent[] = [];
  const parser = createExecEventParser((event) => queue.push(event));

  const stdout = child.stdout;
  if (!stdout) {
    child.kill();
    try {
      await exitPromise;
    } catch (error) {
      throw error;
    }
    throw new Error(`${commandLabel ?? bin} did not provide stdout stream`);
  }

  try {
    for await (const chunk of stdout) {
      parser(chunk);
      while (queue.length > 0) {
        yield queue.shift()!;
      }
    }

    parser.flush();
    while (queue.length > 0) {
      yield queue.shift()!;
    }
  } catch (error) {
    child.kill();
    await exitPromise.catch(() => undefined);
    throw error;
  }

  const exitCode = await exitPromise;
  if (exitCode !== 0) {
    throw new Error(
      `${commandLabel ?? bin} exited with code ${exitCode}: ${stderr.join("")}`,
    );
  }
}
