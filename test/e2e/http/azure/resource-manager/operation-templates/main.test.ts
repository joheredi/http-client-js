import { describe, expect, it } from "vitest";
import { OperationTemplatesClient } from "../../../../generated/azure/resource-manager/operation-templates/src/index.js";
import type { TokenCredential } from "@azure/core-auth";

const endpoint = "http://localhost:3002";
const SUBSCRIPTION_ID = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP = "test-rg";

const fakeCredential: TokenCredential = {
  getToken: async () => ({
    token: "fake-token",
    expiresOnTimestamp: Date.now() + 3600000,
  }),
};

describe("Azure.ResourceManager.OperationTemplates", () => {
  const client = new OperationTemplatesClient(
    fakeCredential,
    SUBSCRIPTION_ID,
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

  describe("operations", () => {
    it("should list available operations", async () => {
      const operations = [];
      for await (const op of client.operations.list()) {
        operations.push(op);
      }
      expect(operations).toBeInstanceOf(Array);
      expect(operations.length).toBeGreaterThan(0);
      expect(operations[0].name).toBeDefined();
    });
  });

  describe("checkNameAvailability", () => {
    it("should check name availability globally", async () => {
      const result = await client.checkNameAvailability.checkGlobal({
        name: "checkName",
        type: "Microsoft.Web/site",
      });
      expect(result.nameAvailable).toBe(false);
      expect(result.reason).toBe("AlreadyExists");
      expect(result.message).toBeDefined();
    });

    it("should check name availability locally", async () => {
      const result = await client.checkNameAvailability.checkLocal("eastus", {
        name: "checkName",
        type: "Microsoft.Web/site",
      });
      expect(result.nameAvailable).toBe(false);
      expect(result.reason).toBe("AlreadyExists");
      expect(result.message).toBeDefined();
    });
  });

  describe("lro", () => {
    it("should create or replace an order with LRO", async () => {
      const poller = client.lro.createOrReplace(
        RESOURCE_GROUP,
        "order1",
        {
          location: "eastus",
          properties: {
            productId: "product1",
            amount: 1,
          },
        } as any,
      );
      const result = await poller.pollUntilDone();
      expect(result.name).toBe("order1");
      expect(result.properties?.productId).toBe("product1");
      expect(result.properties?.amount).toBe(1);
    });

    it("should export an order with LRO", async () => {
      const poller = client.lro.export(RESOURCE_GROUP, "order1", {
        format: "csv",
      });
      const result = await poller.pollUntilDone();
      expect(result.content).toBe("order1,product1,1");
    });

    it("should delete an order with LRO", async () => {
      const poller = client.lro.delete(RESOURCE_GROUP, "order1");
      const result = await poller.pollUntilDone();
      expect(result).toBeUndefined();
    });

    it("should export array with LRO", async () => {
      const poller = client.lro.exportArray({ format: "csv" });
      const result = await poller.pollUntilDone();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      expect(result[0].content).toBe("order1,product1,1");
      expect(result[1].content).toBe("order2,product2,2");
    });
  });

  describe("lroPaging", () => {
    it("should handle LRO with paging", async () => {
      const products = [];
      for await (const product of client.lroPaging.postPagingLro(
        RESOURCE_GROUP,
        "default",
      )) {
        products.push(product);
      }
      expect(products).toBeInstanceOf(Array);
      expect(products.length).toBeGreaterThan(0);
    });
  });

  describe("optionalBody", () => {
    it("should get a widget", async () => {
      const result = await client.optionalBody.get(RESOURCE_GROUP, "widget1");
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.properties).toBeDefined();
    });

    it("should patch a widget without body", async () => {
      const result = await client.optionalBody.patch(
        RESOURCE_GROUP,
        "widget1",
      );
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it("should patch a widget with body", async () => {
      const result = await client.optionalBody.patch(
        RESOURCE_GROUP,
        "widget1",
        {
          properties: {
            location: "eastus",
            properties: {
              name: "updated-widget",
              description: "Updated description",
            },
          } as any,
        },
      );
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it("should post a widget action without body", async () => {
      const result = await client.optionalBody.post(
        RESOURCE_GROUP,
        "widget1",
      );
      expect(result.result).toBe("Action completed successfully");
    });

    it("should post a widget action with body", async () => {
      const result = await client.optionalBody.post(
        RESOURCE_GROUP,
        "widget1",
        {
          body: {
            actionType: "perform",
            parameters: "test-parameters",
          },
        },
      );
      expect(result.result).toBe(
        "Action completed successfully with parameters",
      );
    });

    it("should do provider post without body", async () => {
      const result = await client.optionalBody.providerPost();
      expect(result.totalAllowed).toBe(50);
      expect(result.status).toBe("Changed to default allowance");
    });

    it("should do provider post with body", async () => {
      const result = await client.optionalBody.providerPost({
        body: {
          totalAllowed: 100,
          reason: "Increased demand",
        },
      });
      expect(result.totalAllowed).toBe(100);
      expect(result.status).toBe("Changed to requested allowance");
    });
  });
});
