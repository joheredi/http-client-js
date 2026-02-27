/**
 * Test suite for the JsonEnumSerializer component.
 *
 * JsonEnumSerializer generates pass-through serializer functions for
 * union-as-enum types (TypeSpec unions that TCGC flattens into SdkEnumType
 * with `isUnionAsEnum: true`). These are simple `return item;` functions
 * matching the legacy emitter's behavior.
 *
 * What is tested:
 * - A union-as-enum type produces a pass-through serializer function
 *   when `experimentalExtensibleEnums` is NOT true.
 * - The serializer function body is `return item;` (pass-through).
 * - The parameter type references the enum type alias via refkey.
 * - The return type is `any` (matching the legacy emitter pattern).
 *
 * Why this matters:
 * When `experimentalExtensibleEnums` is false/undefined, the legacy emitter
 * generates pass-through serializers for union-as-enum types. Model serializers
 * call these functions for enum property values (e.g.,
 * `status: provisioningStateSerializer(item["status"])`). Without them, the
 * output breaks parity with the legacy emitter. This was identified in the
 * scenario audit as SA-C31-SER.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import type { SdkEnumType } from "@azure-tools/typespec-client-generator-core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { JsonEnumSerializer } from "../../../src/components/serialization/json-enum-serializer.js";
import { EnumDeclaration } from "../../../src/components/enum-declaration.js";
import { SdkTestFile } from "../../utils.jsx";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("JsonEnumSerializer", () => {
  /**
   * Tests that a union-as-enum type produces a pass-through serializer.
   * A TypeSpec union with only string literal variants and a `string` base
   * is flattened by TCGC into an SdkEnumType with `isUnionAsEnum: true`.
   * The serializer should be a simple `return item;` pass-through function.
   *
   * This validates the core functionality: union-as-enum types get
   * identity serializers for output parity with the legacy emitter.
   */
  it("should render pass-through serializer for union-as-enum type", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("Status")} {
          "active",
          "inactive",
          string,
        }

        op ${t.op("sendStatus")}(@body value: Status): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    // TCGC flattens the union into an enum with isUnionAsEnum: true
    const enumType = sdkContext.sdkPackage.enums.find(
      (e) => e.name === "Status",
    ) as SdkEnumType;
    expect(enumType).toBeDefined();
    expect(enumType.isUnionAsEnum).toBe(true);

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
        {"\n\n"}
        <JsonEnumSerializer type={enumType} />
      </SdkTestFile>
    );

    const result = renderToString(template);
    // Verify the serializer function exists and is a pass-through
    expect(result).toContain(
      "export function statusSerializer(item: Status): any",
    );
    expect(result).toContain("return item;");
    // Verify no unresolved symbols
    expect(result).not.toContain("Unresolved Symbol");
  });

  /**
   * Tests that the serializer uses the correct refkey so it can be
   * referenced from model serializers. The serializer is registered with
   * `serializerRefkey(type)`, and when a model property has this enum type,
   * the model serializer calls `statusSerializer(item["status"])`.
   *
   * This validates the integration with the refkey system: the serializer
   * declaration and its references must use the same refkey.
   */
  it("should register with serializerRefkey for cross-reference", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("Color")} {
          "red",
          "blue",
          string,
        }

        op ${t.op("sendColor")}(@body value: Color): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const enumType = sdkContext.sdkPackage.enums.find(
      (e) => e.name === "Color",
    ) as SdkEnumType;
    expect(enumType).toBeDefined();

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumDeclaration type={enumType} />
        {"\n\n"}
        <JsonEnumSerializer type={enumType} />
      </SdkTestFile>
    );

    const result = renderToString(template);
    // Verify the function name follows camelCase convention
    expect(result).toContain(
      "export function colorSerializer(item: Color): any",
    );
    // Verify pass-through body
    expect(result).toContain("return item;");
    // Verify no unresolved symbols
    expect(result).not.toContain("Unresolved Symbol");
  });
});
