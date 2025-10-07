import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  ApplyOpts,
  ApplyResult,
  TaskDetail,
  TaskInfo,
} from "@ade/engine";

export interface CloudClient {
  list(): Promise<TaskInfo[]>;
  show(id: string): Promise<TaskDetail>;
  diff(id: string): Promise<string>;
  apply(id: string, opts?: ApplyOpts): Promise<ApplyResult>;
}

export interface CloudClientOptions {
  endpoint?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

const fixturesDir = resolve(__dirname, "../fixtures");

async function readJsonFixture<T>(name: string): Promise<T> {
  const data = await readFile(resolve(fixturesDir, name), "utf8");
  return JSON.parse(data) as T;
}

function createFixtureClient(): CloudClient {
  return {
    async list() {
      return readJsonFixture<TaskInfo[]>("tasks.json");
    },
    async show(id: string) {
      return readJsonFixture<TaskDetail>(`${id}.json`);
    },
    async diff(id: string) {
      const detail = await readJsonFixture<TaskDetail>(`${id}.json`);
      return detail.diff ?? "";
    },
    async apply(id: string, opts?: ApplyOpts) {
      return {
        branch: opts?.branch ?? `fixture/${id}`,
        applied: true,
        message: "Fixture apply completed.",
      };
    },
  };
}

export function cloudClient(options: CloudClientOptions = {}): CloudClient {
  const endpoint = options.endpoint ?? process.env.ADE_CLOUD_ENDPOINT;
  const apiKey = options.apiKey ?? process.env.ADE_CLOUD_API_KEY;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!endpoint || !apiKey) {
    return createFixtureClient();
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  } satisfies Record<string, string>;

  return {
    async list() {
      const response = await fetchImpl(`${endpoint}/tasks`, {
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to list tasks: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as TaskInfo[];
    },
    async show(id: string) {
      const response = await fetchImpl(`${endpoint}/tasks/${id}`, {
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to show task ${id}: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as TaskDetail;
    },
    async diff(id: string) {
      const response = await fetchImpl(`${endpoint}/tasks/${id}/diff`, {
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to diff task ${id}: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    },
    async apply(id: string, opts?: ApplyOpts) {
      const response = await fetchImpl(`${endpoint}/tasks/${id}/apply`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          branch: opts?.branch,
          threeWay: opts?.threeWay ?? false,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to apply task ${id}: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as ApplyResult;
    },
  };
}
