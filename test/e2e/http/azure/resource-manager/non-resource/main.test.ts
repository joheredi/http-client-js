import { describe, expect, it } from "vitest";
import { NonResourceClient } from "../../../../generated/azure/resource-manager/non-resource/src/index.js";
import type { TokenCredential } from "@azure/core-auth";

const endpoint = "http://localhost:3002";
const subscriptionId = "00000000-0000-0000-0000-000000000000";
const fakeCredential: TokenCredential = {
  getToken: async () => ({
    token: "fake-token",
    expiresOnTimestamp: Date.now() + 3600000,
  }),
};

// TODO(e2e): All tests skip - Bearer token authentication not permitted for non-TLS (http) URLs
describe("Azure.ResourceManager.NonResource", () => {
  const client = new NonResourceClient(fakeCredential, subscriptionId, {
    endpoint,
    allowInsecureConnection: true,
  });

  describe("nonResourceOperations", () => {
    it.skip("should get a non resource", async () => {
      const result = await client.nonResourceOperations.get(
        "eastus",
        "param",
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it.skip("should create a non resource", async () => {
      const result = await client.nonResourceOperations.create(
        "eastus",
        "param",
        { id: "id", name: "name", type: "type" },
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });
});
