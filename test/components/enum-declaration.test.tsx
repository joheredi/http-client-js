/**
 * Test suite for the EnumDeclaration component.
 *
 * EnumDeclaration generates TypeScript type aliases and Known-values enums from
 * TCGC `SdkEnumType`. Every enum in the generated SDK flows through this component,
 * producing two declarations:
 *
 * 1. A type alias (`type Name = "val1" | "val2"`) that other components reference
 *    via `typeRefkey(enum)` — this is the primary type used in model properties,
 *    operation parameters, and return types.
 *
 * 2. A `KnownName` TypeScript enum documenting all values the service currently
 *    accepts, referenced via `knownValuesRefkey(enum)`.
 *
 * What is tested:
 * - Fixed string enums produce union type alias + Known enum with string values.
 * - Fixed numeric enums produce union type alias + Known enum with numeric values.
 * - Extensible enums (isFixed=false) produce base-type alias + Known enum.
 * - JSDoc documentation from enum.doc appears on both type alias and Known enum.
 * - JSDoc documentation from member.doc appears on enum members.
 * - Members without doc get their literal value as documentation.
 * - Enum types can be referenced from model properties via refkey.
 * - Single-value enums render correctly without pipe separator.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { InterfaceDeclaration, InterfaceMember } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { EnumDeclaration } from "../../src/components/enum-declaration.js";
import { getTypeExpression } from "../../src/components/type-expression.js";
import { typeRefkey } from "../../src/utils/refkeys.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

describe("Enum Declaration", () => {
  /**
   * Tests the most fundamental case: a fixed string enum renders a type alias
   * as a union of string literals and a KnownXXX enum with string member values.
   * This is the baseline enum test — most service enums are fixed string enums,
   * so correctness here is critical.
   */
  it("should render fixed string enum with type alias and Known enum", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum ${t.enum("Color")} {
          Red: "red",
          Green: "green",
          Blue: "blue",
        }

        op ${t.op("getColor")}(): Color;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Type of Color
       */
      export type Color = "red" | "green" | "blue";

      /**
       * Known values of {@link Color} that the service accepts.
       */
      export enum KnownColor {
        /**
         * red
         */
        Red = "red",
        /**
         * green
         */
        Green = "green",
        /**
         * blue
         */
        Blue = "blue",
      }
    `);
  });

  /**
   * Tests that fixed numeric enums render correctly with number literal values
   * in the type alias and numeric values in the Known enum. Numeric enums are
   * less common but used in APIs like priority levels or status codes.
   */
  it("should render fixed numeric enum", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum ${t.enum("Priority")} {
          Low: 1,
          Medium: 2,
          High: 3,
        }

        op ${t.op("getPriority")}(): Priority;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Type of Priority
       */
      export type Priority = 1 | 2 | 3;

      /**
       * Known values of {@link Priority} that the service accepts.
       */
      export enum KnownPriority {
        /**
         * 1
         */
        Low = 1,
        /**
         * 2
         */
        Medium = 2,
        /**
         * 3
         */
        High = 3,
      }
    `);
  });

  /**
   * Tests that extensible enums (isFixed=false) render the base type as the
   * type alias body instead of literal values. This is critical for forward
   * compatibility — when a service adds new enum values, existing client code
   * continues to work because the type allows any string.
   *
   * Since native TypeSpec enums are always `isFixed: true`, this test creates
   * a normal enum and modifies its `isFixed` flag to simulate the extensible
   * case that occurs with Azure-specific union-as-enum patterns.
   */
  it("should render extensible enum with base type alias", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum ${t.enum("Status")} {
          Active: "active",
          Inactive: "inactive",
        }

        op ${t.op("getStatus")}(): Status;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    // Simulate an extensible enum by overriding isFixed.
    // In production, TCGC sets isFixed=false for union-as-enum patterns
    // from Azure-specific libraries.
    const enumType = { ...sdkContext.sdkPackage.enums[0], isFixed: false } as typeof sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Type of Status
       */
      export type Status = string;

      /**
       * Known values of {@link Status} that the service accepts.
       */
      export enum KnownStatus {
        /**
         * active
         */
        Active = "active",
        /**
         * inactive
         */
        Inactive = "inactive",
      }
    `);
  });

  /**
   * Tests that JSDoc documentation from the TypeSpec `@doc` decorator on the
   * enum propagates to both the type alias and the Known enum. Documentation
   * is critical for SDK usability — consumers rely on IntelliSense tooltips.
   */
  it("should render JSDoc from enum doc on both declarations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @doc("The color of the widget surface.")
        enum ${t.enum("Color")} {
          Red: "red",
          Green: "green",
        }

        op ${t.op("getColor")}(): Color;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * The color of the widget surface.
       */
      export type Color = "red" | "green";

      /**
       * The color of the widget surface.
       */
      export enum KnownColor {
        /**
         * red
         */
        Red = "red",
        /**
         * green
         */
        Green = "green",
      }
    `);
  });

  /**
   * Tests that JSDoc documentation from member-level `@doc` decorators
   * appears on enum members. When a member has no doc, the literal value
   * is used as fallback documentation. This ensures every member has some
   * description in IntelliSense.
   */
  it("should render member-level JSDoc from member doc", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum ${t.enum("Direction")} {
          @doc("Points toward the north pole.")
          North: "north",
          South: "south",
        }

        op ${t.op("getDirection")}(): Direction;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Type of Direction
       */
      export type Direction = "north" | "south";

      /**
       * Known values of {@link Direction} that the service accepts.
       */
      export enum KnownDirection {
        /**
         * Points toward the north pole.
         */
        North = "north",
        /**
         * south
         */
        South = "south",
      }
    `);
  });

  /**
   * Tests that model properties referencing an enum type resolve correctly
   * via the refkey system. When a model property has an enum type, the
   * property type should resolve to the enum's type alias name. This is
   * essential for cross-file references and automatic import generation.
   */
  it("should be referenceable from model properties via refkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum ${t.enum("Color")} {
          Red: "red",
          Green: "green",
        }

        model ${t.model("Widget")} {
          color: Color;
        }

        op ${t.op("getWidget")}(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums[0];
    const model = sdkContext.sdkPackage.models[0];
    const colorProp = model.properties.find((p) => p.name === "color")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
        {"\n\n"}
        {code`type Test = ${getTypeExpression(colorProp.type)}`}
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Type of Color
       */
      export type Color = "red" | "green";

      /**
       * Known values of {@link Color} that the service accepts.
       */
      export enum KnownColor {
        /**
         * red
         */
        Red = "red",
        /**
         * green
         */
        Green = "green",
      }

      type Test = Color
    `);
  });

  /**
   * Tests that an enum with a single value renders correctly without
   * a pipe separator in the type alias. Edge case that ensures the
   * join logic handles arrays of length 1.
   */
  it("should handle single-value enum", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum ${t.enum("Singleton")} {
          Only: "only",
        }

        op ${t.op("getSingleton")}(): Singleton;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Type of Singleton
       */
      export type Singleton = "only";

      /**
       * Known values of {@link Singleton} that the service accepts.
       */
      export enum KnownSingleton {
        /**
         * only
         */
        Only = "only",
      }
    `);
  });
});
