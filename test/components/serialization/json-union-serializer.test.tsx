/**
 * Test suite for the JsonUnionSerializer component.
 *
 * JsonUnionSerializer generates pass-through serializer functions for
 * non-discriminated union type aliases. These are simple `return item;`
 * functions that exist so model serialization code can uniformly call
 * `serializerRefkey(propertyType)` regardless of whether the type is
 * a model or union. They also ensure consumers who import these serializer
 * functions from the generated code are not broken.
 *
 * What is tested:
 * - A user-named union (isGeneratedName: false) with Input usage produces
 *   a serializer function (e.g., `fooSerializer`).
 * - The serializer function body is `return item;` (pass-through).
 * - The parameter type references the union type alias via refkey.
 * - The return type is `any` (matching the legacy emitter pattern).
 *
 * Why this matters:
 * Without union serializers, model serializer code that references a union
 * property type would either use inline passthrough (inconsistent with legacy)
 * or produce unresolved refkey references. The legacy emitter generates these
 * identity serializers for all user-defined named unions with Input usage,
 * and consumers may import them. Omitting them is a breaking change (SA-C13).
 */
import "@alloy-js/core/testing";
import type { SdkUnionType } from "@azure-tools/typespec-client-generator-core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { JsonUnionSerializer } from "../../../src/components/serialization/json-union-serializer.js";
import { UnionDeclaration } from "../../../src/components/union-declaration.js";
import { SdkTestFile } from "../../utils.jsx";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("JsonUnionSerializer", () => {
  /**
   * Tests that a user-named union with Input usage produces a pass-through
   * serializer function. The function is `function fooSerializer(item: Foo): any { return item; }`.
   *
   * This matches the legacy emitter behavior where named unions used in request
   * bodies get identity serializer functions. The serializer exists so that:
   * 1. Model serializers can call `serializerRefkey(union)` for union properties
   * 2. Consumers who import the serializer function are not broken
   */
  it("should render pass-through serializer for user-named union", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("MixedType")} {
          s: string,
          n: int32,
        }
        op ${t.op("sendMixed")}(@body value: MixedType): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    // Verify TCGC keeps the user-provided name and marks it as Input
    expect(unionType.isGeneratedName).toBe(false);

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        <JsonUnionSerializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for MixedType
       */
      export type MixedType = string | number;

      export function mixedTypeSerializer(item: MixedType): any {
        return item;
      }
    `);
  });

  /**
   * Tests that the serializer function name follows camelCase convention:
   * the union name is lowercased at the first character and suffixed with
   * "Serializer". For example, union `SchemaContentType` produces
   * `schemaContentTypeSerializer`.
   *
   * This validates the naming convention used by getUnionFunctionName()
   * which mirrors the legacy emitter's naming pattern for serializer functions.
   */
  it("should use correct naming convention for serializer function", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("MixedTypes")} {
          s: string,
          n: int32,
        }

        op ${t.op("sendData")}(@body value: MixedTypes): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        <JsonUnionSerializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for MixedTypes
       */
      export type MixedTypes = string | number;

      export function mixedTypesSerializer(item: MixedTypes): any {
        return item;
      }
    `);
  });
});
