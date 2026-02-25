/**
 * Test suite for the model-name utility functions.
 *
 * These functions determine the display name for model types and their
 * associated serializer/deserializer functions. The key behavior being tested
 * is the underscore prefix for internally-generated (anonymous) models.
 *
 * What is tested:
 * - `getModelName` returns plain model name for user-defined models
 * - `getModelName` returns underscore-prefixed name for generated models
 * - `getModelFunctionName` returns plain function name for user-defined models
 * - `getModelFunctionName` returns underscore-prefixed camelCase name for generated models
 *
 * Why this matters:
 * The legacy emitter prefixes `_` to model names when `isGeneratedName` is true.
 * This signals internal/anonymous types (like multipart request body wrappers) that
 * are not part of the public API surface. If the underscore prefix is missing,
 * the generated SDK would expose internal types as public API, breaking backward
 * compatibility with the legacy emitter's output.
 */
import { describe, expect, it } from "vitest";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import { getModelName, getModelFunctionName } from "../../src/utils/model-name.js";

/** Creates a minimal mock SdkModelType for testing name generation. */
function createMockModel(
  name: string,
  isGeneratedName: boolean,
): SdkModelType {
  return {
    kind: "model",
    name,
    isGeneratedName,
    properties: [],
    access: "public",
  } as unknown as SdkModelType;
}

describe("getModelName", () => {
  /**
   * Tests that user-defined models (isGeneratedName = false) keep their
   * original name without any prefix. This is the common case for most
   * models in a TypeSpec definition.
   */
  it("should return plain name for user-defined models", () => {
    const model = createMockModel("Widget", false);
    const name = getModelName(model);
    expect(name).toBe("Widget");
  });

  /**
   * Tests that generated/anonymous models (isGeneratedName = true) get
   * an underscore prefix. This matches the legacy emitter's behavior for
   * internal types like multipart request body wrappers.
   *
   * The returned value is a Namekey object with `ignoreNamePolicy: true`
   * to prevent Alloy's name policy from stripping the underscore.
   */
  it("should return underscore-prefixed namekey for generated models", () => {
    const model = createMockModel("UploadFileRequest", true);
    const name = getModelName(model);
    // namekey returns a Namekey object, not a plain string
    expect(typeof name).toBe("object");
    expect((name as any).name).toBe("_UploadFileRequest");
    expect((name as any).options.ignoreNamePolicy).toBe(true);
  });
});

describe("getModelFunctionName", () => {
  /**
   * Tests that user-defined models produce a plain concatenated function name
   * (e.g., "WidgetSerializer"). The name policy will handle camelCase.
   */
  it("should return plain function name for user-defined models", () => {
    const model = createMockModel("Widget", false);
    const name = getModelFunctionName(model, "Serializer");
    expect(name).toBe("WidgetSerializer");
  });

  /**
   * Tests that generated models produce an underscore-prefixed camelCase
   * function name (e.g., "_uploadFileRequestSerializer"). The camelCase is
   * applied manually because ignoreNamePolicy prevents Alloy's name policy
   * from doing it.
   */
  it("should return underscore-prefixed camelCase namekey for generated models", () => {
    const model = createMockModel("UploadFileRequest", true);
    const name = getModelFunctionName(model, "Serializer");
    expect(typeof name).toBe("object");
    expect((name as any).name).toBe("_uploadFileRequestSerializer");
    expect((name as any).options.ignoreNamePolicy).toBe(true);
  });

  /**
   * Tests that different suffixes work correctly (e.g., "Deserializer",
   * "UnionSerializer", "XmlSerializer").
   */
  it("should handle various suffixes for generated models", () => {
    const model = createMockModel("FooBar", true);

    const deser = getModelFunctionName(model, "Deserializer");
    expect((deser as any).name).toBe("_fooBarDeserializer");

    const union = getModelFunctionName(model, "UnionSerializer");
    expect((union as any).name).toBe("_fooBarUnionSerializer");

    const xml = getModelFunctionName(model, "XmlSerializer");
    expect((xml as any).name).toBe("_fooBarXmlSerializer");
  });
});
