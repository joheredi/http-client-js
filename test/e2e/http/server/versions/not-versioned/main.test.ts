/**
 * E2E test: Server — Versions Not Versioned
 *
 * Validates that the generated NotVersionedClient correctly handles API version
 * placement when the service is not inherently versioned. The API version must
 * be explicitly provided as a method parameter for query and path operations.
 *
 * Mock server expectations (from @typespec/http-specs server/versions/not-versioned):
 *   - HEAD /server/versions/not-versioned/without-api-version                       — returns 200 (no query params)
 *   - HEAD /server/versions/not-versioned/with-path-api-version/v1.0                — returns 200
 *   - HEAD /server/versions/not-versioned/with-query-api-version?api-version=v1.0   — returns 200
 */
import { describe, expect, it } from "vitest";
import { NotVersionedClient } from "../../../../generated/server/versions/not-versioned/src/index.js";

describe("Server.Versions.NotVersioned", () => {
  /**
   * Client constructed with the mock server endpoint.
   * No default API version since the service is not versioned.
   */
  const client = new NotVersionedClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Validates that an operation without API version in the URL succeeds.
   * The mock server asserts that no query parameters are present.
   */
  it("should perform operation without api-version", async () => {
    const result = await client.withoutApiVersion();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that the client correctly passes API version as a path segment.
   * The apiVersion "v1.0" is provided as a method parameter.
   */
  it("should perform operation with path api-version", async () => {
    const result = await client.withPathApiVersion("v1.0");
    expect(result).toBeUndefined();
  });

  /**
   * Validates that the client correctly passes API version as a query parameter.
   * The apiVersion "v1.0" is provided as a method parameter.
   */
  it("should perform operation with query api-version", async () => {
    const result = await client.withQueryApiVersion("v1.0");
    expect(result).toBeUndefined();
  });
});
