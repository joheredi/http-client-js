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
import {
  deserializerRefkey,
  flattenDeserializerRefkey,
  serializationHelperRefkey,
  typeRefkey,
  arrayDeserializerRefkey,
  recordDeserializerRefkey,
} from "../../utils/refkeys.js";
import {
  computeFlattenCollisionMap,
  getEffectiveClientName,
} from "../../utils/flatten-collision.js";
import { useRuntimeLib } from "../../context/flavor-context.js";
import { needsTransformation } from "./json-serializer.js";
import { isAzureCoreErrorType } from "../../utils/azure-core-error-types.js";

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
  const properties = getDeserializableProperties(
    model,
    includeParentProperties,
  );
  const hasAdditional = model.additionalProperties !== undefined;
  // Empty models (no properties and no additionalProperties) pass through the
  // input unchanged — `return item;` — preserving any extra properties on the
  // object. This matches the legacy emitter's behavior.
  const isEmpty = properties.length === 0 && !hasAdditional;

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, nameSuffix ?? "Deserializer")}
      refkey={refkeyOverride ?? deserializerRefkey(model)}
      export
      returnType={code`${typeRefkey(model)}`}
      parameters={[{ name: "item", type: "any" }]}
    >
      {isEmpty ? (
        code`return item;`
      ) : (
        <>
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
                // Flatten properties emit a spread with a helper function call.
                // Required: `..._testPropertiesDeserializer(item["properties"])`
                // Optional: `...(!item["properties"] ? item["properties"] : _testPropertiesDeserializer(item["properties"]))`
                if (prop.flatten && prop.type.kind === "model") {
                  const helperRef = flattenDeserializerRefkey(
                    model,
                    prop.serializedName,
                  );
                  if (prop.optional) {
                    return code`...(!item["${prop.serializedName}"] ? item["${prop.serializedName}"] : ${helperRef}(item["${prop.serializedName}"]))`;
                  }
                  return code`...${helperRef}(item["${prop.serializedName}"])`;
                }
                const accessor = `item["${prop.serializedName}"]`;
                let valueExpr = getDeserializationExpression(
                  prop.type,
                  accessor,
                );
                // Apply array decoding if the property has @encode(ArrayEncoding.xxx).
                // This parses delimited strings back into arrays (e.g., "a,b" → ["a","b"]).
                valueExpr = wrapWithArrayDecoding(valueExpr, accessor, prop);
                const wrapped = wrapWithNullCheck(valueExpr, accessor, prop);
                return <ObjectProperty name={prop.name} value={wrapped} />;
              }}
            </For>
          </ObjectExpression>
          {code`;`}
        </>
      )}
    </FunctionDeclaration>
  );
}

/**
 * Collects the properties that need to be deserialized for a model.
 *
 * Returns the model's direct properties without expanding flatten properties.
 * Flatten properties remain as-is; the JsonDeserializer component detects them
 * at render time and emits spread expressions with helper function calls.
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
 * - Bytes: calls `stringToUint8Array()` with a `typeof` guard to handle values that may already be Uint8Array
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
      // Azure Core error types are imported from the runtime package and don't
      // have locally generated deserializers. Return the accessor as-is (pass-through).
      if (isAzureCoreErrorType(type)) {
        return accessor;
      }
      // Models without Output/Exception usage don't have deserializer functions.
      // This can happen for Input-only types referenced in response models.
      // Pass through as-is.
      if (
        (type.usage & UsageFlags.Output) === 0 &&
        (type.usage & UsageFlags.Exception) === 0
      ) {
        return accessor;
      }
      return code`${deserializerRefkey(type)}(${accessor})`;

    case "array": {
      if (needsTransformation(type.valueType)) {
        // If the value type has a named deserializer (model, union, nested array/record),
        // reference the named array helper function instead of inlining .map().
        if (valueTypeHasNamedDeserializerFn(type.valueType)) {
          return code`${arrayDeserializerRefkey(type.valueType)}(${accessor})`;
        }
        const elementExpr = getDeserializationExpression(type.valueType, "p");
        return code`${accessor}.map((p: any) => { return ${elementExpr}; })`;
      }
      return accessor;
    }

    case "dict": {
      if (needsTransformation(type.valueType)) {
        // If the value type has a named deserializer, reference the named record
        // helper function instead of using inline deserializeRecord().
        if (valueTypeHasNamedDeserializerFn(type.valueType)) {
          return code`${recordDeserializerRefkey(type.valueType)}(${accessor} as any)`;
        }
        const valueExpr = getDeserializationExpression(type.valueType, "v");
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

    case "bytes": {
      const encoding = type.encode ?? "base64";
      // Binary-encoded bytes (e.g., application/octet-stream responses) don't need
      // a typeof guard since the value always arrives as a string from HTTP.
      // Use "base64" as the encoding format for binary wire formats.
      if (encoding === "binary" || encoding === "bytes") {
        return code`${useRuntimeLib().stringToUint8Array}(${accessor}, "base64")`;
      }
      // For base64/base64url JSON properties, wrap with a typeof guard for robustness.
      // The value may already be a Uint8Array in round-trip scenarios.
      return code`typeof ${accessor} === "string"
    ? ${useRuntimeLib().stringToUint8Array}(${accessor}, "${encoding}")
    : ${accessor}`;
    }

    case "union":
      // Named unions with Output/Exception usage have pass-through deserializer
      // functions. Call the union deserializer refkey so the function is referenced
      // and Alloy auto-generates the import.
      if (
        type.name &&
        ((type.usage & UsageFlags.Output) !== 0 ||
          (type.usage & UsageFlags.Exception) !== 0)
      ) {
        return code`${deserializerRefkey(type)}(${accessor})`;
      }
      return accessor;

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
  const isNullable = property.type.kind === "nullable" || property.optional;

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
function getArrayEncodingParserName(encode: string): string | undefined {
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

/**
 * Props for the {@link FlattenDeserializerHelper} component.
 */
