/**
 * E2E test: Authentication — Union (API Key + OAuth2)
 *
 * Validates that the generated UnionClient supports both API key and OAuth2
 * authentication. The TypeSpec spec declares a union of two auth schemes:
 *   - ApiKey via `x-ms-api-key` header
 *   - OAuth2 via Bearer token
 *
 * Mock server expectations (from @typespec/http-specs authentication/union):
 *   - GET /authentication/union/validkey   — expects `x-ms-api-key: valid-key`, returns 204
 *   - GET /authentication/union/validtoken — expects `Authorization: Bearer https://security.microsoft.com/.default`, returns 204
 */
import { describe, expect, it } from "vitest";
import { UnionClient } from "../../../generated/authentication/union/src/index.js";

describe("Authentication.Union", () => {
  /**
   * Validates that the client authenticates successfully using an API key.
   * When constructed with a KeyCredential ({ key: ... }), the client should
   * send the key via the `x-ms-api-key` header.
   */
  it("should authenticate with a valid API key", async () => {
    const client = new UnionClient(
      { key: "valid-key" },
      {
        endpoint: "http://localhost:3002",
        allowInsecureConnection: true,
      },
    );

    const result = await client.validKey();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that the client authenticates successfully using an OAuth2 token.
   * When constructed with a TokenCredential ({ getOAuth2Token: ... }), the
   * client should send the token as a Bearer authorization header.
   */
  it("should authenticate with a valid OAuth2 token", async () => {
    const client = new UnionClient(
      {
        getOAuth2Token: async () => "https://security.microsoft.com/.default",
      } as any,
      {
        endpoint: "http://localhost:3002",
        allowInsecureConnection: true,
      },
    );

    const result = await client.validToken();
    expect(result).toBeUndefined();
  });
});
