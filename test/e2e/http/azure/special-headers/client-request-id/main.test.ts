import { describe, expect, it } from "vitest";
import { XmsClientRequestIdClient } from "../../../../generated/azure/special-headers/client-request-id/src/index.js";

describe("Azure.SpecialHeaders.ClientRequestId", () => {
  const client = new XmsClientRequestIdClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should send request with auto-generated client-request-id header", async () => {
    const result = await client.get();
    expect(result).toBeUndefined();
  });
});
