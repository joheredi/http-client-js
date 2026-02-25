/**
 * Test suite for the MultipartHelpersFile component.
 *
 * MultipartHelpersFile generates `helpers/multipartHelpers.ts` containing
 * shared utility functions and types for multipart/form-data request bodies.
 *
 * What is tested:
 * - FileContents type alias is rendered with all valid binary content types
 * - createFilePartDescriptor function is rendered with correct signature
 * - createFilePartDescriptor handles structured file objects (with contents)
 * - createFilePartDescriptor handles raw binary values
 * - Both declarations are exported
 * - Refkeys enable cross-file imports via Alloy
 *
 * Why this matters:
 * Without these helpers, multipart serializers would reference functions/types
 * that don't exist, causing runtime errors. The createFilePartDescriptor
 * function is the foundation for file upload support in generated SDKs.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import {
  createTSNamePolicy,
  FunctionDeclaration,
  SourceFile,
} from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { beforeAll, describe, expect, it } from "vitest";
import { t } from "@typespec/compiler/testing";
import { MultipartHelpersFile } from "../../../src/components/static-helpers/multipart-helpers.js";
import { multipartHelperRefkey } from "../../../src/utils/refkeys.js";
import { TesterWithService } from "../../test-host.js";
import type { Program } from "@typespec/compiler";

describe("MultipartHelpersFile", () => {
  let program: Program;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that the FileContents type alias is rendered with all the valid
   * binary content type variants. This type is used by models that have
   * file upload properties in multipart requests.
   */
  it("should render FileContents type alias", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <MultipartHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export type FileContents");
    expect(result).toContain("string");
    expect(result).toContain("NodeJS.ReadableStream");
    expect(result).toContain("ReadableStream<Uint8Array>");
    expect(result).toContain("Uint8Array");
    expect(result).toContain("Blob");
  });

  /**
   * Tests that the createFilePartDescriptor function is rendered with the
   * correct export signature and parameters. This function is critical
   * because it's called by multipart serializers for file parts.
   */
  it("should render createFilePartDescriptor function", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <MultipartHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export function createFilePartDescriptor");
    expect(result).toContain("partName: string");
    expect(result).toContain("fileInput: any");
    expect(result).toContain("defaultContentType?: string");
  });

  /**
   * Tests that createFilePartDescriptor handles structured file objects
   * with contents, contentType, and filename properties.
   */
  it("should handle structured file objects in createFilePartDescriptor", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <MultipartHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("fileInput.contents");
    expect(result).toContain("fileInput.contentType ?? defaultContentType");
    expect(result).toContain("fileInput.filename");
  });

  /**
   * Tests that createFilePartDescriptor handles raw binary values
   * (non-structured file inputs).
   */
  it("should handle raw binary values in createFilePartDescriptor", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <MultipartHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    // The else branch handles raw values
    expect(result).toContain("body: fileInput");
    expect(result).toContain("contentType: defaultContentType");
  });

  /**
   * Tests that the createFilePartDescriptor function is referenceable via
   * multipartHelperRefkey from other components. This validates the cross-file
   * import resolution that Alloy provides through refkeys.
   */
  it("should be referenceable via multipartHelperRefkey", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <MultipartHelpersFile />
        <SourceFile path="consumer.ts">
          <FunctionDeclaration name="useHelper" returnType="any">
            {code`return ${multipartHelperRefkey("createFilePartDescriptor")}("test", "data");`}
          </FunctionDeclaration>
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    // The consumer file should import createFilePartDescriptor from the helpers file
    expect(result).toContain("createFilePartDescriptor");
  });

  /**
   * Tests that the FileContents type is referenceable via multipartHelperRefkey.
   */
  it("should make FileContents referenceable via refkey", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <MultipartHelpersFile />
        <SourceFile path="consumer.ts">
          <FunctionDeclaration
            name="processFile"
            returnType="void"
            parameters={[{ name: "contents", type: multipartHelperRefkey("FileContents") }]}
          >
            {code`console.log(contents);`}
          </FunctionDeclaration>
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("FileContents");
  });
});
