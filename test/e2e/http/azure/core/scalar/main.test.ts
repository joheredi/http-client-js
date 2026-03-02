import { describe, expect, it } from "vitest";
import { ScalarClient } from "../../../../generated/azure/core/scalar/src/index.js";

describe("Azure.Core.Scalar", () => {
  const client = new ScalarClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("AzureLocationScalar", () => {
    it("should get azure location", async () => {
      const result = await client.azureLocationScalar.get();
      expect(result).toBe("eastus");
    });

    it("should put azure location", async () => {
      const result = await client.azureLocationScalar.put("eastus");
      expect(result).toBeUndefined();
    });

    it("should post azure location model", async () => {
      const result = await client.azureLocationScalar.post({
        location: "eastus",
      });
      expect(result.location).toBe("eastus");
    });

    it("should send azure location in header", async () => {
      const result = await client.azureLocationScalar.header("eastus");
      expect(result).toBeUndefined();
    });

    it("should send azure location in query", async () => {
      const result = await client.azureLocationScalar.query("eastus");
      expect(result).toBeUndefined();
    });
  });
});
