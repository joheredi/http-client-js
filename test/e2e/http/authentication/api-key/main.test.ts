/**
 * E2E test: Authentication — API Key
 *
 * Validates that the generated ApiKeyClient correctly sends API key credentials
 * via the `x-ms-api-key` header when communicating with a live mock server.
 *
 * This is the first Spector e2e test (SPECTOR-3) and serves as a proof-of-concept
 * for the full pipeline: TypeSpec → emit → generated client → mock server → test.
 *
 * Mock server expectations (from @typespec/http-specs authentication/api-key):
 *   - GET /authentication/api-key/valid  — expects header `x-ms-api-key: valid-key`, returns 204
 *   - GET /authentication/api-key/invalid — expects header `x-ms-api-key: invalid-key`, returns 403
 */
import { describe, expect, it } from "vitest";
import { ApiKeyClient } from "../../../generated/authentication/api-key/src/index.js";

describe("Authentication.ApiKey", () => {
  /**
   * Client constructed with a valid API key.
   * The Spector mock server on port 3002 recognizes `valid-key` and returns 204.
   */
  const validClient = new ApiKeyClient(
    { key: "valid-key" },
    {
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    },
  );

  /**
   * Validates that a request authenticated with a valid API key succeeds.
   * The `valid()` method should complete without error (returns void / undefined).
   */
  it("should authenticate with a valid API key", async () => {
    const result = await validClient.valid();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that a request authenticated with an invalid API key is rejected.
   * The mock server returns HTTP 403 with an error body, and the generated client
   * should throw a RestError with the corresponding status code.
   */
  it("should return error for an invalid API key", async () => {
    const invalidClient = new ApiKeyClient(
      { key: "invalid-key" },
      {
        endpoint: "http://localhost:3002",
        allowInsecureConnection: true,
      },
    );

    try {
      await invalidClient.invalid();
      expect.unreachable("Expected an error for invalid API key");
    } catch (error: any) {
      expect(error.statusCode).toBe(403);
    }
  });
});
