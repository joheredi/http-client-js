/**
 * E2E tests for Parameters.BodyOptionality — validates required/optional body parameter handling.
 *
 * Spector spec: parameters/body-optionality
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Required explicit body sends object body
 * - Optional explicit body can be set or omitted
 * - Required implicit body sends scalar value
 */
import { describe, it } from "vitest";
import { BodyOptionalityClient } from "../../../generated/parameters/body-optionality/src/index.js";

describe("Parameters.BodyOptionality", () => {
  const client = new BodyOptionalityClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should send required explicit body", async () => {
    await client.requiredExplicit({ name: "foo" });
  });

  it("should send optional explicit body (set)", async () => {
    await client.optionalExplicit.set({ body: { name: "foo" } });
  });

  it("should send optional explicit body (omit)", async () => {
    await client.optionalExplicit.omit();
  });

  it("should send required implicit body", async () => {
    await client.requiredImplicit("foo");
  });
});
