/**
 * E2E tests for Parameters.Query.Constant — validates constant query parameter handling.
 *
 * Spector spec: parameters/query
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Constant query parameters are automatically included in the request URL
 * - The mock server validates the constant value ("constantValue") is present
 */
import { describe, it } from "vitest";
import { QueryClient } from "../../../generated/parameters/query/src/index.js";

describe("Parameters.Query", () => {
  const client = new QueryClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("Constant", () => {
    it("should send constant query parameter", async () => {
      await client.constant.post();
    });
  });
});
