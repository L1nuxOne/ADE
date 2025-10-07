import { createJsonlParser, JsonlParseError } from "@ade/engine";
import type { ExecEvent } from "@ade/engine";

export { createJsonlParser, JsonlParseError };
export type { ExecEvent };

export type ExecEventHandler = (event: ExecEvent) => void;

export function createExecEventParser(onEvent: ExecEventHandler) {
  return createJsonlParser<ExecEvent>(onEvent);
}
