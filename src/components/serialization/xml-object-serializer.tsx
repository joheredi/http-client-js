import { Children, code, For } from "@alloy-js/core";
import {
  FunctionDeclaration,
  ObjectExpression,
  ObjectProperty,
} from "@alloy-js/typescript";
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
} from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";
import { normalizePropertyName } from "../../utils/name-policy.js";

/**
 * Props for the {@link XmlObjectSerializer} component.
 */
export interface XmlObjectSerializerProps {
  /** The TCGC model type to generate an XML object serializer function for. */
  model: SdkModelType;
}

/**
 * Renders an XML object serializer function for a TCGC model type.
 *
 * Generates a function that transforms a typed SDK model object into an
 * `XmlSerializedObject` — a plain object whose keys are XML element/attribute
 * names rather than client-side property names. This intermediate representation
 * is used by parent serializers when a model is nested inside another XML structure.
 *
 * The generated function follows the legacy emitter's pattern:
 * ```typescript
 * export function modelNameXmlObjectSerializer(item: ModelType): XmlSerializedObject {
 *   return {
 *     XmlName: item["clientName"],
 *     NestedXml: nestedXmlObjectSerializer(item["nested"]),
 *   };
 * }
 * ```
 *
 * The object serializer is registered with `xmlObjectSerializerRefkey(model)` so
 * the XML serializer and other parent serializers can reference it via refkey.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the XML object serializer function declaration.
 */
export function XmlObjectSerializer(props: XmlObjectSerializerProps) {
  const { model } = props;
  const properties = model.properties.filter((p) => p.kind === "property");

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, "XmlObjectSerializer")}
      refkey={xmlObjectSerializerRefkey(model)}
      export
      returnType={code`${serializationHelperRefkey("XmlSerializedObject")}`}
      parameters={[{ name: "item", type: typeRefkey(model) }]}
      metadata={createNamespaceMetadata(model)}
    >
      {code`return `}
      <ObjectExpression>
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            const xmlOpts = prop.serializationOptions?.xml;
            const xmlName = xmlOpts?.name ?? prop.serializedName;
            const accessor = `item["${normalizePropertyName(prop.name)}"]`;
            let valueExpr = getXmlObjectSerializationExpression(
              prop.type,
              accessor,
              prop,
            );
            valueExpr = wrapWithXmlNullCheck(valueExpr, accessor, prop);
            return <ObjectProperty name={xmlName} value={valueExpr} />;
          }}
        </For>
      </ObjectExpression>
      {code`;`}
    </FunctionDeclaration>
  );
}

/**
 * Generates the serialization expression for a property in the XML object
 * serializer context. Maps typed values to their XML-compatible representations.
 *
 * Handles:
 * - Nested models: calls the child XML object serializer via refkey
 * - Arrays of models: uses `.map()` with child XML object serializer
 * - Date properties: converts to ISO string, UTC string, or unix timestamp
 * - Bytes properties: converts to base64 string
 * - Simple types: passes through unchanged
 *
 * @param type - The TCGC type of the property.
 * @param accessor - The JavaScript expression accessing the value.
 * @param prop - The TCGC property descriptor (for encoding hints).
 * @returns Alloy Children representing the serialization expression.
 */
function getXmlObjectSerializationExpression(
  type: SdkType,
  accessor: string,
  prop: SdkModelPropertyType,
): Children {
  switch (type.kind) {
    case "model":
      return code`${xmlObjectSerializerRefkey(type)}(${accessor})`;

    case "array": {
      const inner = type.valueType;
      if (inner.kind === "model") {
        return code`${accessor}?.map((i: any) => ${xmlObjectSerializerRefkey(inner)}(i))`;
      }
      // For arrays of bytes/dates, map each item through the appropriate conversion.
      // The legacy emitter generates uint8ArrayToString for bytes items and date
      // conversion for date items in object serializers.
      const itemExpr = getArrayItemSerializationExpression(inner);
      if (itemExpr) {
        return code`${accessor}?.map((i: any) =>\n  ${itemExpr}\n)`;
      }
      return accessor;
    }

    case "utcDateTime":
      if (type.encode === "unixTimestamp") {
        // Unix timestamps are integer seconds, but Date.getTime() returns milliseconds.
        // Divide by 1000 and use bitwise OR to truncate to integer (matches legacy emitter).
        return code`((${accessor}).getTime() / 1000) | 0`;
      }
      return code`(${accessor}).toISOString()`;

    case "plainDate":
      return code`(${accessor}).toISOString().split("T")[0]`;

    case "bytes":
      return code`${useRuntimeLib().uint8ArrayToString}(${accessor}, "base64")`;

    case "nullable":
      return getXmlObjectSerializationExpression(type.type, accessor, prop);

    default:
      return accessor;
  }
}

/**
 * Wraps a serialization expression with a null check for optional/nullable
 * properties that need transformation. Prevents calling nested serializers
 * on `undefined` values.
 */
function wrapWithXmlNullCheck(
  expression: Children,
  accessor: string,
  property: SdkModelPropertyType,
): Children {
  const isNullable = property.type.kind === "nullable" || property.optional;
  if (isNullable && xmlNeedsTransformation(property.type)) {
    return code`!${accessor} ? ${accessor} : ${expression}`;
  }
  return expression;
}

/**
 * Determines whether an XML property type needs a serialization transformation
 * (i.e., is not a simple pass-through). Used to decide whether a null guard
 * is needed around the serialization expression.
 */
function xmlNeedsTransformation(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      return true;
    case "array":
      return false;
    case "utcDateTime":
    case "plainDate":
      return true;
    case "bytes":
      return true;
    case "nullable":
      return xmlNeedsTransformation(type.type);
    default:
      return false;
  }
}

/**
 * Generates the serialization expression for a single array item in the XML
 * object serializer context. Used inside `.map()` callbacks for arrays of
 * non-model types (bytes, dates) that need value conversion.
 *
 * Returns `undefined` for types that don't need conversion (primitives).
 *
 * @param type - The TCGC type of the array's value type.
 * @returns Alloy Children for the `.map()` callback body, or undefined if no conversion needed.
 */
function getArrayItemSerializationExpression(
  type: SdkType,
): Children | undefined {
  switch (type.kind) {
    case "bytes":
      return code`i !== undefined ? ${useRuntimeLib().uint8ArrayToString}(i, "base64") : undefined`;

    case "utcDateTime":
      if (type.encode === "unixTimestamp") {
        return code`i !== undefined ? ((i).getTime() / 1000) | 0 : undefined`;
      }
      return code`i !== undefined ? (i).toISOString() : undefined`;

    case "plainDate":
      return code`i !== undefined ? (i).toISOString().split("T")[0] : undefined`;

    case "nullable":
      return getArrayItemSerializationExpression(type.type);

    default:
      return undefined;
  }
}
