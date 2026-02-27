/**
 * Test suite for the XML helpers static file component.
 *
 * XmlHelpersFile generates `static-helpers/xmlHelpers.ts` containing type interfaces
 * and utility functions used by XML serializers and deserializers.
 *
 * What is tested:
 * - XmlSerializationOptions interface renders with all expected members.
 * - XmlPropertyMetadata interface renders with correct member types.
 * - XmlPropertyDeserializeMetadata interface renders with primitive subtype.
 * - XmlSerializedObject type alias renders as Record<string, any>.
 * - serializeToXml function renders with correct signature.
 * - deserializeFromXml function renders with correct signature.
 * - deserializeXmlObject function renders with correct signature.
 *
 * Why this matters:
 * The XML helpers provide the foundational types and runtime functions that
 * all generated XML serializers and deserializers depend on. If these are
 * incorrect, no XML serialization or deserialization will work, causing
 * failures for services that use application/xml content types.
 */
import "@alloy-js/core/testing";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { renderToString } from "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { XmlHelpersFile } from "../../../src/components/static-helpers/xml-helpers.js";
import { TesterWithService } from "../../test-host.js";
import type { Program } from "@typespec/compiler";

describe("XmlHelpersFile", () => {
  let program: Program;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Helper to render the XmlHelpersFile component and return the output string.
   */
  function renderXmlHelpers(): string {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <XmlHelpersFile />
      </Output>
    );
    return renderToString(template);
  }

  /**
   * Tests that the XmlSerializationOptions interface contains all required
   * members for describing XML element/attribute mapping. This is the core
   * descriptor type that controls XML naming, namespaces, attributes, and
   * array wrapping behavior.
   */
  it("should render XmlSerializationOptions interface with all members", async () => {
    const result = renderXmlHelpers();
    expect(result).toContain("export interface XmlSerializationOptions");
    expect(result).toContain("name: string;");
    expect(result).toContain("attribute?: boolean;");
    expect(result).toContain("unwrapped?: boolean;");
    expect(result).toContain("itemsName?: string;");
  });

  /**
   * Tests that the XmlPropertyMetadata interface renders with the serializer
   * member and type classification. This interface drives the metadata-based
   * serialization approach where each property describes its own serialization
   * strategy.
   */
  it("should render XmlPropertyMetadata interface with serializer member", async () => {
    const result = renderXmlHelpers();
    expect(result).toContain("export interface XmlPropertyMetadata");
    expect(result).toContain("propertyName: string;");
    expect(result).toContain("xmlOptions: XmlSerializationOptions;");
    expect(result).toContain("serializer?: (value: any) => any;");
  });

  /**
   * Tests that the XmlPropertyDeserializeMetadata interface includes the
   * primitiveSubtype member needed for converting XML string values to
   * the correct JavaScript types (string, number, boolean).
   */
  it("should render XmlPropertyDeserializeMetadata with primitiveSubtype", async () => {
    const result = renderXmlHelpers();
    expect(result).toContain("export interface XmlPropertyDeserializeMetadata");
    expect(result).toContain("deserializer?: (value: any) => any;");
    expect(result).toContain(
      'primitiveSubtype?: "string" | "number" | "boolean";',
    );
  });

  /**
   * Tests that the XmlSerializedObject type alias renders as a Record type.
   * This type is the return type of XML object serializers — a plain object
   * with XML-named keys used as an intermediate representation.
   */
  it("should render XmlSerializedObject type alias", async () => {
    const result = renderXmlHelpers();
    expect(result).toContain(
      "export type XmlSerializedObject = Record<string, any>;",
    );
  });

  /**
   * Tests that the serializeToXml function renders with the correct signature
   * including the properties array parameter, rootName, and optional rootNs.
   * This is the primary serialization entry point called by all XmlSerializer
   * functions.
   */
  it("should render serializeToXml function with correct signature", async () => {
    const result = renderXmlHelpers();
    expect(result).toContain("export function serializeToXml");
    expect(result).toContain("item: Record<string, any>");
    expect(result).toContain("properties: XmlPropertyMetadata[]");
    expect(result).toContain("rootName: string");
  });

  /**
   * Tests that the deserializeFromXml function renders with a type parameter
   * and the correct signature. This function parses an XML string and maps
   * it to a typed model using property metadata.
   */
  it("should render deserializeFromXml function with type parameter", async () => {
    const result = renderXmlHelpers();
    expect(result).toContain("export function deserializeFromXml");
    expect(result).toContain("xmlString: string");
    expect(result).toContain("properties: XmlPropertyDeserializeMetadata[]");
    expect(result).toContain("rootName: string");
  });

  /**
   * Tests that the deserializeXmlObject function renders with the correct
   * signature. This function converts a pre-parsed XML object to a typed
   * model and is used for nested model deserialization.
   */
  it("should render deserializeXmlObject function with correct signature", async () => {
    const result = renderXmlHelpers();
    expect(result).toContain("export function deserializeXmlObject");
    expect(result).toContain("xmlObject: Record<string, unknown>");
    expect(result).toContain("properties: XmlPropertyDeserializeMetadata[]");
  });
});
