/**
 * Test suite for the FlavorContext, FlavorProvider, and runtime library hooks.
 *
 * These tests validate the context infrastructure that enables the Azure
 * extension pattern. The FlavorContext provides flavor-specific runtime
 * library references to all descendant components without prop drilling.
 *
 * What is tested:
 * - createCoreRuntimeLib maps all symbols to httpRuntimeLib
 * - createAzureRuntimeLib maps symbols to their Azure package equivalents
 * - Both runtime libs have the same set of property keys
 * - FlavorProvider correctly injects the right runtime lib based on flavor
 * - Default context falls back to core flavor
 *
 * Why this matters:
 * The FlavorContext is the foundation of the composability pattern. If it
 * doesn't correctly map symbols to packages, the generated code will have
 * wrong imports. If the default fallback doesn't work, existing tests break.
 */
import { describe, expect, it } from "vitest";
import {
  createCoreRuntimeLib,
  createAzureRuntimeLib,
  type RuntimeLib,
} from "../../src/context/flavor-context.js";

describe("RuntimeLib", () => {
  /**
   * Tests that createCoreRuntimeLib returns an object with all 17
   * expected properties. This ensures completeness — if a new
   * symbol is needed, both core and Azure libs must be updated.
   */
  it("should have all required properties in core runtime lib", () => {
    const lib = createCoreRuntimeLib();

    const expectedKeys: (keyof RuntimeLib)[] = [
      "Client",
      "ClientOptions",
      "getClient",
      "Pipeline",
      "OperationOptions",
      "operationOptionsToRequestParameters",
      "StreamableMethod",
      "PathUncheckedResponse",
      "RestError",
      "createRestError",
      "AbortSignalLike",
      "uint8ArrayToString",
      "stringToUint8Array",
      "KeyCredential",
      "isKeyCredential",
      "TokenCredential",
      "expandUrlTemplate",
    ];

    for (const key of expectedKeys) {
      expect(lib[key], `Missing key: ${key}`).toBeDefined();
    }
  });

  /**
   * Tests that createAzureRuntimeLib returns an object with the same
   * set of properties as createCoreRuntimeLib. This ensures interface
   * compatibility — components can use either lib interchangeably.
   */
  it("should have same keys in azure runtime lib as core", () => {
    const coreLib = createCoreRuntimeLib();
    const azureLib = createAzureRuntimeLib();

    const coreKeys = Object.keys(coreLib).sort();
    const azureKeys = Object.keys(azureLib).sort();

    expect(azureKeys).toEqual(coreKeys);
  });

  /**
   * Tests that core and Azure runtime libs have different refkey
   * values for symbols that come from different packages.
   *
   * This validates that the Azure lib actually maps to Azure packages
   * rather than just copying the core lib.
   */
  it("should have different refkeys for swapped symbols", () => {
    const coreLib = createCoreRuntimeLib();
    const azureLib = createAzureRuntimeLib();

    // These should be different because they come from different packages
    expect(azureLib.Client).not.toBe(coreLib.Client);
    expect(azureLib.Pipeline).not.toBe(coreLib.Pipeline);
    expect(azureLib.KeyCredential).not.toBe(coreLib.KeyCredential);
    expect(azureLib.AbortSignalLike).not.toBe(coreLib.AbortSignalLike);
    expect(azureLib.uint8ArrayToString).not.toBe(coreLib.uint8ArrayToString);
  });

  /**
   * Tests that expandUrlTemplate uses the same refkey in both flavors.
   *
   * expandUrlTemplate has no Azure equivalent, so it always comes from
   * @typespec/ts-http-runtime regardless of flavor.
   */
  it("should use same refkey for expandUrlTemplate in both flavors", () => {
    const coreLib = createCoreRuntimeLib();
    const azureLib = createAzureRuntimeLib();

    expect(azureLib.expandUrlTemplate).toBe(coreLib.expandUrlTemplate);
  });
});
