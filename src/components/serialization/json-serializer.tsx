import { Children, code, For } from "@alloy-js/core";
import {
  FunctionDeclaration,
  ObjectExpression,
  ObjectProperty,
  ObjectSpreadProperty,
} from "@alloy-js/typescript";
import type {
  SdkModelPropertyType,
  SdkModelType,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { getModelFunctionName } from "../../utils/model-name.js";
import { serializationHelperRefkey, serializerRefkey, typeRefkey } from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";
import { getAdditionalPropertiesFieldName } from "../model-interface.js";

/**
 * Props for the {@link JsonSerializer} component.
 */
export interface JsonSerializerProps {
  /** The TCGC model type to generate a serializer function for. */
  model: SdkModelType;
  /**
   * Optional refkey override for the generated function declaration.
   * When provided, the function is registered with this refkey instead of
   * the default `serializerRefkey(model)`. Used for base model serializers
   * in polymorphic hierarchies, where the polymorphic switch serializer
   * already claims `serializerRefkey(model)`.
   */
  refkeyOverride?: import("@alloy-js/core").Refkey;
  /**
   * Optional name suffix override for the generated function.
   * When provided, the function name uses this suffix instead of "Serializer".
   * Used for base model serializers (e.g., "BaseModelSerializer").
   */
  nameSuffix?: string;
  /**
   * Whether to include inherited properties from parent models.
   * When true, walks the `baseModel` chain to collect all ancestor properties.
   * Used for child types in discriminated hierarchies and base model serializers.
   * @default false
   */
  includeParentProperties?: boolean;
}

/**
 * Renders a JSON serializer function for a TCGC model type.
 *
 * Generates a function that transforms a typed SDK model object into a plain
 * JSON object suitable for HTTP request bodies. The function maps client-side
 * property names to wire-format property names (using `serializedName`), and
 * applies type transformations where needed (e.g., Date → ISO string, nested
 * models → child serializer calls).
 *
 * The generated function follows the legacy emitter's pattern:
 * ```typescript
 * export function modelNameSerializer(item: ModelType): any {
 *   return {
 *     wireName: item["clientName"],
 *     nestedWire: !item["nested"] ? item["nested"] : nestedSerializer(item["nested"]),
 *   };
 * }
 * ```
 *
 * The serializer is registered with `serializerRefkey(model)` so other components
 * (e.g., operation request builders, parent model serializers) can reference it
 * via refkey, and Alloy auto-generates import statements.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the serializer function declaration.
 */
export function JsonSerializer(props: JsonSerializerProps) {
  const { model, refkeyOverride, nameSuffix, includeParentProperties } = props;
  const properties = getSerializableProperties(model, includeParentProperties);
  const hasAdditional = hasAdditionalProperties(model);

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, nameSuffix ?? "Serializer")}
      refkey={refkeyOverride ?? serializerRefkey(model)}
      export
      returnType="any"
      parameters={[{ name: "item", type: typeRefkey(model) }]}
    >
      {code`return `}
      <ObjectExpression>
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            const accessor = `item["${prop.name}"]`;
            let valueExpr = getSerializationExpression(prop.type, accessor);
            // Apply array encoding if the property has @encode(ArrayEncoding.xxx).
            // This converts arrays to delimited strings on the wire (e.g., ["a","b"] → "a,b").
            valueExpr = wrapWithArrayEncoding(valueExpr, accessor, prop);
            const wrapped = wrapWithNullCheck(valueExpr, accessor, prop);
            return <ObjectProperty name={prop.serializedName} value={wrapped} />;
          }}
        </For>
        {hasAdditional ? (
          <ObjectSpreadProperty value={getAdditionalPropertiesSpread(model)} />
        ) : undefined}
      </ObjectExpression>
      {code`;`}
    </FunctionDeclaration>
  );
}

/**
 * Collects the properties that need to be serialized from a model.
 *
 * Handles flattened properties by expanding them inline. When a property
 * has `flatten: true` and its type is a model, the nested model's properties
 * are included directly. Children inherit the wrapper's optionality.
 *
 * When `includeParent` is true, walks the `baseModel` chain to collect all
 * inherited ancestor properties before the model's own properties. This is
 * needed for child types in discriminated hierarchies, where the serializer
 * must map all properties (inherited + own) to their wire names.
 *
 * @param model - The TCGC model type.
 * @param includeParent - Whether to include inherited parent properties.
 * @returns An array of properties to include in the serializer.
 */
