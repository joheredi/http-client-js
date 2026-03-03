import { describe, expect, it } from "vitest";
import { ReturnTypeChangedFromClient } from "../../../generated/versioning/returnTypeChangedFrom/src/index.js";

/**
 * Tests for Versioning.ReturnTypeChangedFrom — validates that the @returnTypeChangedFrom
 * decorator correctly tracks return type changes across versions.
 *
 * In v2, the return type changed from int32 to string. The test sends a string body
 * and expects the same string back, confirming the v2 return type is correctly used.
 */
describe("Versioning.ReturnTypeChangedFrom", () => {
  const client = new ReturnTypeChangedFromClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Tests that the test operation sends and receives a string body.
   * Validates that the return type change from int32 (v1) to string (v2) is
   * correctly reflected in the generated client — the operation accepts and
   * returns a string at the latest API version.
   */
  it("should call test operation", async () => {
    const result = await client.test("test");
    expect(result).toBe("test");
  });
});
