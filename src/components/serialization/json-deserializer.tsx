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
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { getModelFunctionName } from "../../utils/model-name.js";
import { deserializerRefkey, serializationHelperRefkey, typeRefkey } from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";
import { needsTransformation } from "./json-serializer.js";

/**
 * Props for the {@link JsonDeserializer} component.
 */
export interface JsonDeserializerProps {
  /** The TCGC model type to generate a deserializer function for. */
  model: SdkModelType;
  /**
   * Optional refkey override for the generated function declaration.
   * When provided, the function is registered with this refkey instead of
   * the default `deserializerRefkey(model)`. Used for base model deserializers
   * in polymorphic hierarchies, where the polymorphic switch deserializer
   * already claims `deserializerRefkey(model)`.
   */
  refkeyOverride?: import("@alloy-js/core").Refkey;
  /**
   * Optional name suffix override for the generated function.
   * When provided, the function name uses this suffix instead of "Deserializer".
   * Used for base model deserializers (e.g., "BaseModelDeserializer").
   */
  nameSuffix?: string;
  /**
   * Whether to include inherited properties from parent models.
   * When true, walks the `baseModel` chain to collect all ancestor properties.
   * Used for child types in discriminated hierarchies and base model deserializers.
   * @default false
   */
  includeParentProperties?: boolean;
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
  const { model, refkeyOverride, nameSuffix, includeParentProperties } = props;
  const properties = getDeserializableProperties(model, includeParentProperties);

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, nameSuffix ?? "Deserializer")}
      refkey={refkeyOverride ?? deserializerRefkey(model)}
      export
      returnType={code`${typeRefkey(model)}`}
      parameters={[{ name: "item", type: "any" }]}
    >
      {code`return `}
      <ObjectExpression>
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            const accessor = `item["${prop.serializedName}"]`;
            let valueExpr = getDeserializationExpression(prop.type, accessor);
            // Apply array decoding if the property has @encode(ArrayEncoding.xxx).
            // This parses delimited strings back into arrays (e.g., "a,b" → ["a","b"]).
            valueExpr = wrapWithArrayDecoding(valueExpr, accessor, prop);
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
 * When `includeParent` is true, walks the `baseModel` chain to collect all
 * inherited ancestor properties before the model's own properties. This is
 * needed for child types in discriminated hierarchies, where the deserializer
 * must map all wire properties (inherited + own) to their client-side names.
 *
 * @param model - The TCGC model type.
 * @param includeParent - Whether to include inherited parent properties.
 * @returns An array of properties to include in the deserializer.
 */
function getDeserializableProperties(
  model: SdkModelType,
  includeParent?: boolean,
): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];

  // Collect inherited properties from ancestor models first
  if (includeParent) {
    const ancestors = collectAncestorProperties(model);
    result.push(...ancestors);
  }

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
 * Collects all properties inherited from ancestor models by walking
 * up the `baseModel` chain.
 *
 * Properties from the most distant ancestor appear first, then closer
 * ancestors, matching the natural inheritance order. Properties that are
 * overridden by descendant models (same `name`) are excluded to avoid
 * duplicate mappings in deserializers.
 *
 * @param model - The TCGC model type to start from.
 * @returns An array of inherited properties (excluding those overridden by descendants).
 */
function collectAncestorProperties(
  model: SdkModelType,
): SdkModelPropertyType[] {
  const ancestors: SdkModelType[] = [];
  let current = model.baseModel;
  while (current) {
    ancestors.unshift(current);
    current = current.baseModel;
  }

  const ownPropertyNames = new Set(model.properties.map((p) => p.name));
  const inherited: SdkModelPropertyType[] = [];
  const seenNames = new Set<string>();

  for (const ancestor of ancestors) {
    for (const prop of ancestor.properties) {
      if (!ownPropertyNames.has(prop.name) && !seenNames.has(prop.name)) {
        inherited.push(prop);
        seenNames.add(prop.name);
      }
    }
  }

  return inherited;
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
      // Models without Output/Exception usage don't have deserializer functions.
      // This can happen for Input-only types referenced in response models.
      // Pass through as-is.
      if ((type.usage & UsageFlags.Output) === 0 && (type.usage & UsageFlags.Exception) === 0) {
        return accessor;
      }
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
        return code`${serializationHelperRefkey("deserializeRecord")}(${accessor} as any, (v: any) => ${valueExpr})`;
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
      return code`${useRuntimeLib().stringToUint8Array}(${accessor}, "base64")`;

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

/**
 * Wraps a deserialization expression with a collection parser helper when the
 * property has an `@encode(ArrayEncoding.xxx)` annotation.
 *
 * This parses delimited strings from the wire format back into arrays:
 * - `commaDelimited`: `parseCsvCollection(value)` → `["a","b","c"]`
 * - `pipeDelimited`: `parsePipeCollection(value)` → `["a","b","c"]`
 * - `spaceDelimited`: `parseSsvCollection(value)` → `["a","b","c"]`
 * - `newlineDelimited`: `parseNewlineCollection(value)` → `["a","b","c"]`
 *
 * @param expression - The current deserialization expression for the property.
 * @param accessor - The raw accessor expression for the property value.
 * @param prop - The TCGC model property with potential `encode` field.
 * @returns The expression wrapped with a collection parser, or unchanged.
 */
function wrapWithArrayDecoding(
  expression: Children,
  accessor: string,
  prop: SdkModelPropertyType,
): Children {
  if (!prop.encode) return expression;

  const helperName = getArrayEncodingParserName(prop.encode);
  if (!helperName) return expression;

  return code`${serializationHelperRefkey(helperName)}(${accessor})`;
}

/**
 * Maps an `ArrayKnownEncoding` value to the corresponding collection parser
 * helper function name.
 *
 * @param encode - The TCGC array encoding string.
 * @returns The helper function name, or undefined if no decoding is needed.
 */
function getArrayEncodingParserName(
  encode: string,
): string | undefined {
  switch (encode) {
    case "commaDelimited":
      return "parseCsvCollection";
    case "pipeDelimited":
      return "parsePipeCollection";
    case "spaceDelimited":
      return "parseSsvCollection";
    case "newlineDelimited":
      return "parseNewlineCollection";
    default:
      return undefined;
  }
}
