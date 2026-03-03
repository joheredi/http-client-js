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
import { JsonDeserializer } from "../../../src/components/serialization/json-deserializer.js";
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
    const catModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Cat",
    )!;
    const dogModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Dog",
    )!;

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
      /**
       * model interface Cat
       */
      export interface Cat {
        meow: boolean;
      }

      /**
       * model interface Dog
       */
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

  /**
   * Tests that a discriminated union with envelope mode generates a deserializer
   * that reads the discriminator property, then unwraps the data from the envelope
   * property and passes it to the variant's deserializer.
   *
   * Wire format: `{ "kind": "cat", "value": { "meow": true } }`
   * Client format: `Cat { meow: true }`
   *
   * This validates the envelope deserialization pattern — the deserializer must
   * switch on the discriminator value, then extract and deserialize the inner data.
   */
  it("should generate envelope deserializer for discriminated union", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Cat")} { meow: boolean; }
        model ${t.model("Dog")} { bark: boolean; }

        @discriminated
        union ${t.union("PetWithEnvelope")} {
          cat: Cat,
          dog: Dog,
        }

        op ${t.op("readPet")}(): { @body body: PetWithEnvelope };
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
        <JsonDeserializer model={catModel} />
        {"\n\n"}
        <JsonDeserializer model={dogModel} />
        {"\n\n"}
        <JsonUnionDeserializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Cat
       */
      export interface Cat {
        meow: boolean;
      }

      /**
       * model interface Dog
       */
      export interface Dog {
        bark: boolean;
      }

      /**
       * Alias for PetWithEnvelope
       */
      export type PetWithEnvelope = Cat | Dog;

      export function catDeserializer(item: any): Cat {
        return {
          meow: item["meow"],
        };
      }

      export function dogDeserializer(item: any): Dog {
        return {
          bark: item["bark"],
        };
      }

      export function petWithEnvelopeDeserializer(item: any): PetWithEnvelope {
        switch (item["kind"]) {
          case "cat":
            return catDeserializer(item["value"]);
          case "dog":
            return dogDeserializer(item["value"]);
          default:
            return item;
        }
      }
    `);
  });

  /**
   * Tests that a discriminated union with no-envelope (inline) mode generates a
   * deserializer that reads the discriminator, destructures it away, and passes
   * the remaining properties to the variant's deserializer.
   *
   * Wire format: `{ "kind": "cat", "meow": true }`
   * Client format: `Cat { meow: true }`
   *
   * This validates the inline discriminator stripping pattern — the discriminator
   * property is part of the wire format but not the client model, so it must be
   * removed before deserializing the variant.
   */
  it("should generate inline deserializer for discriminated union with no-envelope", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Cat")} { meow: boolean; }
        model ${t.model("Dog")} { bark: boolean; }

        @discriminated(#{ envelope: "none" })
        union ${t.union("PetInline")} {
          cat: Cat,
          dog: Dog,
        }

        op ${t.op("readPet")}(): { @body body: PetInline };
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
        <JsonDeserializer model={catModel} />
        {"\n\n"}
        <JsonDeserializer model={dogModel} />
        {"\n\n"}
        <JsonUnionDeserializer type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Cat
       */
      export interface Cat {
        meow: boolean;
      }

      /**
       * model interface Dog
       */
      export interface Dog {
        bark: boolean;
      }

      /**
       * Alias for PetInline
       */
      export type PetInline = Cat | Dog;

      export function catDeserializer(item: any): Cat {
        return {
          meow: item["meow"],
        };
      }

      export function dogDeserializer(item: any): Dog {
        return {
          bark: item["bark"],
        };
      }

      export function petInlineDeserializer(item: any): PetInline {
        switch (item["kind"]) {
          case "cat": {
            const { ["kind"]: _, ...rest } = item;
            return catDeserializer(rest);
          }
          case "dog": {
            const { ["kind"]: _, ...rest } = item;
            return dogDeserializer(rest);
          }
          default:
            return item;
        }
      }
    `);
  });
});
