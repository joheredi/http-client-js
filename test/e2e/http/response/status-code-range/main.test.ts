/**
 * E2E test: Response — Status Code Range
 *
 * Validates that the generated StatusCodeRangeClient correctly handles error
 * responses for specific status codes (404) and status code ranges (494-499).
 *
 * These tests exercise the client's error deserialization logic: when the server
 * responds with a non-success status code, the client should throw a RestError
 * with the correct status code and error body.
 *
 * Mock server expectations (from @typespec/http-specs response/status-code-range):
 *   - GET /response/status-code-range/error-response-status-code-in-range — returns 494
 *     with body { code: "request-header-too-large", message: "Request header too large" }
 *   - GET /response/status-code-range/error-response-status-code-404 — returns 404
 *     with body { code: "not-found", resourceId: "resource1" }
 */
import { describe, expect, it } from "vitest";
import { StatusCodeRangeClient } from "../../../generated/response/status-code-range/src/index.js";

describe("Response.StatusCodeRange", () => {
  const client = new StatusCodeRangeClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  /**
   * Validates that a 404 response is correctly surfaced as a RestError.
   * The mock server returns a NotFoundError body with `code` and `resourceId` fields.
   * The client should throw because 404 is not an expected success status (204).
   */
  it("errorResponseStatusCode404", async () => {
    try {
      await client.errorResponseStatusCode404();
      expect.unreachable("Expected an error for 404 status code");
    } catch (error: any) {
      expect(error.statusCode).toBe(404);
    }
  });

  /**
   * Validates that a status code in the 494-499 range is correctly surfaced as a RestError.
   * The mock server returns a 494 response with an ErrorInRange body containing
   * `code` and `message` fields. The client should throw because 494 is not an
   * expected success status (204).
   */
  it("errorResponseStatusCodeInRange", async () => {
    try {
      await client.errorResponseStatusCodeInRange();
      expect.unreachable("Expected an error for 494 status code");
    } catch (error: any) {
      expect(error.statusCode).toBe(494);
    }
  });
});
