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

// TODO(e2e): All tests skip - Bearer token authentication not permitted for non-TLS (http) URLs
describe("Azure.ResourceManager.LargeHeader", () => {
  const client = new LargeHeaderClient(fakeCredential, subscriptionId, {
    endpoint,
    allowInsecureConnection: true,
  });

  describe("largeHeaders", () => {
    it.skip("should handle two6k large header LRO", async () => {
      const poller = client.largeHeaders.two6k("test-rg", "largeHeader");
      const result = await poller;
      expect(result).toBeDefined();
      expect(result.succeeded).toBeDefined();
    });
  });
});
