import { describe, expect, it } from "vitest";
import { DeserializeEmptyStringAsNullClient } from "../../../../generated/azure/client-generator-core/deserialize-empty-string-as-null/src/index.js";

describe("Azure.ClientGenerator.Core.DeserializeEmptyStringAsNull", () => {
  const client = new DeserializeEmptyStringAsNullClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should get response model", async () => {
    const result = await client.get();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("sampleUrl");
  });
});
