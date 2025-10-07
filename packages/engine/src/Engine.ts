/** Options for executing a prompt with an engine. */
export interface ExecInput {
  /** Prompt or instruction payload. */
  prompt: string;
  /** Additional CLI arguments to forward to the engine binary. */
  args?: string[];
  /** Working directory for spawned processes. */
  cwd?: string;
  /** Environment variables to add/override when spawning processes. */
  env?: Record<string, string | undefined>;
  /** Optional metadata blob forwarded to the engine implementation. */
  metadata?: Record<string, unknown>;
}

/** Events emitted by an engine during execution. */
export type ExecEvent =
  | ExecStartEvent
  | ExecTokenEvent
  | ExecToolEvent
  | ExecArtifactEvent
  | ExecStatusEvent
  | ExecErrorEvent
  | ExecDoneEvent;

export interface ExecStartEvent {
  type: "start";
  /** Timestamp when execution began. */
  timestamp?: string;
  /** Process id if the engine spawns a child process. */
  pid?: number;
  /** Arbitrary metadata describing the run. */
  metadata?: Record<string, unknown>;
}

export interface ExecTokenEvent {
  type: "token";
  value: string;
  /** Optional index or ordering hint. */
  index?: number;
}

export interface ExecToolEvent {
  type: "tool";
  toolName: string;
  payload: unknown;
}

export interface ExecArtifactEvent {
  type: "artifact";
  artifactType: string;
  description?: string;
  uri?: string;
  data?: unknown;
}

export interface ExecStatusEvent {
  type: "status";
  status: string;
  detail?: string;
}

export interface ExecErrorEvent {
  type: "error";
  message: string;
  stack?: string;
  fatal?: boolean;
}

export interface ExecDoneEvent {
  type: "done";
  /**
   * Optional summarized result for the run. Engines may emit structured
   * payloads here to avoid clients needing to buffer token events.
   */
  result?: unknown;
}

export interface EngineCaps {
  hasCDP: boolean;
  hasMCP: boolean;
  hasCloud: boolean;
}

export interface TaskInfo {
  id: string;
  title: string;
  status?: string;
  updatedAt?: string;
}

export interface ConversationTurn {
  role: "system" | "user" | "assistant" | string;
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskDetail extends TaskInfo {
  description?: string;
  conversation: ConversationTurn[];
  metadata?: Record<string, unknown>;
  diff?: string;
}

export interface ApplyOpts {
  branch?: string;
  threeWay?: boolean;
}

export interface ApplyResult {
  branch: string;
  applied: boolean;
  message?: string;
}

export interface Engine {
  exec(input: ExecInput): AsyncIterable<ExecEvent>;
  capabilities(): Promise<EngineCaps>;
  cloud: {
    list(): Promise<TaskInfo[]>;
    show(id: string): Promise<TaskDetail>;
    diff(id: string): Promise<string>;
    apply(id: string, opts?: ApplyOpts): Promise<ApplyResult>;
  };
}
