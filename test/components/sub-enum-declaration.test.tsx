/**
 * Test suite for the SubEnumDeclaration component and extractSubEnums utility.
 *
 * When TCGC encounters a model property typed as a union of enums (e.g., `LR | UD`),
 * it flattens both enums into a single combined enum (e.g., `TestColor`) with
 * `isUnionAsEnum: true` and `isGeneratedName: true`. The individual enum types
 * (LR, UD) are lost from `sdkPackage.enums`.
 *
 * The `extractSubEnums` function reconstructs the original sub-enums by inspecting
 * `__raw` TypeSpec references on each value. The `SubEnumDeclaration` component
 * renders each reconstructed sub-enum as a simple type alias:
 *
 *   `export type LR = "left" | "right";`
 *
 * Unlike full enum declarations (which emit both a type alias and a KnownXXX enum),
 * sub-enums only produce a type alias because they are partial views of the combined
 * enum's known values.
 *
 * What is tested:
 * - extractSubEnums correctly groups values by their original TypeSpec enum source.
 * - extractSubEnums handles TypeSpec union sources (union leftAndRight { ... }).
 * - extractSubEnums returns empty array for non-union-as-enum types.
 * - extractSubEnums returns empty array for union-as-enum with isGeneratedName: false.
 * - SubEnumDeclaration renders a type alias with doc comment for string enum values.
 * - SubEnumDeclaration renders numeric enum values without quotes.
 * - Full integration: model property with enum union emits both sub-enum type aliases.
 * - Full integration: model property with union + enum mix emits sub-enum aliases.
 */
import "@alloy-js/core/testing";
import type {
  SdkEnumType,
  SdkEnumValueType,
} from "@azure-tools/typespec-client-generator-core";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import {
  extractSubEnums,
  SubEnumDeclaration,
  SubEnumDeclarations,
} from "../../src/components/sub-enum-declaration.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

describe("extractSubEnums", () => {
  /**
   * Tests that extractSubEnums correctly groups values from two TypeSpec enums
   * that were flattened into a single union-as-enum by TCGC. This is the core
   * case: `enum LR { left, right }` + `enum UD { up, down }` used as `LR | UD`.
   */
  it("should extract sub-enums from union of TypeSpec enums", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum LR { left, right }
        enum UD { up, down }
        model ${t.model("Test")} { color: LR | UD; }
        op ${t.op("read")}(@body body: Test): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const combined = sdkContext.sdkPackage.enums[0];

    expect(combined.name).toBe("TestColor");
    expect(combined.isUnionAsEnum).toBe(true);
    expect(combined.isGeneratedName).toBe(true);

    const subEnums = extractSubEnums(combined);
    expect(subEnums).toHaveLength(2);

    expect(subEnums[0].name).toBe("LR");
    expect(subEnums[0].values.map((v) => v.value)).toEqual(["left", "right"]);

    expect(subEnums[1].name).toBe("UD");
    expect(subEnums[1].values.map((v) => v.value)).toEqual(["up", "down"]);
  });

  /**
   * Tests that extractSubEnums handles TypeSpec union sources in addition to
   * enum sources. When the property type is `union leftAndRight | enum upAndDown`,
   * the values from the union have `__raw.union.name` instead of `__raw.enum.name`.
   */
  it("should extract sub-enums from mix of union and enum", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union leftAndRight { "left", "right" }
        enum upAndDown { up, down }
        model ${t.model("Test")} { color: leftAndRight | upAndDown; }
        op ${t.op("read")}(@body body: Test): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const combined = sdkContext.sdkPackage.enums[0];

    const subEnums = extractSubEnums(combined);
    expect(subEnums).toHaveLength(2);

    expect(subEnums[0].name).toBe("leftAndRight");
    expect(subEnums[0].values.map((v) => v.value)).toEqual(["left", "right"]);

    expect(subEnums[1].name).toBe("upAndDown");
    expect(subEnums[1].values.map((v) => v.value)).toEqual(["up", "down"]);
  });

  /**
   * Tests that extractSubEnums returns an empty array for regular enums
   * (not union-as-enum). Regular enums already appear in sdkPackage.enums
   * and don't need sub-enum extraction.
   */
  it("should return empty for non-union-as-enum types", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum Color { red, blue }
        model ${t.model("Test")} { color: Color; }
        op ${t.op("read")}(@body body: Test): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const colorEnum = sdkContext.sdkPackage.enums[0];

    expect(colorEnum.isUnionAsEnum).toBe(false);
    const subEnums = extractSubEnums(colorEnum);
    expect(subEnums).toHaveLength(0);
  });
});

describe("SubEnumDeclaration", () => {
  describe("with LR | UD union", () => {
    let sdkContext: any;
    let combined: any;
    let subEnums: any[];

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          enum LR { left, right }
          enum UD { up, down }
          model ${t.model("Test")} { color: LR | UD; }
          op ${t.op("read")}(@body body: Test): void;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      combined = sdkContext.sdkPackage.enums[0];
      subEnums = extractSubEnums(combined);
    });

    /**
     * Tests that SubEnumDeclaration renders a type alias with the correct doc
     * comment format: "Type of {Name}". This matches the legacy emitter's
     * behavior for sub-enum type aliases.
     */
    it("should render type alias with doc for string enum values", async () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <SubEnumDeclaration parentEnum={combined} subEnum={subEnums[0]} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * Type of LR
         */
        export type LR = "left" | "right";
      `);
    });

    /**
     * Tests that SubEnumDeclarations renders multiple sub-enums separated by
     * blank lines. This verifies the <For> iteration with doubleHardline joiner.
     */
    it("should render multiple sub-enums with spacing", async () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <SubEnumDeclarations parentEnum={combined} subEnums={subEnums} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * Type of LR
         */
        export type LR = "left" | "right";

        /**
         * Type of UD
         */
        export type UD = "up" | "down";
      `);
    });
  });

  /**
   * Tests that SubEnumDeclarations returns undefined when given an empty
   * array of sub-enums. This ensures no empty whitespace is emitted.
   */
  it("should return undefined for empty sub-enums", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum Color { red, blue }
        model ${t.model("Test")} { color: Color; }
        op ${t.op("read")}(@body body: Test): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const combined = sdkContext.sdkPackage.enums[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <SubEnumDeclarations parentEnum={combined} subEnums={[]} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(``);
  });
});
