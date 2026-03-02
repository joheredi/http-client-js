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

  it("should call listByScope(scope)", async () => {
    const result = await client.listByScope("car");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("1");
    expect(result[0]?.name).toBe("foo");
    expect(result[0]?.scope).toBe("car");
  });
});
