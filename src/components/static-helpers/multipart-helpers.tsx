import { code } from "@alloy-js/core";
import {
  FunctionDeclaration,
  SourceFile,
  TypeDeclaration,
} from "@alloy-js/typescript";
import { multipartHelperRefkey } from "../../utils/refkeys.js";

/**
 * Renders the `helpers/multipartHelpers.ts` source file containing
 * shared utility functions and types for multipart/form-data request bodies.
 *
 * These are static helpers — they don't depend on TCGC data or any specific
 * service definition. They provide:
 * - `FileContents`: A type alias for the valid binary content types that can
 *   be used in multipart file uploads (string, streams, Uint8Array, Blob).
 * - `createFilePartDescriptor`: A factory function that creates a part
 *   descriptor object from a file input, handling both raw binary values
 *   and structured file objects (with contents, contentType, filename).
 *
 * Each declaration is registered with a `multipartHelperRefkey` so other
 * components (multipart serializers) can reference them via refkey and
 * Alloy auto-generates import statements.
 *
 * @returns An Alloy JSX tree for the multipart helpers source file.
 */
export function MultipartHelpersFile() {
  return (
    <SourceFile path="helpers/multipartHelpers.ts">
      <FileContentsType />
      {"\n\n"}
      <CreateFilePartDescriptorFunction />
    </SourceFile>
  );
}

/**
 * Renders the `FileContents` type alias that defines the valid types for
 * binary file content in multipart uploads.
 *
 * This union type covers all the ways binary data can be provided:
 * - `string` — plain text or base64-encoded binary
 * - `NodeJS.ReadableStream` — Node.js server-side streams
 * - `ReadableStream<Uint8Array>` — WHATWG standard streams (browser/Deno)
 * - `Uint8Array` — raw binary data
 * - `Blob` — browser Blob objects
 *
 * @returns An Alloy JSX tree for the FileContents type declaration.
 */
function FileContentsType() {
  return (
    <TypeDeclaration
      name="FileContents"
      refkey={multipartHelperRefkey("FileContents")}
      export
    >
      {code`string | NodeJS.ReadableStream | ReadableStream<Uint8Array> | Uint8Array | Blob`}
    </TypeDeclaration>
  );
}

/**
 * Renders the `createFilePartDescriptor` function that creates a part
 * descriptor from a file input for multipart/form-data requests.
 *
 * The function handles two input shapes:
 * 1. **Structured file object** — has a `contents` property, optionally
 *    `contentType` and `filename`. The function extracts these and builds
 *    a descriptor with all metadata.
 * 2. **Raw binary value** — a plain `FileContents` value (string, Uint8Array,
 *    etc.). The function wraps it in a descriptor with just the part name
 *    and optional default content type.
 *
 * This mirrors the pattern used by the legacy emitter and the
 * `@typespec/ts-http-runtime` multipart handling.
 *
 * @returns An Alloy JSX tree for the createFilePartDescriptor function.
 */
function CreateFilePartDescriptorFunction() {
  return (
    <FunctionDeclaration
      name="createFilePartDescriptor"
      refkey={multipartHelperRefkey("createFilePartDescriptor")}
      export
      returnType="any"
      parameters={[
        { name: "partName", type: "string" },
        { name: "fileInput", type: "any" },
        { name: "defaultContentType", type: "string", optional: true },
      ]}
    >
      {code`if (fileInput.contents) {
  return {
    name: partName,
    body: fileInput.contents,
    contentType: fileInput.contentType ?? defaultContentType,
    filename: fileInput.filename,
  };
} else {
  return {
    name: partName,
    body: fileInput,
    contentType: defaultContentType,
  };
}`}
    </FunctionDeclaration>
  );
}
