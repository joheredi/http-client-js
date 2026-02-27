import { Children, code, For, namekey } from "@alloy-js/core";
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
import { flattenSerializerRefkey, serializationHelperRefkey, serializerRefkey, typeRefkey } from "../../utils/refkeys.js";
import { computeFlattenCollisionMap, getEffectiveClientName } from "../../utils/flatten-collision.js";
import { useRuntimeLib } from "../../context/flavor-context.js";

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
        {hasAdditional ? (
          <>
            <ObjectSpreadProperty value="item" />
            {properties.length > 0 ? code`, ` : undefined}
          </>
        ) : undefined}
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            // Flatten properties emit a helper function call instead of inline expansion.
            // Required: `properties: _testPropertiesSerializer(item)`
            // Optional: `properties: areAllPropsUndefined(item, [...]) ? undefined : _testPropertiesSerializer(item)`
            if (prop.flatten && prop.type.kind === "model") {
              const helperRef = flattenSerializerRefkey(model, prop.serializedName);
              if (prop.optional) {
                const clientNames = getFlattenClientNames(prop);
                const namesList = clientNames.map((n) => `"${n}"`).join(", ");
                return (
                  <ObjectProperty
                    name={prop.serializedName}
                    value={code`${serializationHelperRefkey("areAllPropsUndefined")}(item, [${namesList}])\n? undefined\n: ${helperRef}(item)`}
                  />
                );
              }
              return (
                <ObjectProperty
                  name={prop.serializedName}
                  value={code`${helperRef}(item)`}
                />
              );
            }
            const accessor = `item["${prop.name}"]`;
            let valueExpr = getSerializationExpression(prop.type, accessor);
            // Apply array encoding if the property has @encode(ArrayEncoding.xxx).
            // This converts arrays to delimited strings on the wire (e.g., ["a","b"] → "a,b").
            valueExpr = wrapWithArrayEncoding(valueExpr, accessor, prop);
            const wrapped = wrapWithNullCheck(valueExpr, accessor, prop);
            return <ObjectProperty name={prop.serializedName} value={wrapped} />;
          }}
        </For>
      </ObjectExpression>
      {code`;`}
    </FunctionDeclaration>
  );
}

/**
 * Collects the properties that need to be serialized from a model.
 *
 * Returns the model's direct properties without expanding flatten properties.
 * Flatten properties remain as-is in the result; the JsonSerializer component
 * detects them at render time and emits helper function calls instead of
 * inline serialization.
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
    result.push(prop);
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

    case "union":
      // User-defined named unions with Input usage have pass-through serializer
      // functions. Call the union serializer refkey so the function is referenced
      // and Alloy auto-generates the import. Generated unions (e.g., additional
      // property type wrappers) are excluded — they don't have serializer functions.
      if (
        type.name &&
        !type.isGeneratedName &&
        (type.usage & UsageFlags.Input) !== 0
      ) {
        return code`${serializerRefkey(type)}(${accessor})`;
      }
      return accessor;

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
    case "union":
      // User-defined named unions with Input usage have serializer functions and
      // those with Output/Exception usage have deserializer functions. In both
      // cases, the type needs transformation so that null-check wrapping and
      // array/dict handling correctly call the serializer/deserializer function.
      // Generated unions (isGeneratedName) are excluded from serializer generation.
      return !!(
        type.name &&
        ((!type.isGeneratedName && (type.usage & UsageFlags.Input) !== 0) ||
          (type.usage & UsageFlags.Output) !== 0 ||
          (type.usage & UsageFlags.Exception) !== 0)
      );
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
 * When true, the serializer prepends `...item` to the return object to capture
 * all additional properties from the `extends Record<string, T>` pattern, then
 * overrides known properties with their serialized versions.
 *
 * @param model - The TCGC model type to check.
 * @returns `true` if the model has additional properties.
 */
