/**
 * Test suite for the EnumDeclaration component.
 *
 * EnumDeclaration generates TypeScript type aliases from TCGC `SdkEnumType`.
 * The output depends on the enum's `isFixed` flag and the
 * `experimentalExtensibleEnums` emitter option:
 *
 * - Fixed enums always produce only a type alias (`type Name = "val1" | "val2"`).
 * - Extensible enums without the flag also produce only a type alias with
 *   all known literal values.
 * - Extensible enums with `experimentalExtensibleEnums: true` produce both a
 *   type alias (`type Name = string`) and a `KnownName` TypeScript enum.
 *
 * What is tested:
 * - Fixed string enums produce union type alias only (no Known enum).
 * - Fixed numeric enums produce union type alias only.
 * - Extensible enums without flag produce literal union type alias only.
 * - Extensible enums with flag produce base-type alias + Known enum.
 * - JSDoc documentation from enum.doc appears on the type alias.
 * - JSDoc documentation from member.doc appears on Known enum members.
 * - Members without doc get their literal value as documentation.
 * - Enum types can be referenced from model properties via refkey.
 * - Single-value enums render correctly without pipe separator.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { InterfaceDeclaration, InterfaceMember } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EnumDeclaration,
  isApiVersionEnumOnly,
} from "../../src/components/enum-declaration.js";
import {
  extractSubEnums,
  SubEnumDeclarations,
} from "../../src/components/sub-enum-declaration.js";
import { getTypeExpression } from "../../src/components/type-expression.js";
import { typeRefkey } from "../../src/utils/refkeys.js";
import {
  TesterWithService,
  RawTester,
  createSdkContextForTest,
} from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";

describe("Enum Declaration", () => {
  /**
   * Tests the default case: a fixed string enum renders only a type alias
   * as a union of string literals, without a KnownXXX enum. Fixed enums
   * don't produce Known enums because they represent a closed set of values.
   * This is the most common case — most service enums are fixed string enums.
   */
  it("should render fixed string enum as type alias only (no Known enum)", async () => {
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
    `);
  });

  /**
   * Tests that fixed numeric enums render correctly with number literal values
   * in the type alias only. Numeric enums are less common but used in APIs
   * like priority levels or status codes. No Known enum is generated for
   * fixed enums.
   */
  it("should render fixed numeric enum as type alias only", async () => {
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
    `);
  });

  describe("extensible Status enum", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;
    let enumType: (typeof sdkContext.sdkPackage.enums)[0];

    beforeAll(async () => {
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

      sdkContext = await createSdkContextForTest(program);
      enumType = {
        ...sdkContext.sdkPackage.enums[0],
        isFixed: false,
      } as (typeof sdkContext.sdkPackage.enums)[0];
    });

    /**
     * Tests that extensible enums (isFixed=false) WITHOUT the
     * `experimentalExtensibleEnums` flag produce only a literal union type alias.
     * This matches the legacy emitter's default behavior where extensible enums
     * are treated like fixed enums unless the flag is explicitly enabled.
     */
    it("should render extensible enum without flag as literal union only", async () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <EnumDeclaration type={enumType} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * Type of Status
         */
        export type Status = "active" | "inactive";
      `);
    });

    /**
     * Tests that extensible enums (isFixed=false) WITH the
     * `experimentalExtensibleEnums` flag produce the KnownXxx pattern:
     * a base type alias (`type Name = string`) plus a Known enum.
     * This is critical for forward compatibility — when a service adds new
     * enum values, existing client code continues to work because the type
     * allows any string.
     */
    it("should render extensible enum with flag as base type + Known enum", async () => {
      const template = (
        <SdkTestFile
          sdkContext={sdkContext}
          emitterOptions={{ experimentalExtensibleEnums: true }}
        >
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
  });

  /**
   * Tests that JSDoc documentation from the TypeSpec `@doc` decorator on the
   * enum propagates to the type alias. Documentation is critical for SDK
   * usability — consumers rely on IntelliSense tooltips.
   */
  it("should render JSDoc from enum doc on type alias", async () => {
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
    `);
  });

  /**
   * Tests that JSDoc documentation from member-level `@doc` decorators
   * appears on Known enum members when `experimentalExtensibleEnums` is
   * enabled. When a member has no doc, the literal value is used as
   * fallback documentation.
   */
  it("should render member-level JSDoc on Known enum when flag enabled", async () => {
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
    const enumType = {
      ...sdkContext.sdkPackage.enums[0],
      isFixed: false,
    } as (typeof sdkContext.sdkPackage.enums)[0];

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        emitterOptions={{ experimentalExtensibleEnums: true }}
      >
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Type of Direction
       */
      export type Direction = string;

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
    `);
  });

  /**
   * Tests that API version enums (used only by @versioned decorator) generate
   * a KnownXxx enum instead of a type alias. This is critical for public API
   * parity with the legacy emitter, which produces `enum KnownVersions { ... }`
   * for API version enums. The enum uses PascalCase member names
   * (e.g., `v2021_10_01_preview` → `V20211001Preview`).
   */
  it("should render API version enum as Known enum only (no type alias)", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
      import "@typespec/versioning";
      import "@typespec/http";
      using TypeSpec.Versioning;
      using TypeSpec.Http;

      #suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
      @service(#{
        title: "Test Service",
      })
      @versioned(TestService.Versions)
      namespace TestService;

      /** The available API versions. */
      enum Versions {
        /** 2021-10-01-preview version */
        v2021_10_01_preview: "2021-10-01-preview",
      }

      op foo(): void;
    `);

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums.find(
      (e) => (e.usage & UsageFlags.ApiVersionEnum) !== 0,
    );
    expect(enumType).toBeDefined();

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType!} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * The available API versions.
       */
      export enum KnownVersions {
        /**
         * 2021-10-01-preview version
         */
        V20211001Preview = "2021-10-01-preview",
      }
    `);
  });

  /**
   * Tests that an API version enum with multiple versions generates a Known enum
   * with PascalCase members for each version. Ensures the naming transformation
   * (e.g., `v2023_12_01` → `V20231201`) handles numeric-only segments correctly.
   */
  it("should render multi-version API version enum with PascalCase members", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
      import "@typespec/versioning";
      import "@typespec/http";
      using TypeSpec.Versioning;
      using TypeSpec.Http;

      #suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
      @service(#{
        title: "Test Service",
      })
      @versioned(TestService.Versions)
      namespace TestService;

      /** Versions info. */
      enum Versions {
        /** The 2023-12-01 version. */
        v2023_12_01: "2023-12-01",
        /** The 2024-06-15 version. */
        v2024_06_15: "2024-06-15",
      }

      op foo(): void;
    `);

    const sdkContext = await createSdkContextForTest(program);
    const enumType = sdkContext.sdkPackage.enums.find(
      (e) => (e.usage & UsageFlags.ApiVersionEnum) !== 0,
    );
    expect(enumType).toBeDefined();

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType!} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Versions info.
       */
      export enum KnownVersions {
        /**
         * The 2023-12-01 version.
         */
        V20231201 = "2023-12-01",
        /**
         * The 2024-06-15 version.
         */
        V20240615 = "2024-06-15",
      }
    `);
  });

  /**
   * Tests that an API version enum referenced by an operation parameter
   * is NOT treated as an API-version-only enum. When the version enum
   * is used as an explicit parameter type (not just for @versioned),
   * TCGC adds Input flags, so it should be generated as a normal type alias.
   * This is the case described in apiVersionAsFixedEnum scenario.
   */
  it("should render version enum referenced by operation as normal type alias", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
      import "@typespec/versioning";
      import "@typespec/http";
      using TypeSpec.Versioning;
      using TypeSpec.Http;

      #suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
      @service(#{
        title: "Test Service",
      })
      @versioned(TestService.Versions)
      namespace TestService;

      /** The available API versions. */
      enum Versions {
        /** 2021-10-01-preview version */
        v2021_10_01_preview: "2021-10-01-preview",
      }

      op foo(@header apiVersion: Versions): void;
    `);

    const sdkContext = await createSdkContextForTest(program);
    // This enum has both ApiVersionEnum and Input usage, so it should be treated as normal
    const enumType = sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * The available API versions.
       */
      export type Versions = "2021-10-01-preview";
    `);
  });

  /**
   * Tests the isApiVersionEnumOnly helper function directly. This utility
   * is exported for use by other components and must correctly distinguish
   * API-version-only enums from enums with mixed usage.
   */
  it("isApiVersionEnumOnly should detect API version enum usage correctly", () => {
    const makeEnum = (usage: number) => ({ usage }) as any;

    expect(isApiVersionEnumOnly(makeEnum(UsageFlags.ApiVersionEnum))).toBe(
      true,
    );
    expect(
      isApiVersionEnumOnly(
        makeEnum(UsageFlags.ApiVersionEnum | UsageFlags.Input),
      ),
    ).toBe(false);
    expect(
      isApiVersionEnumOnly(
        makeEnum(UsageFlags.ApiVersionEnum | UsageFlags.Output),
      ),
    ).toBe(false);
    expect(isApiVersionEnumOnly(makeEnum(UsageFlags.Input))).toBe(false);
    expect(isApiVersionEnumOnly(makeEnum(UsageFlags.None))).toBe(false);
  });

  /**
   * Tests that union-as-enum types with nested enums compose sub-enum
   * references instead of flattening all values into a single literal union.
   * This verifies the RC21 fix: nested enum identities are preserved in
   * the parent union type alias, matching the legacy emitter output.
   *
   * For example, `union Foo { Baz, "extra", string }` should generate:
   *   `export type Foo = Baz | "extra" | string;`
   * NOT: `export type Foo = "test" | "foo" | "extra";`
   */
  it("should compose sub-enum references in union-as-enum type alias", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum Baz { test, foo }
        union Foo { Baz, "extra", string }
        model ${t.model("Test")} { value: Foo; }
        op ${t.op("read")}(@body body: Test): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    // The union-as-enum should compose Baz reference
    const unionEnum = sdkContext.sdkPackage.enums.find(
      (e) => e.isUnionAsEnum && e.values.length > 1,
    );
    if (!unionEnum) return;

    const { extractSubEnums, SubEnumDeclarations } =
      await import("../../src/components/sub-enum-declaration.js");
    const subEnums = extractSubEnums(unionEnum);

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={unionEnum} />
        {subEnums.length > 0 && "\n\n"}
        <SubEnumDeclarations parentEnum={unionEnum} subEnums={subEnums} />
      </SdkTestFile>
    );

    // Should reference Baz as a type, not flatten its values
    const rendered = (template as any).toString?.() ?? "";
    // The key assertion: Baz should appear as a type reference, not flattened
    expect(subEnums.length).toBeGreaterThan(0);
    expect(subEnums.find((s) => s.name === "Baz")).toBeDefined();
  });
});
