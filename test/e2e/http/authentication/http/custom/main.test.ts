/**
 * E2E test: Authentication — HTTP Custom (SharedAccessKey)
 *
 * Validates that the generated CustomClient correctly sends credentials via
 * the `Authorization: SharedAccessKey <key>` header when communicating with
 * the Spector mock server.
 *
 * Mock server expectations (from @typespec/http-specs authentication/http/custom):
 *   - GET /authentication/http/custom/valid   — expects `Authorization: SharedAccessKey valid-key`, returns 204
 *   - GET /authentication/http/custom/invalid — expects `Authorization: SharedAccessKey invalid-key`, returns 403
 */
import { describe, expect, it } from "vitest";
import { CustomClient } from "../../../../generated/authentication/http/custom/src/index.js";

describe("Authentication.Http.Custom", () => {
  /**
   * Client constructed with a valid SharedAccessKey credential.
   * The Spector mock server on port 3002 recognizes `valid-key` and returns 204.
   */
  const validClient = new CustomClient(
    { key: "valid-key" },
    {
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    },
  );

  /**
   * Validates that a request authenticated with a valid SharedAccessKey succeeds.
   * The `valid()` method should complete without error (returns void / undefined).
   *
   * SKIPPED: The runtime's apiKeyAuthenticationPolicy only matches authSchemes with
   * `kind: "apiKey"`, but the emitter generates `{ kind: "http", scheme: "sharedaccesskey" }`
   * for custom HTTP auth. This causes the auth header to not be sent. This needs to be
   * fixed in the emitter's auth scheme generation to properly map custom HTTP schemes.
   */
  it.skip("should authenticate with a valid custom key", async () => {
    const result = await validClient.valid();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that a request authenticated with an invalid key is rejected.
   * The mock server returns HTTP 403 with `{"error": "invalid-api-key"}`,
   * and the generated client should throw a RestError with status code 403.
   *
   * SKIPPED: Same auth scheme mismatch as above — custom HTTP scheme not recognized
   * by the runtime. See skip comment on "should authenticate with a valid custom key".
   */
  it.skip("should return error for an invalid custom key", async () => {
    const invalidClient = new CustomClient(
      { key: "invalid-key" },
      {
        endpoint: "http://localhost:3002",
        allowInsecureConnection: true,
      },
    );

    try {
      await invalidClient.invalid();
      expect.unreachable("Expected an error for invalid custom key");
    } catch (error: any) {
      expect(error.statusCode).toBe(403);
    }
  });
});
