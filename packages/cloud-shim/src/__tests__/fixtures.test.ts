import { describe, expect, it } from "vitest";

import { cloudClient } from "../client";

describe("cloudClient fixtures", () => {
  const client = cloudClient({ endpoint: undefined, apiKey: undefined });

  it("lists fixture tasks", async () => {
    const tasks = await client.list();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: "task-123" });
  });

  it("returns fixture detail", async () => {
    const detail = await client.show("task-123");
    expect(detail.conversation).toBeInstanceOf(Array);
    expect(detail.diff).toContain("sample.txt");
  });
});
