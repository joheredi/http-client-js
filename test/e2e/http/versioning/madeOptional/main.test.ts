import { describe, expect, it } from "vitest";
import { MadeOptionalClient } from "../../../generated/versioning/madeOptional/src/index.js";

/**
 * Tests for Versioning.MadeOptional — validates that the @madeOptional decorator
 * correctly makes properties/parameters optional in later API versions.
 *
 * The test sends a TestModel with only the required `prop` field (omitting the
 * optional `changedProp`). The mock API at /versioning/made-optional/api-version:v2/test
 * echoes the request body back.
 */
describe("Versioning.MadeOptional", () => {
  const client = new MadeOptionalClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Tests that the test operation works with only the required prop,
   * omitting the changedProp that was made optional in v2.
   */
  it("should call test operation", async () => {
    const body = { prop: "foo" };
    const result = await client.test(body);
    expect(result.prop).toBe("foo");
  });
});
