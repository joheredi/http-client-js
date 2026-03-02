/**
 * Test suite for serialization predicate utilities.
 *
 * These predicates are the single source of truth for whether a given SDK type
 * will have a JSON serializer or deserializer declaration rendered. They must
 * mirror the filtering logic in model-files.tsx exactly.
 *
 * What is tested:
 * - `typeHasSerializerDeclaration` returns true for Input models without XML.
 * - `typeHasSerializerDeclaration` returns false for XML-only Input models.
 * - `typeHasDeserializerDeclaration` returns true for Output models (including XML).
 *
 * Why this matters:
 * SMOKE-2 bug: XML-only models (e.g., CorsRule, BlobTag) have `UsageFlags.Input`
 * set but only get XmlObjectSerializer declarations (xmlObjectSerializerRefkey),
 * NOT JsonSerializer declarations (serializerRefkey). If `typeHasSerializerDeclaration`
 * incorrectly returns true for these, JSON array/record helper functions reference
 * `serializerRefkey(model)` which is never declared → `<Unresolved Symbol>` in output.
 */
import { describe, expect, it } from "vitest";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import type {
  SdkEnumType,
  SdkModelType,
} from "@azure-tools/typespec-client-generator-core";
import {
  typeHasSerializerDeclaration,
  typeHasDeserializerDeclaration,
} from "../../src/utils/serialization-predicates.js";

/**
 * Creates a minimal mock SdkModelType for testing predicate functions.
 *
 * @param name - Model name.
 * @param usage - UsageFlags bitmask.
 * @param xmlSerialization - Whether the model has XML serialization options.
 * @returns A mock SdkModelType with the specified flags.
 */
function createMockModel(
  name: string,
  usage: number,
  xmlSerialization: boolean = false,
): SdkModelType {
  const properties = xmlSerialization
    ? [
        {
          kind: "property" as const,
          name: "value",
          serializedName: "value",
          type: { kind: "string" as const },
          optional: false,
          serializationOptions: {
            json: { name: "value" },
            xml: { name: "Value" },
          },
        },
      ]
    : [
        {
          kind: "property" as const,
          name: "value",
          serializedName: "value",
          type: { kind: "string" as const },
          optional: false,
          serializationOptions: {
            json: { name: "value" },
          },
        },
      ];

  return {
    kind: "model",
    name,
    access: "public",
    usage,
    properties,
    serializationOptions: xmlSerialization ? { xml: { name } } : undefined,
    crossLanguageDefinitionId: `Test.${name}`,
  } as any;
}

describe("typeHasSerializerDeclaration", () => {
  /**
   * Standard JSON Input models must have a serializer declaration so that
   * `serializerRefkey(model)` resolves to their JsonSerializer function.
   */
  it("should return true for JSON Input models", () => {
    const model = createMockModel("Widget", UsageFlags.Input);
    expect(typeHasSerializerDeclaration(model)).toBe(true);
  });

  /**
   * SMOKE-2 fix: XML-only Input models (e.g., CorsRule, BlobTag) get
   * XmlObjectSerializer instead of JsonSerializer. Their serializerRefkey
   * is never declared, so this predicate must return false to prevent
   * array/record helpers from generating references to non-existent functions.
   */
  it("should return false for XML-only Input models", () => {
    const model = createMockModel(
      "CorsRule",
      UsageFlags.Input | UsageFlags.Xml,
      true, // has XML serialization
    );
    expect(typeHasSerializerDeclaration(model)).toBe(false);
  });

  /**
   * Output-only models should not have serializer declarations since
   * serializers are only generated for Input usage.
   */
  it("should return false for Output-only models", () => {
    const model = createMockModel("Widget", UsageFlags.Output);
    expect(typeHasSerializerDeclaration(model)).toBe(false);
  });

  /**
   * Models with both Input and Output that are NOT XML should still get
   * JSON serializers.
   */
  it("should return true for Input+Output JSON models", () => {
    const model = createMockModel(
      "Widget",
      UsageFlags.Input | UsageFlags.Output,
    );
    expect(typeHasSerializerDeclaration(model)).toBe(true);
  });

  /**
   * XML models with both Input and Output should NOT get JSON serializers.
   * They get XmlObjectSerializer and JSON deserializer separately.
   */
  it("should return false for Input+Output XML models", () => {
    const model = createMockModel(
      "SignedIdentifier",
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Xml,
      true,
    );
    expect(typeHasSerializerDeclaration(model)).toBe(false);
  });
});

