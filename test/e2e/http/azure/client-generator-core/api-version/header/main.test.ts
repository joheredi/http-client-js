import { describe, expect, it } from "vitest";
import { HeaderClient } from "../../../../../generated/azure/client-generator-core/api-version/header/src/index.js";

describe("Azure.ClientGenerator.Core.ApiVersion.Header", () => {
  const client = new HeaderClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("headerApiVersion", async () => {
    const result = await client.headerApiVersion();
    expect(result).toBeUndefined();
  });
});
