/**
 * Unit tests for the flavor detection and resolution logic used by the
 * scenario test harness.
 *
 * These tests verify that the test harness correctly identifies when Azure
 * flavor should be used based on TypeSpec code patterns and YAML configuration.
 * Correct flavor detection is critical because it determines which runtime
 * package imports are generated (`@azure-rest/core-client` vs
 * `@typespec/ts-http-runtime`), affecting the entire output of the emitter.
 *
 * @module
 */
import { describe, expect, it } from "vitest";
import { detectAzureFlavor, resolveFlavor } from "./emit-for-scenario.js";

describe("detectAzureFlavor", () => {
  /**
   * Tests that Azure.Core namespace usage triggers Azure flavor detection.
   * Azure.Core is the most common Azure-specific TypeSpec namespace, used
   * for standard patterns like LRO, paging, and error models.
   */
  it("detects Azure.Core namespace usage", () => {
    const code = `
      using Azure.Core;
      model Foo { id: string; }
    `;
    expect(detectAzureFlavor(code)).toBe(true);
  });

  /**
   * Tests that Azure.ResourceManager namespace triggers Azure flavor.
   * ARM services use this namespace for resource lifecycle operations.
   */
  it("detects Azure.ResourceManager namespace usage", () => {
    const code = `
      using Azure.ResourceManager;
      @armProviderNamespace
      namespace Microsoft.Example;
    `;
    expect(detectAzureFlavor(code)).toBe(true);
  });

  /**
   * Tests that @armProviderNamespace decorator triggers Azure flavor.
   * This decorator is used in ARM service definitions even when the
   * full Azure.ResourceManager namespace is imported via `using`.
   */
  it("detects @armProviderNamespace decorator", () => {
    const code = `
      @armProviderNamespace
      namespace Microsoft.Example;
    `;
    expect(detectAzureFlavor(code)).toBe(true);
  });

  /**
   * Tests that @armCommonTypesVersion decorator triggers Azure flavor.
   * This decorator specifies which version of ARM common types to use.
   */
  it("detects @armCommonTypesVersion decorator", () => {
    const code = `
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.Example;
    `;
    expect(detectAzureFlavor(code)).toBe(true);
  });

  /**
   * Tests that import of @azure-tools/typespec-azure packages triggers Azure flavor.
   * Some scenarios import Azure packages directly rather than using `using` statements.
   */
  it("detects @azure-tools/typespec-azure import", () => {
    const code = `
      import "@azure-tools/typespec-azure-core";
      model Foo { id: string; }
    `;
    expect(detectAzureFlavor(code)).toBe(true);
  });

  /**
   * Tests that plain TypeSpec code without Azure features returns false.
   * Non-Azure scenarios should use core flavor with @typespec/ts-http-runtime.
   */
  it("returns false for plain TypeSpec without Azure features", () => {
    const code = `
      model Widget { id: string; name: string; }
      op getWidget(@path id: string): Widget;
    `;
    expect(detectAzureFlavor(code)).toBe(false);
  });

  /**
   * Tests that TypeSpec code with only HTTP features (no Azure) returns false.
   * Many scenarios use TypeSpec.Http features without any Azure dependency.
   */
  it("returns false for TypeSpec with only HTTP features", () => {
    const code = `
      @route("/widgets")
      op listWidgets(): Widget[];
      @route("/widgets/{id}")
      op getWidget(@path id: string): Widget;
    `;
    expect(detectAzureFlavor(code)).toBe(false);
  });

  /**
   * Tests that Foundations namespace usage (Azure.Core.Foundations) triggers
   * Azure flavor detection. This pattern appears in scenarios that use
   * Foundations.Operation or other Azure Core foundation types.
   */
  it("detects Foundations namespace usage", () => {
    const code = `
      alias MyOp = Foundations.Operation<Params, Response>;
    `;
    expect(detectAzureFlavor(code)).toBe(true);
  });

  /**
   * Tests that Azure Core resource operation types trigger Azure flavor.
   * These types (ResourceRead, ResourceList, etc.) are used in Azure Core
   * scenarios without necessarily referencing Azure.Core directly.
   */
  it("detects Azure Core resource operation types", () => {
    const code = `
      op read is ResourceRead<Widget>;
      op list is ResourceList<Widget>;
    `;
    expect(detectAzureFlavor(code)).toBe(true);
  });
});

describe("resolveFlavor", () => {
  /**
   * Tests that explicit YAML config takes highest priority over auto-detection.
   * This allows scenarios to override the detected flavor when needed.
   */
  it("uses explicit flavor from YAML config over auto-detection", () => {
    const azureCode = `using Azure.Core; model Foo { id: string; }`;
    expect(resolveFlavor(azureCode, { flavor: "core" })).toBe("core");
  });

  /**
   * Tests that YAML config can explicitly set Azure flavor even for
   * non-Azure TypeSpec code.
   */
  it("uses explicit azure flavor from YAML config", () => {
    const plainCode = `model Foo { id: string; }`;
    expect(resolveFlavor(plainCode, { flavor: "azure" })).toBe("azure");
  });

  /**
   * Tests that auto-detection kicks in when no flavor is specified in YAML.
   * Azure code should auto-detect to "azure" flavor.
   */
  it("auto-detects azure flavor from Azure.Core usage", () => {
    const azureCode = `using Azure.Core; model Foo { id: string; }`;
    expect(resolveFlavor(azureCode, {})).toBe("azure");
  });

  /**
   * Tests that non-Azure code defaults to "core" flavor when no YAML
   * config specifies a flavor.
   */
  it("defaults to core flavor for non-Azure code", () => {
    const plainCode = `model Foo { id: string; }`;
    expect(resolveFlavor(plainCode, {})).toBe("core");
  });

  /**
   * Tests that invalid flavor values in YAML config are ignored,
   * falling back to auto-detection.
   */
  it("ignores invalid flavor values and falls back to auto-detection", () => {
    const plainCode = `model Foo { id: string; }`;
    expect(resolveFlavor(plainCode, { flavor: "invalid" })).toBe("core");
  });
});