describe("typeHasDeserializerDeclaration", () => {
  /**
   * Output models (including XML ones) should have JSON deserializer
   * declarations because the HTTP runtime parses response bodies to
   * plain objects before deserialization, regardless of content type.
   */
  it("should return true for Output models", () => {
    const model = createMockModel("Widget", UsageFlags.Output);
    expect(typeHasDeserializerDeclaration(model)).toBe(true);
  });

  /**
   * XML Output models also need JSON deserializers — the runtime parses
   * XML responses into objects first, then they go through the deserializer.
   */
  it("should return true for XML Output models", () => {
    const model = createMockModel(
      "CorsRule",
      UsageFlags.Output | UsageFlags.Xml,
      true,
    );
    expect(typeHasDeserializerDeclaration(model)).toBe(true);
  });

  /**
   * Input-only models should not have deserializer declarations.
   */
  it("should return false for Input-only models", () => {
    const model = createMockModel("Widget", UsageFlags.Input);
    expect(typeHasDeserializerDeclaration(model)).toBe(false);
  });
});

/**
 * Creates a minimal mock SdkEnumType for testing predicate functions.
 *
 * @param name - Enum name.
 * @param usage - UsageFlags bitmask.
 * @param isUnionAsEnum - Whether this enum was derived from a TypeSpec union.
 * @returns A mock SdkEnumType with the specified flags.
 */
function createMockEnum(
  name: string,
  usage: number,
  isUnionAsEnum: boolean,
): SdkEnumType {
  return {
    kind: "enum",
    name,
    access: "public",
    usage,
    isUnionAsEnum,
    valueType: { kind: "string" as const },
    values: [],
    crossLanguageDefinitionId: `Test.${name}`,
  } as any;
}

describe("typeHasSerializerDeclaration — enum types", () => {
  /**
   * Union-as-enum types with Input usage get pass-through serializer
   * declarations. Verifies that serializerRefkey resolves for Input enums.
   */
  it("should return true for union-as-enum with Input usage", () => {
    const enumType = createMockEnum("Status", UsageFlags.Input, true);
    expect(typeHasSerializerDeclaration(enumType)).toBe(true);
  });

  /**
   * ARM ProvisioningState fix: Output-only union-as-enum types should NOT
   * have serializer declarations. Referencing serializerRefkey for these
   * would produce <Unresolved Symbol> in generated code.
   */
  it("should return false for output-only union-as-enum", () => {
    const enumType = createMockEnum(
      "ProvisioningState",
      UsageFlags.Output,
      true,
    );
    expect(typeHasSerializerDeclaration(enumType)).toBe(false);
  });

  /**
   * Regular enums (not union-as-enum) never get serializer declarations
   * regardless of usage, because they pass through without transformation.
   */
  it("should return false for regular enum with Input usage", () => {
    const enumType = createMockEnum("Color", UsageFlags.Input, false);
    expect(typeHasSerializerDeclaration(enumType)).toBe(false);
  });

  /**
   * Union-as-enum with both Input and Output should get a serializer
   * since it has Input usage.
   */
  it("should return true for union-as-enum with Input+Output usage", () => {
    const enumType = createMockEnum(
      "Status",
      UsageFlags.Input | UsageFlags.Output,
      true,
    );
    expect(typeHasSerializerDeclaration(enumType)).toBe(true);
  });
});
