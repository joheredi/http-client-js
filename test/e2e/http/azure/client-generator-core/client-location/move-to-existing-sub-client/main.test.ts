import { describe, expect, it } from "vitest";
import { MoveToExistingSubClient } from "../../../../../generated/azure/client-generator-core/client-location/move-to-existing-sub-client/src/index.js";

describe("Azure.ClientGenerator.Core.ClientLocation.MoveToExistingSubClient", () => {
  const client = new MoveToExistingSubClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("adminOperations", () => {
    it("should get admin info", async () => {
      await client.adminOperations.getAdminInfo();
    });

    it("should delete user", async () => {
      await client.adminOperations.deleteUser();
    });
  });

  describe("userOperations", () => {
    it("should get user", async () => {
      await client.userOperations.getUser();
    });
  });
});
