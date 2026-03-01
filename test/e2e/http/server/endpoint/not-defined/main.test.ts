/**
 * E2E test: Server — Endpoint Not Defined
 *
 * Validates that the generated NotDefinedClient works correctly when the
 * TypeSpec service does not define a specific server endpoint. The endpoint
 * must be provided entirely by the caller at construction time.
 *
 * Mock server expectations (from @typespec/http-specs server/endpoint/not-defined):
 *   - HEAD /server/endpoint/not-defined/valid — returns 200
 */
import { describe, expect, it } from "vitest";
import { NotDefinedClient } from "../../../../generated/server/endpoint/not-defined/src/index.js";

describe("Server.Endpoint.NotDefined", () => {
  /**
   * Client constructed with the full mock server endpoint.
   * Since the service has no server definition, the caller must provide
   * the complete endpoint URL.
   */
  const client = new NotDefinedClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Validates that the client can make a request to a server whose
   * endpoint is not defined in the TypeSpec spec but provided at runtime.
   */
  it("should handle a request to a server without a defined endpoint", async () => {
    const result = await client.valid();
    expect(result).toBeUndefined();
  });
});
