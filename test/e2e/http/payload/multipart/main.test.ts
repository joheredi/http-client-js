/**
 * E2E tests for Payload.MultiPart — validates multipart/form-data request handling.
 *
 * Spector spec: payload/multipart
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Basic multipart requests send id + binary image
 * - Wire name mapping works for field names
 * - Optional parts can be partially provided
 * - Binary arrays send multiple files
 * - File metadata (filename, content-type) is preserved
 * - JSON parts are sent alongside binary parts
 * - HttpPart features (content types, non-string values, arrays) work
 * - File operations with specific content types and required filenames work
 *
 * NOTE: The generated model types use Uint8Array but the multipart serializer
 * (createFilePartDescriptor) also accepts file descriptor objects with
 * { contents, filename, contentType }. The mock server requires filenames
 * for binary parts, so we use file descriptors here.
 */
import { describe, it } from "vitest";
import { MultiPartClient } from "../../../generated/payload/multipart/src/index.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specsAssetsDir = resolve(
  __dirname,
  "../../../../../submodules/typespec/packages/http-specs/assets",
);
const jpegContents = new Uint8Array(
  readFileSync(resolve(specsAssetsDir, "image.jpg")),
);
const pngContents = new Uint8Array(
  readFileSync(resolve(specsAssetsDir, "image.png")),
);

describe("Payload.MultiPart", () => {
  const client = new MultiPartClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("formData", () => {
    it("should send basic multipart request", async () => {
      await client.formData.basic({
        id: "123",
        profileImage: {
          contents: jpegContents,
          filename: "test.jpg",
        } as any,
      });
    });

    it("should send multipart request with wire name", async () => {
      await client.formData.withWireName({
        identifier: "123",
        image: {
          contents: jpegContents,
          filename: "test.jpg",
        } as any,
      });
    });

    it("should send optional parts - id only", async () => {
      await client.formData.optionalParts({
        id: "123",
      });
    });

    it("should send optional parts - profileImage only", async () => {
      await client.formData.optionalParts({
        profileImage: {
          contents: jpegContents,
          filename: "test.jpg",
        } as any,
      });
    });

    it("should send optional parts - both id and profileImage", async () => {
      await client.formData.optionalParts({
        id: "123",
        profileImage: {
          contents: jpegContents,
          filename: "test.jpg",
        } as any,
      });
    });

    it("should send binary array parts", async () => {
      await client.formData.binaryArrayParts({
        id: "123",
        pictures: [
          { filename: "test1.png", contents: pngContents },
          { filename: "test2.png", contents: pngContents },
        ] as any,
      });
    });

    it("should send file array and basic parts", async () => {
      await client.formData.fileArrayAndBasic({
        id: "123",
        address: { city: "X" },
        profileImage: {
          filename: "hello.jpg",
          contents: jpegContents,
        } as any,
        pictures: [
          { filename: "test1.png", contents: pngContents },
          { filename: "test2.png", contents: pngContents },
        ] as any,
      });
    });

    it("should send json part with binary part", async () => {
      await client.formData.jsonPart({
        address: { city: "X" },
        profileImage: {
          filename: "hello.jpg",
          contents: jpegContents,
        } as any,
      });
    });

    it("should send multi binary parts", async () => {
      await client.formData.multiBinaryParts({
        profileImage: {
          filename: "hello.jpg",
          contents: jpegContents,
        } as any,
      });

      await client.formData.multiBinaryParts({
        profileImage: {
          filename: "hello.jpg",
          contents: jpegContents,
        } as any,
        picture: {
          filename: "test1.png",
          contents: pngContents,
        } as any,
      });
    });

    it("should check filename and content type", async () => {
      await client.formData.checkFileNameAndContentType({
        id: "123",
        profileImage: {
          filename: "hello.jpg",
          contentType: "image/jpg",
          contents: jpegContents,
        } as any,
      });
    });

    describe("httpParts", () => {
      it("should send JSON array and file array", async () => {
        await client.formData.httpParts.jsonArrayAndFileArray({
          id: "123",
          address: { city: "X" },
          profileImage: {
            filename: "test.jpg",
            contents: jpegContents,
            contentType: "application/octet-stream",
          },
          previousAddresses: [{ city: "Y" }, { city: "Z" }],
          pictures: [
            {
              filename: "test1.png",
              contents: pngContents,
              contentType: "application/octet-stream",
            },
            {
              filename: "test2.png",
              contents: pngContents,
              contentType: "application/octet-stream",
            },
          ],
        });
      });

      it("should send non-string float value", async () => {
        await client.formData.httpParts.nonString.float({ temperature: 0.5 });
      });

      describe("contentType", () => {
        it("should send image/jpeg content type", async () => {
          await client.formData.httpParts.contentType.imageJpegContentType({
            profileImage: {
              contents: jpegContents,
              filename: "hello.jpg",
            },
          });
        });

        it("should send optional content type", async () => {
          await client.formData.httpParts.contentType.optionalContentType({
            profileImage: {
              contents: jpegContents,
              filename: "hello.jpg",
            },
          });
        });

        it("should send required content type", async () => {
          await client.formData.httpParts.contentType.requiredContentType({
            profileImage: {
              contents: jpegContents,
              filename: "hello.jpg",
              contentType: "application/octet-stream",
            },
          });
        });
      });
    });

    describe("file", () => {
      it("should upload file with specific content type", async () => {
        await client.formData.file.uploadFileSpecificContentType({
          file: {
            contents: pngContents,
            filename: "image.png",
          },
        });
      });

      it("should upload file with required filename", async () => {
        await client.formData.file.uploadFileRequiredFilename({
          file: {
            contents: pngContents,
            filename: "image.png",
          },
        });
      });

      it("should upload file array", async () => {
        await client.formData.file.uploadFileArray({
          files: [
            { contents: pngContents, filename: "image1.png" },
            { contents: pngContents, filename: "image2.png" },
          ],
        });
      });
    });
  });
});
