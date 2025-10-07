import {
  ApplyOpts,
  ApplyResult,
  Engine,
  EngineCaps,
  ExecEvent,
  ExecInput,
  TaskDetail,
  TaskInfo,
} from "./Engine";

const DEFAULT_CAPS: EngineCaps = {
  hasCDP: false,
  hasMCP: false,
  hasCloud: false,
};

const STUB_TASKS: TaskInfo[] = [
  {
    id: "stub-task-1",
    title: "Stub Task",
    status: "pending",
    updatedAt: new Date().toISOString(),
  },
];

const STUB_TASK_DETAIL: TaskDetail = {
  ...STUB_TASKS[0],
  description: "Stub task detail used when no cloud provider is configured.",
  conversation: [
    {
      role: "system",
      content: "Stub engine ready.",
    },
  ],
  diff: "",
};

export class StubEngine implements Engine {
  async *exec(input: ExecInput): AsyncIterable<ExecEvent> {
    const startTimestamp = new Date().toISOString();
    yield { type: "start", timestamp: startTimestamp } as ExecEvent;
    yield {
      type: "status",
      status: "running",
      detail: `Stub executing prompt: ${input.prompt}`,
    } satisfies ExecEvent;
    yield {
      type: "token",
      value: `echo:${input.prompt}`,
    } satisfies ExecEvent;
    yield {
      type: "done",
      result: { echoed: input.prompt, timestamp: startTimestamp },
    } satisfies ExecEvent;
  }

  async capabilities(): Promise<EngineCaps> {
    return DEFAULT_CAPS;
  }

  readonly cloud = {
    list: async (): Promise<TaskInfo[]> => STUB_TASKS,
    show: async (id: string): Promise<TaskDetail> => ({
      ...STUB_TASK_DETAIL,
      id,
      title: `Stub Task ${id}`,
    }),
    diff: async (id: string): Promise<string> => `--- ${id}\n+++ ${id}\n`,
    apply: async (id: string, opts?: ApplyOpts): Promise<ApplyResult> => ({
      branch: opts?.branch ?? `stub/${id}`,
      applied: true,
      message: "Stub apply succeeded.",
    }),
  };
}

export function createStubEngine(): Engine {
  return new StubEngine();
}
