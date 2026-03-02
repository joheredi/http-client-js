import { describe, expect, it } from "vitest";
import { CommonPropertiesClient } from "../../../../generated/azure/resource-manager/common-properties/src/index.js";
import type { TokenCredential } from "@azure/core-auth";
import { RestError } from "@azure/core-rest-pipeline";

const endpoint = "http://localhost:3002";
const subscriptionId = "00000000-0000-0000-0000-000000000000";
const fakeCredential: TokenCredential = {
  getToken: async () => ({
    token: "fake-token",
    expiresOnTimestamp: Date.now() + 3600000,
  }),
};

describe("Azure.ResourceManager.CommonProperties", () => {
  const client = new CommonPropertiesClient(
    fakeCredential,
    subscriptionId,
    {
      endpoint,
      allowInsecureConnection: true,
    },
  );
  // Remove bearer token policy so tests can run against HTTP mock server.
  // The policy hard-codes an HTTPS requirement that can't be bypassed.
  client.pipeline.removePolicy({
    name: "bearerTokenAuthenticationPolicy",
  });

  describe("managedIdentity", () => {
    it("should get a managed identity tracked resource", async () => {
      const result = await client.managedIdentity.get("test-rg", "identity");
      expect(result.id).toBeDefined();
      expect(result.location).toBeDefined();
    });

    it("should createWithSystemAssigned", async () => {
      const result = await client.managedIdentity.createWithSystemAssigned(
        "test-rg",
        "identity",
        {
          location: "eastus",
          identity: { type: "SystemAssigned" },
        },
      );
      expect(result.id).toBeDefined();
      expect(result.identity).toBeDefined();
      expect(result.identity!.type).toBe("SystemAssigned");
    });

    it("should updateWithUserAssignedAndSystemAssigned", async () => {
      const result =
        await client.managedIdentity.updateWithUserAssignedAndSystemAssigned(
          "test-rg",
          "identity",
          {
            location: "eastus",
            identity: {
              type: "SystemAssigned,UserAssigned",
              userAssignedIdentities: {
                "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1":
                  {},
              },
            },
          },
        );
      expect(result.id).toBeDefined();
      expect(result.identity).toBeDefined();
    });
  });

  describe("error", () => {
    it("should return 404 for predefined error", async () => {
      try {
        await client.error.getForPredefinedError("test-rg", "confidential");
        expect.unreachable("Expected RestError");
      } catch (e) {
        expect(e).toBeInstanceOf(RestError);
        expect((e as RestError).statusCode).toBe(404);
      }
    });

    it("should return 400 for user defined error", async () => {
      try {
        await client.error.createForUserDefinedError(
          "test-rg",
          "confidential",
          {
            location: "eastus",
            properties: {
              provisioningState: "Succeeded",
              username: "testuser",
            },
          },
        );
        expect.unreachable("Expected RestError");
      } catch (e) {
        expect(e).toBeInstanceOf(RestError);
        expect((e as RestError).statusCode).toBe(400);
      }
    });
  });
});
