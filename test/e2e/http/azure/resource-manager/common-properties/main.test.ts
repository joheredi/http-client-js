import { describe, expect, it } from "vitest";
import { CommonPropertiesClient } from "../../../../generated/azure/resource-manager/common-properties/src/index.js";
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
describe("Azure.ResourceManager.CommonProperties", () => {
  const client = new CommonPropertiesClient(
    fakeCredential,
    subscriptionId,
    {
      endpoint,
      allowInsecureConnection: true,
    },
  );

  describe("managedIdentity", () => {
    it.skip("should get a managed identity tracked resource", async () => {
      const result = await client.managedIdentity.get("test-rg", "identity");
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.location).toBeDefined();
    });

    it.skip("should createWithSystemAssigned", async () => {
      const result = await client.managedIdentity.createWithSystemAssigned(
        "test-rg",
        "identity",
        {
          location: "eastus",
          identity: { type: "SystemAssigned" },
        },
      );
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.identity).toBeDefined();
      expect(result.identity!.type).toBe("SystemAssigned");
    });

    it.skip("should updateWithUserAssignedAndSystemAssigned", async () => {
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
    it.skip("should get a confidential resource for predefined error", async () => {
      const result = await client.error.getForPredefinedError(
        "test-rg",
        "confidential",
      );
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.location).toBeDefined();
    });

    it.skip("should create a confidential resource for user defined error", async () => {
      const result = await client.error.createForUserDefinedError(
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
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });
});
