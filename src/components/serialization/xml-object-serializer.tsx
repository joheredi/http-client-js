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
import {
  serializationHelperRefkey,
  typeRefkey,
  xmlObjectSerializerRefkey,
} from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";

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
    >
      {code`return `}
      <ObjectExpression>
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            const xmlOpts = prop.serializationOptions?.xml;
            const xmlName = xmlOpts?.name ?? prop.serializedName;
            const accessor = `item["${prop.name}"]`;
            const valueExpr = getXmlObjectSerializationExpression(
              prop.type,
              accessor,
              prop,
            );
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
