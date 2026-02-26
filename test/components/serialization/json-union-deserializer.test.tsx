/**
 * Test suite for the JsonUnionDeserializer component.
 *
 * JsonUnionDeserializer generates pass-through deserializer functions for
 * non-discriminated union type aliases. These are simple `return item;`
 * functions that exist so operation response deserialization can uniformly
 * call `deserializerRefkey(responseType)` regardless of whether the type
 * is a model or union.
 *
 * What is tested:
 * - A generated-name union (isGeneratedName: true) produces a deserializer
 *   with underscore-prefixed name (e.g., `_readResponseDeserializer`).
 * - The deserializer function body is `return item;` (pass-through).
 * - The return type references the union type alias via refkey.
 * - A user-named union (isGeneratedName: false) produces a deserializer
 *   without underscore prefix.
 *
 * Why this matters:
 * Without union deserializers, the refkey for the union's deserializer would
 * be unresolved, producing `<Unresolved Symbol>` placeholders in the generated
 * code. This is a critical correctness requirement — any operation that returns
 * a union type needs a deserializer function to call.
 */
import "@alloy-js/core/testing";
import type { SdkUnionType } from "@azure-tools/typespec-client-generator-core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { JsonUnionDeserializer } from "../../../src/components/serialization/json-union-deserializer.js";
import { UnionDeclaration } from "../../../src/components/union-declaration.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { SdkTestFile } from "../../utils.jsx";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("JsonUnionDeserializer", () => {
  /**
   * Tests that a generated-name union (anonymous response union like `Cat | Dog`)
   * produces a deserializer function with underscore-prefixed name and a simple
   * `return item;` body. This matches the legacy emitter pattern where TCGC-generated
   * union types get `_` prefix on both the type alias and the deserializer function.
   *
   * The deserializer is a pass-through because non-discriminated unions cannot be
   * routed to a specific subtype deserializer at runtime — the emitter has no way
   * to determine which variant the response actually is.
   */
  it("should render pass-through deserializer for generated-name union", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Cat")} { meow: boolean; }
        model ${t.model("Dog")} { bark: boolean; }
        op ${t.op("read")}(): { @body body: Cat | Dog };
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;
    const catModel = sdkContext.sdkPackage.models.find((m) => m.name === "Cat")!;
    const dogModel = sdkContext.sdkPackage.models.find((m) => m.name === "Dog")!;

    // Verify TCGC marks this as a generated name
    expect(unionType.isGeneratedName).toBe(true);

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={catModel} />
        {"\n\n"}
        <ModelInterface model={dogModel} />
        {"\n\n"}
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        <JsonUnionDeserializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      export interface Cat {
        meow: boolean;
      }

      export interface Dog {
        bark: boolean;
      }

      /**
       * Alias for _ReadResponse
       */
      export type _ReadResponse = Cat | Dog;

      export function _readResponseDeserializer(item: any): _ReadResponse {
        return item;
      }
    `);
  });

  /**
   * Tests that a user-named union (isGeneratedName: false) produces a deserializer
   * without the underscore prefix. User-defined unions like `union Pet { ... }`
   * keep their original name in both the type alias and the deserializer function.
   *
   * This verifies that the underscore prefix logic only applies to TCGC-generated
   * names, not to unions explicitly named by the TypeSpec author.
   */
  it("should render deserializer without underscore for user-named union", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("PetKind")} {
          s: string,
          n: int32,
        }
        op ${t.op("read")}(): { @body body: PetKind };
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    // Verify TCGC keeps the user-provided name
    expect(unionType.isGeneratedName).toBe(false);

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        <JsonUnionDeserializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for PetKind
       */
      export type PetKind = string | number;

      export function petKindDeserializer(item: any): PetKind {
        return item;
      }
    `);
  });
});