export interface FlattenDeserializerHelperProps {
  /** The parent model that contains the flatten property. */
  parentModel: SdkModelType;
  /** The flatten property (with `flatten: true` and `type.kind === "model"`). */
  flattenProp: SdkModelPropertyType;
}

/**
 * Renders a flatten deserializer helper function for a specific flatten property.
 *
 * Generates a function like `_testPropertiesDeserializer(item: any)` that reads
 * from the nested wire-format sub-object and returns an object with client-side
 * property names. The returned object gets spread into the parent model's
 * deserialized result.
 *
 * The function name follows the legacy emitter's pattern:
 * `_${lcfirst(parentModelName)}${ucfirst(propSerializedName)}Deserializer`.
 * Unlike the regular deserializer, the flatten helper has NO explicit return type
 * annotation (implicit `any`), matching the legacy emitter's output.
 *
 * When flatten property names collide with existing properties on the parent model,
 * the helper writes to collision-renamed client names (e.g., `barPropertiesBar: item["bar"]`
 * instead of `bar: item["bar"]`).
 *
 * @param props - The component props containing the parent model and flatten property.
 * @returns An Alloy JSX tree representing the flatten helper function declaration.
 */
export function FlattenDeserializerHelper(
  props: FlattenDeserializerHelperProps,
) {
  const { parentModel, flattenProp } = props;
  const flatModel = flattenProp.type as SdkModelType;
  const properties = getFlattenHelperDeserializableProperties(
    flatModel,
    flattenProp.optional,
  );
  const funcName = getFlattenHelperFunctionName(
    parentModel,
    flattenProp,
    "Deserializer",
  );
  const refkeyVal = flattenDeserializerRefkey(
    parentModel,
    flattenProp.serializedName,
  );
  const collisionMap = computeFlattenCollisionMap(parentModel);

  return (
    <FunctionDeclaration
      name={funcName}
      refkey={refkeyVal}
      export
      parameters={[{ name: "item", type: "any" }]}
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
            const accessor = `item["${prop.serializedName}"]`;
            let valueExpr = getDeserializationExpression(prop.type, accessor);
            valueExpr = wrapWithArrayDecoding(valueExpr, accessor, prop);
            const wrapped = wrapWithNullCheck(valueExpr, accessor, prop);
            return <ObjectProperty name={effectiveName} value={wrapped} />;
          }}
        </For>
      </ObjectExpression>
      {code`;`}
    </FunctionDeclaration>
  );
}

/**
 * Collects the properties for a flatten deserializer helper function.
 *
 * Gathers all properties from the flattened model type (own + inherited from base
 * models). If the flatten property is optional, all expanded properties become
 * optional. Unlike the main deserializer, this function does NOT check for nested
 * flatten — all properties are treated as regular for the wire sub-object.
 *
 * @param flatModel - The flatten model type (the `type` of the flatten property).
 * @param parentOptional - Whether the parent flatten property is optional.
 * @returns An array of properties to include in the flatten helper.
 */
function getFlattenHelperDeserializableProperties(
  flatModel: SdkModelType,
  parentOptional: boolean,
): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];

  if (flatModel.baseModel) {
    result.push(...collectAncestorProperties(flatModel));
  }

  for (const prop of flatModel.properties) {
    result.push(prop);
  }

  if (parentOptional) {
    return result.map((p) => ({ ...p, optional: true }));
  }

  return result;
}

/**
 * Generates the function name for a flatten deserializer helper.
 * See the serializer's `getFlattenHelperFunctionName` for the naming convention.
 */
function getFlattenHelperFunctionName(
  parentModel: SdkModelType,
  flattenProp: SdkModelPropertyType,
  suffix: string,
) {
  const modelName =
    parentModel.name.charAt(0).toLowerCase() + parentModel.name.slice(1);
  const propName =
    flattenProp.serializedName.charAt(0).toUpperCase() +
    flattenProp.serializedName.slice(1);
  return namekey(`_${modelName}${propName}${suffix}`, {
    ignoreNamePolicy: true,
  });
}

/**
 * Determines whether a type has a named deserializer function that can be
 * called by reference. Used to decide whether array/dict deserialization
 * should use a named helper function or stay inline.
 *
 * Defined locally to avoid circular dependency with json-array-record-helpers.tsx.
 *
 * @param type - The SDK type to check.
 * @returns True if the type has a named deserializer function.
 */
function valueTypeHasNamedDeserializerFn(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      // Azure Core error types don't have local deserializer functions
      if (isAzureCoreErrorType(type)) return false;
      return (
        (type.usage & UsageFlags.Output) !== 0 ||
        (type.usage & UsageFlags.Exception) !== 0
      );
    case "union":
      return !!(
        type.name &&
        ((type.usage & UsageFlags.Output) !== 0 ||
          (type.usage & UsageFlags.Exception) !== 0)
      );
    case "array":
      return (
        needsTransformation(type.valueType) &&
        valueTypeHasNamedDeserializerFn(type.valueType)
      );
    case "dict":
      return (
        needsTransformation(type.valueType) &&
        valueTypeHasNamedDeserializerFn(type.valueType)
      );
    case "nullable":
      return valueTypeHasNamedDeserializerFn(type.type);
    default:
      return false;
  }
}
