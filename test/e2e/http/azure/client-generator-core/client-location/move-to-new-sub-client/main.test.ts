import { describe, expect, it } from "vitest";
import { MoveToNewSubClient } from "../../../../../generated/azure/client-generator-core/client-location/move-to-new-sub-client/src/index.js";

describe("Azure.ClientGenerator.Core.ClientLocation.MoveToNewSubClient", () => {
  const client = new MoveToNewSubClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("productOperations", () => {
    it("should list products", async () => {
      await client.productOperations.listProducts();
    });
  });

  describe("archiveOperations", () => {
    it("should archive product", async () => {
      await client.archiveOperations.archiveProduct();
    });
  });
});
