import type {
  SdkModelPropertyType,
  SdkModelType,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Capitalizes the first character of a string.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Computes the collision rename map for flatten properties on a model.
 *
 * When a model has `@flattenProperty` properties that expand nested model
 * properties inline, those nested property names may collide with:
 * - Properties directly on the parent model (non-flatten or non-model flatten)
 * - Properties from other flatten properties expanded earlier in order
 *
 * When a collision occurs, the nested property is renamed using the legacy
 * emitter's naming convention:
 *   `${propName}${capitalize(flattenPropName)}${capitalize(propName)}`
 *
 * For example, `bar` from flatten property `properties` becomes `barPropertiesBar`.
 * This matches the legacy autorest.typescript behavior from `normalizeName(
 *   "${childPropertyName}_${flattenProperty.name}_${childPropertyName}",
 *   NameType.Property)`.
 *
 * @param model - The TCGC model type to analyze for flatten collisions.
 * @returns A map from flatten property serialized name to a map of
 *          (original nested prop name → renamed name).
 *          Only contains entries for flatten properties that have collisions.
 */
export function computeFlattenCollisionMap(
  model: SdkModelType,
): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  const existingNames = new Set<string>();

  // Collect names from non-expandable properties: non-flatten props and
  // flatten props with non-model types (e.g., @flattenProperty name: string)
  for (const prop of model.properties) {
    if (!prop.flatten || prop.type.kind !== "model") {
      existingNames.add(prop.name);
    }
  }

  // Process expandable flatten properties in declaration order
  for (const prop of model.properties) {
    if (prop.flatten && prop.type.kind === "model") {
      const renames = new Map<string, string>();
      for (const nestedProp of (prop.type as SdkModelType).properties) {
        if (existingNames.has(nestedProp.name)) {
          // Collision detected — rename using legacy pattern
          const renamed = `${nestedProp.name}${capitalize(prop.name)}${capitalize(nestedProp.name)}`;
          renames.set(nestedProp.name, renamed);
          existingNames.add(renamed);
        } else {
          existingNames.add(nestedProp.name);
        }
      }
      if (renames.size > 0) {
        result.set(prop.serializedName, renames);
      }
    }
  }

  return result;
}

/**
 * Gets the effective client name for a nested property within a flatten property,
 * accounting for collision renaming.
 *
 * If the property name collides and has been renamed, returns the renamed name.
 * Otherwise returns the original property name. This is used by both the
 * serializer helper (to read from `item["renamedName"]`) and the deserializer
 * helper (to write to `renamedName: item["wireName"]`).
 *
 * @param collisionMap - The collision map from `computeFlattenCollisionMap()`.
 * @param flattenPropSerializedName - The serialized name of the flatten property.
 * @param nestedPropName - The original name of the nested property.
 * @returns The effective client name (renamed or original).
 */
export function getEffectiveClientName(
  collisionMap: Map<string, Map<string, string>>,
  flattenPropSerializedName: string,
  nestedPropName: string,
): string {
  const renames = collisionMap.get(flattenPropSerializedName);
  return renames?.get(nestedPropName) ?? nestedPropName;
}
