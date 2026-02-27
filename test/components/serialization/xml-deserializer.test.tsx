/**
 * Test suite for the XmlDeserializer component.
 *
 * XmlDeserializer generates `export function {name}XmlDeserializer(xmlString: string): T`
 * functions that parse an XML string and map it to a typed SDK model instance.
 * The function builds a `XmlPropertyDeserializeMetadata[]` array and delegates
 * to the static `deserializeFromXml()` helper.
 *
 * What is tested:
 * - Basic model with string and number properties produces correct metadata.
 * - Deserialization metadata includes primitiveSubtype for type conversion.
 * - Nested model properties include a deserializer reference to the child's
 *   XmlObjectDeserializer.
 * - The function delegates to deserializeFromXml with correct rootName.
 *
 * Why this matters:
 * XML deserializers are needed to process responses from services that return
 * application/xml content. If the metadata arrays or helper call are wrong,
 * response parsing will fail, causing undefined properties or type errors
 * in the consuming application.
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
import { XmlDeserializer } from "../../../src/components/serialization/xml-deserializer.js";
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
    attribute?: boolean;
    itemsName?: string;
  }>,
  xmlName?: string,
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
        xml: {
          name: p.xmlName,
          attribute: p.attribute,
          itemsName: p.itemsName,
        },
      },
    })),
    serializationOptions: {
      xml: { name: xmlName ?? name },
    },
    crossLanguageDefinitionId: `Test.${name}`,
  } as any;
}

describe("XmlDeserializer", () => {
  let program: any;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that a basic model with string and number properties produces
   * metadata entries with correct primitiveSubtype values. The subtype
   * tells the deserializer how to convert raw XML string values to the
   * correct JavaScript types.
   */
  it("should generate metadata with primitiveSubtype for basic types", async () => {
    const model = createMockXmlOutputModel("Logging", [
      {
        name: "version",
        serializedName: "version",
        xmlName: "Version",
        type: { kind: "string" },
      },
      {
        name: "read",
        serializedName: "read",
        xmlName: "Read",
        type: { kind: "boolean" },
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlDeserializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export function loggingXmlDeserializer");
    expect(result).toContain("xmlString: string");
    expect(result).toContain('primitiveSubtype: "string"');
    expect(result).toContain('primitiveSubtype: "boolean"');
    expect(result).toContain('deserializeFromXml<Logging>(xmlString, properties, "Logging")');
  });

  /**
   * Tests that nested model properties include a deserializer reference
   * to the child model's XmlObjectDeserializer. This enables recursive
   * deserialization of complex nested XML structures.
   */
  it("should reference child XmlObjectDeserializer for nested models", async () => {
    const childModel = createMockXmlOutputModel("RetentionPolicy", [
      {
        name: "enabled",
        serializedName: "enabled",
        xmlName: "Enabled",
        type: { kind: "boolean" },
      },
    ]);

    const parentModel = createMockXmlOutputModel("Logging", [
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
          <XmlObjectDeserializer model={childModel} />
          {"\n\n"}
          <ModelInterface model={parentModel} />
          {"\n\n"}
          <XmlDeserializer model={parentModel} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("retentionPolicyXmlObjectDeserializer");
    expect(result).toContain('type: "object"');
  });

  /**
   * Tests that the deserializer uses a custom XML root name from the model's
   * serializationOptions.xml.name when it differs from the model name.
   */
  it("should use custom XML root name from serializationOptions", async () => {
    const model = createMockXmlOutputModel(
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
          <XmlDeserializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain('"BlockList"');
  });

  /**
   * Tests that attribute properties are marked with `attribute: true`
   * in the metadata xmlOptions. This tells the deserializer to look
   * for XML attributes instead of child elements.
   */
  it("should handle attribute properties", async () => {
    const model = createMockXmlOutputModel("ModelWithAttr", [
      {
        name: "id",
        serializedName: "id",
        xmlName: "id",
        type: { kind: "int32" },
        attribute: true,
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlDeserializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("attribute: true");
  });

  /**
   * Tests that array properties with date item types produce metadata with
   * `dateEncoding` propagated from the array's value type in deserialization
   * metadata. This ensures the runtime correctly parses date strings in arrays.
   *
   * Why this matters: Without dateEncoding on array metadata, the runtime
   * may use the wrong date parsing strategy (e.g., treating rfc7231 dates
   * as rfc3339), causing incorrect Date objects or parse failures.
   */
  it("should include dateEncoding for arrays of dates", async () => {
    const model = createMockXmlOutputModel("DateArraysModel", [
      {
        name: "timestamps",
        serializedName: "timestamps",
        xmlName: "Timestamps",
        type: { kind: "array", valueType: { kind: "utcDateTime", encode: "rfc3339" } },
        itemsName: "utcDateTime",
      },
      {
        name: "httpDates",
        serializedName: "httpDates",
        xmlName: "HttpDates",
        type: { kind: "array", valueType: { kind: "utcDateTime", encode: "rfc7231" } },
        itemsName: "rfc7231DateTime",
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlDeserializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain('dateEncoding: "rfc3339"');
    expect(result).toContain('dateEncoding: "rfc7231"');
    expect(result).toContain('itemType: "date"');
  });

  /**
   * Tests that array properties with bytes item types produce metadata with
   * `bytesEncoding: "base64"` in deserialization metadata.
   *
   * Why this matters: Without bytesEncoding on array metadata, the runtime
   * cannot properly decode base64 strings back to Uint8Array items.
   */
  it("should include bytesEncoding for arrays of bytes", async () => {
    const model = createMockXmlOutputModel("BlockLookupList", [
      {
        name: "committed",
        serializedName: "committed",
        xmlName: "Committed",
        type: { kind: "array", valueType: { kind: "bytes", encode: "base64" } },
        itemsName: "Committed",
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={model} />
          {"\n\n"}
          <XmlDeserializer model={model} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain('bytesEncoding: "base64"');
    expect(result).toContain('itemType: "bytes"');
    expect(result).toContain('type: "array"');
  });
});
