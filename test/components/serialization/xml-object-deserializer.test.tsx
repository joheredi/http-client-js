/**
 * Test suite for the XmlObjectDeserializer component.
 *
 * XmlObjectDeserializer generates
 * `export function {name}XmlObjectDeserializer(xmlObject: Record<string, unknown>): T`
 * functions that convert a pre-parsed XML object (with XML-named keys) into a
 * typed SDK model instance. These are used for nested model deserialization.
 *
 * What is tested:
 * - Basic model with string and boolean properties produces correct metadata.
 * - Nested model properties reference child XmlObjectDeserializer.
 * - The function delegates to deserializeXmlObject with correct type parameter.
 * - Metadata includes primitiveSubtype for type conversion from XML strings.
 *
 * Why this matters:
 * Object deserializers enable recursive deserialization of nested XML structures.
 * When a parent deserializer encounters a child element representing a model,
 * it delegates to the child's XmlObjectDeserializer. Without this, nested
 * models would remain as raw objects instead of typed model instances.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { TesterWithService } from "../../test-host.js";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { XmlObjectDeserializer } from "../../../src/components/serialization/xml-object-deserializer.js";
import { XmlHelpersFile } from "../../../src/components/static-helpers/xml-helpers.js";
import { ModelInterface } from "../../../src/components/model-interface.js";

/**
 * Creates a mock SdkModelType with XML serialization options for testing.
 * Models have Output + Xml usage flags for deserialization context.
 */
function createMockXmlOutputModel(
  name: string,
  properties: Array<{
    name: string;
    serializedName: string;
    xmlName: string;
    type: any;
    optional?: boolean;
  }>,
): SdkModelType {
  return {
    kind: "model",
    name,
    access: "public",
    usage: UsageFlags.Output | UsageFlags.Xml,
    properties: properties.map((p) => ({
      kind: "property" as const,
      name: p.name,
      serializedName: p.serializedName,
      type: p.type,
      optional: p.optional ?? false,
      discriminator: false,
      isMultipartFileInput: false,
      serializationOptions: {
        json: { name: p.serializedName },
        xml: { name: p.xmlName },
      },
    })),
    serializationOptions: {
      xml: { name },
    },
    crossLanguageDefinitionId: `Test.${name}`,
  } as any;
}

describe("XmlObjectDeserializer", () => {
  let program: any;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that a basic model produces an XmlObjectDeserializer function
   * with the correct signature and metadata entries. The metadata includes
   * primitiveSubtype for type conversion from XML string values.
   */
  it("should generate metadata with primitiveSubtype for basic model", async () => {
    const model = createMockXmlOutputModel("RetentionPolicy", [
      {
        name: "enabled",
        serializedName: "enabled",
        xmlName: "Enabled",
        type: { kind: "boolean" },
      },
      {
        name: "days",
        serializedName: "days",
        xmlName: "Days",
        type: { kind: "int32" },
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlObjectDeserializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain(
      "export function retentionPolicyXmlObjectDeserializer",
    );
    expect(result).toContain("xmlObject: Record<string, unknown>");
    expect(result).toContain('primitiveSubtype: "boolean"');
    expect(result).toContain('primitiveSubtype: "number"');
    expect(result).toContain(
      "deserializeXmlObject<RetentionPolicy>(xmlObject, properties)",
    );
  });

  /**
   * Tests that nested model properties call the child model's
   * XmlObjectDeserializer function via refkey. This enables recursive
   * deserialization of complex nested structures.
   */
  it("should call child XmlObjectDeserializer for nested models", async () => {
    const childModel = createMockXmlOutputModel("Inner", [
      {
        name: "value",
        serializedName: "value",
        xmlName: "Value",
        type: { kind: "string" },
      },
    ]);

    const parentModel = createMockXmlOutputModel("Outer", [
      {
        name: "inner",
        serializedName: "inner",
        xmlName: "Inner",
        type: childModel,
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={childModel} />
          {"\n\n"}
          <XmlObjectDeserializer model={childModel} />
          {"\n\n"}
          <ModelInterface model={parentModel} />
          {"\n\n"}
          <XmlObjectDeserializer model={parentModel} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("innerXmlObjectDeserializer");
    expect(result).toContain('type: "object"');
  });

  /**
   * Tests that the return type references the model type via typeRefkey.
   * This ensures the deserialized result is properly typed and imports
   * are auto-generated when used across files.
   */
  it("should have correct return type referencing model", async () => {
    const model = createMockXmlOutputModel("Simple", [
      {
        name: "name",
        serializedName: "name",
        xmlName: "Name",
        type: { kind: "string" },
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlObjectDeserializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("): Simple");
  });
});
