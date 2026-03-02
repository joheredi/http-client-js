import { describe, expect, it } from "vitest";
import { ModelClient } from "../../../../generated/azure/core/model/src/index.js";

describe("Azure.Core.Model", () => {
  const client = new ModelClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("AzureCoreEmbeddingVector", () => {
    it("should get embedding vector", async () => {
      const result = await client.azureCoreEmbeddingVector.get();
      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it("should put embedding vector", async () => {
      const result = await client.azureCoreEmbeddingVector.put([0, 1, 2, 3, 4]);
      expect(result).toBeUndefined();
    });

    it("should post embedding model", async () => {
      const result = await client.azureCoreEmbeddingVector.post({
        embedding: [0, 1, 2, 3, 4],
      });
      expect(result.embedding).toEqual([5, 6, 7, 8, 9]);
    });
  });
});
