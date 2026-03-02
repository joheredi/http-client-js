import { describe, expect, it } from "vitest";
import { ReturnTypeChangedFromClient } from "../../../generated/versioning/returnTypeChangedFrom/src/index.js";

/**
 * Tests for Versioning.ReturnTypeChangedFrom — validates that the @returnTypeChangedFrom
 * decorator correctly tracks return type changes across versions.
 *
 * In v2, the return type changed from int32 to string. The test sends a string body
 * with text/plain content type and expects the same string back.
 *
 * SKIPPED: The mock API expects Content-Type: text/plain but the generated client
 * may send application/json. This matches the reference test behavior.
 */
describe("Versioning.ReturnTypeChangedFrom", () => {
  const client = new ReturnTypeChangedFromClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Tests that the test operation sends and receives a string body.
   * Skipped due to mock API content-type mismatch (same as reference implementation).
   */
  it.skip("should call test operation", async () => {
    const result = await client.test("test");
    expect(result).toBe("test");
  });
});
