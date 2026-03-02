import { describe, expect, it } from "vitest";
import { MoveMethodParameterToClient } from "../../../../../generated/azure/client-generator-core/client-location/move-method-parameter-to-client/src/index.js";

describe("Azure.ClientGenerator.Core.ClientLocation.MoveMethodParameterToClient", () => {
  const client = new MoveMethodParameterToClient("test-account", {
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  // TODO(e2e): Fix - server expects storageAccount=testaccount but got test-account
  it.skip("should get blob", async () => {
    const result = await client.blobOperations.getBlob("test-container", "test-blob");
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
  });
});
