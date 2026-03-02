/**
 * E2E tests for Encode.Datetime — validates that the generated client correctly
 * encodes and decodes datetime values in RFC3339, RFC7231, and unix timestamp
 * formats across query, property, header, and response header positions.
 *
 * Some unix timestamp tests are skipped due to known serialization issues
 * with the runtime's handling of numeric-encoded dates.
 */
import { describe, expect, it } from "vitest";
import { DatetimeClient } from "../../../generated/encode/datetime/src/index.js";

describe("Encode.Datetime", () => {
  describe("QueryOperations", () => {
    const client = new DatetimeClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should test default encode (rfc3339) for datetime query parameter", async () => {
      await client.query.default(new Date("2022-08-26T18:38:00.000Z"));
    });

    it("should test rfc3339 encode for datetime query parameter", async () => {
      await client.query.rfc3339(new Date("2022-08-26T18:38:00.000Z"));
    });

    it("should test rfc7231 encode for datetime query parameter", async () => {
      await client.query.rfc7231(new Date("2022-08-26T14:38:00.000Z"));
    });

    it("should test unixTimestamp encode for datetime query parameter", async () => {
      await client.query.unixTimestamp(new Date("2023-06-12T10:47:44Z"));
    });

    it("should test unixTimestamp encode for datetime array query parameter", async () => {
      const timestamps = [
        new Date("2023-06-12T10:47:44Z"),
        new Date("2023-06-14T09:17:36Z"),
      ];
      await client.query.unixTimestampArray(timestamps);
    });
  });

  describe("PropertyOperations", () => {
    const client = new DatetimeClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should handle default encode (rfc3339) for datetime property", async () => {
      const requestBody = { value: new Date("2022-08-26T18:38:00.000Z") };
      const response = await client.property.default(requestBody);
      expect(response).toEqual(requestBody);
    });

    it("should handle rfc3339 encode for datetime property", async () => {
      const requestBody = { value: new Date("2022-08-26T18:38:00.000Z") };
      const response = await client.property.rfc3339(requestBody);
      expect(response).toEqual(requestBody);
    });

    it("should handle rfc7231 encode for datetime property", async () => {
      const requestBody = { value: new Date("Fri, 26 Aug 2022 14:38:00 GMT") };
      const response = await client.property.rfc7231(requestBody);
      expect(response).toEqual(requestBody);
    });

    it.skip("should handle unixTimestamp encode for datetime property", async () => {
      const requestBody = { value: new Date("2023-06-12T06:41:04.000Z") };
      const response = await client.property.unixTimestamp(requestBody);
      expect(response).toEqual(requestBody);
    });

    it.skip("should handle unixTimestamp encode for datetime array property", async () => {
      const requestBody = {
        value: [
          new Date("2023-06-12T06:41:04.000Z"),
          new Date("2023-06-14T11:57:36.000Z"),
        ],
      };
      const response = await client.property.unixTimestampArray(requestBody);
      expect(response).toEqual(requestBody);
    });
  });

  describe("HeaderOperations", () => {
    const client = new DatetimeClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should test default encode (rfc7231) for datetime header", async () => {
      await client.header.default(new Date("2022-08-26T14:38:00.000Z"));
    });

    it("should test rfc3339 encode for datetime header", async () => {
      await client.header.rfc3339(new Date("2022-08-26T18:38:00.000Z"));
    });

    it("should test rfc7231 encode for datetime header", async () => {
      await client.header.rfc7231(new Date("2022-08-26T14:38:00.000Z"));
    });

    it("should test unixTimestamp encode for datetime header", async () => {
      await client.header.unixTimestamp(new Date("2023-06-12T10:47:44.000Z"));
    });

    it("should test unixTimestamp encode for datetime array header", async () => {
      const timestamps = [
        new Date("2023-06-12T10:47:44.000Z"),
        new Date("2023-06-14T09:17:36.000Z"),
      ];
      await client.header.unixTimestampArray(timestamps);
    });
  });

  /**
   * ResponseHeader operations validate that typed response headers are accessible
   * via the onResponse callback. The callback receives a FullOperationResponse
   * whose headers property is an HttpHeaders object (use .get() to read values).
   * These tests match the legacy emitter's pattern where response header operations
   * return Promise<void> and headers are inspected via the onResponse callback.
   */
  describe("ResponseHeaderOperations", () => {
    const client = new DatetimeClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 1 },
    });

    it("should handle default encode (rfc7231) for datetime response header", async () => {
      let headerValue: string | undefined;
      await client.responseHeader.default({
        onResponse: (res: any) => {
          headerValue = res.headers.get("value");
        },
      });
      expect(headerValue).toEqual("Fri, 26 Aug 2022 14:38:00 GMT");
    });

    it("should handle rfc3339 encode for datetime response header", async () => {
      let headerValue: string | undefined;
      await client.responseHeader.rfc3339({
        onResponse: (res: any) => {
          headerValue = res.headers.get("value");
        },
      });
      expect(headerValue).toEqual("2022-08-26T18:38:00.000Z");
    });

    it("should handle rfc7231 encode for datetime response header", async () => {
      let headerValue: string | undefined;
      await client.responseHeader.rfc7231({
        onResponse: (res: any) => {
          headerValue = res.headers.get("value");
        },
      });
      expect(headerValue).toEqual("Fri, 26 Aug 2022 14:38:00 GMT");
    });

    it("should handle unixTimestamp encode for datetime response header", async () => {
      let headerValue: string | undefined;
      await client.responseHeader.unixTimestamp({
        onResponse: (res: any) => {
          headerValue = res.headers.get("value");
        },
      });
      expect(headerValue).toEqual("1686566864");
    });
  });
});
