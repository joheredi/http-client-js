import { describe, expect, it } from "vitest";
import { OverloadClient } from "../../../generated/client/overload/src/index.js";

describe("Client.Overload", () => {
  const client = new OverloadClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should call list()", async () => {
    const result = await client.list();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  // TODO(e2e): Fix - route not matching (404)
  it.skip("should call listByScope(scope)", async () => {
    const result = await client.listByScope("test-scope");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
