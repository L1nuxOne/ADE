import { spawn } from "node:child_process";

import type {
  ApplyOpts,
  ApplyResult,
  TaskDetail,
  TaskInfo,
} from "@ade/engine";

const ADE_CLOUD_BIN = process.env.ADE_CLOUD_BIN ?? "ade-cloud";

class AdeCloudMissingError extends Error {
  constructor() {
    super(
      "The `ade-cloud` CLI is not installed or not found in PATH. " +
        "Install @ade/cloud-shim or set ADE_ENGINE=stub.",
    );
    this.name = "AdeCloudMissingError";
  }
}

async function runAdeCloudText(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ADE_CLOUD_BIN, args, {
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

export async function listTasks(): Promise<TaskInfo[]> {
  return runAdeCloudJson<TaskInfo[]>(["list", "--json"]);
}

export async function showTask(id: string): Promise<TaskDetail> {
  return runAdeCloudJson<TaskDetail>(["show", id, "--json"]);
}

export async function diffTask(id: string): Promise<string> {
  return runAdeCloudText(["diff", id]);
}

export async function applyTask(id: string, opts: ApplyOpts = {}): Promise<ApplyResult> {
  const args = ["apply", id];
  if (opts.branch) {
    args.push("--branch", opts.branch);
  }
  if (opts.threeWay) {
    args.push("--three-way");
  }
  return runAdeCloudJson<ApplyResult>(args);
}

export async function hasAdeCloud(): Promise<boolean> {
  try {
    await runAdeCloudJson<TaskInfo[]>(["list", "--json"]);
    return true;
  } catch (error) {
    if (error instanceof AdeCloudMissingError) {
      return false;
    }
    throw error;
  }
}

export { AdeCloudMissingError };

async function runAdeCloudJson<T>(args: string[]): Promise<T> {
  const output = await runAdeCloudText(args);
  try {
    return JSON.parse(output) as T;
  } catch (error) {
    throw new Error(
      `ade-cloud returned invalid JSON. Output: ${output}. ${(error as Error).message}`,
    );
  }
}
