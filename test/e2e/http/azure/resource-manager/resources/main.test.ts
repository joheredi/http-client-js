import { describe, expect, it } from "vitest";
import {
  ResourcesClient,
  type TopLevelTrackedResource,
  type NestedProxyResource,
  type ExtensionsResource,
  type LocationResource,
} from "../../../../generated/azure/resource-manager/resources/src/index.js";
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

const validTopLevelResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`,
  name: "top",
  type: "Azure.ResourceManager.Resources/topLevelTrackedResources",
  location: "eastus",
  properties: {
    provisioningState: "Succeeded",
    description: "valid",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

const validNestedResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested`,
  name: "nested",
  type: "Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources",
  properties: {
    provisioningState: "Succeeded",
    description: "valid",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

const validSingletonResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default`,
  name: "default",
  type: "Azure.ResourceManager.Resources/singletonTrackedResources",
  location: "eastus",
  properties: {
    provisioningState: "Succeeded",
    description: "valid",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

const validLocationResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/providers/Azure.ResourceManager.Resources/locations/${LOCATION}/locationResources/resource`,
  name: "resource",
  type: "Azure.ResourceManager.Resources/locationResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

const validResourceGroupExtensionsResource: ExtensionsResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

const validSubscriptionExtensionsResource: ExtensionsResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

const validTenantExtensionsResource: ExtensionsResource = {
  id: `/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

const validResourceExtensionsResource: ExtensionsResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: new Date("2024-10-04T00:56:07.442Z"),
    lastModifiedByType: "User",
  },
};

describe("Azure.ResourceManager.Resources", () => {
  const client = new ResourcesClient(fakeCredential, SUBSCRIPTION_ID, {
    endpoint,
    allowInsecureConnection: true,
  });
  // Remove bearer token policy so tests can run against HTTP mock server.
  client.pipeline.removePolicy({
    name: "bearerTokenAuthenticationPolicy",
  });

  describe("singleton tracked resources", () => {
    it("should get singleton by resource group", async () => {
      const result = await client.singleton.getByResourceGroup(RESOURCE_GROUP);
      expect(result.id).toBe(validSingletonResource.id);
      expect(result.name).toBe(validSingletonResource.name);
      expect(result.type).toBe(validSingletonResource.type);
    });

    it("should update singleton tracked resource", async () => {
      const result = await client.singleton.update(RESOURCE_GROUP, {
        location: "eastus",
        properties: {
          description: "valid2",
        },
      });
      expect(result.id).toBe(validSingletonResource.id);
      expect(result.name).toBe(validSingletonResource.name);
      expect(result.type).toBe(validSingletonResource.type);
      expect(result.location).toBe("eastus");
      expect(result.properties?.description).toBe("valid2");
    });

    it("should createOrUpdate singleton tracked resource", async () => {
      const poller = client.singleton.createOrUpdate(RESOURCE_GROUP, {
        location: "eastus",
        properties: {
          description: "valid",
        },
      });
      const result = await poller.pollUntilDone();
      expect(result.id).toBe(validSingletonResource.id);
      expect(result.name).toBe(validSingletonResource.name);
      expect(result.type).toBe(validSingletonResource.type);
    });

    it("should list singleton tracked resources by resource group", async () => {
      const result = client.singleton.listByResourceGroup(RESOURCE_GROUP);
      const items = [];
      for await (const item of result) {
        items.push(item);
      }
      expect(items[0]?.id).toBe(validSingletonResource.id);
      expect(items[0]?.name).toBe(validSingletonResource.name);
      expect(items[0]?.type).toBe(validSingletonResource.type);
    });
  });

  describe("top-level tracked resources", () => {
    it("should actionSync top level tracked resource", async () => {
      const result = await client.topLevel.actionSync(RESOURCE_GROUP, "top", {
        message: "Resource action at top level.",
        urgent: true,
      });
      expect(result).toBeUndefined();
    });

    it("should get top level tracked resource", async () => {
      const result = await client.topLevel.get(RESOURCE_GROUP, "top");
      expect(result.id).toBe(validTopLevelResource.id);
      expect(result.name).toBe(validTopLevelResource.name);
      expect(result.type).toBe(validTopLevelResource.type);
    });

    it("should create or replace top level tracked resource", async () => {
      const poller = client.topLevel.createOrReplace(RESOURCE_GROUP, "top", {
        location: "eastus",
        properties: {
          description: "valid",
        },
      });
      const result = await poller.pollUntilDone();
      expect(result.id).toBe(validTopLevelResource.id);
      expect(result.name).toBe(validTopLevelResource.name);
      expect(result.type).toBe(validTopLevelResource.type);
      expect(result.location).toBe(validTopLevelResource.location);
      expect(result.properties?.description).toBe(
        validTopLevelResource.properties?.description,
      );
    });

    it("should delete top level tracked resource", async () => {
      const poller = client.topLevel.delete(RESOURCE_GROUP, "top");
      const result = await poller.pollUntilDone();
      expect(result).toBeUndefined();
    });

    it("should list top level tracked resources by resource group", async () => {
      const result = client.topLevel.listByResourceGroup(RESOURCE_GROUP);
      const items: TopLevelTrackedResource[] = [];
      for await (const item of result) {
        items.push(item);
      }
      expect(items.length).toBe(1);
      expect(items[0]?.id).toBe(validTopLevelResource.id);
      expect(items[0]?.name).toBe(validTopLevelResource.name);
      expect(items[0]?.type).toBe(validTopLevelResource.type);
    });

    it("should list top level tracked resources by subscription", async () => {
      const result = client.topLevel.listBySubscription();
      const items: TopLevelTrackedResource[] = [];
      for await (const item of result) {
        items.push(item);
      }
      expect(items.length).toBe(1);
      expect(items[0]?.id).toBe(validTopLevelResource.id);
      expect(items[0]?.name).toBe(validTopLevelResource.name);
      expect(items[0]?.type).toBe(validTopLevelResource.type);
    });
  });

  describe("nested proxy resources", () => {
    it("should get nested proxy resource", async () => {
      const result = await client.nested.get(RESOURCE_GROUP, "top", "nested");
      expect(result).toEqual(validNestedResource);
    });

    it("should create or replace nested proxy resource", async () => {
      const poller = client.nested.createOrReplace(
        RESOURCE_GROUP,
        "top",
        "nested",
        {
          properties: {
            description: "valid",
          },
        },
      );
      const result = await poller.pollUntilDone();
      expect(result).toEqual(validNestedResource);
    });

    it("should update nested proxy resource", async () => {
      const poller = client.nested.update(RESOURCE_GROUP, "top", "nested", {
        properties: {
          description: "valid2",
        },
      });
      const result = await poller.pollUntilDone();
      expect(result).toEqual({
        ...validNestedResource,
        properties: {
          provisioningState: "Succeeded",
          description: "valid2",
        },
      });
    });

    it("should delete nested proxy resource", async () => {
      const poller = client.nested.delete(RESOURCE_GROUP, "top", "nested");
      const result = await poller.pollUntilDone();
      expect(result).toBeUndefined();
    });

    it("should list nested proxy resources by top level tracked resource", async () => {
      const result = client.nested.listByTopLevelTrackedResource(
        RESOURCE_GROUP,
        "top",
      );
      const items: NestedProxyResource[] = [];
      for await (const item of result) {
        items.push(item);
      }
      expect(items.length).toBe(1);
      expect(items).toEqual([validNestedResource]);
    });
  });

  describe("location resources", () => {
    it("should get location resource", async () => {
      const result = await client.locationResources.get(LOCATION, "resource");
      expect(result).toEqual(validLocationResource);
    });

    it("should createOrUpdate location resource", async () => {
      const result = await client.locationResources.createOrUpdate(
        LOCATION,
        "resource",
        {
          properties: {
            description: "valid",
          },
        },
      );
      expect(result).toEqual(validLocationResource);
    });

    it("should update location resource", async () => {
      const result = await client.locationResources.update(
        LOCATION,
        "resource",
        {
          properties: {
            description: "valid2",
          },
        },
      );
      expect(result).toEqual({
        ...validLocationResource,
        properties: {
          provisioningState: "Succeeded",
          description: "valid2",
        },
      });
    });

    it("should delete location resource", async () => {
      const result = await client.locationResources.delete(
        LOCATION,
        "resource",
      );
      expect(result).toBeUndefined();
    });

    it("should list location resources by location", async () => {
      const result = client.locationResources.listByLocation(LOCATION);
      const items: LocationResource[] = [];
      for await (const item of result) {
        items.push(item);
      }
      expect(items.length).toBe(1);
      expect(items).toEqual([validLocationResource]);
    });
  });

  describe("extensions resources", () => {
    it("should get extensions resources at all scopes", async () => {
      const resourceGroupResult = await client.extensionsResources.get(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}`,
        "extension",
      );
      expect(resourceGroupResult).toEqual(validResourceGroupExtensionsResource);

      const subscriptionResult = await client.extensionsResources.get(
        `subscriptions/${SUBSCRIPTION_ID}`,
        "extension",
      );
      expect(subscriptionResult).toEqual(validSubscriptionExtensionsResource);

      const tenantResult = await client.extensionsResources.get(
        "",
        "extension",
      );
      expect(tenantResult).toEqual(validTenantExtensionsResource);

      const resourceResult = await client.extensionsResources.get(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`,
        "extension",
      );
      expect(resourceResult).toEqual(validResourceExtensionsResource);
    });

    it("should createOrUpdate extensions resources at all scopes", async () => {
      const rgPoller = client.extensionsResources.createOrUpdate(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}`,
        "extension",
        { properties: { description: "valid" } },
      );
      const resourceGroupResult = await rgPoller.pollUntilDone();
      expect(resourceGroupResult).toEqual(validResourceGroupExtensionsResource);

      const subPoller = client.extensionsResources.createOrUpdate(
        `subscriptions/${SUBSCRIPTION_ID}`,
        "extension",
        { properties: { description: "valid" } },
      );
      const subscriptionResult = await subPoller.pollUntilDone();
      expect(subscriptionResult).toEqual(validSubscriptionExtensionsResource);

      const tenantPoller = client.extensionsResources.createOrUpdate(
        "",
        "extension",
        { properties: { description: "valid" } },
      );
      const tenantResult = await tenantPoller.pollUntilDone();
      expect(tenantResult).toEqual(validTenantExtensionsResource);

      const resPoller = client.extensionsResources.createOrUpdate(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`,
        "extension",
        { properties: { description: "valid" } },
      );
      const resourceResult = await resPoller.pollUntilDone();
      expect(resourceResult).toEqual(validResourceExtensionsResource);
    });

    it("should update extensions resources at all scopes", async () => {
      const resourceGroupResult = await client.extensionsResources.update(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}`,
        "extension",
        { properties: { description: "valid2" } },
      );
      expect(resourceGroupResult).toEqual({
        ...validResourceGroupExtensionsResource,
        properties: { provisioningState: "Succeeded", description: "valid2" },
      });

      const subscriptionResult = await client.extensionsResources.update(
        `subscriptions/${SUBSCRIPTION_ID}`,
        "extension",
        { properties: { description: "valid2" } },
      );
      expect(subscriptionResult).toEqual({
        ...validSubscriptionExtensionsResource,
        properties: { provisioningState: "Succeeded", description: "valid2" },
      });

      const tenantResult = await client.extensionsResources.update(
        "",
        "extension",
        { properties: { description: "valid2" } },
      );
      expect(tenantResult).toEqual({
        ...validTenantExtensionsResource,
        properties: { provisioningState: "Succeeded", description: "valid2" },
      });

      const resourceResult = await client.extensionsResources.update(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`,
        "extension",
        { properties: { description: "valid2" } },
      );
      expect(resourceResult).toEqual({
        ...validResourceExtensionsResource,
        properties: { provisioningState: "Succeeded", description: "valid2" },
      });
    });

    it("should delete extensions resources at all scopes", async () => {
      const resourceGroupResult = await client.extensionsResources.delete(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}`,
        "extension",
      );
      expect(resourceGroupResult).toBeUndefined();

      const subscriptionResult = await client.extensionsResources.delete(
        `subscriptions/${SUBSCRIPTION_ID}`,
        "extension",
      );
      expect(subscriptionResult).toBeUndefined();

      const tenantResult = await client.extensionsResources.delete(
        "",
        "extension",
      );
      expect(tenantResult).toBeUndefined();

      const resourceResult = await client.extensionsResources.delete(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`,
        "extension",
      );
      expect(resourceResult).toBeUndefined();
    });

    it("should list extensions resources at all scopes", async () => {
      const rgResult = client.extensionsResources.listByScope(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}`,
      );
      const rgItems: ExtensionsResource[] = [];
      for await (const item of rgResult) {
        rgItems.push(item);
      }
      expect(rgItems.length).toBe(1);
      expect(rgItems).toEqual([validResourceGroupExtensionsResource]);

      const subResult = client.extensionsResources.listByScope(
        `subscriptions/${SUBSCRIPTION_ID}`,
      );
      const subItems: ExtensionsResource[] = [];
      for await (const item of subResult) {
        subItems.push(item);
      }
      expect(subItems.length).toBe(1);
      expect(subItems).toEqual([validSubscriptionExtensionsResource]);

      const tenantResult = client.extensionsResources.listByScope("");
      const tenantItems: ExtensionsResource[] = [];
      for await (const item of tenantResult) {
        tenantItems.push(item);
      }
      expect(tenantItems.length).toBe(1);
      expect(tenantItems).toEqual([validTenantExtensionsResource]);

      const resResult = client.extensionsResources.listByScope(
        `subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`,
      );
      const resItems: ExtensionsResource[] = [];
      for await (const item of resResult) {
        resItems.push(item);
      }
      expect(resItems.length).toBe(1);
      expect(resItems).toEqual([validResourceExtensionsResource]);
    });
  });
});
