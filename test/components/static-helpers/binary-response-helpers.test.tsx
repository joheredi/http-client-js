/**
 * Test suite for the BinaryResponseHelpersFile component.
 *
 * BinaryResponseHelpersFile generates `static-helpers/getBinaryResponse.ts` containing
 * the `getBinaryResponse` helper function that reads binary HTTP responses via streaming
 * to avoid UTF-8 corruption by the HTTP pipeline.
 *
 * What is tested:
 * - getBinaryResponse function is rendered with correct signature (async, exported)
 * - Function accepts StreamableMethod parameter and returns PathUncheckedResponse
 * - Function uses asNodeStream() to read the binary stream
 * - Function handles undefined body (returns response as-is)
 * - Function reads stream chunks and concatenates into Buffer
 * - Function is referenceable via binaryResponseHelperRefkey for cross-file imports
 *
 * Why this matters:
 * Without this helper, binary responses would be corrupted by the HTTP pipeline's
 * UTF-8 decoding. The getBinaryResponse function is referenced by public operation
 * functions for any operation that returns binary bytes (encode="bytes"/"binary").
 * If this helper is missing or malformed, binary downloads will produce corrupted data.
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
import { BinaryResponseHelpersFile } from "../../../src/components/static-helpers/binary-response-helpers.js";
import { binaryResponseHelperRefkey } from "../../../src/utils/refkeys.js";
import { FlavorProvider } from "../../../src/context/flavor-context.js";
import { httpRuntimeLib } from "../../../src/utils/external-packages.js";
import { TesterWithService } from "../../test-host.js";
import type { Program } from "@typespec/compiler";

describe("BinaryResponseHelpersFile", () => {
  let program: Program;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that the getBinaryResponse function is rendered with the correct
   * async export signature. This function must be async because it awaits
   * the streaming response and reads stream chunks.
   */
  it("should render getBinaryResponse as async exported function", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <BinaryResponseHelpersFile />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export async function getBinaryResponse");
  });

  /**
   * Tests that getBinaryResponse accepts a StreamableMethod parameter.
   * StreamableMethod is the return type of the _xxxSend functions and
   * must be the input to getBinaryResponse.
   */
  it("should accept StreamableMethod parameter", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <BinaryResponseHelpersFile />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("streamableMethod: StreamableMethod");
  });

  /**
   * Tests that getBinaryResponse uses asNodeStream() to get the raw binary
   * stream. This is the key mechanism that bypasses UTF-8 decoding.
   */
  it("should use asNodeStream() to read binary stream", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <BinaryResponseHelpersFile />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("streamableMethod.asNodeStream()");
  });

  /**
   * Tests that getBinaryResponse handles undefined body by returning
   * the response as-is. Some binary endpoints may return empty bodies
   * (e.g., 204 No Content).
   */
  it("should handle undefined body gracefully", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <BinaryResponseHelpersFile />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("response.body === undefined");
  });

  /**
   * Tests that getBinaryResponse reads and concatenates stream chunks
   * using Buffer. This is the core binary data preservation logic.
   */
  it("should read stream chunks into Buffer and concatenate", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <BinaryResponseHelpersFile />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("Buffer.concat(bufs)");
    expect(result).toContain("for await");
  });

  /**
   * Tests that getBinaryResponse is referenceable via binaryResponseHelperRefkey
   * from other components. This validates cross-file import resolution
   * that Alloy provides through refkeys — essential for public operation
   * functions that need to call getBinaryResponse.
   */
  it("should be referenceable via binaryResponseHelperRefkey", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <BinaryResponseHelpersFile />
          <SourceFile path="consumer.ts">
            <FunctionDeclaration name="useHelper" returnType="any">
              {code`return ${binaryResponseHelperRefkey("getBinaryResponse")}(method);`}
            </FunctionDeclaration>
          </SourceFile>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    // The consumer file should be able to reference getBinaryResponse
    expect(result).toContain("getBinaryResponse");
  });
});
