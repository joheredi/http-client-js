/**
 * E2E test: Server — Path Single
 *
 * Validates that the generated SingleClient correctly constructs the server
 * URL from a single endpoint parameter. The client takes the endpoint as a
 * constructor argument and appends operation-specific paths.
 *
 * Mock server expectations (from @typespec/http-specs server/path/single):
 *   - HEAD /server/path/single/myOp — returns 200
 */
import { describe, expect, it } from "vitest";
import { SingleClient } from "../../../../generated/server/path/single/src/index.js";

describe("Server.Path.Single", () => {
  /**
   * Client constructed with the mock server endpoint.
   * The SingleClient takes a single endpoint parameter used as the base URL.
   */
  const client = new SingleClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Validates that a basic HEAD operation succeeds on a single-path server.
   * The myOp() method should complete without error (returns void / undefined).
   */
  it("should perform a simple operation on a parameterized server", async () => {
    const result = await client.myOp();
    expect(result).toBeUndefined();
  });
});
