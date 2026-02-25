/**
 * Test suite for the XmlSerializer component.
 *
 * XmlSerializer generates `export function {name}XmlSerializer(item: T): string`
 * functions that convert typed SDK model objects into XML strings using a
 * metadata-driven approach with `XmlPropertyMetadata[]` arrays and the
 * `serializeToXml()` static helper.
 *
 * What is tested:
 * - Basic model with primitive properties produces correct metadata entries.
 * - XML element names are extracted from serializationOptions.xml.name.
 * - Nested model properties include a serializer reference to the child's
 *   XmlObjectSerializer.
 * - The function delegates to serializeToXml with correct rootName.
 * - The function is registered with xmlSerializerRefkey for cross-referencing.
 *
 * Why this matters:
 * XML serializers are needed for services that use application/xml content
 * types (e.g., Azure Storage, Azure Batch). If the metadata arrays are
 * incorrectly structured or the helper call is wrong, request bodies will
 * be malformed, causing service-side parsing errors.
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
import { XmlSerializer } from "../../../src/components/serialization/xml-serializer.js";
import { XmlObjectSerializer } from "../../../src/components/serialization/xml-object-serializer.js";
import { XmlHelpersFile } from "../../../src/components/static-helpers/xml-helpers.js";
import { ModelInterface } from "../../../src/components/model-interface.js";

/**
 * Creates a mock SdkModelType with XML serialization options for testing.
 *
 * This avoids the need for @typespec/xml in the test environment. TCGC
 * would normally populate these fields from @Xml.name and other decorators.
 *
 * @param name - The model name.
 * @param properties - Array of property descriptors with XML options.
 * @param xmlName - Optional XML root element name (defaults to model name).
 * @returns A mock SdkModelType with XML serialization metadata.
 */
function createMockXmlModel(
  name: string,
  properties: Array<{
    name: string;
    serializedName: string;
    xmlName: string;
    type: any;
    optional?: boolean;
    attribute?: boolean;
  }>,
  xmlName?: string,
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
        xml: {
          name: p.xmlName,
          attribute: p.attribute,
        },
      },
    })),
    serializationOptions: {
      xml: { name: xmlName ?? name },
    },
    crossLanguageDefinitionId: `Test.${name}`,
  } as any;
}

describe("XmlSerializer", () => {
  let program: any;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that a basic model with string and number properties produces an
   * XmlSerializer function with correct metadata entries. Each property
   * should have a propertyName, xmlOptions with the XML element name, and
   * a type classification. This is the foundation of XML serialization.
   */
  it("should generate metadata-driven serializer for basic model", async () => {
    const model = createMockXmlModel("Logging", [
      {
        name: "version",
        serializedName: "version",
        xmlName: "Version",
        type: { kind: "string" },
      },
      {
        name: "enabled",
        serializedName: "enabled",
        xmlName: "Enabled",
        type: { kind: "boolean" },
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlSerializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    // Check function signature
    expect(result).toContain("export function loggingXmlSerializer(item: Logging): string");
    // Check metadata array entries
    expect(result).toContain('propertyName: "version"');
    expect(result).toContain('name: "Version"');
    expect(result).toContain('propertyName: "enabled"');
    expect(result).toContain('name: "Enabled"');
    // Check serializeToXml call
    expect(result).toContain('serializeToXml(item, properties, "Logging")');
  });

  /**
   * Tests that XML attribute properties produce metadata with
   * `attribute: true` in the xmlOptions. Attributes are serialized
   * as XML attributes on the element rather than child elements.
   */
  it("should handle attribute properties with attribute: true", async () => {
    const model = createMockXmlModel("ModelWithAttributes", [
      {
        name: "id",
        serializedName: "id",
        xmlName: "id",
        type: { kind: "int32" },
        attribute: true,
      },
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
          <XmlSerializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("attribute: true");
    expect(result).toContain('name: "id"');
  });

  /**
   * Tests that nested model properties include a serializer reference
   * to the child model's XmlObjectSerializer. This enables recursive
   * serialization of complex nested XML structures.
   */
  it("should reference child XmlObjectSerializer for nested models", async () => {
    const childModel = createMockXmlModel("RetentionPolicy", [
      {
        name: "enabled",
        serializedName: "enabled",
        xmlName: "Enabled",
        type: { kind: "boolean" },
      },
    ]);

    const parentModel = createMockXmlModel("Logging", [
      {
        name: "version",
        serializedName: "version",
        xmlName: "Version",
        type: { kind: "string" },
      },
      {
        name: "retentionPolicy",
        serializedName: "retentionPolicy",
        xmlName: "RetentionPolicy",
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
          <XmlSerializer model={parentModel} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    // Should reference the child's object serializer
    expect(result).toContain("retentionPolicyXmlObjectSerializer");
    expect(result).toContain('type: "object"');
  });

  /**
   * Tests that the serializer function is correctly named with the
   * XmlSerializer suffix and uses the model's XML name (from
   * serializationOptions.xml.name) as the rootName argument.
   */
  it("should use custom XML root name from serializationOptions", async () => {
    const model = createMockXmlModel(
      "BlockLookupList",
      [
        {
          name: "committed",
          serializedName: "committed",
          xmlName: "Committed",
          type: { kind: "string" },
        },
      ],
      "BlockList",
    );

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlSerializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("blockLookupListXmlSerializer");
    expect(result).toContain('"BlockList"');
  });
});