function hasAdditionalProperties(model: SdkModelType): boolean {
  return model.additionalProperties !== undefined;
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

/**
 * Props for the {@link FlattenSerializerHelper} component.
 */
export interface FlattenSerializerHelperProps {
  /** The parent model that contains the flatten property. */
  parentModel: SdkModelType;
  /** The flatten property (with `flatten: true` and `type.kind === "model"`). */
  flattenProp: SdkModelPropertyType;
}

/**
 * Renders a flatten serializer helper function for a specific flatten property.
 *
 * Generates a function like `_testPropertiesSerializer(item: Test): any` that reads
 * flattened properties from the parent model's flat interface and produces the nested
 * wire-format sub-object. The function name follows the legacy emitter's pattern:
 * `_${lcfirst(parentModelName)}${ucfirst(propSerializedName)}Serializer`.
 *
 * The helper serializes the properties of the flattened model type (including inherited
 * base model properties) as regular properties — any nested flatten properties within
 * the flattened model type are serialized using their model type's own serializer, not
 * expanded further.
 *
 * When flatten property names collide with existing properties on the parent model,
 * the helper reads from the collision-renamed client names (e.g., `item["barPropertiesBar"]`
 * instead of `item["bar"]`).
 *
 * @param props - The component props containing the parent model and flatten property.
 * @returns An Alloy JSX tree representing the flatten helper function declaration.
 */
export function FlattenSerializerHelper(props: FlattenSerializerHelperProps) {
  const { parentModel, flattenProp } = props;
  const flatModel = flattenProp.type as SdkModelType;
  const properties = getFlattenHelperProperties(flatModel, flattenProp.optional);
  const funcName = getFlattenHelperFunctionName(parentModel, flattenProp, "Serializer");
  const refkeyVal = flattenSerializerRefkey(parentModel, flattenProp.serializedName);
  const collisionMap = computeFlattenCollisionMap(parentModel);

  return (
    <FunctionDeclaration
      name={funcName}
      refkey={refkeyVal}
      export
      returnType="any"
      parameters={[{ name: "item", type: typeRefkey(parentModel) }]}
    >
      {code`return `}
      <ObjectExpression>
        <For each={properties} comma softline enderPunctuation>
          {(prop) => {
            const effectiveName = getEffectiveClientName(
              collisionMap,
              flattenProp.serializedName,
              prop.name,
            );
            const accessor = `item["${effectiveName}"]`;
            let valueExpr = getSerializationExpression(prop.type, accessor);
            valueExpr = wrapWithArrayEncoding(valueExpr, accessor, prop);
            const wrapped = wrapWithNullCheck(valueExpr, accessor, prop);
            return <ObjectProperty name={prop.serializedName} value={wrapped} />;
          }}
        </For>
      </ObjectExpression>
      {code`;`}
    </FunctionDeclaration>
  );
}

/**
 * Collects the properties for a flatten helper function.
 *
 * Gathers all properties from the flattened model type (own + inherited from base
 * models). If the flatten property is optional, all expanded properties become
 * optional to match the legacy emitter's behavior.
 *
 * Unlike the main serializer's property collection, this function does NOT
 * check for nested flatten properties — all properties are treated as regular,
 * which is correct for the wire-format sub-object.
 *
 * @param flatModel - The flatten model type (the `type` of the flatten property).
 * @param parentOptional - Whether the parent flatten property is optional.
 * @returns An array of properties to include in the flatten helper.
 */
function getFlattenHelperProperties(
  flatModel: SdkModelType,
  parentOptional: boolean,
): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];

  // Include base model properties
  if (flatModel.baseModel) {
    result.push(...collectAncestorProperties(flatModel));
  }

  // Include own properties
  for (const prop of flatModel.properties) {
    result.push(prop);
  }

  // If parent flatten property is optional, all expanded props become optional
  if (parentOptional) {
    return result.map((p) => ({ ...p, optional: true }));
  }

  return result;
}

/**
 * Gets the client property names for the areAllPropsUndefined check.
 *
 * Returns the client-side names of all properties that the flatten serializer
 * helper would serialize. These names are used in the `areAllPropsUndefined(item, [...])`
 * call that guards optional flatten properties — if all listed properties are
 * undefined, the wire property is set to `undefined` instead of calling the helper.
 *
 * @param flattenProp - The flatten property with `type.kind === "model"`.
 * @returns An array of client property names.
 */
function getFlattenClientNames(flattenProp: SdkModelPropertyType): string[] {
  const flatModel = flattenProp.type as SdkModelType;
  const result: string[] = [];

  if (flatModel.baseModel) {
    const ancestors = collectAncestorProperties(flatModel);
    for (const p of ancestors) {
      result.push(p.name);
    }
  }

  for (const prop of flatModel.properties) {
    result.push(prop.name);
  }

  return result;
}

/**
 * Generates the function name for a flatten helper function.
 *
 * Follows the legacy emitter's naming convention:
 * `_${lcfirst(parentModelName)}${ucfirst(propSerializedName)}${suffix}`
 *
 * For example, model `Test` with flatten property `properties` and suffix `Serializer`
 * produces `_testPropertiesSerializer`. Uses `namekey` with `ignoreNamePolicy: true`
 * to preserve the underscore prefix from Alloy's name normalization.
 *
 * @param parentModel - The parent model containing the flatten property.
 * @param flattenProp - The flatten property.
 * @param suffix - The function suffix ("Serializer" or "Deserializer").
 * @returns A Namekey for the function name.
 */
function getFlattenHelperFunctionName(
  parentModel: SdkModelType,
  flattenProp: SdkModelPropertyType,
  suffix: string,
) {
  const modelName = parentModel.name.charAt(0).toLowerCase() + parentModel.name.slice(1);
  const propName =
    flattenProp.serializedName.charAt(0).toUpperCase() + flattenProp.serializedName.slice(1);
  return namekey(`_${modelName}${propName}${suffix}`, { ignoreNamePolicy: true });
}
