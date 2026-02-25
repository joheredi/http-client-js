/**
 * Test suite for the XmlObjectSerializer component.
 *
 * XmlObjectSerializer generates `export function {name}XmlObjectSerializer(item: T): XmlSerializedObject`
 * functions that convert typed SDK model objects into plain objects with XML-named
 * keys. These are used for nested model serialization — the parent serializer calls
 * the child's object serializer and embeds the result in its output.
 *
 * What is tested:
 * - Basic model with simple properties produces object with XML-named keys.
 * - The return type is XmlSerializedObject (resolved via refkey).
 * - Nested model properties call child XmlObjectSerializer via refkey.
 * - The function is registered with xmlObjectSerializerRefkey.
 *
 * Why this matters:
 * Object serializers enable recursive serialization of nested XML structures.
 * Without them, nested models cannot be serialized, breaking complex XML
 * payloads used by services like Azure Storage.
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
import { XmlObjectSerializer } from "../../../src/components/serialization/xml-object-serializer.js";
import { XmlHelpersFile } from "../../../src/components/static-helpers/xml-helpers.js";
import { ModelInterface } from "../../../src/components/model-interface.js";

/**
 * Creates a mock SdkModelType with XML serialization options for testing.
 * See xml-serializer.test.tsx for detailed documentation.
 */
function createMockXmlModel(
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
    usage: UsageFlags.Input | UsageFlags.Xml,
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

describe("XmlObjectSerializer", () => {
  let program: any;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that a basic model produces an object serializer that maps
   * client property names to XML element names in the returned object.
   * This is the core functionality — creating the intermediate object
   * representation used by parent serializers and serializeToXml.
   */
  it("should serialize basic model properties with XML names", async () => {
    const model = createMockXmlModel("RetentionPolicy", [
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
          <XmlObjectSerializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain(
      "export function retentionPolicyXmlObjectSerializer",
    );
    expect(result).toContain("item: RetentionPolicy");
    expect(result).toContain("XmlSerializedObject");
    expect(result).toContain('Enabled: item["enabled"]');
    expect(result).toContain('Days: item["days"]');
  });

  /**
   * Tests that nested model properties call the child model's
   * XmlObjectSerializer function via refkey. This enables recursive
   * serialization of complex nested structures.
   */
  it("should call child XmlObjectSerializer for nested models", async () => {
    const childModel = createMockXmlModel("Inner", [
      {
        name: "value",
        serializedName: "value",
        xmlName: "Value",
        type: { kind: "string" },
      },
    ]);

    const parentModel = createMockXmlModel("Outer", [
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
          <XmlObjectSerializer model={childModel} />
          {"\n\n"}
          <ModelInterface model={parentModel} />
          {"\n\n"}
          <XmlObjectSerializer model={parentModel} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("innerXmlObjectSerializer(item");
  });

  /**
   * Tests that the function return type references XmlSerializedObject
   * from the xml helpers via refkey resolution. This ensures the
   * return type is properly typed and imports are auto-generated.
   */
  it("should have XmlSerializedObject return type", async () => {
    const model = createMockXmlModel("Simple", [
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
          <XmlObjectSerializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("XmlSerializedObject");
  });
});
