import type { SdkModelType, SdkType } from "@azure-tools/typespec-client-generator-core";

/**
 * Azure Core error type cross-language definition IDs.
 *
 * These are the well-known `crossLanguageDefinitionId` values for Azure Core
 * Foundations error types that should be imported from the runtime package
 * instead of being generated locally. The legacy emitter identifies these types
 * and skips local generation, importing them from `@azure-rest/core-client`
 * (Azure flavor) or `@typespec/ts-http-runtime` (core flavor) instead.
 */
const AZURE_CORE_ERROR_TYPE_IDS = new Set([
  "Azure.Core.Foundations.Error",
  "Azure.Core.Foundations.InnerError",
  "Azure.Core.Foundations.ErrorResponse",
]);

/**
 * Checks whether an SdkType is a built-in Azure Core error type.
 *
 * Azure Core error types (ErrorModel, InnerError, ErrorResponse) are imported
 * from the runtime package rather than generated as local interfaces. This
 * matches the legacy emitter's behavior where these types come from
 * `@azure-rest/core-client` or `@typespec/ts-http-runtime`.
 *
 * @param type - The TCGC SdkType to check.
 * @returns `true` if the type is an Azure Core error type that should be imported.
 */
export function isAzureCoreErrorType(type: SdkType): boolean {
  return (
    type.kind === "model" &&
    AZURE_CORE_ERROR_TYPE_IDS.has(type.crossLanguageDefinitionId)
  );
}
