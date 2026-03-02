import { describe, expect, it } from "vitest";
import { MoveToRootClient } from "../../../../../generated/azure/client-generator-core/client-location/move-to-root-client/src/index.js";

describe("Azure.ClientGenerator.Core.ClientLocation.MoveToRootClient", () => {
  const client = new MoveToRootClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should get health status", async () => {
    await client.getHealthStatus();
  });

  describe("resourceOperations", () => {
    it("should get resource", async () => {
      await client.resourceOperations.getResource();
    });
  });
});