function getSerializableProperties(
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
 * duplicate mappings in serializers.
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

  // Collect all ancestor properties, then remove any overridden by the model itself
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
 * Generates the serialization expression for a given type and value accessor.
 *
 * This function determines how to transform a typed value into its wire format
 * based on the TCGC type kind. It handles:
 * - Models: calls the child serializer function via refkey
 * - Arrays: uses `.map()` with recursive element serialization
 * - Dictionaries: iterates entries with child serializer
 * - utcDateTime: calls `.toISOString()` (or `(getTime() / 1000) | 0` for unixTimestamp encoding, integer seconds)
 * - plainDate: calls `.toISOString().split("T")[0]` for date-only (YYYY-MM-DD) format
 * - Bytes: calls `uint8ArrayToString()` from the runtime library
 * - Nullable: unwraps and serializes the inner type
 * - Simple types: returns the accessor unchanged (passthrough)
 *
 * @param type - The TCGC type to generate a serialization expression for.
 * @param accessor - The JavaScript expression that accesses the value (e.g., `item["name"]`).
 * @returns Alloy Children representing the serialization expression.
 */
export function getSerializationExpression(
  type: SdkType,
  accessor: string,
): Children {
  switch (type.kind) {
    case "model":
      // Models without Input usage don't have serializer functions generated.
      // This happens for read-only types like Azure.ResourceManager.SystemData
      // that only appear in responses (Output usage). Pass through as-is.
      if ((type.usage & UsageFlags.Input) === 0) {
        return accessor;
      }
      return code`${serializerRefkey(type)}(${accessor})`;

    case "array": {
      if (needsTransformation(type.valueType)) {
        const elementExpr = getSerializationExpression(type.valueType, "p");
        return code`${accessor}.map((p: any) => { return ${elementExpr}; })`;
      }
      return accessor;
    }

    case "dict": {
      if (needsTransformation(type.valueType)) {
        const valueExpr = getSerializationExpression(type.valueType, "v");
        return code`${serializationHelperRefkey("serializeRecord")}(${accessor} as any, (v: any) => ${valueExpr})`;
      }
      return accessor;
    }

    case "utcDateTime":
      if (type.encode === "unixTimestamp") {
        // Unix timestamps are integer seconds, but Date.getTime() returns milliseconds.
        // Divide by 1000 and use bitwise OR to truncate to integer (matches legacy emitter).
        return code`((${accessor}).getTime() / 1000) | 0`;
      }
      if (type.encode === "rfc7231") {
        // RFC 7231 HTTP-date format for headers (e.g., "Mon, 15 Jan 2024 12:30:00 GMT").
        // HTTP headers use this format per RFC 7231 §7.1.1.1. TCGC sets this encoding
        // when utcDateTime is used in a header parameter position.
        return code`(${accessor}).toUTCString()`;
      }
      // Default: RFC 3339 / ISO 8601 format (e.g., "2024-01-15T12:30:00.000Z")
      return code`(${accessor}).toISOString()`;

    case "plainDate":
      return code`(${accessor}).toISOString().split("T")[0]`;

    case "duration":
      return accessor;

    case "bytes": {
      // Use the type's encoding, but fall back to "base64" for binary wire formats
      // since uint8ArrayToString always needs a string encoding format.
      const rawEncoding = type.encode ?? "base64";
      const encoding = rawEncoding === "binary" || rawEncoding === "bytes" ? "base64" : rawEncoding;
      return code`${useRuntimeLib().uint8ArrayToString}(${accessor}, "${encoding}")`;
    }

    case "nullable":
      return getSerializationExpression(type.type, accessor);

    default:
      return accessor;
  }
}

/**
 * Determines whether a TCGC type requires transformation during serialization.
 *
 * Types that need transformation include models (which call child serializers),
 * arrays and dictionaries with complex element types, date types (which need
 * `.toISOString()`), and bytes (which need base64 encoding).
 *
 * Simple types (string, number, boolean, enums, constants) pass through
 * unchanged and don't need transformation.
 *
 * @param type - The TCGC type to check.
 * @returns `true` if the type requires a serialization transformation.
 */
export function needsTransformation(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      return true;
    case "array":
      return needsTransformation(type.valueType);
    case "dict":
      return needsTransformation(type.valueType);
    case "nullable":
      return needsTransformation(type.type);
    case "utcDateTime":
    case "plainDate":
      return true;
    case "bytes":
      return true;
    default:
      return false;
  }
}

