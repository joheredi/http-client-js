import { describe, expect, it } from "vitest";
import { UsageClient } from "../../../../generated/azure/client-generator-core/usage/src/index.js";

describe("Azure.ClientGenerator.Core.Usage", () => {
  const client = new UsageClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("modelInOperation", () => {
    it("inputToInputOutput", async () => {
      const result = await client.modelInOperation.inputToInputOutput({
        name: "Madge",
      });
      expect(result).toBeUndefined();
    });

    it("outputToInputOutput", async () => {
      const result = await client.modelInOperation.outputToInputOutput();
      expect(result.name).toBe("Madge");
    });

    it("modelInReadOnlyProperty", async () => {
      const result = await client.modelInOperation.modelInReadOnlyProperty({
        result: { name: "Madge" },
      } as any);
      expect(result.result.name).toBe("Madge");
    });
  });
});
