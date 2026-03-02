/**
 * E2E tests for Parameters.Basic — validates explicit and implicit body parameter handling.
 *
 * Spector spec: parameters/basic
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Explicit body parameters send an object body ({ name: "foo" })
 * - Implicit body parameters send a scalar value directly ("foo")
 */
import { describe, it } from "vitest";
import { BasicClient } from "../../../generated/parameters/basic/src/index.js";

describe("Parameters.Basic", () => {
  const client = new BasicClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should send explicit body simple parameter", async () => {
    await client.explicitBody.simple({ name: "foo" });
  });

  it("should send implicit body simple parameter", async () => {
    await client.implicitBody.simple("foo");
  });
});
