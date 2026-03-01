/**
 * E2E tests for Encode.Duration — validates that the generated client correctly
 * encodes and decodes duration values in ISO 8601, int32 seconds, float seconds,
 * and float64 seconds formats across query, property, and header positions.
 *
 * Some tests are skipped due to known limitations with numeric-encoded duration
 * serialization in the runtime.
 */
import { describe, expect, it } from "vitest";
import { DurationClient } from "../../../generated/encode/duration/src/index.js";

describe("Encode.Duration", () => {
  describe("QueryOperations", () => {
    const client = new DurationClient({ endpoint: "http://localhost:3002", allowInsecureConnection: true });

    it("should test default encode for a duration parameter", async () => {
      await client.query.default("P40D");
    });

    it("should test iso8601 encode for a duration parameter", async () => {
      await client.query.iso8601("P40D");
    });

    it.skip("should test int32 seconds encode for a duration parameter", async () => {
      await client.query.int32Seconds(36);
    });

    it.skip("should test float seconds encode for a duration parameter", async () => {
      await client.query.floatSeconds(35.625);
    });

    it.skip("should test float64 seconds encode for a duration parameter", async () => {
      await client.query.float64Seconds(35.625);
    });

    it.skip("should test int32 seconds encode for a duration array parameter", async () => {
      await client.query.int32SecondsArray([36, 47]);
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

    it.skip("should test int32 seconds encode for a duration header", async () => {
      await client.header.int32Seconds(36);
    });

    it.skip("should test float seconds encode for a duration header", async () => {
      await client.header.floatSeconds(35.625);
    });

    it.skip("should test float64 seconds encode for a duration header", async () => {
      await client.header.float64Seconds(35.625);
    });
  });
});
