import { describe, expect, it } from "vitest";
import { MoveMethodParameterToClient } from "../../../../../generated/azure/client-generator-core/client-location/move-method-parameter-to-client/src/index.js";

describe("Azure.ClientGenerator.Core.ClientLocation.MoveMethodParameterToClient", () => {
  const client = new MoveMethodParameterToClient("testaccount", {
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should get blob", async () => {
    const result = await client.blobOperations.getBlob("testcontainer", "testblob.txt");
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
  });
});
