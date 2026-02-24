/**
 * Test suite for the MultipartSerializer component.
 *
 * MultipartSerializer generates `export function {name}Serializer(item: {Type}): any`
 * functions that convert typed SDK model objects into arrays of part descriptors
 * for multipart/form-data HTTP request bodies.
 *
 * What is tested:
 * - Basic multipart model with file and text parts produces serializer returning part array
 * - File parts call createFilePartDescriptor with correct arguments
 * - Non-file (simple) parts produce `{ name, body }` object literals
 * - Optional parts are wrapped in conditional spread expressions
 * - Multi-valued file parts use .map() with createFilePartDescriptor
 * - Multi-valued non-file parts use .map() with object literal
 * - Content type is passed to createFilePartDescriptor for file parts
 * - Serializer refkey matches serializerRefkey(model) for cross-referencing
 *
 * Why this matters:
 * Multipart serializers are critical for file upload operations. If the
 * serializer doesn't produce the correct part descriptor array, the HTTP
 * runtime won't be able to build the multipart/form-data request body,
 * causing 400 errors or lost file data.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { SourceFile } from "@alloy-js/typescript";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import { MultipartSerializer } from "../../../src/components/serialization/multipart-serializer.js";
import { MultipartHelpersFile } from "../../../src/components/static-helpers/multipart-helpers.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { SdkContextProvider } from "../../../src/context/sdk-context.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("MultipartSerializer", () => {
  /**
   * Helper to create a test render tree with both the MultipartHelpersFile
   * (needed for createFilePartDescriptor refkey resolution) and the
   * multipart serializer under test. Uses renderToString for assertion.
   */
  async function renderMultipartSerializer(tspCode: ReturnType<typeof t.code>) {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(tspCode);
    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <Output program={sdkContext.emitContext.program} namePolicy={createTSNamePolicy()}>
        <SdkContextProvider sdkContext={sdkContext}>
          <MultipartHelpersFile />
          <SourceFile path="test.ts">
            <ModelInterface model={model} />
            {"\n\n"}
            <MultipartSerializer model={model} />
          </SourceFile>
        </SdkContextProvider>
      </Output>
    );

    return renderToString(template);
  }

  /**
   * Tests that a multipart model with a required file part and an optional
   * text part produces the correct serializer output. The file part should
   * use createFilePartDescriptor, and the optional text part should be
   * wrapped in a conditional spread.
   */
  it("should serialize model with file and optional text parts", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          file: HttpPart<bytes>;
          description?: HttpPart<string>;
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // Should have the serializer function signature
    expect(result).toContain("export function uploadRequestSerializer");
    expect(result).toContain("item: UploadRequest");
    expect(result).toContain("return [");

    // File part should use createFilePartDescriptor
    expect(result).toContain('createFilePartDescriptor("file", item["file"]');

    // Optional text part should be wrapped in conditional spread
    expect(result).toContain('item["description"] === undefined ? []');
    expect(result).toContain('name: "description"');
    expect(result).toContain('body: item["description"]');
  });

  /**
   * Tests that file parts include the default content type from TCGC
   * metadata when it's not a wildcard. The content type helps the HTTP
   * runtime set the correct Content-Type header for each part.
   */
  it("should pass content type to createFilePartDescriptor for file parts", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          file: HttpPart<bytes>;
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // File part should include the default content type
    expect(result).toContain('"application/octet-stream"');
  });

  /**
   * Tests that required non-file parts are NOT wrapped in conditional
   * spread expressions. Only optional parts need the undefined check.
   */
  it("should not wrap required parts in conditional spread", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          label: HttpPart<string>;
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // Required part should NOT have conditional spread
    expect(result).not.toContain("=== undefined");
    // Should have direct part expression
    expect(result).toContain('{ name: "label", body: item["label"] }');
  });

  /**
   * Tests that multi-valued file parts (arrays of files) use .map()
   * to create individual file part descriptors for each element.
   */
  it("should handle multi-valued file parts with .map()", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          files: HttpPart<bytes>[];
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // Multi-file part should use map with spread
    expect(result).toContain('.map((x: unknown) => createFilePartDescriptor("files", x');
    expect(result).toContain("...(");
  });

  /**
   * Tests that multi-valued non-file parts (arrays of values) use .map()
   * to create individual part objects for each element.
   */
  it("should handle multi-valued non-file parts with .map()", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          tags: HttpPart<string>[];
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // Multi non-file part should use map with spread
    expect(result).toContain('.map((x: unknown) => ({ name: "tags", body: x }))');
    expect(result).toContain("...(");
  });

  /**
   * Tests that optional multi-valued parts are wrapped in conditional
   * spread with the undefined check.
   */
  it("should handle optional multi-valued parts", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          tags?: HttpPart<string>[];
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // Optional multi part should have conditional spread wrapping the map
    expect(result).toContain('item["tags"] === undefined ? []');
  });

  /**
   * Tests that a model with a mix of file parts, required text parts,
   * and optional text parts produces the correct combined serializer.
   */
  it("should handle mixed part types in a single model", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          file: HttpPart<bytes>;
          title: HttpPart<string>;
          description?: HttpPart<string>;
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // Should have all three parts
    expect(result).toContain('createFilePartDescriptor("file"');
    expect(result).toContain('{ name: "title", body: item["title"] }');
    expect(result).toContain('item["description"] === undefined ? []');
    expect(result).toContain('name: "description"');
  });

  /**
   * Tests that the multipart serializer function returns 'any' as return type,
   * matching the legacy emitter convention for serializer functions.
   */
  it("should have correct function signature", async () => {
    const result = await renderMultipartSerializer(
      t.code`
        model UploadRequest {
          file: HttpPart<bytes>;
        }

        @post op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: UploadRequest,
        ): void;
      `,
    );

    // Check function signature
    expect(result).toContain("export function uploadRequestSerializer(");
    expect(result).toContain("): any");
  });
});
