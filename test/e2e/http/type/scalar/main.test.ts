/**
 * E2E test: Type — Scalar
 *
 * Validates that the generated ScalarClient correctly handles various scalar
 * types (string, boolean, unknown, decimal, decimal128) through get/put
 * operations and verification workflows against the Spector mock server.
 *
 * Mock server expectations (from @typespec/http-specs type/scalar):
 *   - GET/PUT for string, boolean, unknown value types
 *   - Decimal/Decimal128 responseBody, requestBody, requestParameter operations
 *   - DecimalVerify/Decimal128Verify prepareVerify + verify operations
 */
import { describe, expect, it } from "vitest";
import { ScalarClient } from "../../../generated/type/scalar/src/index.js";

describe("Type.Scalar", () => {
  const client = new ScalarClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("string", () => {
    it("should get a string value", async () => {
      const response = await client.string.get();
      expect(response).toBe("test");
    });

    it("should put a string value", async () => {
      await client.string.put("test");
    });
  });

  describe("boolean", () => {
    it("should get a boolean value", async () => {
      const response = await client.boolean.get();
      expect(response).toBe(true);
    });

    it("should put a boolean value", async () => {
      await client.boolean.put(true);
    });
  });

  describe("unknown", () => {
    it("should get an unknown value", async () => {
      const response = await client.unknown.get();
      expect(response).toBe("test");
    });

    it("should put an unknown value", async () => {
      await client.unknown.put("test");
    });
  });

  describe("decimalType", () => {
    it("should get a decimal value in response body", async () => {
      const response = await client.decimalType.responseBody();
      expect(response).toBe(0.33333);
    });

    it("should send a decimal value in request body", async () => {
      await client.decimalType.requestBody(0.33333);
    });

    it("should send a decimal value as request parameter", async () => {
      await client.decimalType.requestParameter(0.33333);
    });
  });

  describe("decimal128Type", () => {
    it("should get a decimal128 value in response body", async () => {
      const response = await client.decimal128Type.responseBody();
      expect(response).toBe(0.33333);
    });

    it("should send a decimal128 value in request body", async () => {
      await client.decimal128Type.requestBody(0.33333);
    });

    it("should send a decimal128 value as request parameter", async () => {
      await client.decimal128Type.requestParameter(0.33333);
    });
  });

  describe("decimalVerify", () => {
    it("should prepare verify values for decimal", async () => {
      const response = await client.decimalVerify.prepareVerify();
      expect(response).toEqual([0.1, 0.1, 0.1]);
    });

    it("should send a decimal value to verify", async () => {
      await client.decimalVerify.verify(0.3);
    });
  });

  describe("decimal128Verify", () => {
    it("should prepare verify values for decimal128", async () => {
      const response = await client.decimal128Verify.prepareVerify();
      expect(response).toEqual([0.1, 0.1, 0.1]);
    });

    it("should send a decimal128 value to verify", async () => {
      await client.decimal128Verify.verify(0.3);
    });
  });
});
