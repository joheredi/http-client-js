/**
 * Test suite for the UnionDeclaration component.
 *
 * UnionDeclaration generates TypeScript type alias declarations from TCGC
 * `SdkUnionType`. Named unions in the SDK package flow through this component,
 * producing a single exported type alias:
 *
 *   `export type MyUnion = string | number | SomeModel;`
 *
 * Variant types are rendered via `getTypeExpression()`, which returns refkeys
 * for named types (enabling automatic cross-file imports) and plain strings
 * for primitives.
 *
 * Note: TCGC converts TypeSpec unions of string literals (e.g., `"a" | "b"`)
 * into `SdkEnumType` rather than `SdkUnionType`. Only unions with mixed
 * types (e.g., `string | int32`) or model variants remain as `SdkUnionType`.
 *
 * What is tested:
 * - Basic union with mixed primitive types (string | number) renders correctly.
 * - Union with three mixed types (string | number | boolean) renders correctly.
 * - JSDoc documentation from union.doc appears on the type alias.
 * - Union without doc gets fallback "Alias for {Name}" documentation.
 * - Single-variant union renders correctly without pipe separator.
 * - Union with model type variants resolves via refkey.
 * - Union can be referenced from model properties via refkey.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { InterfaceDeclaration, InterfaceMember } from "@alloy-js/typescript";
import type { SdkUnionType } from "@azure-tools/typespec-client-generator-core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { UnionDeclaration } from "../../src/components/union-declaration.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { getTypeExpression } from "../../src/components/type-expression.js";
import { typeRefkey } from "../../src/utils/refkeys.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

describe("Union Declaration", () => {
  /**
   * Tests that a union of string and integer types renders a type alias with
   * pipe-separated TypeScript types. This verifies the basic rendering path
   * for unions that TCGC preserves as `SdkUnionType` (as opposed to string-
   * literal unions, which TCGC promotes to enums).
   */
  it("should render union of string and integer types", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("StringOrInt")} {
          s: string,
          n: int32,
        }

        op ${t.op("getValue")}(@body value: StringOrInt): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for StringOrInt
       */
      export type StringOrInt = string | number;
    `);
  });

  /**
   * Tests that a union of mixed primitive types renders correctly.
   * This verifies that the type expression mapper handles different
   * scalar types (string, int32 → number, boolean) within the same union.
   */
  it("should render union of mixed primitive types", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("MixedValue")} {
          s: string,
          n: int32,
          b: boolean,
        }

        op ${t.op("getValue")}(@body value: MixedValue): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for MixedValue
       */
      export type MixedValue = string | number | boolean;
    `);
  });

  /**
   * Tests that JSDoc documentation from the TypeSpec `@doc` decorator
   * on the union propagates to the type alias. Documentation is critical
   * for SDK usability — consumers rely on IntelliSense tooltips.
   */
  it("should render JSDoc from union doc", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @doc("Represents either a string or numeric identifier.")
        union ${t.union("Identifier")} {
          s: string,
          n: int32,
        }

        op ${t.op("getItem")}(@body id: Identifier): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Represents either a string or numeric identifier.
       */
      export type Identifier = string | number;
    `);
  });

  /**
   * Tests that unions without a `@doc` decorator get the fallback
   * documentation pattern "Alias for {Name}". This ensures every union
   * type alias has some description in IntelliSense, matching the legacy
   * emitter's behavior.
   */
  it("should render fallback doc when no doc decorator", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("Result")} {
          s: string,
          n: int32,
        }

        op ${t.op("getResult")}(@body result: Result): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for Result
       */
      export type Result = string | number;
    `);
  });

  /**
   * Tests that a union with a single variant renders correctly without
   * a pipe separator. This is an edge case that verifies the `<For>`
   * joiner logic handles arrays of length 1 — no leading or trailing
   * pipe should appear.
   */
  it("should handle single-variant union", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("OnlyString")} {
          s: string,
        }

        op ${t.op("getOnly")}(@body value: OnlyString): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for OnlyString
       */
      export type OnlyString = string;
    `);
  });

  /**
   * Tests that a union containing model type variants resolves the
   * model references via refkeys. This is critical for cross-file
   * imports — when a union variant is a named model, the type alias
   * should reference the model name (not inline the model definition),
   * and Alloy should auto-generate the import if in a different file.
   */
  it("should render union with model type variants via refkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Cat")} {
          meow: boolean;
        }

        model ${t.model("Dog")} {
          bark: boolean;
        }

        union ${t.union("Pet")} {
          cat: Cat,
          dog: Dog,
        }

        op ${t.op("getPet")}(@body pet: Pet): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;
    const catModel = sdkContext.sdkPackage.models.find((m) => m.name === "Cat")!;
    const dogModel = sdkContext.sdkPackage.models.find((m) => m.name === "Dog")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={catModel} />
        {"\n\n"}
        <ModelInterface model={dogModel} />
        {"\n\n"}
        <UnionDeclaration type={unionType} />
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
       * Alias for Pet
       */
      export type Pet = Cat | Dog;
    `);
  });

  /**
   * Tests that a union type can be referenced from model properties via
   * the refkey system. When a model property has a union type, the property
   * type should resolve to the union's type alias name. This is essential
   * for cross-file references and automatic import generation throughout
   * the generated SDK.
   *
   * Note: TCGC converts string-literal unions to enums, so this test uses
   * a mixed-type union (string | int32) which TCGC preserves as SdkUnionType.
   */
  it("should be referenceable from model properties via refkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("Identifier")} {
          s: string,
          n: int32,
        }

        model ${t.model("Item")} {
          id: Identifier;
        }

        op ${t.op("getItem")}(): Item;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const unionType = sdkContext.sdkPackage.unions[0] as SdkUnionType;
    const model = sdkContext.sdkPackage.models[0];
    const idProp = model.properties.find((p) => p.name === "id")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <UnionDeclaration type={unionType} />
        {"\n\n"}
        {code`type Test = ${getTypeExpression(idProp.type)}`}
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Alias for Identifier
       */
      export type Identifier = string | number;

      type Test = Identifier
    `);
  });
});
