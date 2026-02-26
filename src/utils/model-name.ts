import { namekey, type Namekey, type NamekeyOptions } from "@alloy-js/core";
import type {
  SdkModelType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { normalizePascalCaseName } from "./name-policy.js";

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
export function getModelName(model: SdkModelType): string | Namekey<NamekeyOptions> {
  if (model.isGeneratedName) {
    const prefixedName = `_${model.name}`;
    return namekey(prefixedName, { ignoreNamePolicy: true });
  }
  return model.name;
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
  // Compose from the PascalCase-normalized model name so that camelCase
  // (applied by the name policy) preserves ALL-CAPS segments. For example,
  // model "AzureArcK8sClusterNFVIDetails" normalizes to
  // "AzureArcK8SClusterNfviDetails" → camelCase → "azureArcK8SClusterNfviDetailsSerializer".
  return `${normalizePascalCaseName(model.name)}${suffix}`;
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
export function getUnionName(union: SdkUnionType): string | Namekey<NamekeyOptions> {
  if (union.isGeneratedName) {
    const prefixedName = `_${union.name}`;
    return namekey(prefixedName, { ignoreNamePolicy: true });
  }
  return union.name;
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
  // Compose from the PascalCase-normalized union name so that camelCase
  // (applied by the name policy) preserves ALL-CAPS segments.
  return `${normalizePascalCaseName(union.name)}${suffix}`;
}
