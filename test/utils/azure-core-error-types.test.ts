import { describe, it, expect } from "vitest";
import { isAzureCoreErrorType } from "../../src/utils/azure-core-error-types.js";
import type { SdkType } from "@azure-tools/typespec-client-generator-core";

/**
 * Tests for the Azure Core error type identification utility.
 *
 * These tests verify that the emitter correctly identifies built-in Azure Core
 * Foundations error types (ErrorModel, InnerError, ErrorResponse) which should
 * be imported from the runtime package instead of being generated locally.
 *
 * This is critical for output parity with the legacy emitter, which imports
 * these types from `@azure-rest/core-client` (Azure flavor) or
 * `@typespec/ts-http-runtime` (core flavor) rather than generating local
 * interface definitions and deserializer functions.
 */
describe("isAzureCoreErrorType", () => {
  /**
   * Validates that Azure.Core.Foundations.Error (ErrorModel) is recognized.
   * This type represents the standard Azure error object and should be
   * imported from the runtime package, not generated locally.
   */
  it("returns true for Azure.Core.Foundations.Error (ErrorModel)", () => {
    const type = {
      kind: "model",
      crossLanguageDefinitionId: "Azure.Core.Foundations.Error",
    } as unknown as SdkType;
    expect(isAzureCoreErrorType(type)).toBe(true);
  });

  /**
   * Validates that Azure.Core.Foundations.InnerError is recognized.
   * This type is the recursive inner error detail and should not be
   * generated locally when the parent ErrorModel is imported.
   */
  it("returns true for Azure.Core.Foundations.InnerError", () => {
    const type = {
      kind: "model",
      crossLanguageDefinitionId: "Azure.Core.Foundations.InnerError",
    } as unknown as SdkType;
    expect(isAzureCoreErrorType(type)).toBe(true);
  });

  /**
   * Validates that Azure.Core.Foundations.ErrorResponse is recognized.
   * This is the wrapper type containing the error object and should be
   * imported from the runtime package.
   */
  it("returns true for Azure.Core.Foundations.ErrorResponse", () => {
    const type = {
      kind: "model",
      crossLanguageDefinitionId: "Azure.Core.Foundations.ErrorResponse",
    } as unknown as SdkType;
    expect(isAzureCoreErrorType(type)).toBe(true);
  });

  /**
   * Validates that regular user-defined model types are NOT identified as
   * Azure Core error types. These should still be generated locally.
   */
  it("returns false for regular model types", () => {
    const type = {
      kind: "model",
      crossLanguageDefinitionId: "MyService.MyModel",
    } as unknown as SdkType;
    expect(isAzureCoreErrorType(type)).toBe(false);
  });

  /**
   * Validates that non-model types (enums, unions, etc.) are never
   * identified as Azure Core error types, even if they happen to have
   * a matching crossLanguageDefinitionId (which shouldn't occur in practice).
   */
  it("returns false for non-model types", () => {
    const type = {
      kind: "enum",
      crossLanguageDefinitionId: "Azure.Core.Foundations.Error",
    } as unknown as SdkType;
    expect(isAzureCoreErrorType(type)).toBe(false);
  });

  /**
   * Validates that user-defined error types (using @error decorator but
   * not from Azure.Core.Foundations) are NOT treated as Azure Core error
   * types and are still generated locally with full deserializers.
   */
  it("returns false for user-defined error types", () => {
    const type = {
      kind: "model",
      crossLanguageDefinitionId: "MyService.CustomApiError",
    } as unknown as SdkType;
    expect(isAzureCoreErrorType(type)).toBe(false);
  });
});
