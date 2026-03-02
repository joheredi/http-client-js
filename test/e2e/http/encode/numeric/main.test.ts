/**
 * E2E tests for Encode.Numeric — validates that the generated client correctly
 * handles numeric values encoded as strings (safeint, uint32, uint8).
 *
 * These tests are currently skipped because the numeric string encoding
 * functionality is not yet fully supported in the runtime.
 */
import { describe, expect, it } from "vitest";
import { NumericClient } from "../../../generated/encode/numeric/src/index.js";

describe("Encode.Numeric", () => {
  describe("PropertyOperations", () => {
    const client = new NumericClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should send and receive safeint as string", async () => {
      const payload = { value: "10000000000" };
      const response = await client.property.safeintAsString(payload);
      expect(response).toEqual(payload);
    });

    it("should send and receive optional uint32 as string", async () => {
      const payload = { value: "1" };
      const response = await client.property.uint32AsStringOptional(payload);
      expect(response).toEqual(payload);
    });

    it("should send and receive uint8 as string", async () => {
      const payload = { value: "255" };
      const response = await client.property.uint8AsString(payload);
      expect(response).toEqual(payload);
    });
  });
});
