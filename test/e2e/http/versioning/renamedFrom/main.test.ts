import { describe, expect, it } from "vitest";
import { RenamedFromClient } from "../../../generated/versioning/renamedFrom/src/index.js";

/**
 * Tests for Versioning.RenamedFrom — validates that the @renamedFrom decorator
 * correctly tracks renamed operations, models, and properties across API versions.
 *
 * Operations and interfaces are renamed in v2 (e.g., oldOp → newOp).
 * Mock API at /versioning/renamed-from/api-version:v2/* echoes request bodies.
 */
describe("Versioning.RenamedFrom", () => {
  const client = new RenamedFromClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Tests the renamed newOp operation (formerly oldOp) with NewModel body
   * and newQuery query parameter.
   */
  it("should call newOp operation", async () => {
    const body = {
      newProp: "foo",
      enumProp: "newEnumMember" as const,
      unionProp: 10 as string | number,
    };
    const result = await client.newOp(body, "bar");
    expect(result.newProp).toBe("foo");
    expect(result.enumProp).toBe("newEnumMember");
    expect(result.unionProp).toBe(10);
  });

  /**
   * Tests the renamed newOpInNewInterface operation from NewInterface.
   * With hierarchy-client: false (default), this is flattened onto the root client.
   */
  it("should call newOpInNewInterface operation", async () => {
    const body = {
      newProp: "foo",
      enumProp: "newEnumMember" as const,
      unionProp: 10 as string | number,
    };
    const result = await client.newOpInNewInterface(body);
    expect(result.newProp).toBe("foo");
    expect(result.enumProp).toBe("newEnumMember");
    expect(result.unionProp).toBe(10);
  });
});
