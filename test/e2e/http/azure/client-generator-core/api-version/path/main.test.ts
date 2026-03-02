import { describe, expect, it } from "vitest";
import { PathClient } from "../../../../../generated/azure/client-generator-core/api-version/path/src/index.js";

describe("Azure.ClientGenerator.Core.ApiVersion.Path", () => {
  const client = new PathClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("pathApiVersion", async () => {
    const result = await client.pathApiVersion();
    expect(result).toBeUndefined();
  });
});
