import { namekey, type Namekey, type NamekeyOptions } from "@alloy-js/core";
import type {
  SdkArrayType,
  SdkDictionaryType,
  SdkEnumType,
  SdkModelType,
  SdkType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { camelCase } from "change-case";
import { normalizePascalCaseName } from "./name-policy.js";

/** Options matching the name policy's `camelCase` call (see name-policy.ts). */
const caseOptions = {
  prefixCharacters: "$_",
  suffixCharacters: "$_",
};

/**
 * Converts a PascalCase name to a camelCase `namekey` with `ignoreNamePolicy`.
 *
 * This is a workaround for an Alloy framework bug (ALLOY-001, see
 * docs/alloy-issues.md) where name conflict detection fails when the name
 * policy changes casing. By passing names already in their final camelCase
 * form with `ignoreNamePolicy: true`, the symbol's `originalName` matches its
 * post-policy `name`, ensuring Alloy's conflict resolver detects duplicates.
 *
 * Uses the same `camelCase` from `change-case` with the same options as the
 * name policy to guarantee the pre-applied name matches what the policy would
 * produce.
 *
 * @param pascalName - A PascalCase name (e.g., `"ActionGroupDeserializer"`).
 * @returns A `Namekey` with the camelCased name and `ignoreNamePolicy: true`.
 */
function toCamelCaseNamekey(pascalName: string): Namekey<NamekeyOptions> {
  return namekey(camelCase(pascalName, caseOptions), {
    ignoreNamePolicy: true,
  });
}

/**
 * Returns the display name for a model, adding an underscore prefix for
 * internally-generated (anonymous) models.
 *
 * The legacy emitter prefixes `_` to model names when `isGeneratedName` is
 * `true`. This signals that the type is an internal/anonymous model — for
 * example, a multipart request body wrapper like `_UploadFileRequest` — that
 * is not part of the public API surface. The underscore prefix follows Azure
 * SDK naming conventions for generated types.
 *
 * Uses Alloy's `namekey` with `ignoreNamePolicy: true` to prevent the
 * TypeScript name policy (which applies `pascalCase` via change-case) from
 * stripping the underscore prefix (e.g., `_UploadFileRequest` → `UploadFileRequest`).
 *
 * @param model - The TCGC model type to compute the name for.
 * @returns The model name (plain string or namekey), suitable for use as the
 *          `name` prop on Alloy declaration components.
 */
export function getModelName(
  model: SdkModelType,
): string | Namekey<NamekeyOptions> {
  if (model.isGeneratedName) {
    const prefixedName = `_${model.name}`;
    return namekey(prefixedName, { ignoreNamePolicy: true });
  }
  return preNormalizeName(model.name);
}

/**
 * Pre-normalizes a TCGC type name using legacy PascalCase conventions before
 * it enters the Alloy rendering pipeline. This ensures digit-word boundaries
 * are correctly capitalized (e.g., `Base64url` → `Base64Url`) before the
 * name policy sees the name. The name policy then preserves the already-correct
 * casing, and Alloy's conflict resolver can safely append `_N` suffixes
 * without the legacy deconstruct logic stripping them.
 */
function preNormalizeName(name: string): string {
  return normalizePascalCaseName(name);
}

/**
 * Returns a declaration name for a function derived from a model, adding
 * an underscore prefix for internally-generated (anonymous) models.
 *
 * This is used for serializer/deserializer function names that incorporate
 * the model name as a prefix (e.g., `_uploadFileRequestSerializer`). When
 * the model has `isGeneratedName`, the full function name gets a `namekey`
 * with `ignoreNamePolicy: true` to preserve the underscore prefix.
 *
 * The function name is manually lowercased at the first character because
 * Alloy's name policy (which uses change-case's camelCase) would strip the
 * underscore prefix entirely. By using `ignoreNamePolicy`, we must apply
 * camelCase manually: underscore + lowercase first char + rest.
 *
 * @param model - The TCGC model type.
 * @param suffix - The suffix to append (e.g., `"Serializer"`, `"Deserializer"`).
 * @returns The function name (plain string or namekey) for the `name` prop.
 */
export function getModelFunctionName(
  model: SdkModelType,
  suffix: string,
): string | Namekey<NamekeyOptions> {
  if (model.isGeneratedName) {
    // Manually apply camelCase: lowercase first char of model name + rest + suffix
    const camelName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    const prefixedName = `_${camelName}${suffix}`;
    return namekey(prefixedName, { ignoreNamePolicy: true });
  }
  // Workaround for ALLOY-001 (docs/alloy-issues.md): pass the composed name
  // already in camelCase with ignoreNamePolicy so that Alloy's conflict
  // detection sees matching originalName and name values.
  return toCamelCaseNamekey(`${normalizePascalCaseName(model.name)}${suffix}`);
}

/**
 * Returns the display name for a union type, adding an underscore prefix for
 * internally-generated (anonymous) unions.
 *
 * The legacy emitter prefixes `_` to union names when `isGeneratedName` is
 * `true`. This signals that the type is an internal/anonymous union — for
 * example, a response body union wrapper like `_ReadResponse` — that is not
 * part of the public API surface. The underscore prefix follows Azure SDK
 * naming conventions for generated types.
 *
 * Uses Alloy's `namekey` with `ignoreNamePolicy: true` to prevent the
 * TypeScript name policy from stripping the underscore prefix.
 *
 * @param union - The TCGC union type to compute the name for.
 * @returns The union name (plain string or namekey), suitable for use as the
 *          `name` prop on Alloy declaration components.
 */
export function getUnionName(
  union: SdkUnionType,
): string | Namekey<NamekeyOptions> {
  if (union.isGeneratedName) {
    const prefixedName = `_${union.name}`;
    return namekey(prefixedName, { ignoreNamePolicy: true });
  }
  return preNormalizeName(union.name);
}

/**
 * Returns the display name for the union type in documentation strings.
 *
 * Unlike {@link getUnionName} which returns a `Namekey` for generated names,
 * this returns a plain string suitable for embedding in JSDoc comments.
 * For generated names, prepends `_` to match the rendered type name.
 *
 * @param union - The TCGC union type.
 * @returns A plain string name for use in documentation.
 */
export function getUnionDisplayName(union: SdkUnionType): string {
  if (union.isGeneratedName) {
    return `_${union.name}`;
  }
  return union.name;
}

/**
 * Returns a declaration name for a function derived from a union type, adding
 * an underscore prefix for internally-generated (anonymous) unions.
 *
 * This is used for serializer/deserializer function names that incorporate
 * the union name as a prefix (e.g., `_readResponseDeserializer`). When the
 * union has `isGeneratedName`, the full function name gets a `namekey` with
 * `ignoreNamePolicy: true` to preserve the underscore prefix.
 *
 * @param union - The TCGC union type.
 * @param suffix - The suffix to append (e.g., `"Serializer"`, `"Deserializer"`).
 * @returns The function name (plain string or namekey) for the `name` prop.
 */
export function getUnionFunctionName(
  union: SdkUnionType,
  suffix: string,
): string | Namekey<NamekeyOptions> {
  if (union.isGeneratedName) {
    const camelName = union.name.charAt(0).toLowerCase() + union.name.slice(1);
    const prefixedName = `_${camelName}${suffix}`;
    return namekey(prefixedName, { ignoreNamePolicy: true });
  }
  // Workaround for ALLOY-001 (docs/alloy-issues.md)
  return toCamelCaseNamekey(`${normalizePascalCaseName(union.name)}${suffix}`);
}

/**
 * Recursively builds the PascalCase base name for an array or record type,
 * following the legacy emitter's naming convention.
 *
 * Examples:
 * - `Array<Pet>` → `"PetArray"`
 * - `Array<Array<Pet>>` → `"PetArrayArray"`
 * - `Record<string, Pet>` → `"PetRecord"`
 * - `Array<Record<string, Pet>>` → `"PetRecordArray"`
 *
 * @param type - The SDK type to compute the name for.
 * @returns The PascalCase base name string.
 */
function getArrayRecordTypeBaseName(type: SdkType): string {
  switch (type.kind) {
    case "model":
      return normalizePascalCaseName(type.name);
    case "array":
      return getArrayRecordTypeBaseName(type.valueType) + "Array";
    case "dict":
      return getArrayRecordTypeBaseName(type.valueType) + "Record";
    case "nullable":
      return getArrayRecordTypeBaseName(type.type);
    case "union":
      return normalizePascalCaseName(type.name ?? "Unknown");
    default:
      return "Unknown";
  }
}

/**
 * Returns a declaration name for a serializer/deserializer function derived
 * from an array type, following the legacy emitter's naming convention.
 *
 * For example, `Array<Pet>` with suffix `"Serializer"` produces
 * `"PetArraySerializer"` which Alloy's name policy will camelCase to
 * `petArraySerializer`.
 *
 * Handles generated (anonymous) types by using `namekey` with `ignoreNamePolicy`
 * to preserve underscore prefixes, matching the legacy emitter's behavior.
 *
 * @param type - The SDK array type.
 * @param suffix - The suffix to append (e.g., `"Serializer"`, `"Deserializer"`).
 * @returns The function name (plain string or namekey) for the `name` prop.
 */
export function getArrayFunctionName(
  type: SdkArrayType,
  suffix: string,
): string | Namekey<NamekeyOptions> {
  const valueType = type.valueType;
  // Check if the innermost non-array/non-dict type is a generated type
  const innerType = getInnermostType(valueType);
  if (innerType && isGeneratedType(innerType)) {
    const baseName = getArrayRecordTypeBaseName(type);
    const camelName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
    return namekey(`_${camelName}${suffix}`, { ignoreNamePolicy: true });
  }
  // Workaround for ALLOY-001 (docs/alloy-issues.md)
  return toCamelCaseNamekey(`${getArrayRecordTypeBaseName(type)}${suffix}`);
}

/**
 * Returns a declaration name for a serializer/deserializer function derived
 * from a record (dictionary) type, following the legacy emitter's naming convention.
 *
 * For example, `Record<string, Pet>` with suffix `"Serializer"` produces
 * `"PetRecordSerializer"` which Alloy's name policy will camelCase to
 * `petRecordSerializer`.
 *
 * @param type - The SDK dictionary type.
 * @param suffix - The suffix to append (e.g., `"Serializer"`, `"Deserializer"`).
 * @returns The function name (plain string or namekey) for the `name` prop.
 */
export function getRecordFunctionName(
  type: SdkDictionaryType,
  suffix: string,
): string | Namekey<NamekeyOptions> {
  const valueType = type.valueType;
  const innerType = getInnermostType(valueType);
  if (innerType && isGeneratedType(innerType)) {
    const baseName = getArrayRecordTypeBaseName(type);
    const camelName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
    return namekey(`_${camelName}${suffix}`, { ignoreNamePolicy: true });
  }
  // Workaround for ALLOY-001 (docs/alloy-issues.md)
  return toCamelCaseNamekey(`${getArrayRecordTypeBaseName(type)}${suffix}`);
}

/**
 * Gets the innermost non-array/non-dict/non-nullable type from a nested type chain.
 */
function getInnermostType(type: SdkType): SdkType {
  if (type.kind === "array") return getInnermostType(type.valueType);
  if (type.kind === "dict") return getInnermostType(type.valueType);
  if (type.kind === "nullable") return getInnermostType(type.type);
  return type;
}

/**
 * Checks if a type is a generated (anonymous) type that needs underscore prefix.
 */
function isGeneratedType(type: SdkType): boolean {
  if (type.kind === "model") return type.isGeneratedName;
  if (type.kind === "union") return (type as SdkUnionType).isGeneratedName;
  return false;
}

/**
 * Returns a declaration name for a function derived from an enum type.
 *
 * Used for pass-through serializer function names for union-as-enum types
 * (e.g., `ProvisioningState` → `provisioningStateSerializer`). The name is
 * composed from the PascalCase-normalized enum name + suffix, and Alloy's
 * name policy applies camelCase.
 *
 * @param type - The TCGC enum type.
 * @param suffix - The suffix to append (e.g., `"Serializer"`).
 * @returns The function name (plain string or namekey) for the `name` prop.
 */
export function getEnumFunctionName(
  type: SdkEnumType,
  suffix: string,
): string | Namekey<NamekeyOptions> {
  // Workaround for ALLOY-001 (docs/alloy-issues.md)
  return toCamelCaseNamekey(`${normalizePascalCaseName(type.name)}${suffix}`);
}
