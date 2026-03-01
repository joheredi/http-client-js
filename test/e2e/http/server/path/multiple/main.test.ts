/**
 * E2E test: Server — Path Multiple
 *
 * Validates that the generated MultipleClient correctly constructs server
 * URLs using multiple path parameters. The client embeds the API version
 * in the base URL path (e.g., `/server/path/multiple/v1.0`).
 *
 * Mock server expectations (from @typespec/http-specs server/path/multiple):
 *   - GET /server/path/multiple/v1.0      — returns 204 (no operation params)
 *   - GET /server/path/multiple/v1.0/test — returns 204 (with operation path param)
 */
import { describe, expect, it } from "vitest";
import { MultipleClient } from "../../../../generated/server/path/multiple/src/index.js";

describe("Server.Path.Multiple", () => {
  /**
   * Client constructed with the mock server endpoint.
   * The default API version "v1.0" is embedded in the base URL path.
   */
  const client = new MultipleClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Validates that the client can make a request with only the client-level
   * path parameters (endpoint + API version), without any operation-level params.
   */
  it("should call operation with client path parameters only", async () => {
    const result = await client.noOperationParams();
    expect(result).toBeUndefined();
  });

  /**
   * Validates that the client correctly appends an operation-level path parameter
   * ("test") after the client-level path parameters (endpoint + API version).
   */
  it("should call operation with client and method path parameters", async () => {
    const result = await client.withOperationPathParam("test");
    expect(result).toBeUndefined();
  });
});
