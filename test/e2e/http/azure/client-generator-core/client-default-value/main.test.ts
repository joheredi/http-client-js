import { describe, expect, it } from "vitest";
import { ClientDefaultValueClient } from "../../../../generated/azure/client-generator-core/client-default-value/src/index.js";

describe("Azure.ClientGenerator.Core.ClientDefaultValue", () => {
  const client = new ClientDefaultValueClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should put model property", async () => {
    const result = await client.putModelProperty({
      name: "test",
    });
    expect(result).toBeDefined();
    expect(result.name).toBe("test");
  });

  it("should get operation parameter", async () => {
    await client.getOperationParameter("test");
  });

  // TODO(e2e): Fix - path param routing / content-type mismatch
  it.skip("should get path parameter", async () => {
    await client.getPathParameter("test-segment");
  });

  // TODO(e2e): Fix - path param routing / content-type mismatch
  it.skip("should get header parameter", async () => {
    await client.getHeaderParameter();
  });
});
