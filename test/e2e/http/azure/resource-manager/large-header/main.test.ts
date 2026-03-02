import { describe, expect, it } from "vitest";
import { LargeHeaderClient } from "../../../../generated/azure/resource-manager/large-header/src/index.js";
import type { TokenCredential } from "@azure/core-auth";

const endpoint = "http://localhost:3002";
const subscriptionId = "00000000-0000-0000-0000-000000000000";
const fakeCredential: TokenCredential = {
  getToken: async () => ({
    token: "fake-token",
    expiresOnTimestamp: Date.now() + 3600000,
  }),
};

describe("Azure.ResourceManager.LargeHeader", () => {
  const client = new LargeHeaderClient(fakeCredential, subscriptionId, {
    endpoint,
    allowInsecureConnection: true,
  });
  // Remove bearer token policy so tests can run against HTTP mock server.
  // The policy hard-codes an HTTPS requirement that can't be bypassed.
  client.pipeline.removePolicy({
    name: "bearerTokenAuthenticationPolicy",
  });

  describe("largeHeaders", () => {
    it("should handle two6k large header LRO", async () => {
      const poller = client.largeHeaders.two6k("test-rg", "header1");
      const result = await poller;
      expect(result).toBeDefined();
      expect(result.succeeded).toBeDefined();
    });
  });
});
