import { describe, expect, it } from "vitest";

import { createJsonlParser } from "../jsonl";

interface SampleEvent {
  type: string;
  value?: string;
}

describe("createJsonlParser", () => {
  it("parses objects across chunk boundaries", () => {
    const events: SampleEvent[] = [];
    const parse = createJsonlParser<SampleEvent>((event) => events.push(event));

    parse('{"type":"token","value":"hel');
    parse('lo"}\n{"type":"token","value":"world"}\n');

    expect(events).toEqual([
      { type: "token", value: "hello" },
      { type: "token", value: "world" },
    ]);
  });

  it("flushes trailing line when stream ends without newline", () => {
    const events: SampleEvent[] = [];
    const parse = createJsonlParser<SampleEvent>((event) => events.push(event));

    parse('{"type":"status","value":"ok"}');
    parse.flush();

    expect(events).toEqual([{ type: "status", value: "ok" }]);
  });

  it("flushes trailing line split across chunk boundary", () => {
    const events: SampleEvent[] = [];
    const parse = createJsonlParser<SampleEvent>((event) => events.push(event));

    parse('{"type":"done","value"');
    parse(':"yes"}');
    parse.flush();

    expect(events).toEqual([{ type: "done", value: "yes" }]);
  });

  it("ignores blank lines", () => {
    const events: SampleEvent[] = [];
    const parse = createJsonlParser<SampleEvent>((event) => events.push(event));

    parse('\n\n{"type":"token"}\n');

    expect(events).toEqual([{ type: "token" }]);
  });
});
