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
import { deserializerRefkey, typeRefkey } from "../../utils/refkeys.js";
import { httpRuntimeLib } from "../../utils/external-packages.js";
import { needsTransformation } from "./json-serializer.js";

/**
 * Props for the {@link JsonDeserializer} component.
 */
export interface JsonDeserializerProps {
  /** The TCGC model type to generate a deserializer function for. */
  model: SdkModelType;
}

/**
 * Renders a JSON deserializer function for a TCGC model type.
 *
 * Generates a function that transforms a raw JSON response object into a typed
 * SDK model instance. The function maps wire-format property names (from the JSON
 * response) to client-side property names, and applies type transformations where
 * needed (e.g., ISO string → Date, nested JSON → child model instances).
 *
 * The generated function follows the legacy emitter's pattern:
 * ```typescript
 * export function modelNameDeserializer(item: any): ModelType {
 *   return {
 *     clientName: item["wireName"],
 *     nested: !item["nestedWire"] ? item["nestedWire"] : nestedDeserializer(item["nestedWire"]),
 *   };
 * }
 * ```
 *
 * The deserializer is registered with `deserializerRefkey(model)` so other
 * components (e.g., operation response handlers, parent model deserializers)
 * can reference it via refkey, and Alloy auto-generates import statements.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the deserializer function declaration.
 */
export function JsonDeserializer(props: JsonDeserializerProps) {
  const { model } = props;
  const properties = getDeserializableProperties(model);

  return (
    <FunctionDeclaration
      name={`${model.name}Deserializer`}
      refkey={deserializerRefkey(model)}
      export
      returnType={code`${typeRefkey(model)}`}
      parameters={[{ name: "item", type: "any" }]}
    >
      {code`return `}
      <ObjectExpression>
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            const accessor = `item["${prop.serializedName}"]`;
            const valueExpr = getDeserializationExpression(prop.type, accessor);
            const wrapped = wrapWithNullCheck(valueExpr, accessor, prop);
            return <ObjectProperty name={prop.name} value={wrapped} />;
          }}
        </For>
      </ObjectExpression>
      {code`;`}
    </FunctionDeclaration>
  );
}

/**
 * Collects the properties that need to be deserialized for a model.
 *
 * Handles flattened properties by expanding them inline, mirroring the
 * serializer's property expansion logic. See `getSerializableProperties()`
 * in json-serializer.tsx for details.
 *
 * @param model - The TCGC model type.
 * @returns An array of properties to include in the deserializer.
 */
function getDeserializableProperties(
  model: SdkModelType,
): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];

  for (const prop of model.properties) {
    if (prop.flatten && prop.type.kind === "model") {
      for (const nestedProp of prop.type.properties) {
        result.push({
          ...nestedProp,
          optional: prop.optional ? true : nestedProp.optional,
        });
      }
    } else {
      result.push(prop);
    }
  }

  return result;
}

/**
 * Generates the deserialization expression for a given type and value accessor.
 *
 * This function determines how to transform a raw JSON value into the typed
 * SDK model representation based on the TCGC type kind. It handles:
 * - Models: calls the child deserializer function via refkey
 * - Arrays: uses `.map()` with recursive element deserialization
 * - Dictionaries: iterates entries with child deserializer
 * - Dates: wraps with `new Date()`
 * - Bytes: calls `stringToUint8Array()` from the runtime library
 * - Nullable: unwraps and deserializes the inner type
 * - Simple types: returns the accessor unchanged (passthrough)
 *
 * @param type - The TCGC type to generate a deserialization expression for.
 * @param accessor - The JavaScript expression that accesses the value (e.g., `item["name"]`).
 * @returns Alloy Children representing the deserialization expression.
 */
export function getDeserializationExpression(
  type: SdkType,
  accessor: string,
): Children {
  switch (type.kind) {
    case "model":
      return code`${deserializerRefkey(type)}(${accessor})`;

    case "array": {
      if (needsTransformation(type.valueType)) {
        const elementExpr = getDeserializationExpression(
          type.valueType,
          "p",
        );
        return code`${accessor}.map((p: any) => { return ${elementExpr}; })`;
      }
      return accessor;
    }

    case "dict": {
      if (needsTransformation(type.valueType)) {
        const valueExpr = getDeserializationExpression(
          type.valueType,
          "v",
        );
        return code`deserializeRecord(${accessor} as any, (v: any) => ${valueExpr})`;
      }
      return accessor;
    }

    case "utcDateTime":
    case "plainDate":
      if (type.encode === "unixTimestamp") {
        return code`new Date(${accessor} * 1000)`;
      }
      return code`new Date(${accessor})`;

    case "duration":
      return accessor;

    case "bytes":
      return code`${httpRuntimeLib.stringToUint8Array}(${accessor}, "base64")`;

    case "nullable":
      return getDeserializationExpression(type.type, accessor);

    default:
      return accessor;
  }
}

/**
 * Wraps a deserialization expression with a null/undefined check when needed.
 *
 * Mirrors the serializer's null check logic. See `wrapWithNullCheck()` in
 * json-serializer.tsx for the full rationale. The pattern is:
 * ```typescript
 * !item["wireName"] ? item["wireName"] : deserializerFn(item["wireName"])
 * ```
 *
 * @param expression - The deserialization expression to potentially wrap.
 * @param accessor - The raw accessor expression (used in the falsy branch).
 * @param property - The TCGC property (checked for optionality/nullability).
 * @returns The original or null-guarded expression.
 */
function wrapWithNullCheck(
  expression: Children,
  accessor: string,
  property: SdkModelPropertyType,
): Children {
  const isNullable =
    property.type.kind === "nullable" ||
    property.optional;

  if (isNullable && needsTransformation(property.type)) {
    return code`!${accessor} ? ${accessor} : ${expression}`;
  }

  return expression;
}
