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

/**
 * Props for the {@link JsonSerializer} component.
 */
export interface JsonSerializerProps {
  /** The TCGC model type to generate a serializer function for. */
  model: SdkModelType;
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
  const { model } = props;
  const properties = getSerializableProperties(model);
  const hasAdditional = hasAdditionalProperties(model);

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, "Serializer")}
      refkey={serializerRefkey(model)}
      export
      returnType="any"
      parameters={[{ name: "item", type: typeRefkey(model) }]}
    >
      {code`return `}
      <ObjectExpression>
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            const accessor = `item["${prop.name}"]`;
            const valueExpr = getSerializationExpression(prop.type, accessor);
            const wrapped = wrapWithNullCheck(valueExpr, accessor, prop);
            return <ObjectProperty name={prop.serializedName} value={wrapped} />;
          }}
        </For>
        {hasAdditional ? (
          <ObjectSpreadProperty value={code`(item["additionalProperties"] ?? {})`} />
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
 * @param model - The TCGC model type.
 * @returns An array of properties to include in the serializer.
 */
function getSerializableProperties(
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
 * Generates the serialization expression for a given type and value accessor.
 *
 * This function determines how to transform a typed value into its wire format
 * based on the TCGC type kind. It handles:
 * - Models: calls the child serializer function via refkey
 * - Arrays: uses `.map()` with recursive element serialization
 * - Dictionaries: iterates entries with child serializer
 * - Dates: calls `.toISOString()`
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
    case "plainDate":
      if (type.encode === "unixTimestamp") {
        return code`(${accessor}).getTime()`;
      }
      return code`(${accessor}).toISOString()`;

    case "duration":
      return accessor;

    case "bytes":
      return code`${useRuntimeLib().uint8ArrayToString}(${accessor}, "base64")`;

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
