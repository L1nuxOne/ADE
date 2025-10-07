import { spawn } from "node:child_process";

import type { ApplyOpts, ApplyResult, TaskDetail, TaskInfo } from "@ade/engine";

const ADE_CLOUD_BIN = process.env.ADE_CLOUD_BIN ?? "ade-cloud";

export class AdeCloudMissingError extends Error {
  constructor() {
    super(
      "The `ade-cloud` CLI is not installed or not found in PATH. Install @ade/cloud-shim or set ADE_ENGINE=stub.",
    );
    this.name = "AdeCloudMissingError";
  }
}

export interface AdeCloudClient {
  list(): Promise<TaskInfo[]>;
  show(id: string): Promise<TaskDetail>;
  diff(id: string): Promise<string>;
  apply(id: string, opts?: ApplyOpts): Promise<ApplyResult>;
  hasCli(): Promise<boolean>;
}

export function createAdeCloudClient(bin: string = ADE_CLOUD_BIN): AdeCloudClient {
  return {
    list: () => runAdeCloudJson<TaskInfo[]>(bin, ["list", "--json"]),
    show: (id: string) => runAdeCloudJson<TaskDetail>(bin, ["show", id, "--json"]),
    diff: (id: string) => runAdeCloudText(bin, ["diff", id]),
    apply: (id: string, opts: ApplyOpts = {}) => {
      const args = ["apply", id];
      if (opts.branch) {
        args.push("--branch", opts.branch);
      }
      if (opts.threeWay) {
        args.push("--three-way");
      }
      return runAdeCloudJson<ApplyResult>(bin, args);
    },
    hasCli: async () => {
      try {
        await runAdeCloudJson<TaskInfo[]>(bin, ["list", "--json"]);
        return true;
      } catch (error) {
        if (isAdeCloudMissingError(error)) {
          return false;
        }
        throw error;
      }
    },
  };
}

export function isAdeCloudMissingError(error: unknown): error is AdeCloudMissingError {
  return error instanceof AdeCloudMissingError;
}

async function runAdeCloudText(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout?.on("data", (chunk) => stdout.push(chunk.toString()));
    child.stderr?.on("data", (chunk) => stderr.push(chunk.toString()));

    child.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(new AdeCloudMissingError());
        return;
      }
      reject(error);
    });

    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ade-cloud ${args.join(" ")} failed: ${stderr.join("")}`));
        return;
      }
      resolve(stdout.join("").trim());
    });
  });
}

async function runAdeCloudJson<T>(bin: string, args: string[]): Promise<T> {
  const output = await runAdeCloudText(bin, args);
  try {
    return JSON.parse(output) as T;
  } catch (error) {
    throw new Error(
      `ade-cloud returned invalid JSON. Output: ${output}. ${(error as Error).message}`,
    );
  }
}
