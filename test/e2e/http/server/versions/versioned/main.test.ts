/**
 * E2E test: Server — Versions Versioned
 *
 * Validates that the generated VersionedClient correctly handles API version
 * placement in different positions (none, query parameter, path segment).
 * The default API version is "2022-12-01-preview".
 *
 * Mock server expectations (from @typespec/http-specs server/versions/versioned):
 *   - HEAD /server/versions/versioned/without-api-version                                           — returns 200 (no query params)
 *   - HEAD /server/versions/versioned/with-path-api-version/2022-12-01-preview                      — returns 200
 *   - HEAD /server/versions/versioned/with-query-api-version?api-version=2022-12-01-preview         — returns 200
 *   - HEAD /server/versions/versioned/with-query-old-api-version?api-version=2021-01-01-preview     — returns 200
 */
import { describe, expect, it } from "vitest";
import { VersionedClient } from "../../../../generated/server/versions/versioned/src/index.js";

describe("Server.Versions.Versioned", () => {
  /**
   * Client constructed with the mock server endpoint.
   * Defaults to apiVersion "2022-12-01-preview" (set in the generated context).
   */
  const client = new VersionedClient("http://localhost:3002", {
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
   * Validates that the client correctly places the API version as a path segment.
   * The URL should be: /server/versions/versioned/with-path-api-version/2022-12-01-preview
   */
  it("should perform operation with path api-version", async () => {
    const result = await client.withPathApiVersion();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that the client correctly places the API version as a query parameter.
   * The URL should include: ?api-version=2022-12-01-preview
   */
  it("should perform operation with query api-version", async () => {
    const result = await client.withQueryApiVersion();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that the client can send an older API version as a query parameter.
   * Requires constructing a separate client with apiVersion "2021-01-01-preview".
   * The URL should include: ?api-version=2021-01-01-preview
   */
  it("should perform operation with query old api-version", async () => {
    const oldVersionClient = new VersionedClient("http://localhost:3002", {
      allowInsecureConnection: true,
      apiVersion: "2021-01-01-preview",
    });
    const result = await oldVersionClient.withQueryOldApiVersion();
    expect(result).toBeUndefined();
  });
});
