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

describe("Azure.ResourceManager.NonResource", () => {
  const client = new NonResourceClient(fakeCredential, subscriptionId, {
    endpoint,
    allowInsecureConnection: true,
  });
  // Remove bearer token policy so tests can run against HTTP mock server.
  // The policy hard-codes an HTTPS requirement that can't be bypassed.
  client.pipeline.removePolicy({
    name: "bearerTokenAuthenticationPolicy",
  });

  describe("nonResourceOperations", () => {
    it("should get a non resource", async () => {
      const result = await client.nonResourceOperations.get(
        "eastus",
        "hello",
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it("should create a non resource", async () => {
      const result = await client.nonResourceOperations.create(
        "eastus",
        "hello",
        { id: "id", name: "hello", type: "nonResource" },
      );
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });
});
