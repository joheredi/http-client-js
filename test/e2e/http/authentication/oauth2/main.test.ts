/**
 * E2E test: Authentication — OAuth2
 *
 * Validates that the generated OAuth2Client correctly sends a Bearer token
 * in the Authorization header when communicating with the Spector mock server.
 *
 * The client uses an OAuth2TokenCredential that provides the token via the
 * `getOAuth2Token` callback. The mock server expects the token to equal
 * the default scope `https://security.microsoft.com/.default`.
 *
 * Mock server expectations (from @typespec/http-specs authentication/oauth2):
 *   - GET /authentication/oauth2/valid   — expects `Authorization: Bearer https://security.microsoft.com/.default`, returns 204
 *   - GET /authentication/oauth2/invalid — returns 403 with `{"error": "invalid-grant"}`
 */
import { describe, expect, it } from "vitest";
import { OAuth2Client } from "../../../generated/authentication/oauth2/src/index.js";

describe("Authentication.OAuth2", () => {
  /**
   * Client constructed with a valid OAuth2 token credential.
   * The getOAuth2Token callback returns the scope value as the token,
   * which the mock server recognizes as valid.
   */
  const validClient = new OAuth2Client(
    {
      getOAuth2Token: async () => "https://security.microsoft.com/.default",
    } as any,
    {
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    },
  );

  /**
   * Validates that a request authenticated with a valid OAuth2 token succeeds.
   * The `valid()` method should complete without error (returns void / undefined).
   */
  it("should authenticate with a valid OAuth2 token", async () => {
    const result = await validClient.valid();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that a request with an invalid OAuth2 token is rejected.
   * The mock server returns HTTP 403 with `{"error": "invalid-grant"}`.
   */
  it("should return error for an invalid OAuth2 token", async () => {
    const invalidClient = new OAuth2Client(
      {
        getOAuth2Token: async () => "invalid-token",
      } as any,
      {
        endpoint: "http://localhost:3002",
        allowInsecureConnection: true,
      },
    );

    try {
      await invalidClient.invalid();
      expect.unreachable("Expected an error for invalid OAuth2 token");
    } catch (error: any) {
      expect(error.statusCode).toBe(403);
    }
  });
});
