/**
 * Test suite for the SerializationHelpersFile component.
 *
 * SerializationHelpersFile generates `helpers/serializationHelpers.ts` containing
 * shared utility functions used by model serializers and deserializers.
 *
 * What is tested:
 * - serializeRecord function is rendered with correct signature and refkey
 * - deserializeRecord function is rendered with correct signature and refkey
 * - Collection builder functions (csv, multi, pipe, ssv, tsv, newline) are rendered
 * - Collection parser functions (csv, pipe, ssv, newline) are rendered
 * - areAllPropsUndefined function is rendered
 * - Each function's refkey enables cross-file imports via Alloy
 * - Functions are referenced from serializer components via refkey
 *
 * Why this matters:
 * Without these helper functions, the generated serializer/deserializer code
 * would reference functions that don't exist, causing runtime errors. The
 * collection builders are essential for query parameter formatting, and
 * serializeRecord/deserializeRecord are critical for dictionary-typed properties.
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
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
import { SerializationHelpersFile } from "../../../src/components/static-helpers/serialization-helpers.js";
import { serializationHelperRefkey } from "../../../src/utils/refkeys.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";
import { SdkTestFile } from "../../utils.js";

describe("SerializationHelpersFile", () => {
  describe("with simple void operation", () => {
    let program: any;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      ({ program } = await runner.compile(t.code`op test(): void;`));
    });

    /**
     * Tests that the serializeRecord function is rendered with the correct
     * export signature. This function is critical because it's called by
     * json-serializer.tsx for dict-typed properties.
     */
    it("should render serializeRecord function", async () => {
      const template = (
        <Output program={program} namePolicy={createTSNamePolicy()}>
          <SerializationHelpersFile />
        </Output>
      );

      const result = renderToString(template);
      expect(result).toContain("export function serializeRecord");
      expect(result).toContain("item: any");
      expect(result).toContain("Record<string, any>");
    });

    /**
     * Tests that the deserializeRecord function is rendered with the correct
     * export signature. This function is the inverse of serializeRecord and
     * is called by json-deserializer.tsx for dict-typed properties.
     */
    it("should render deserializeRecord function", async () => {
      const template = (
        <Output program={program} namePolicy={createTSNamePolicy()}>
          <SerializationHelpersFile />
        </Output>
      );

      const result = renderToString(template);
      expect(result).toContain("export function deserializeRecord");
      expect(result).toContain("deserializer");
    });

    /**
     * Tests that all 6 collection builder functions are rendered.
     * These are used by send functions to format array values into
     * delimited strings for query parameters (CSV, pipe, SSV, TSV,
     * newline, and multi formats).
     */
    it("should render all collection builder functions", async () => {
      const template = (
        <Output program={program} namePolicy={createTSNamePolicy()}>
          <SerializationHelpersFile />
        </Output>
      );

      const result = renderToString(template);
      expect(result).toContain("export function buildCsvCollection");
      expect(result).toContain("export function buildMultiCollection");
      expect(result).toContain("export function buildPipeCollection");
      expect(result).toContain("export function buildSsvCollection");
      expect(result).toContain("export function buildTsvCollection");
      expect(result).toContain("export function buildNewlineCollection");
    });

    /**
     * Tests that all 4 collection parser functions are rendered.
     * These are used by deserializers to parse delimited response
     * values back into arrays.
     */
    it("should render all collection parser functions", async () => {
      const template = (
        <Output program={program} namePolicy={createTSNamePolicy()}>
          <SerializationHelpersFile />
        </Output>
      );

      const result = renderToString(template);
      expect(result).toContain("export function parseCsvCollection");
      expect(result).toContain("export function parsePipeCollection");
      expect(result).toContain("export function parseSsvCollection");
      expect(result).toContain("export function parseNewlineCollection");
    });

    /**
     * Tests that the areAllPropsUndefined function is rendered.
     * This utility checks whether all specified properties on an object
     * are undefined, used to skip optional object groups in serializers.
     */
    it("should render areAllPropsUndefined function", async () => {
      const template = (
        <Output program={program} namePolicy={createTSNamePolicy()}>
          <SerializationHelpersFile />
        </Output>
      );

      const result = renderToString(template);
      expect(result).toContain("export function areAllPropsUndefined");
      expect(result).toContain("Record<string, any>");
      expect(result).toContain("properties: string[]");
    });

    /**
     * Tests that serializeRecord has a working refkey that enables Alloy's
     * auto-import resolution. When a component in a different file references
     * serializationHelperRefkey("serializeRecord"), Alloy should generate
     * an import from the helpers file.
     */
    it("should enable cross-file import via serializeRecord refkey", async () => {
      const template = (
        <Output program={program} namePolicy={createTSNamePolicy()}>
          <SourceFile path="consumer.ts">
            <FunctionDeclaration name="useHelper" export>
              {code`return ${serializationHelperRefkey("serializeRecord")}({});`}
            </FunctionDeclaration>
          </SourceFile>
          <SerializationHelpersFile />
        </Output>
      );

      const result = renderToString(template);
      // The consumer file should have an import from the helpers file
      expect(result).toContain('import { serializeRecord } from');
    });

    /**
     * Tests that deserializeRecord has a working refkey that enables Alloy's
     * auto-import resolution from a different file.
     */
    it("should enable cross-file import via deserializeRecord refkey", async () => {
      const template = (
        <Output program={program} namePolicy={createTSNamePolicy()}>
          <SourceFile path="consumer.ts">
            <FunctionDeclaration name="useHelper" export>
              {code`return ${serializationHelperRefkey("deserializeRecord")}({});`}
            </FunctionDeclaration>
          </SourceFile>
          <SerializationHelpersFile />
        </Output>
      );

      const result = renderToString(template);
      expect(result).toContain('import { deserializeRecord } from');
    });
  });

  /**
   * Tests that the json-serializer's serializeRecord usage now produces
   * a proper refkey-based import when rendering dict-typed model properties.
   * This validates the fix from plain-string to refkey reference.
   */
  it("should produce serializeRecord import when serializer handles dict properties", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          tags: Record<string>;
          counts: Record<int32>;
        }

        op createWidget(@body widget: Widget): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const { JsonSerializer } = await import(
      "../../../src/components/serialization/json-serializer.js"
    );
    const { ModelInterface } = await import(
      "../../../src/components/model-interface.js"
    );
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <Output program={sdkContext.emitContext.program} namePolicy={createTSNamePolicy()}>
        <SourceFile path="models.ts">
          <ModelInterface model={model} />
          <JsonSerializer model={model} />
        </SourceFile>
        <SerializationHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    // The serializer should reference serializeRecord via refkey, generating an import
    expect(result).toContain("serializeRecord");
  });
});
