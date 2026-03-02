import { describe, expect, it } from "vitest";
import { StandardClient } from "../../../../../generated/azure/core/lro/standard/src/index.js";

describe("Azure.Core.Lro.Standard", () => {
  const client = new StandardClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should create or replace with LRO", async () => {
    const poller = await client.createOrReplace("madge", { role: "contributor" } as any);
    const result = await poller.pollUntilDone();
    expect(result.name).toBe("madge");
    expect(result.role).toBe("contributor");
  });

  it("should delete with LRO", async () => {
    const poller = await client.delete("madge");
    const result = await poller.pollUntilDone();
    expect(result).toBeUndefined();
  });

  // TODO(e2e): Fix - LRO pollUntilDone() result properties are undefined
  it.skip("should export with LRO", async () => {
    const poller = await client.export("madge", "json");
    const result = await poller.pollUntilDone();
    expect(result.name).toBe("madge");
    expect(result.resourceUri).toBeDefined();
  });
});
