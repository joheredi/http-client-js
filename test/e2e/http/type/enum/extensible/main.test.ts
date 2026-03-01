/**
 * E2E test: Type — Enum (Extensible)
 *
 * Validates that the generated ExtensibleClient correctly handles extensible
 * enum values (union-based string enums that accept unknown variants) through
 * get/put operations against the Spector mock server.
 *
 * Mock server expectations (from @typespec/http-specs type/enum/extensible):
 *   - GET  /type/enum/extensible/string/known-value   — returns "Monday"
 *   - GET  /type/enum/extensible/string/unknown-value  — returns "Weekend"
 *   - PUT  /type/enum/extensible/string/known-value   — expects "Monday", returns 204
 *   - PUT  /type/enum/extensible/string/unknown-value  — expects "Weekend", returns 204
 */
import { describe, expect, it } from "vitest";
import { ExtensibleClient } from "../../../../generated/type/enum/extensible/src/index.js";

describe("Type.Enum.Extensible", () => {
  const client = new ExtensibleClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should get a known enum value", async () => {
    const response = await client.string.getKnownValue();
    expect(response).toBe("Monday");
  });

  it("should get an unknown enum value", async () => {
    const response = await client.string.getUnknownValue();
    expect(response).toBe("Weekend");
  });

  it("should put a known enum value", async () => {
    await client.string.putKnownValue("Monday");
  });

  it("should put an unknown enum value", async () => {
    await client.string.putUnknownValue("Weekend");
  });
});
