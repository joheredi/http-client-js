import { describe, expect, it } from "vitest";
import { MethodSubscriptionIdClient } from "../../../../generated/azure/resource-manager/method-subscription-id/src/index.js";
import type { TokenCredential } from "@azure/core-auth";

const endpoint = "http://localhost:3002";
const SUBSCRIPTION_ID = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP = "test-rg";
const LOCATION = "eastus";

const fakeCredential: TokenCredential = {
  getToken: async () => ({
    token: "fake-token",
    expiresOnTimestamp: Date.now() + 3600000,
  }),
};

describe("Azure.ResourceManager.MethodSubscriptionId", () => {
  const client = new MethodSubscriptionIdClient(
    fakeCredential,
    SUBSCRIPTION_ID,
    {
      endpoint,
      allowInsecureConnection: true,
    },
  );
  client.pipeline.removePolicy({
    name: "bearerTokenAuthenticationPolicy",
  });

  describe("operations", () => {
    it("should list operations", async () => {
      const operations = [];
      for await (const op of client.operations.list()) {
        operations.push(op);
      }
      expect(operations).toBeInstanceOf(Array);
      expect(operations.length).toBeGreaterThan(0);
    });
  });

  describe("twoSubscriptionResourcesMethodLevel - subscriptionResource1", () => {
    it("should get subscription resource 1", async () => {
      const result =
        await client.twoSubscriptionResourcesMethodLevel.subscriptionResource1Operations.get(
          SUBSCRIPTION_ID,
          "sub-resource-1",
        );
      expect(result.name).toBe("sub-resource-1");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s",
      );
    });

    it("should create or update subscription resource 1", async () => {
      const result =
        await client.twoSubscriptionResourcesMethodLevel.subscriptionResource1Operations.put(
          SUBSCRIPTION_ID,
          "sub-resource-1",
          {
            properties: {
              description: "Valid subscription resource 1",
            },
          },
        );
      expect(result.name).toBe("sub-resource-1");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s",
      );
    });

    it("should delete subscription resource 1", async () => {
      const result =
        await client.twoSubscriptionResourcesMethodLevel.subscriptionResource1Operations.delete(
          SUBSCRIPTION_ID,
          "sub-resource-1",
        );
      expect(result).toBeUndefined();
    });
  });

  describe("twoSubscriptionResourcesMethodLevel - subscriptionResource2", () => {
    it("should get subscription resource 2", async () => {
      const result =
        await client.twoSubscriptionResourcesMethodLevel.subscriptionResource2Operations.get(
          SUBSCRIPTION_ID,
          "sub-resource-2",
        );
      expect(result.name).toBe("sub-resource-2");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s",
      );
    });

    it("should create or update subscription resource 2", async () => {
      const result =
        await client.twoSubscriptionResourcesMethodLevel.subscriptionResource2Operations.put(
          SUBSCRIPTION_ID,
          "sub-resource-2",
          {
            properties: {
              configValue: "test-config",
            },
          },
        );
      expect(result.name).toBe("sub-resource-2");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s",
      );
    });

    it("should delete subscription resource 2", async () => {
      const result =
        await client.twoSubscriptionResourcesMethodLevel.subscriptionResource2Operations.delete(
          SUBSCRIPTION_ID,
          "sub-resource-2",
        );
      expect(result).toBeUndefined();
    });
  });

  describe("mixedSubscriptionPlacement - subscriptionResource", () => {
    it("should get mixed subscription resource", async () => {
      const result =
        await client.mixedSubscriptionPlacement.subscriptionResourceOperations.get(
          SUBSCRIPTION_ID,
          "sub-resource",
        );
      expect(result.name).toBe("sub-resource");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/subscriptionResources",
      );
    });

    it("should get mixed subscription resource with method-level subscription ID", async () => {
      // Create a client with a DIFFERENT subscription ID to verify that
      // method-level subscription ID overrides client-level.
      const wrongSubClient = new MethodSubscriptionIdClient(
        fakeCredential,
        "11111111-1111-1111-1111-111111111111",
        {
          endpoint,
          allowInsecureConnection: true,
        },
      );
      wrongSubClient.pipeline.removePolicy({
        name: "bearerTokenAuthenticationPolicy",
      });

      // Pass the CORRECT subscription ID at method level — the mock server
      // expects exactly SUBSCRIPTION_ID in the URL path.
      const result =
        await wrongSubClient.mixedSubscriptionPlacement.subscriptionResourceOperations.get(
          SUBSCRIPTION_ID,
          "sub-resource",
        );
      expect(result.name).toBe("sub-resource");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/subscriptionResources",
      );
    });

    it("should create or update mixed subscription resource", async () => {
      const result =
        await client.mixedSubscriptionPlacement.subscriptionResourceOperations.put(
          SUBSCRIPTION_ID,
          "sub-resource",
          {
            properties: {
              subscriptionSetting: "test-sub-setting",
            },
          },
        );
      expect(result.name).toBe("sub-resource");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/subscriptionResources",
      );
    });

    it("should delete mixed subscription resource", async () => {
      const result =
        await client.mixedSubscriptionPlacement.subscriptionResourceOperations.delete(
          SUBSCRIPTION_ID,
          "sub-resource",
        );
      expect(result).toBeUndefined();
    });
  });

  describe("mixedSubscriptionPlacement - resourceGroupResource", () => {
    it("should get resource group resource", async () => {
      const result =
        await client.mixedSubscriptionPlacement.resourceGroupResourceOperations.get(
          RESOURCE_GROUP,
          "rg-resource",
        );
      expect(result.name).toBe("rg-resource");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources",
      );
    });

    it("should create or update resource group resource", async () => {
      const result =
        await client.mixedSubscriptionPlacement.resourceGroupResourceOperations.put(
          RESOURCE_GROUP,
          "rg-resource",
          {
            location: LOCATION,
            properties: {
              resourceGroupSetting: "test-setting",
            },
          },
        );
      expect(result.name).toBe("rg-resource");
      expect(result.type).toBe(
        "Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources",
      );
    });

    it("should delete resource group resource", async () => {
      const result =
        await client.mixedSubscriptionPlacement.resourceGroupResourceOperations.delete(
          RESOURCE_GROUP,
          "rg-resource",
        );
      expect(result).toBeUndefined();
    });
  });
});
