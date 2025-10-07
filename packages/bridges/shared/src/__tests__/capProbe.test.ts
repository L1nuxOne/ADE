import { describe, expect, test } from "vitest";

import * as capProbe from "../capProbe";
import { AdeCloudMissingError, isAdeCloudMissingError } from "../cloudClient";

describe("detectCapabilitiesFromHelp", () => {
  test("detects CDP and MCP hints", () => {
    const { hasCDP, hasMCP } = capProbe.detectCapabilitiesFromHelp(
      "Supports Chrome CDP and MCP tools",
    );
    expect(hasCDP).toBe(true);
    expect(hasMCP).toBe(true);
  });

  test("returns false flags when hints missing", () => {
    const { hasCDP, hasMCP } = capProbe.detectCapabilitiesFromHelp("plain output");
    expect(hasCDP).toBe(false);
    expect(hasMCP).toBe(false);
  });
});

describe("probeEngineCapabilities", () => {
  test("falls back when ade-cloud is missing", async () => {
    const result = await capProbe.probeEngineCapabilities({
      bin: process.execPath,
      helpArgs: ["-e", "process.stdout.write('browser tools')"],
      detectCloud: async () => {
        throw new AdeCloudMissingError();
      },
    });
    expect(result).toEqual({ hasCDP: true, hasMCP: false, hasCloud: false });
  });
});

describe("isAdeCloudMissingError", () => {
  test("identifies AdeCloudMissingError", () => {
    expect(isAdeCloudMissingError(new AdeCloudMissingError())).toBe(true);
    expect(isAdeCloudMissingError(new Error("nope"))).toBe(false);
  });
});
