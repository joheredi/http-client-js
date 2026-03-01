/**
 * E2E test: Type — Enum (Fixed)
 *
 * Validates that the generated FixedClient correctly handles fixed enum values
 * (traditional enums with predefined string variants) through get/put operations
 * against the Spector mock server.
 *
 * Note: Our generated FixedClient does NOT expose getUnknownValue (fixed enums
 * do not accept unknown values by definition). The put operations are skipped
 * due to Spector mock server expecting plain/text content-type.
 *
 * Mock server expectations (from @typespec/http-specs type/enum/fixed):
 *   - GET  /type/enum/fixed/string/known-value   — returns "Monday"
 *   - PUT  /type/enum/fixed/string/known-value    — expects "Monday", returns 204
 *   - PUT  /type/enum/fixed/string/unknown-value  — expects "Weekend", returns 500
 */
import { describe, expect, it } from "vitest";
import { FixedClient } from "../../../../generated/type/enum/fixed/src/index.js";

describe("Type.Enum.Fixed", () => {
  const client = new FixedClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should get a known enum value", async () => {
    const response = await client.string.getKnownValue();
    expect(response).toBe("Monday");
  });

  // Spector mock server issue expecting plain/text content-type
  it.skip("should put a known enum value", async () => {
    await client.string.putKnownValue("Monday");
  });

  // Spector mock server issue expecting plain/text content-type
  it.skip("should put an unknown enum value and receive 500", async () => {
    try {
      await client.string.putUnknownValue("Weekend" as any);
      expect.unreachable("Expected error with status code 500");
    } catch (err: any) {
      expect(err.statusCode).toBe(500);
    }
  });
});
