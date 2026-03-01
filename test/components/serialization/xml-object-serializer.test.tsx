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
import { FlavorProvider } from "../../../src/context/flavor-context.js";
import { httpRuntimeLib } from "../../../src/utils/external-packages.js";

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

  /**
   * Tests that arrays of bytes are serialized with `.map()` and
   * `uint8ArrayToString(i, "base64")` for each item. The legacy emitter
   * generates this pattern so each Uint8Array in the array is properly
   * base64-encoded for XML transport.
   *
   * Why this matters: Without the `.map()` + uint8ArrayToString call,
   * byte arrays would be passed as raw Uint8Array objects which cannot
   * be directly serialized to XML text content.
   */
  it("should map bytes array items through uint8ArrayToString", async () => {
    const model = createMockXmlModel("BlockLookupList", [
      {
        name: "committed",
        serializedName: "committed",
        xmlName: "Committed",
        type: { kind: "array", valueType: { kind: "bytes", encode: "base64" } },
      },
    ]);

    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <XmlHelpersFile />
          <SourceFile path="test.ts">
            <ModelInterface model={model} />
            {"\n\n"}
            <XmlObjectSerializer model={model} />
          </SourceFile>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("uint8ArrayToString(i");
    expect(result).toContain("?.map(");
    expect(result).not.toContain("Unresolved Symbol");
  });

  /**
   * Tests that arrays of dates are serialized with `.map()` and
   * date conversion for each item. The legacy emitter generates
   * `.toISOString()` for rfc3339 encoding.
   *
   * Why this matters: Date objects in arrays need to be converted to
   * their string representations for XML serialization. Without the
   * `.map()` call, raw Date objects would appear in the XML output.
   */
  it("should map date array items through date conversion", async () => {
    const model = createMockXmlModel("DateModel", [
      {
        name: "timestamps",
        serializedName: "timestamps",
        xmlName: "Timestamps",
        type: {
          kind: "array",
          valueType: { kind: "utcDateTime", encode: "rfc3339" },
        },
      },
    ]);

    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <XmlHelpersFile />
          <SourceFile path="test.ts">
            <ModelInterface model={model} />
            {"\n\n"}
            <XmlObjectSerializer model={model} />
          </SourceFile>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("?.map(");
    expect(result).toContain("toISOString()");
    expect(result).not.toContain("Unresolved Symbol");
  });

  /**
   * Tests that optional nested model properties are wrapped with a null guard
   * to prevent calling the nested serializer on `undefined`.
   * Without this guard, `nestedXmlObjectSerializer(undefined)` would throw.
   */
  it("should add null guard for optional nested model properties", async () => {
    const childModel = createMockXmlModel("Logging", [
      {
        name: "version",
        serializedName: "version",
        xmlName: "Version",
        type: { kind: "string" },
      },
    ]);

    const parentModel = createMockXmlModel("BlobServiceProperties", [
      {
        name: "logging",
        serializedName: "logging",
        xmlName: "Logging",
        type: childModel,
        optional: true,
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
    expect(result).toContain('!item["logging"] ? item["logging"] : logging');
    expect(result).not.toContain("Unresolved Symbol");
  });

  /**
   * Tests that nullable nested model properties also get a null guard.
   */
  it("should add null guard for nullable nested model properties", async () => {
    const childModel = createMockXmlModel("Metrics", [
      {
        name: "enabled",
        serializedName: "enabled",
        xmlName: "Enabled",
        type: { kind: "boolean" },
      },
    ]);

    const parentModel = createMockXmlModel("ServiceProperties", [
      {
        name: "metrics",
        serializedName: "metrics",
        xmlName: "HourMetrics",
        type: { kind: "nullable", type: childModel },
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
    expect(result).toContain('!item["metrics"] ? item["metrics"] : metrics');
    expect(result).not.toContain("Unresolved Symbol");
  });

  /**
   * Tests that optional array-of-models properties get a null guard.
   * The array `.map()` call would throw on `undefined` without this check.
   */
  it("should add null guard for optional array-of-models properties", async () => {
    const itemModel = createMockXmlModel("CorsRule", [
      {
        name: "allowedOrigins",
        serializedName: "allowedOrigins",
        xmlName: "AllowedOrigins",
        type: { kind: "string" },
      },
    ]);

    const parentModel = createMockXmlModel("ServiceProperties", [
      {
        name: "cors",
        serializedName: "cors",
        xmlName: "Cors",
        type: { kind: "array", valueType: itemModel },
        optional: true,
      },
    ]);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
        <SourceFile path="test.ts">
          <ModelInterface model={itemModel} />
          {"\n\n"}
          <XmlObjectSerializer model={itemModel} />
          {"\n\n"}
          <ModelInterface model={parentModel} />
          {"\n\n"}
          <XmlObjectSerializer model={parentModel} />
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain('!item["cors"] ? item["cors"] :');
    expect(result).toContain("?.map(");
    expect(result).not.toContain("Unresolved Symbol");
  });

  /**
   * Tests that non-optional model properties are NOT wrapped with a null guard.
   * Required properties should call the nested serializer directly.
   */
  it("should not add null guard for required nested model properties", async () => {
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
        optional: false,
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
    expect(result).not.toContain('!item["inner"]');
    expect(result).toContain("innerXmlObjectSerializer(item");
    expect(result).not.toContain("Unresolved Symbol");
  });
});
