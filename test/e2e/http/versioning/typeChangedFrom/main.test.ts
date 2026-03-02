import { describe, expect, it } from "vitest";
import { TypeChangedFromClient } from "../../../generated/versioning/typeChangedFrom/src/index.js";

/**
 * Tests for Versioning.TypeChangedFrom — validates that the @typeChangedFrom decorator
 * correctly tracks property/parameter type changes across API versions.
 *
 * In v2, the changedProp type changed from int32 to string. The test sends a TestModel
 * with string props and a query parameter. Mock API echoes the body back.
 */
describe("Versioning.TypeChangedFrom", () => {
  const client = new TypeChangedFromClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Tests the test operation with v2 types (string changedProp) and a query parameter.
   */
  it("should call test operation", async () => {
    const body = {
      prop: "foo",
      changedProp: "bar",
    };
    const result = await client.test(body, "baz");
    expect(result.prop).toBe("foo");
    expect(result.changedProp).toBe("bar");
  });
});
