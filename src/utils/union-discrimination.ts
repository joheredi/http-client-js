import type {
  SdkModelType,
  SdkType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Information about a constant-valued property that can serve as a discriminator
 * for a set of model variants in a non-discriminated union.
 */
export interface DiscriminatorPropertyInfo {
  /** The serialized (wire) name of the property. */
  serializedName: string;
  /** Whether each constant value maps to exactly one model variant. */
  isFullyDistinct: boolean;
  /** Map from constant value to the model variants that have that value. */
  valueToModels: Map<string, SdkModelType[]>;
}

/**
 * Finds the best constant-valued property to use as a runtime discriminator
 * for a set of model variants.
 *
 * Scans all model properties for `SdkConstantType` values and looks for a
 * property where every model has a constant value. Prefers properties where
 * each value maps to exactly one model (fully distinct), enabling clean
 * switch-statement discrimination.
 *
 * @param models - The model variants to analyze.
 * @returns Discriminator property info, or undefined if no suitable property found.
 */
export function findDiscriminatorProperty(
  models: SdkModelType[],
): DiscriminatorPropertyInfo | undefined {
  if (models.length < 2) return undefined;

  // Collect constant-valued properties across all models
  const propertyMap = new Map<string, Map<string, SdkModelType[]>>();

  for (const model of models) {
    for (const prop of model.properties) {
      if (
        prop.type.kind === "constant" &&
        typeof prop.type.value === "string"
      ) {
        const sName = prop.serializedName;
        if (!propertyMap.has(sName)) {
          propertyMap.set(sName, new Map());
        }
        const valueMap = propertyMap.get(sName)!;
        const value = String(prop.type.value);
        if (!valueMap.has(value)) {
          valueMap.set(value, []);
        }
        valueMap.get(value)!.push(model);
      }
    }
  }

  // Find a property that covers all models with constant values
  let bestProp: DiscriminatorPropertyInfo | undefined;

  for (const [propName, valueMap] of propertyMap) {
    const coveredModels = new Set<SdkModelType>();
    for (const modelsForValue of valueMap.values()) {
      for (const model of modelsForValue) {
        coveredModels.add(model);
      }
    }

    // Must cover all models
    if (coveredModels.size !== models.length) continue;

    const isFullyDistinct = [...valueMap.values()].every((m) => m.length === 1);

    if (!bestProp || isFullyDistinct) {
      bestProp = {
        serializedName: propName,
        isFullyDistinct,
        valueToModels: valueMap,
      };
      if (isFullyDistinct) break; // Found a perfect discriminator
    }
  }

  return bestProp;
}

/**
 * Finds a property name that is unique to a specific model (not present in
 * any other model in the set). Used as a secondary discrimination strategy
 * when constant-value discrimination is not possible (e.g., overlapping
 * discriminator values like two models both having `kind: "kind1"`).
 *
 * @param target - The model to find a unique property for.
 * @param allModels - All model variants in the union.
 * @returns The serialized name of a unique property, or undefined if none found.
 */
export function findUniquePropertyForModel(
  target: SdkModelType,
  allModels: SdkModelType[],
): string | undefined {
  const otherModels = allModels.filter((m) => m !== target);
  const otherPropNames = new Set<string>();

  for (const model of otherModels) {
    for (const prop of model.properties) {
      otherPropNames.add(prop.serializedName);
    }
  }

  for (const prop of target.properties) {
    if (!otherPropNames.has(prop.serializedName)) {
      return prop.serializedName;
    }
  }

  return undefined;
}

/**
 * Checks whether a type variant requires active deserialization transformation.
 *
 * Returns true when the pass-through approach (`return item`) would produce
 * incorrect results — e.g., Date fields remaining as ISO strings instead of
 * being parsed to Date objects, or bytes remaining as base64 strings.
 *
 * This is NOT the same as `needsTransformation()` from json-serializer.tsx,
 * which checks whether a type needs a serializer/deserializer declaration.
 * This function checks whether the actual data transformation would change
 * the output.
 *
 * @param type - The variant type to check.
 * @returns True if the type needs active deserialization transformation.
 */
export function variantNeedsDeserialization(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      return type.properties.some((p) => variantNeedsDeserialization(p.type));
    case "array":
      return variantNeedsDeserialization(type.valueType);
    case "nullable":
      return variantNeedsDeserialization(type.type);
    case "utcDateTime":
    case "plainDate":
    case "bytes":
      return true;
    case "union":
      return type.variantTypes.some((v) => variantNeedsDeserialization(v));
    default:
      return false;
  }
}

/**
 * Checks whether a type variant requires active serialization transformation.
 *
 * Returns true when the pass-through approach (`return item`) would produce
 * incorrect results — e.g., Date objects not being converted to ISO strings,
 * or bytes not being base64-encoded.
 *
 * @param type - The variant type to check.
 * @returns True if the type needs active serialization transformation.
 */
export function variantNeedsSerialization(type: SdkType): boolean {
  // Same logic as deserialization — the same types need transformation in both directions
  return variantNeedsDeserialization(type);
}

/**
 * Unwraps a nullable type wrapper to get the inner type.
 * Returns the type unchanged if it's not nullable.
 */
export function unwrapNullable(type: SdkType): SdkType {
  return type.kind === "nullable" ? type.type : type;
}

/**
 * Builds a mapping from each SdkModelType variant to its discriminator value
 * by inspecting the raw TypeSpec union's named variants.
 *
 * TypeSpec discriminated unions like `union Pet { cat: Cat, dog: Dog }` have
 * named variants where the name ("cat", "dog") is the discriminator value.
 * TCGC preserves the raw TypeSpec union on `__raw`, and each variant model's
 * `__raw` points to the same TypeSpec Model object, enabling reference-based
 * matching between TCGC types and TypeSpec types.
 *
 * @param sdkUnion - The TCGC union type with discriminatedOptions.
 * @returns Map from SdkModelType to its discriminator value string, or undefined
 *          if the raw union structure is not available.
 */
export function getDiscriminatedVariantMapping(
  sdkUnion: SdkUnionType,
): Map<SdkModelType, string> | undefined {
  const raw = (sdkUnion as any).__raw;
  if (!raw || raw.kind !== "Union" || !raw.variants) {
    return undefined;
  }

  // Build a map from raw TypeSpec Model → variant name (discriminator value)
  const rawModelToName = new Map<unknown, string>();
  for (const [variantName, rawVariant] of raw.variants) {
    if (rawVariant?.type) {
      rawModelToName.set(rawVariant.type, String(variantName));
    }
  }

  // Match SDK variant types to their discriminator values
  const result = new Map<SdkModelType, string>();
  for (const variant of sdkUnion.variantTypes) {
    const base = unwrapNullable(variant);
    if (base.kind === "model") {
      const variantRaw = (base as any).__raw;
      if (variantRaw && rawModelToName.has(variantRaw)) {
        result.set(base, rawModelToName.get(variantRaw)!);
      }
    }
  }

  return result;
}
