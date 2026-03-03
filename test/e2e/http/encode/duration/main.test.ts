/**
 * E2E tests for Encode.Duration — validates that the generated client correctly
 * encodes and decodes duration values in ISO 8601, int32/float/float64 seconds,
 * int32/float/float64 milliseconds, and LargerUnit variants across query,
 * property, and header positions.
 *
 * Some property tests are skipped due to known limitations with numeric-encoded
 * duration serialization in the runtime (the generated serializer passes
 * numeric values through as-is, but the runtime may not round-trip them
 * correctly through the body pipeline).
 */
import { describe, expect, it } from "vitest";
import { DurationClient } from "../../../generated/encode/duration/src/index.js";

describe("Encode.Duration", () => {
  describe("QueryOperations", () => {
    const client = new DurationClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should test default encode for a duration parameter", async () => {
      await client.query.default("P40D");
    });

    it("should test iso8601 encode for a duration parameter", async () => {
      await client.query.iso8601("P40D");
    });

    it("should test int32 seconds encode for a duration parameter", async () => {
      await client.query.int32Seconds(36);
    });

    it("should test float seconds encode for a duration parameter", async () => {
      await client.query.floatSeconds(35.625);
    });

    it("should test float64 seconds encode for a duration parameter", async () => {
      await client.query.float64Seconds(35.625);
    });

    it("should test int32 seconds encode for a duration array parameter", async () => {
      await client.query.int32SecondsArray([36, 47]);
    });

    it("should test int32 milliseconds encode for a duration parameter", async () => {
      await client.query.int32Milliseconds(36000);
    });

    it("should test float milliseconds encode for a duration parameter", async () => {
      await client.query.floatMilliseconds(35625);
    });

    it("should test float64 milliseconds encode for a duration parameter", async () => {
      await client.query.float64Milliseconds(35625);
    });

    it("should test int32 milliseconds encode for a duration array parameter", async () => {
      await client.query.int32MillisecondsArray([36000, 47000]);
    });

    it("should test int32 seconds larger unit encode for a duration parameter", async () => {
      await client.query.int32SecondsLargerUnit(120);
    });

    it("should test float seconds larger unit encode for a duration parameter", async () => {
      await client.query.floatSecondsLargerUnit(150);
    });

    it("should test int32 milliseconds larger unit encode for a duration parameter", async () => {
      await client.query.int32MillisecondsLargerUnit(180000);
    });

    it("should test float milliseconds larger unit encode for a duration parameter", async () => {
      await client.query.floatMillisecondsLargerUnit(210000);
    });
  });

  describe("PropertyOperations", () => {
    const client = new DurationClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 1 },
    });

    it("should test default encode for a duration property", async () => {
      const requestBody = { value: "P40D" };
      const response = await client.property.default(requestBody);
      expect(response).toEqual({ value: "P40D" });
    });

    it("should test iso8601 encode for a duration property", async () => {
      const requestBody = { value: "P40D" };
      const response = await client.property.iso8601(requestBody);
      expect(response).toEqual({ value: "P40D" });
    });

    it.skip("should test int32 seconds encode for a duration property", async () => {
      const requestBody = { value: 36 };
      const response = await client.property.int32Seconds(requestBody);
      expect(response).toEqual({ value: 36 });
    });

    it.skip("should test float seconds encode for a duration property", async () => {
      const requestBody = { value: 35.625 };
      const response = await client.property.floatSeconds(requestBody);
      expect(response).toEqual({ value: 35.625 });
    });

    it.skip("should test float64 seconds encode for a duration property", async () => {
      const requestBody = { value: 35.625 };
      const response = await client.property.float64Seconds(requestBody);
      expect(response).toEqual({ value: 35.625 });
    });

    it.skip("should test float seconds encode for a duration array property", async () => {
      const requestBody = { value: [35.625, 46.75] };
      const response = await client.property.floatSecondsArray(requestBody);
      expect(response).toEqual({ value: [35.625, 46.75] });
    });

    it.skip("should test int32 milliseconds encode for a duration property", async () => {
      const requestBody = { value: 36000 };
      const response = await client.property.int32Milliseconds(requestBody);
      expect(response).toEqual({ value: 36000 });
    });

    it.skip("should test float milliseconds encode for a duration property", async () => {
      const requestBody = { value: 35625 };
      const response = await client.property.floatMilliseconds(requestBody);
      expect(response).toEqual({ value: 35625 });
    });

    it.skip("should test float64 milliseconds encode for a duration property", async () => {
      const requestBody = { value: 35625 };
      const response = await client.property.float64Milliseconds(requestBody);
      expect(response).toEqual({ value: 35625 });
    });

    it.skip("should test float milliseconds encode for a duration array property", async () => {
      const requestBody = { value: [35625, 46750] };
      const response = await client.property.floatMillisecondsArray(requestBody);
      expect(response).toEqual({ value: [35625, 46750] });
    });

    it.skip("should test int32 seconds larger unit encode for a duration property", async () => {
      const requestBody = { value: 120 };
      const response = await client.property.int32SecondsLargerUnit(requestBody);
      expect(response).toEqual({ value: 120 });
    });

    it.skip("should test float seconds larger unit encode for a duration property", async () => {
      const requestBody = { value: 150.0 };
      const response = await client.property.floatSecondsLargerUnit(requestBody);
      expect(response).toEqual({ value: 150.0 });
    });

    it.skip("should test int32 milliseconds larger unit encode for a duration property", async () => {
      const requestBody = { value: 180000 };
      const response = await client.property.int32MillisecondsLargerUnit(requestBody);
      expect(response).toEqual({ value: 180000 });
    });

    it.skip("should test float milliseconds larger unit encode for a duration property", async () => {
      const requestBody = { value: 210000.0 };
      const response = await client.property.floatMillisecondsLargerUnit(requestBody);
      expect(response).toEqual({ value: 210000.0 });
    });
  });

  describe("HeaderOperations", () => {
    const client = new DurationClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 1 },
    });

    it("should test default encode for a duration header", async () => {
      await client.header.default("P40D");
    });

    it("should test iso8601 encode for a duration header", async () => {
      await client.header.iso8601("P40D");
    });

    it("should test iso8601 encode for a duration array header", async () => {
      await client.header.iso8601Array(["P40D", "P50D"]);
    });

    it("should test int32 seconds encode for a duration header", async () => {
      await client.header.int32Seconds(36);
    });

    it("should test float seconds encode for a duration header", async () => {
      await client.header.floatSeconds(35.625);
    });

    it("should test float64 seconds encode for a duration header", async () => {
      await client.header.float64Seconds(35.625);
    });

    it("should test int32 milliseconds encode for a duration header", async () => {
      await client.header.int32Milliseconds(36000);
    });

    it("should test float milliseconds encode for a duration header", async () => {
      await client.header.floatMilliseconds(35625);
    });

    it("should test float64 milliseconds encode for a duration header", async () => {
      await client.header.float64Milliseconds(35625);
    });

    it("should test int32 milliseconds encode for a duration array header", async () => {
      await client.header.int32MillisecondsArray([36000, 47000]);
    });

    it("should test int32 seconds larger unit encode for a duration header", async () => {
      await client.header.int32SecondsLargerUnit(120);
    });

    it("should test float seconds larger unit encode for a duration header", async () => {
      await client.header.floatSecondsLargerUnit(150);
    });

    it("should test int32 milliseconds larger unit encode for a duration header", async () => {
      await client.header.int32MillisecondsLargerUnit(180000);
    });

    it("should test float milliseconds larger unit encode for a duration header", async () => {
      await client.header.floatMillisecondsLargerUnit(210000);
    });
  });
});
