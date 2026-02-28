import { Children, code, For } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkModelPropertyType,
  SdkModelType,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import { getModelFunctionName } from "../../utils/model-name.js";
import {
  serializationHelperRefkey,
  typeRefkey,
  xmlObjectDeserializerRefkey,
} from "../../utils/refkeys.js";
import { normalizePropertyName } from "../../utils/name-policy.js";

/**
 * Props for the {@link XmlObjectDeserializer} component.
 */
export interface XmlObjectDeserializerProps {
  /** The TCGC model type to generate an XML object deserializer function for. */
  model: SdkModelType;
}

/**
 * Renders an XML object deserializer function for a TCGC model type.
 *
 * Generates a function that converts a pre-parsed XML object (with XML-named
 * keys) into a typed SDK model instance. This is used for nested model types
 * where the parent deserializer has already parsed the XML string and is
 * passing individual element objects.
 *
 * The generated function follows the legacy emitter's pattern:
 * ```typescript
 * export function modelNameXmlObjectDeserializer(
 *   xmlObject: Record<string, unknown>,
 * ): ModelType {
 *   const properties: XmlPropertyDeserializeMetadata[] = [
 *     { propertyName: "name", xmlOptions: { name: "Name" }, type: "primitive", primitiveSubtype: "string" },
 *   ];
 *   return deserializeXmlObject<ModelType>(xmlObject, properties);
 * }
 * ```
 *
 * The object deserializer is registered with `xmlObjectDeserializerRefkey(model)`
 * so the XML deserializer and other parent deserializers can reference it.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the XML object deserializer function declaration.
 */
export function XmlObjectDeserializer(props: XmlObjectDeserializerProps) {
  const { model } = props;
  const properties = model.properties.filter((p) => p.kind === "property");

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, "XmlObjectDeserializer")}
      refkey={xmlObjectDeserializerRefkey(model)}
      export
      returnType={code`${typeRefkey(model)}`}
      parameters={[{ name: "xmlObject", type: "Record<string, unknown>" }]}
    >
      {code`const properties: ${serializationHelperRefkey("XmlPropertyDeserializeMetadata")}[] = [\n`}
      <For each={properties} comma softline enderPunctuation>
        {(prop) => renderDeserializeMetadataEntry(prop)}
      </For>
      {code`\n];\nreturn ${serializationHelperRefkey("deserializeXmlObject")}<${typeRefkey(model)}>(xmlObject, properties);`}
    </FunctionDeclaration>
  );
}

/**
 * Renders a single metadata entry for the deserialization property array.
 *
 * Builds an object literal describing how to deserialize one XML element or
 * attribute back to a model property, including primitive subtype for type
 * conversion and optional nested deserializer function.
 *
 * @param prop - The TCGC model property to describe.
 * @returns Alloy Children representing the metadata object literal.
 */
function renderDeserializeMetadataEntry(prop: SdkModelPropertyType): Children {
  const xmlOpts = prop.serializationOptions?.xml;
  const xmlName = xmlOpts?.name ?? prop.serializedName;
  const propType = getXmlPropertyType(prop.type);

  const parts: string[] = [];
  parts.push(`propertyName: "${normalizePropertyName(prop.name)}"`);

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

  // Add deserializer for array items that are models
  if (propType === "array" && prop.type.kind === "array") {
    const inner = prop.type.valueType;
    if (inner.kind === "model") {
      return code`{ ${parts.join(", ")}, deserializer: ${xmlObjectDeserializerRefkey(inner)} }`;
    }
    const itemType = getArrayItemType(inner);
    if (itemType) parts.push(`itemType: "${itemType}"`);
  }

  // Add primitive subtype for conversion
  const subtype = getPrimitiveSubtype(prop.type);
  if (subtype) parts.push(`primitiveSubtype: "${subtype}"`);

  // Add encoding hints
  const encoding = getDateEncoding(prop.type);
  if (encoding) parts.push(`dateEncoding: "${encoding}"`);
  const bytesEnc = getBytesEncoding(prop.type);
  if (bytesEnc) parts.push(`bytesEncoding: "${bytesEnc}"`);

  return code`{ ${parts.join(", ")} }`;
}

/**
 * Maps a TCGC type kind to the XML property type classification.
 *
 * @param type - The TCGC type.
 * @returns The XML property type string.
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
