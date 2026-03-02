import { describe, expect, it } from "vitest";
import { QueryClient } from "../../../../../generated/azure/client-generator-core/api-version/query/src/index.js";

describe("Azure.ClientGenerator.Core.ApiVersion.Query", () => {
  const client = new QueryClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("queryApiVersion", async () => {
    const result = await client.queryApiVersion();
    expect(result).toBeUndefined();
  });
});
