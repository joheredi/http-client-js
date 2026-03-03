/**
 * E2E tests for Parameters.Path — validates required and optional path parameter handling.
 *
 * Spector spec: parameters/path
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Required path parameters are correctly interpolated into the URL (e.g., /normal/foo)
 * - Optional path parameters can be omitted (e.g., /optional)
 * - Optional path parameters can be provided (e.g., /optional/foo)
 */
import { describe, it } from "vitest";
import { PathClient } from "../../../generated/parameters/path/src/index.js";

describe("Parameters.Path", () => {
  const client = new PathClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should send required path parameter", async () => {
    await client.normal("foo");
  });

  it("should send request without optional path parameter", async () => {
    await client.optional();
  });

  it("should send request with optional path parameter", async () => {
    await client.optional({ name: "foo" });
  });
});