/**
 * Wraps a serialization expression with a null/undefined check when needed.
 *
 * When a property is optional or nullable and requires a transformation
 * (serializer call, type conversion), the expression is wrapped with a
 * ternary guard to avoid calling transformation functions on null/undefined:
 * ```typescript
 * !item["prop"] ? item["prop"] : serializerFn(item["prop"])
 * ```
 *
 * This pattern is safe because null/undefined values pass through as-is
 * in JSON, while defined values get properly serialized.
 *
 * @param expression - The serialization expression to potentially wrap.
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
 * Checks whether a model has additional properties that need spreading.
 *
 * @param model - The TCGC model type to check.
 * @returns `true` if the model has additional properties.
 */
function hasAdditionalProperties(model: SdkModelType): boolean {
  return model.additionalProperties !== undefined;
}

/**
 * Generates the spread expression for additional properties in a serializer.
 *
 * Accesses the explicit `additionalProperties` (or `additionalPropertiesBag`)
 * field on the model instance and spreads its entries into the serialized output.
 * For additional property types that need transformation (e.g., model-typed values),
 * uses `serializeRecord` with a per-value serializer callback. For simple types,
 * spreads directly.
 *
 * @param model - The TCGC model type with additional properties.
 * @returns Alloy Children representing the spread expression.
 */
function getAdditionalPropertiesSpread(model: SdkModelType): Children {
  const fieldName = getAdditionalPropertiesFieldName(model);
  const accessor = `item["${fieldName}"]`;
  const fallback = code`${accessor} ?? {}`;

  if (
    model.additionalProperties &&
    needsTransformation(model.additionalProperties)
  ) {
    const valueExpr = getSerializationExpression(
      model.additionalProperties,
      "v",
    );
    return code`${serializationHelperRefkey("serializeRecord")}(${fallback} as any, (v: any) => ${valueExpr})`;
  }

  return code`(${fallback})`;
}

/**
 * Wraps a serialization expression with a collection builder helper when the
 * property has an `@encode(ArrayEncoding.xxx)` annotation.
 *
 * This transforms arrays into delimited strings for the wire format:
 * - `commaDelimited`: `buildCsvCollection(value)` → `"a,b,c"`
 * - `pipeDelimited`: `buildPipeCollection(value)` → `"a|b|c"`
 * - `spaceDelimited`: `buildSsvCollection(value)` → `"a b c"`
 * - `newlineDelimited`: `buildNewlineCollection(value)` → `"a\nb\nc"`
 *
 * When the array elements also need transformation (e.g., date arrays),
 * the inner transformation is applied first via `.map()`, then the
 * collection builder wraps the result.
 *
 * @param expression - The current serialization expression for the property.
 * @param accessor - The raw accessor expression for the property value.
 * @param prop - The TCGC model property with potential `encode` field.
 * @returns The expression wrapped with a collection builder, or unchanged.
 */
function wrapWithArrayEncoding(
  expression: Children,
  accessor: string,
  prop: SdkModelPropertyType,
): Children {
  if (!prop.encode) return expression;

  const helperName = getArrayEncodingBuilderName(prop.encode);
  if (!helperName) return expression;

  // If the inner array elements need transformation (e.g., dates), the
  // expression is already a .map() call. Wrap that with the collection builder.
  // If no transformation is needed, the expression is the raw accessor.
  if (needsTransformation(prop.type)) {
    return code`${serializationHelperRefkey(helperName)}(${expression})`;
  }

  return code`${serializationHelperRefkey(helperName)}(${accessor})`;
}

/**
 * Maps an `ArrayKnownEncoding` value to the corresponding collection builder
 * helper function name.
 *
 * @param encode - The TCGC array encoding string.
 * @returns The helper function name, or undefined if no encoding is needed.
 */
function getArrayEncodingBuilderName(
  encode: string,
): string | undefined {
  switch (encode) {
    case "commaDelimited":
      return "buildCsvCollection";
    case "pipeDelimited":
      return "buildPipeCollection";
    case "spaceDelimited":
      return "buildSsvCollection";
    case "newlineDelimited":
      return "buildNewlineCollection";
    default:
      return undefined;
  }
}
