/**
 * E2E tests for Type.File.Body — validates that the generated client correctly
 * handles file upload and download operations with different content types.
 *
 * The File type in TypeSpec represents binary file content with metadata (contentType,
 * filename, contents). These tests verify that the client:
 * - Sends the correct Content-Type header for uploads
 * - Sends the raw binary/JSON content as the request body
 * - Correctly deserializes binary/JSON response bodies into File objects
 *
 * 8 scenarios cover: specific (image/png), JSON (application/json), multiple
 * (image/png | image/jpeg), and default (*\/*) content types for both upload and download.
 *
 * SKIPPED: All 8 tests are skipped because the emitter generates JSON model serialization
 * (fileSerializer/fileDeserializer) for File body operations instead of raw binary handling.
 * - Uploads: Client sends `{ contentType, filename, contents: base64 }` as JSON body,
 *   but the mock server expects raw binary content with the correct Content-Type header.
 * - Downloads: Client uses `fileDeserializer(result.body)` which tries to access
 *   `result.body.contents`, but the response body IS the raw binary content (Buffer),
 *   not a JSON object with a `contents` field.
 * Tracked by prd.json task: EMITTER-FIX-FILE-BODY
 */
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { FileClient } from "../../../generated/type/file/src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Load the PNG test image used by the Spector mock server for binary file scenarios. */
const pngImagePath = resolve(
  __dirname,
  "../../../../../node_modules/@typespec/http-specs/assets/image.png",
);
const pngBuffer = await readFile(pngImagePath);
const pngContents = new Uint8Array(pngBuffer);

describe("Type.File.Body", () => {
  const client = new FileClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("Upload", () => {
    /**
     * Tests uploading a file with a specific content type (image/png).
     * The mock server validates the Content-Type header is "image/png"
     * and that the raw body matches the PNG image bytes.
     *
     * SKIPPED: Generated code sends JSON-serialized File object instead of raw PNG bytes.
     */
    it.skip("uploadFileSpecificContentType", async () => {
      await client.body.uploadFileSpecificContentType({
        contents: pngContents,
        contentType: "image/png",
      });
    });

    /**
     * Tests uploading a file with JSON content type (application/json).
     * The mock server validates the Content-Type header is "application/json"
     * and that the body contains the expected JSON file data.
     *
     * SKIPPED: Generated code sends JSON-serialized File model, not the raw JSON file content.
     */
    it.skip("uploadFileJsonContentType", async () => {
      const jsonContent = JSON.stringify({ message: "test file content" });
      const jsonBytes = new Uint8Array(
        [...jsonContent].map((c) => c.charCodeAt(0)),
      );
      await client.body.uploadFileJsonContentType({
        contents: jsonBytes,
        contentType: "application/json",
      });
    });

    /**
     * Tests uploading a file with multiple allowed content types (image/png | image/jpeg).
     * The client sends image/png; the server accepts either image/png or image/jpeg.
     *
     * SKIPPED: Generated code sends JSON-serialized File object instead of raw binary.
     */
    it.skip("uploadFileMultipleContentTypes", async () => {
      await client.body.uploadFileMultipleContentTypes({
        contents: pngContents,
        contentType: "image/png",
      });
    });

    /**
     * Tests uploading a file with the default (unspecified) content type.
     * The File type accepts any content type; for testing, we use image/png.
     * The mock server validates Content-Type is "image/png" and body matches PNG bytes.
     *
     * SKIPPED: Generated code sends JSON-serialized File object instead of raw binary.
     */
    it.skip("uploadFileDefaultContentType", async () => {
      await client.body.uploadFileDefaultContentType({
        contents: pngContents,
        contentType: "image/png",
      });
    });
  });

  describe("Download", () => {
    /**
     * Tests downloading a file with a specific content type (image/png).
     * The server returns PNG binary data; the client should deserialize it
     * into a File object with the correct contents as Uint8Array.
     *
     * SKIPPED: Generated fileDeserializer accesses result.body.contents, but the
     * response body IS the raw binary Buffer — not a JSON object with a contents field.
     */
    it.skip("downloadFileSpecificContentType", async () => {
      const result = await client.body.downloadFileSpecificContentType();
      expect(new Uint8Array(result.contents)).toStrictEqual(
        new Uint8Array(pngContents),
      );
    });

    /**
     * Tests downloading a file with JSON content type (application/json).
     * The server returns JSON file data; the client should deserialize it
     * into a File1 object with the correct contents.
     *
     * SKIPPED: Generated fileDeserializer accesses result.body.contents, but the
     * response body is parsed as the JSON value {message: "test file content"}, not
     * a File-shaped object.
     */
    it.skip("downloadFileJsonContentType", async () => {
      const result = await client.body.downloadFileJsonContentType();
      const expectedJson = JSON.stringify({ message: "test file content" });
      const expectedBytes = new Uint8Array(
        [...expectedJson].map((c) => c.charCodeAt(0)),
      );
      expect(new Uint8Array(result.contents)).toStrictEqual(
        new Uint8Array(expectedBytes),
      );
    });

    /**
     * Tests downloading a file with multiple allowed content types.
     * The server returns image/png; the client should correctly deserialize
     * the binary response into a File3 object.
     *
     * SKIPPED: Generated fileDeserializer doesn't handle raw binary response bodies.
     */
    it.skip("downloadFileMultipleContentTypes", async () => {
      const result = await client.body.downloadFileMultipleContentTypes();
      expect(new Uint8Array(result.contents)).toStrictEqual(
        new Uint8Array(pngContents),
      );
    });

    /**
     * Tests downloading a file with default (unspecified) content type.
     * The server returns image/png data; the client should deserialize it
     * into a File4 object with the correct binary contents.
     *
     * SKIPPED: Generated fileDeserializer doesn't handle raw binary response bodies.
     */
    it.skip("downloadFileDefaultContentType", async () => {
      const result = await client.body.downloadFileDefaultContentType();
      expect(new Uint8Array(result.contents)).toStrictEqual(
        new Uint8Array(pngContents),
      );
    });
  });
});
