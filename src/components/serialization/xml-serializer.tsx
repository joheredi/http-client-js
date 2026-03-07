import { Children, code, For } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkModelPropertyType,
  SdkModelType,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import { getModelFunctionName } from "../../utils/model-name.js";
import { createNamespaceMetadata } from "../../utils/namespace-qualifier.js";
import {
  serializationHelperRefkey,
  typeRefkey,
  xmlObjectSerializerRefkey,
  xmlSerializerRefkey,
} from "../../utils/refkeys.js";

/**
 * Props for the {@link XmlSerializer} component.
 */
export interface XmlSerializerProps {
  /** The TCGC model type to generate an XML serializer function for. */
  model: SdkModelType;
}

/**
 * Renders an XML serializer function for a TCGC model type.
 *
 * Generates a function that transforms a typed SDK model object into an XML
 * string suitable for HTTP request bodies with `application/xml` content type.
 * The function builds a `XmlPropertyMetadata[]` array describing how each
 * property maps to XML elements/attributes, then delegates to the static
 * `serializeToXml()` helper.
 *
 * The generated function follows the legacy emitter's pattern:
 * ```typescript
 * export function modelNameXmlSerializer(item: ModelType): string {
 *   const properties: XmlPropertyMetadata[] = [
 *     { propertyName: "name", xmlOptions: { name: "Name" }, type: "primitive" },
 *   ];
 *   return serializeToXml(item, properties, "ModelName");
 * }
 * ```
 *
 * The serializer is registered with `xmlSerializerRefkey(model)` so other
 * components (e.g., operation request builders) can reference it via refkey,
 * and Alloy auto-generates import statements.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the XML serializer function declaration.
 */
export function XmlSerializer(props: XmlSerializerProps) {
  const { model } = props;
  const properties = model.properties.filter((p) => p.kind === "property");
  const xmlName = getXmlModelName(model);

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, "XmlSerializer")}
      refkey={xmlSerializerRefkey(model)}
      export
      returnType="string"
      parameters={[{ name: "item", type: typeRefkey(model) }]}
      metadata={createNamespaceMetadata(model)}
    >
      {code`const properties: ${serializationHelperRefkey("XmlPropertyMetadata")}[] = [\n`}
      <For each={properties} comma softline enderPunctuation>
        {(prop) => renderSerializeMetadataEntry(prop)}
      </For>
      {code`\n];\nreturn ${serializationHelperRefkey("serializeToXml")}(item, properties, "${xmlName}"${getRootNsArg(model)});`}
    </FunctionDeclaration>
  );
}

/**
 * Renders a single metadata entry for the serialization property array.
 *
 * Builds an object literal describing how to serialize one model property
 * to XML, including the property name, XML options (element name, attribute,
 * namespace, wrapping), type classification, and optional nested serializer.
 *
 * @param prop - The TCGC model property to describe.
 * @returns Alloy Children representing the metadata object literal.
 */
function renderSerializeMetadataEntry(prop: SdkModelPropertyType): Children {
  const xmlOpts = prop.serializationOptions?.xml;
  const xmlName = xmlOpts?.name ?? prop.serializedName;
  const propType = getXmlPropertyType(prop.type);

  const parts: string[] = [];
  parts.push(`propertyName: "${prop.name}"`);

  // Build xmlOptions
  const optParts: string[] = [`name: "${xmlName}"`];
  if (xmlOpts?.attribute) optParts.push("attribute: true");
  if (xmlOpts?.ns) {
    optParts.push(
      `ns: { namespace: "${xmlOpts.ns.namespace}", prefix: "${xmlOpts.ns.prefix}" }`,
    );
  }
  if (xmlOpts?.unwrapped) optParts.push("unwrapped: true");
  if (xmlOpts?.itemsName) optParts.push(`itemsName: "${xmlOpts.itemsName}"`);
  if (xmlOpts?.itemsNs) {
    optParts.push(
      `itemsNs: { namespace: "${xmlOpts.itemsNs.namespace}", prefix: "${xmlOpts.itemsNs.prefix}" }`,
    );
  }
  parts.push(`xmlOptions: { ${optParts.join(", ")} }`);

  if (propType) parts.push(`type: "${propType}"`);

  // Add serializer for nested model types
  if (propType === "object" && prop.type.kind === "model") {
    return code`{ ${parts.join(", ")}, serializer: ${xmlObjectSerializerRefkey(prop.type)} }`;
  }

  // Add encoding hints — for arrays, extract encoding from the item type (valueType)
  // since the array type itself has no encoding; the legacy emitter propagates encoding
  // metadata from leaf types through array containers.
  const encodingType =
    prop.type.kind === "array" ? prop.type.valueType : prop.type;
  const encoding = getDateEncoding(encodingType);
  if (encoding) parts.push(`dateEncoding: "${encoding}"`);
  const bytesEnc = getBytesEncoding(encodingType);
  if (bytesEnc) parts.push(`bytesEncoding: "${bytesEnc}"`);

  // Add serializer for array items that are models
  if (propType === "array" && prop.type.kind === "array") {
    const inner = prop.type.valueType;
    if (inner.kind === "model") {
      return code`{ ${parts.join(", ")}, serializer: ${xmlObjectSerializerRefkey(inner)} }`;
    }
    const itemType = getArrayItemType(inner);
    if (itemType) parts.push(`itemType: "${itemType}"`);
  }

  return code`{ ${parts.join(", ")} }`;
}

