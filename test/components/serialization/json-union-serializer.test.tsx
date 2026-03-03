/**
 * Test suite for the JsonUnionSerializer component.
 *
 * JsonUnionSerializer generates serializer functions for union type aliases.
 * For non-discriminated unions, it generates simple pass-through `return item;`
 * functions. For discriminated unions (with `discriminatedOptions`), it generates
 * variant-detection logic using property existence checks, then wraps the
 * serialized variant in the appropriate wire format (envelope or inline).
 *
 * What is tested:
 * - A user-named union (isGeneratedName: false) with Input usage produces
 *   a serializer function (e.g., `fooSerializer`).
 * - Non-discriminated unions produce pass-through serializer bodies.
 * - Discriminated unions with envelope produce if/else chains that wrap
 *   the variant in `{ discriminator: "value", envelope: serialized }`.
 * - Discriminated unions without envelope (inline) produce if/else chains
 *   that add the discriminator inline: `{ discriminator: "value", ...serialized }`.
 * - Custom discriminator property names and envelope property names work correctly.
 *
 * Why this matters:
 * Without proper discriminated union serializers, the wire format would be incorrect
 * (missing discriminator, missing envelope wrapping), causing server-side validation
 * failures and broken round-trip serialization.
 */
import "@alloy-js/core/testing";
import type { SdkUnionType } from "@azure-tools/typespec-client-generator-core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { JsonUnionSerializer } from "../../../src/components/serialization/json-union-serializer.js";
import { JsonSerializer } from "../../../src/components/serialization/json-serializer.js";
import { UnionDeclaration } from "../../../src/components/union-declaration.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
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

  /**
   * Tests that a discriminated union with default envelope mode generates a
   * serializer that detects variants via unique property existence and wraps
   * the serialized variant in `{ "kind": "value", "value": serialized }`.
   *
   * This validates the core envelope serialization pattern where the wire format
   * wraps the variant data in a discriminator/value envelope structure. The
   * discriminator value comes from the TypeSpec union variant name, and the
   * envelope property name defaults to "value".
   */
  it("should generate envelope serializer for discriminated union with default names", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Cat")} { name: string; meow: boolean; }
        model ${t.model("Dog")} { name: string; bark: boolean; }

        @discriminated
        union ${t.union("PetWithEnvelope")} {
          cat: Cat,
          dog: Dog,
        }

        op ${t.op("sendPet")}(@body body: PetWithEnvelope): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;
    const catModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Cat",
    )!;
    const dogModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Dog",
    )!;

    expect(unionType.discriminatedOptions).toBeDefined();
    expect(unionType.discriminatedOptions!.envelope).toBe("object");

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={catModel} />
        {"\n\n"}
        <ModelInterface model={dogModel} />
        {"\n\n"}
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        <JsonSerializer model={catModel} />
        {"\n\n"}
        <JsonSerializer model={dogModel} />
        {"\n\n"}
        <JsonUnionSerializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Cat
       */
      export interface Cat {
        name: string;
        meow: boolean;
      }

      /**
       * model interface Dog
       */
      export interface Dog {
        name: string;
        bark: boolean;
      }

      /**
       * Alias for PetWithEnvelope
       */
      export type PetWithEnvelope = Cat | Dog;

      export function catSerializer(item: Cat): any {
        return {
          name: item["name"],
          meow: item["meow"],
        };
      }

      export function dogSerializer(item: Dog): any {
        return {
          name: item["name"],
          bark: item["bark"],
        };
      }

      export function petWithEnvelopeSerializer(item: PetWithEnvelope): any {
        if ("meow" in (item as any)) {
          return { "kind": "cat", "value": catSerializer(item as any) };
        }
        else if ("bark" in (item as any)) {
          return { "kind": "dog", "value": dogSerializer(item as any) };
        }
        return item;
      }
    `);
  });

  /**
   * Tests that a discriminated union with no-envelope mode generates a
   * serializer that adds the discriminator property inline with the
   * serialized variant properties: `{ "kind": "value", ...serialized }`.
   *
   * This validates the inline discriminator pattern where the wire format
   * includes the discriminator as a peer property alongside the variant data.
   */
  it("should generate inline serializer for discriminated union with no-envelope", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Cat")} { name: string; meow: boolean; }
        model ${t.model("Dog")} { name: string; bark: boolean; }

        @discriminated(#{ envelope: "none" })
        union ${t.union("PetInline")} {
          cat: Cat,
          dog: Dog,
        }

        op ${t.op("sendPet")}(@body body: PetInline): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;
    const catModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Cat",
    )!;
    const dogModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Dog",
    )!;

    expect(unionType.discriminatedOptions).toBeDefined();
    expect(unionType.discriminatedOptions!.envelope).toBe("none");

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={catModel} />
        {"\n\n"}
        <ModelInterface model={dogModel} />
        {"\n\n"}
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        <JsonSerializer model={catModel} />
        {"\n\n"}
        <JsonSerializer model={dogModel} />
        {"\n\n"}
        <JsonUnionSerializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Cat
       */
      export interface Cat {
        name: string;
        meow: boolean;
      }

      /**
       * model interface Dog
       */
      export interface Dog {
        name: string;
        bark: boolean;
      }

      /**
       * Alias for PetInline
       */
      export type PetInline = Cat | Dog;

      export function catSerializer(item: Cat): any {
        return {
          name: item["name"],
          meow: item["meow"],
        };
      }

      export function dogSerializer(item: Dog): any {
        return {
          name: item["name"],
          bark: item["bark"],
        };
      }

      export function petInlineSerializer(item: PetInline): any {
        if ("meow" in (item as any)) {
          return { "kind": "cat", ...catSerializer(item as any) };
        }
        else if ("bark" in (item as any)) {
          return { "kind": "dog", ...dogSerializer(item as any) };
        }
        return item;
      }
    `);
  });

  /**
   * Tests discriminated union with custom discriminator and envelope property names.
   * Verifies that `discriminatorPropertyName: "petType"` and
   * `envelopePropertyName: "petData"` appear in the generated serializer.
   */
  it("should generate envelope serializer with custom property names", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Cat")} { name: string; meow: boolean; }
        model ${t.model("Dog")} { name: string; bark: boolean; }

        @discriminated(#{ discriminatorPropertyName: "petType", envelopePropertyName: "petData" })
        union ${t.union("PetCustom")} {
          cat: Cat,
          dog: Dog,
        }

        op ${t.op("sendPet")}(@body body: PetCustom): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;
    const catModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Cat",
    )!;
    const dogModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Dog",
    )!;

    expect(unionType.discriminatedOptions!.discriminatorPropertyName).toBe(
      "petType",
    );
    expect(unionType.discriminatedOptions!.envelopePropertyName).toBe(
      "petData",
    );

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={catModel} />
        {"\n\n"}
        <ModelInterface model={dogModel} />
        {"\n\n"}
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        <JsonSerializer model={catModel} />
        {"\n\n"}
        <JsonSerializer model={dogModel} />
        {"\n\n"}
        <JsonUnionSerializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Cat
       */
      export interface Cat {
        name: string;
        meow: boolean;
      }

      /**
       * model interface Dog
       */
      export interface Dog {
        name: string;
        bark: boolean;
      }

      /**
       * Alias for PetCustom
       */
      export type PetCustom = Cat | Dog;

      export function catSerializer(item: Cat): any {
        return {
          name: item["name"],
          meow: item["meow"],
        };
      }

      export function dogSerializer(item: Dog): any {
        return {
          name: item["name"],
          bark: item["bark"],
        };
      }

      export function petCustomSerializer(item: PetCustom): any {
        if ("meow" in (item as any)) {
          return { "petType": "cat", "petData": catSerializer(item as any) };
        }
        else if ("bark" in (item as any)) {
          return { "petType": "dog", "petData": dogSerializer(item as any) };
        }
        return item;
      }
    `);
  });
});
