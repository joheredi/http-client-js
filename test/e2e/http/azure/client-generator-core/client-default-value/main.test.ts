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

  it("should get path parameter", async () => {
    await client.getPathParameter("segment2");
  });

  it("should get header parameter", async () => {
    await client.getHeaderParameter();
  });
});