/**
 * Gets the XML root element name for a model, using XML serialization
 * options if available, or falling back to the model name.
 *
 * @param model - The TCGC model type.
 * @returns The XML root element name string.
 */
function getXmlModelName(model: SdkModelType): string {
  // Check for model-level XML name via the first property's parent or model config
  return model.serializationOptions?.xml?.name ?? model.name;
}

/**
 * Builds the optional root namespace argument for `serializeToXml()`.
 *
 * @param model - The TCGC model type.
 * @returns A string like `, { namespace: "...", prefix: "..." }` or empty string.
 */
function getRootNsArg(model: SdkModelType): string {
  const ns = model.serializationOptions?.xml?.ns;
  if (ns) {
    return `, { namespace: "${ns.namespace}", prefix: "${ns.prefix}" }`;
  }
  return "";
}

/**
 * Maps a TCGC type kind to the XML property type classification used in
 * metadata arrays.
 *
 * @param type - The TCGC type.
 * @returns The XML property type string, or undefined for simple passthrough types.
 */
function getXmlPropertyType(
  type: SdkType,
): "array" | "object" | "primitive" | "date" | "bytes" | "dict" | undefined {
  switch (type.kind) {
    case "model":
      return "object";
    case "array":
      return "array";
    case "dict":
      return "dict";
    case "utcDateTime":
    case "plainDate":
      return "date";
    case "bytes":
      return "bytes";
    case "nullable":
      return getXmlPropertyType(type.type);
    default:
      return "primitive";
  }
}

/**
 * Gets the date encoding for a date-typed property.
 *
 * @param type - The TCGC type to check.
 * @returns The date encoding string or undefined.
 */
function getDateEncoding(
  type: SdkType,
): "rfc3339" | "rfc7231" | "unixTimestamp" | undefined {
  if (type.kind === "utcDateTime" || type.kind === "plainDate") {
    if (type.encode === "unixTimestamp") return "unixTimestamp";
    if (type.encode === "rfc7231") return "rfc7231";
    return "rfc3339";
  }
  if (type.kind === "nullable") return getDateEncoding(type.type);
  return undefined;
}

/**
 * Gets the bytes encoding for a bytes-typed property.
 *
 * @param type - The TCGC type to check.
 * @returns The bytes encoding string or undefined.
 */
function getBytesEncoding(type: SdkType): "base64" | "base64url" | undefined {
  if (type.kind === "bytes") {
    return (type as any).encode === "base64url" ? "base64url" : "base64";
  }
  if (type.kind === "nullable") return getBytesEncoding(type.type);
  return undefined;
}

/**
 * Gets the array item type classification for primitive, date, or bytes items.
 *
 * @param type - The TCGC type of the array's value type.
 * @returns The item type string or undefined for model items.
 */
function getArrayItemType(
  type: SdkType,
): "primitive" | "date" | "bytes" | undefined {
  switch (type.kind) {
    case "utcDateTime":
    case "plainDate":
      return "date";
    case "bytes":
      return "bytes";
    case "nullable":
      return getArrayItemType(type.type);
    default:
      return "primitive";
  }
}
