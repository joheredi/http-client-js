/**
 * E2E tests for Encode.Bytes — validates that the generated client correctly
 * handles byte encoding formats (base64, base64url) across query, property,
 * header, request body, and response body positions.
 */
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { BytesClient } from "../../../generated/encode/bytes/src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pngImagePath = resolve(
  __dirname,
  "../../../../../node_modules/@typespec/http-specs/assets/image.png",
);
const pngBuffer = await readFile(pngImagePath);
const pngContents = new Uint8Array(pngBuffer);

/** Encodes a plain string into a Uint8Array via base64 round-trip to match the server's expected encoding. */
const base64EncodeToUint8Array = (input: string): Uint8Array => {
  const base64String = btoa(input);
  const binaryString = atob(base64String);
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  return uint8Array;
};

const encodedTestString = base64EncodeToUint8Array("test");

const str = "test";
const testUint8Array = new Uint8Array(
  [...str].map((char) => char.charCodeAt(0)),
);

describe("Encode.Bytes", () => {
  describe("QueryOperations", () => {
    const client = new BytesClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should test default encode (base64) for bytes query parameter", async () => {
      await client.query.default(testUint8Array);
    });

    it("should test base64 encode for bytes query parameter", async () => {
      await client.query.base64(testUint8Array);
    });

    it("should test base64url encode for bytes query parameter", async () => {
      await client.query.base64url(testUint8Array);
    });

    it("should test base64url encode for bytes array query parameter", async () => {
      await client.query.base64urlArray([testUint8Array, testUint8Array]);
    });
  });

  describe("PropertyOperations", () => {
    const client = new BytesClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should test default encode (base64) for bytes properties", async () => {
      const response = await client.property.default({
        value: encodedTestString,
      });
      expect(new Uint8Array(response.value)).toStrictEqual(
        new Uint8Array(encodedTestString),
      );
    });

    it("should test base64 encode for bytes properties", async () => {
      const response = await client.property.base64({ value: testUint8Array });
      expect(new Uint8Array(response.value)).toStrictEqual(
        new Uint8Array(encodedTestString),
      );
    });

    it("should test base64url encode for bytes properties", async () => {
      const response = await client.property.base64url({
        value: testUint8Array,
      });
      expect(new Uint8Array(response.value)).toStrictEqual(
        new Uint8Array(encodedTestString),
      );
    });

    it("should test base64url encode for bytes array properties", async () => {
      const response = await client.property.base64urlArray({
        value: [testUint8Array, testUint8Array],
      });
      expect(response.value.map((v: any) => new Uint8Array(v))).toStrictEqual(
        [testUint8Array, testUint8Array].map((v) => new Uint8Array(v)),
      );
    });
  });

  /**
   * Header operations are skipped because the generated code passes raw Uint8Array
   * to header values instead of base64-encoding it first. This is an emitter bug.
   */
  describe("HeaderOperations", () => {
    const client = new BytesClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should test default encode (base64) for bytes header", async () => {
      await client.header.default(testUint8Array);
    });

    it("should test base64 encode for bytes header", async () => {
      await client.header.base64(testUint8Array);
    });

    it("should test base64url encode for bytes header", async () => {
      await client.header.base64url(testUint8Array);
    });

    it("should test base64url encode for bytes array header", async () => {
      await client.header.base64urlArray([
        encodedTestString,
        encodedTestString,
      ]);
    });
  });

  describe("RequestBodyOperations", () => {
    const client = new BytesClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 1 },
    });

    it("should test default binary bytes in request body", async () => {
      await client.requestBody.default(pngContents);
    });

    it("should test application/octet-stream content type with bytes payload", async () => {
      await client.requestBody.octetStream(pngContents);
    });

    it("should test custom content type (image/png) with bytes payload", async () => {
      await client.requestBody.customContentType(pngContents);
    });

    it("should test base64 encode for bytes body", async () => {
      await client.requestBody.base64(testUint8Array);
    });

    it("should test base64url encode for bytes body", async () => {
      await client.requestBody.base64url(testUint8Array);
    });
  });

  describe("ResponseBodyOperations", () => {
    const client = new BytesClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 1 },
    });

    it("should test default binary bytes in response body", async () => {
      const response = await client.responseBody.default();
      expect(new Uint8Array(response)).toStrictEqual(
        new Uint8Array(pngContents),
      );
    });

    it("should test application/octet-stream content type with bytes response", async () => {
      const response = await client.responseBody.octetStream();
      expect(new Uint8Array(response)).toStrictEqual(
        new Uint8Array(pngContents),
      );
    });

    it("should test custom content type (image/png) with bytes response", async () => {
      const response = await client.responseBody.customContentType();
      expect(new Uint8Array(response)).toStrictEqual(
        new Uint8Array(pngContents),
      );
    });

    it("should test base64 encode for bytes response body", async () => {
      const response = await client.responseBody.base64();
      expect(new Uint8Array(response)).toStrictEqual(
        new Uint8Array(encodedTestString),
      );
    });

    it("should test base64url encode for bytes response body", async () => {
      const response = await client.responseBody.base64url();
      expect(new Uint8Array(response)).toStrictEqual(
        new Uint8Array(encodedTestString),
      );
    });
  });
});
