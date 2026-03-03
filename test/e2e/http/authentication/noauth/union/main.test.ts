/**
 * E2E test: Authentication — NoAuth Union (NoAuth | OAuth2)
 *
 * Validates that the generated UnionClient supports both unauthenticated
 * requests and OAuth2-authenticated requests. The TypeSpec spec declares a
 * union of two auth schemes:
 *   - NoAuth (no credentials required)
 *   - OAuth2 via Bearer token
 *
 * This tests that a client configured with an OAuth2 credential can still
 * make requests to endpoints that don't require authentication, as well as
 * endpoints that require a valid Bearer token.
 *
 * Mock server expectations (from @typespec/http-specs authentication/noauth/union):
 *   - GET /authentication/noauth/union/valid      — no auth required, returns 204
 *   - GET /authentication/noauth/union/validtoken  — expects `Authorization: Bearer https://security.microsoft.com/.default`, returns 204
 */
import { describe, expect, it } from "vitest";
import { UnionClient } from "../../../../generated/authentication/noauth/union/src/index.js";

describe("Authentication.Noauth.Union", () => {
  /**
   * Client constructed with a valid OAuth2 token credential.
   * The getOAuth2Token callback returns the scope value as the token,
   * which the mock server recognizes as valid for the validToken endpoint.
   */
  const client = new UnionClient(
    {
      getOAuth2Token: async () => "https://security.microsoft.com/.default",
    } as any,
    {
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    },
  );

  /**
   * Validates that a request to an endpoint with no auth requirement succeeds.
   * Even though the client is configured with OAuth2 credentials, the NoAuth
   * union member allows this endpoint to be called without authentication.
   * The `validNoAuth()` method should complete without error (returns void / undefined).
   */
  it("should succeed without authentication", async () => {
    const result = await client.validNoAuth();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that a request with a valid OAuth2 Bearer token succeeds.
   * The `validToken()` method sends the token via the Authorization header
   * and should complete without error (returns void / undefined).
   */
  it("should authenticate with a valid OAuth2 token", async () => {
    const result = await client.validToken();
    expect(result).toBeUndefined();
  });
});
