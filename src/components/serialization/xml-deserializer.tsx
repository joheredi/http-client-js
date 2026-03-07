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
  xmlDeserializerRefkey,
  xmlObjectDeserializerRefkey,
} from "../../utils/refkeys.js";

/**
 * Props for the {@link XmlDeserializer} component.
 */
export interface XmlDeserializerProps {
  /** The TCGC model type to generate an XML deserializer function for. */
  model: SdkModelType;
}

/**
 * Renders an XML deserializer function for a TCGC model type.
 *
 * Generates a function that parses an XML string and maps it to a typed
 * SDK model instance. The function builds a `XmlPropertyDeserializeMetadata[]`
 * array describing how each XML element/attribute maps back to model properties,
 * then delegates to the static `deserializeFromXml()` helper.
 *
 * The generated function follows the legacy emitter's pattern:
 * ```typescript
 * export function modelNameXmlDeserializer(xmlString: string): ModelType {
 *   const properties: XmlPropertyDeserializeMetadata[] = [
 *     { propertyName: "name", xmlOptions: { name: "Name" }, type: "primitive", primitiveSubtype: "string" },
 *   ];
 *   return deserializeFromXml<ModelType>(xmlString, properties, "ModelName");
 * }
 * ```
 *
 * The deserializer is registered with `xmlDeserializerRefkey(model)` so other
 * components (e.g., operation response handlers) can reference it via refkey.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the XML deserializer function declaration.
 */
export function XmlDeserializer(props: XmlDeserializerProps) {
  const { model } = props;
  const properties = model.properties.filter((p) => p.kind === "property");
  const xmlName = getXmlModelName(model);

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, "XmlDeserializer")}
      refkey={xmlDeserializerRefkey(model)}
      export
      returnType={code`${typeRefkey(model)}`}
      parameters={[{ name: "xmlString", type: "string" }]}
      metadata={createNamespaceMetadata(model)}
    >
      {code`const properties: ${serializationHelperRefkey("XmlPropertyDeserializeMetadata")}[] = [\n`}
      <For each={properties} comma softline enderPunctuation>
        {(prop) => renderDeserializeMetadataEntry(prop)}
      </For>
      {code`\n];\nreturn ${serializationHelperRefkey("deserializeFromXml")}<${typeRefkey(model)}>(xmlString, properties, "${xmlName}");`}
    </FunctionDeclaration>
  );
}

/**
 * Renders a single metadata entry for the deserialization property array.
 *
 * Builds an object literal describing how to deserialize one XML element or
 * attribute back to a model property, including the property name, XML options,
 * type classification, primitive subtype for conversion, and optional nested
 * deserializer function.
 *
 * @param prop - The TCGC model property to describe.
 * @returns Alloy Children representing the metadata object literal.
 */
function renderDeserializeMetadataEntry(prop: SdkModelPropertyType): Children {
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

  // Add deserializer for nested model types
  if (propType === "object" && prop.type.kind === "model") {
    return code`{ ${parts.join(", ")}, deserializer: ${xmlObjectDeserializerRefkey(prop.type)} }`;
  }

  // Add primitive subtype for conversion
  const subtype = getPrimitiveSubtype(prop.type);
  if (subtype) parts.push(`primitiveSubtype: "${subtype}"`);

  // Add encoding hints — for arrays, extract encoding from the item type (valueType)
  // since the array type itself has no encoding; the legacy emitter propagates encoding
  // metadata from leaf types through array containers.
  const encodingType =
    prop.type.kind === "array" ? prop.type.valueType : prop.type;
  const encoding = getDateEncoding(encodingType);
  if (encoding) parts.push(`dateEncoding: "${encoding}"`);
  const bytesEnc = getBytesEncoding(encodingType);
  if (bytesEnc) parts.push(`bytesEncoding: "${bytesEnc}"`);

  // Add deserializer for array items that are models
  if (propType === "array" && prop.type.kind === "array") {
    const inner = prop.type.valueType;
    if (inner.kind === "model") {
      return code`{ ${parts.join(", ")}, deserializer: ${xmlObjectDeserializerRefkey(inner)} }`;
    }
    const itemType = getArrayItemType(inner);
    if (itemType) parts.push(`itemType: "${itemType}"`);
    // Add primitive subtype for array items to enable type conversion
    const innerSubtype = getPrimitiveSubtype(inner);
    if (innerSubtype) parts.push(`primitiveSubtype: "${innerSubtype}"`);
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
  return model.serializationOptions?.xml?.name ?? model.name;
}

/**
 * Maps a TCGC type kind to the XML property type classification.
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
 * Gets the primitive subtype for type conversion during deserialization.
 *
 * XML values are always strings; this tells the deserializer how to
 * convert them to the correct JS type.
 *
 * @param type - The TCGC type.
 * @returns The primitive subtype or undefined for non-primitives.
 */
function getPrimitiveSubtype(
  type: SdkType,
): "string" | "number" | "boolean" | undefined {
  switch (type.kind) {
    case "string":
    case "url":
      return "string";
    case "int32":
    case "int64":
    case "float32":
    case "float64":
    case "decimal":
    case "decimal128":
    case "safeint":
    case "integer":
    case "float":
    case "numeric":
      return "number";
    case "boolean":
      return "boolean";
    case "nullable":
      return getPrimitiveSubtype(type.type);
    default:
      return undefined;
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
