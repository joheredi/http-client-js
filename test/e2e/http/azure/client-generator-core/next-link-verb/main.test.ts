import { describe, expect, it } from "vitest";
import { NextLinkVerbClient } from "../../../../generated/azure/client-generator-core/next-link-verb/src/index.js";

describe("Azure.ClientGenerator.Core.NextLinkVerb", () => {
  const client = new NextLinkVerbClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should list items with pagination", async () => {
    const items: Array<{ id: string }> = [];
    for await (const item of client.listItems()) {
      items.push(item);
    }
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty("id");
  });
});
