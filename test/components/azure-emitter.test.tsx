/**
 * Test suite for the Azure flavor extension (Phase 8).
 *
 * These tests validate the core architectural goal of the rewrite:
 * **composability via JSX composition**. The Azure extension pattern
 * wraps the same core components with Azure-specific additions without
 * modifying any core component source files.
 *
 * What is tested:
 * - Azure emitter uses Azure package references (`@azure-rest/core-client`,
 *   `@azure/core-rest-pipeline`, etc.) instead of `@typespec/ts-http-runtime`
 * - Azure emitter generates a `logger.ts` file with `@azure/logger`
 * - Core emitter does NOT generate Azure-specific imports or logger
 * - FlavorProvider correctly switches runtime library references
 * - Core components remain flavor-agnostic (no if/else Azure checks)
 * - Both flavors produce correct output for the same TypeSpec input
 *
 * Why this matters:
 * Without the composition pattern, Azure-specific behavior would require
 * if/else checks scattered throughout core components, violating the
 * maintainability goal. This test suite proves that the FlavorContext
 * pattern works: components call `useRuntimeLib()` and get the right
 * package references for the active flavor.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { Children, For, SourceDirectory } from "@alloy-js/core";
import { createTSNamePolicy, tsNameConflictResolver } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { beforeAll, describe, expect, it } from "vitest";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { AzureCoreEmitter } from "../../src/azure-emitter.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { OperationFiles } from "../../src/components/operation-files.js";
import { ClientContextFile } from "../../src/components/client-context.js";
import { ClassicalClientFile } from "../../src/components/classical-client.js";
import { LoggerFile } from "../../src/components/logger-file.js";
import {
  httpRuntimeLib,
  azureCoreLroLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureLoggerLib,
} from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";

/**
 * Azure test wrapper that mirrors the AzureCoreEmitter's component tree.
 *
 * Uses the full set of Azure external packages and wraps components
 * with `FlavorProvider flavor="azure"`. Includes the LoggerFile to
 * validate Azure-specific additions.
 */
function AzureEmitterTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children?: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      nameConflictResolver={tsNameConflictResolver}
      externals={[
        httpRuntimeLib,
        azureCoreClientLib,
        azureCorePipelineLib,
        azureCoreAuthLib,
        azureCoreUtilLib,
        azureAbortControllerLib,
        azureCoreLroLib,
        azureLoggerLib,
      ]}
    >
      <AzureCoreEmitter sdkContext={props.sdkContext} />
    </Output>
  );
}

/**
 * Core (non-Azure) test wrapper for comparison testing.
 *
 * Uses only httpRuntimeLib and wraps with `FlavorProvider flavor="core"`.
 * This is the baseline that Azure output is compared against.
 */
function CoreEmitterTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children?: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      nameConflictResolver={tsNameConflictResolver}
      externals={[httpRuntimeLib]}
    >
      <FlavorProvider flavor="core">
        <SdkContextProvider sdkContext={props.sdkContext}>
          <SourceDirectory path="src">
            <ModelFiles />
            <OperationFiles />
            <For each={props.sdkContext.sdkPackage.clients}>
              {(client) => (
                <>
                  <ClientContextFile client={client} />
                  <ClassicalClientFile client={client} />
                </>
              )}
            </For>
          </SourceDirectory>
        </SdkContextProvider>
      </FlavorProvider>
    </Output>
  );
}

/**
 * Helper to compile TypeSpec and get SDK context for testing.
 */
async function compileForTest(tspCode: Parameters<Awaited<ReturnType<typeof TesterWithService.createInstance>>["compile"]>[0]) {
  const runner = await TesterWithService.createInstance();
  const { program } = await runner.compile(tspCode);
  const sdkContext = await createSdkContextForTest(program);
  return sdkContext;
}

describe("Azure Extension", () => {
  /**
   * Tests that share the same TypeSpec input: a service with a Widget
   * model and a getWidget operation.
   */
  describe("with Widget model and getWidget operation", () => {
    let sdkContext: Awaited<ReturnType<typeof compileForTest>>;

    beforeAll(async () => {
      sdkContext = await compileForTest(
        t.code`
          model Widget { name: string; }
          @get op getWidget(): Widget;
        `,
      );
    });

    /**
     * Tests that the Azure emitter generates imports from
     * `@azure-rest/core-client` instead of `@typespec/ts-http-runtime`
     * for core client types (Client, getClient, etc.).
     *
     * This validates that the FlavorProvider correctly swaps package
     * references via the RuntimeLib abstraction.
     */
    it("should use @azure-rest/core-client instead of @typespec/ts-http-runtime for core types", () => {
      const result = renderToString(<AzureEmitterTestWrapper sdkContext={sdkContext} />);

      // Azure SDK should import from @azure-rest/core-client
      expect(result).toContain("@azure-rest/core-client");

      // Should NOT import Client/getClient from @typespec/ts-http-runtime
      // (expandUrlTemplate is OK to come from there)
      const lines = result.split("\n");
      const httpRuntimeImports = lines.filter(
        (l) => l.includes("@typespec/ts-http-runtime") && !l.includes("expandUrlTemplate"),
      );
      // All runtime imports except expandUrlTemplate should be from Azure packages
      expect(httpRuntimeImports.length).toBe(0);
    });

    /**
     * Tests that the core emitter uses `@typespec/ts-http-runtime`
     * for all runtime imports.
     *
     * This validates the core flavor's RuntimeLib mapping where
     * all symbols come from a single package.
     */
    it("should use @typespec/ts-http-runtime in core flavor", () => {
      const result = renderToString(<CoreEmitterTestWrapper sdkContext={sdkContext} />);

      // Core should use the unified runtime package
      expect(result).toContain("@typespec/ts-http-runtime");

      // Should NOT import from Azure packages
      expect(result).not.toContain("@azure-rest/core-client");
      expect(result).not.toContain("@azure/core-rest-pipeline");
      expect(result).not.toContain("@azure/core-auth");
    });
  });

  /**
   * Tests that share the same TypeSpec input: a simple service with a
   * single @get ping operation returning void.
   */
  describe("with simple ping operation", () => {
    let sdkContext: Awaited<ReturnType<typeof compileForTest>>;

    beforeAll(async () => {
      sdkContext = await compileForTest(
        t.code`
          @get op ping(): void;
        `,
      );
    });

    /**
     * Tests that the Azure emitter generates a `logger.ts` file
     * with the `createClientLogger` import from `@azure/logger`.
     *
     * The logger file is Azure-specific — it should NOT appear in
     * core flavor output.
     */
    it("should generate logger.ts file with @azure/logger", () => {
      const result = renderToString(<AzureEmitterTestWrapper sdkContext={sdkContext} />);

      // Logger file should be present
      expect(result).toContain("createClientLogger");
      expect(result).toContain("@azure/logger");
    });

    /**
     * Tests that the core (non-Azure) emitter does NOT generate
     * a logger file or import from `@azure/logger`.
     *
     * This proves the composition pattern works: Azure additions
     * are only present when the Azure wrapper is used.
     */
    it("should NOT generate logger in core flavor", () => {
      const result = renderToString(<CoreEmitterTestWrapper sdkContext={sdkContext} />);

      // Core output should not have Azure logger
      expect(result).not.toContain("createClientLogger");
      expect(result).not.toContain("@azure/logger");
    });

    /**
     * Tests that the Azure emitter imports Pipeline from
     * `@azure/core-rest-pipeline` (not `@typespec/ts-http-runtime`).
     *
     * In Azure SDKs, the Pipeline type comes from a separate package,
     * demonstrating that individual symbols are correctly mapped to
     * their Azure equivalents.
     */
    it("should use @azure/core-rest-pipeline for Pipeline type", () => {
      const result = renderToString(<AzureEmitterTestWrapper sdkContext={sdkContext} />);

      // Classical client has a `pipeline` property
      expect(result).toContain("@azure/core-rest-pipeline");
    });
  });

  /**
   * Tests that both Azure and core flavors produce the same
   * structural output (models, operations, client context, etc.)
   * with only the import packages differing.
   *
   * This validates that core components are truly flavor-agnostic:
   * the same model interfaces, operation functions, and class
   * structure appear regardless of flavor.
   */
  it("should produce same structural output for both flavors", async () => {
    const sdkContext = await compileForTest(
      t.code`
        model Widget { name: string; age: int32; }
        @get op getWidget(): Widget;
        @post op createWidget(@body body: Widget): Widget;
      `,
    );

    const azureResult = renderToString(<AzureEmitterTestWrapper sdkContext={sdkContext} />);
    const coreResult = renderToString(<CoreEmitterTestWrapper sdkContext={sdkContext} />);

    // Both should have the same structural elements
    for (const element of [
      "export interface Widget",
      "export async function getWidget",
      "export async function createWidget",
      "TestServiceContext",
      "createTestService",
      "export class TestServiceClient",
    ]) {
      expect(azureResult).toContain(element);
      expect(coreResult).toContain(element);
    }

    // Only Azure should have logger
    expect(azureResult).toContain("createClientLogger");
    expect(coreResult).not.toContain("createClientLogger");
  });

  /**
   * Tests that the AzureCoreEmitter component can be used
   * standalone as a composable JSX element, validating the
   * composition pattern design.
   */
  it("should work as a composable JSX component", async () => {
    const sdkContext = await compileForTest(
      t.code`
        @get op health(): void;
      `,
    );

    // AzureCoreEmitter should render without errors when wrapped in Output
    const template = (
      <Output
        program={sdkContext.emitContext.program}
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={tsNameConflictResolver}
        externals={[
          httpRuntimeLib,
          azureCoreClientLib,
          azureCorePipelineLib,
          azureCoreAuthLib,
          azureCoreUtilLib,
          azureAbortControllerLib,
          azureCoreLroLib,
          azureLoggerLib,
        ]}
      >
        <AzureCoreEmitter sdkContext={sdkContext} />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toBeDefined();
    expect(result).toContain("TestServiceClient");
  });
});

describe("FlavorProvider", () => {
  /**
   * Tests that share the same TypeSpec input: a service with a Foo
   * model and a getFoo operation.
   */
  describe("with Foo model and getFoo operation", () => {
    let sdkContext: Awaited<ReturnType<typeof compileForTest>>;

    beforeAll(async () => {
      sdkContext = await compileForTest(
        t.code`
          model Foo { x: string; }
          @get op getFoo(): Foo;
        `,
      );
    });

    /**
     * Tests that FlavorProvider with "core" flavor uses
     * `@typespec/ts-http-runtime` references.
     *
     * This validates that the FlavorProvider correctly creates
     * and injects the core RuntimeLib.
     */
    it("should provide core runtime lib references with core flavor", () => {
      const result = renderToString(<CoreEmitterTestWrapper sdkContext={sdkContext} />);

      expect(result).toContain("@typespec/ts-http-runtime");
      expect(result).not.toContain("@azure-rest/core-client");
    });

    /**
     * Tests that FlavorProvider with "azure" flavor uses
     * Azure package references for client types.
     *
     * This validates that the FlavorProvider correctly creates
     * and injects the Azure RuntimeLib.
     */
    it("should provide azure runtime lib references with azure flavor", () => {
      const result = renderToString(<AzureEmitterTestWrapper sdkContext={sdkContext} />);

      expect(result).toContain("@azure-rest/core-client");
    });
  });

  /**
   * Tests that the default flavor (when no FlavorProvider is present)
   * falls back to core. This ensures backwards compatibility with
   * existing tests that don't explicitly set up a FlavorProvider.
   */
  it("should default to core flavor when no provider is present", async () => {
    const sdkContext = await compileForTest(
      t.code`
        @get op test(): void;
      `,
    );

    // Use Output without FlavorProvider
    const result = renderToString(
      <Output
        program={sdkContext.emitContext.program}
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={tsNameConflictResolver}
        externals={[httpRuntimeLib]}
      >
        <SdkContextProvider sdkContext={sdkContext}>
          <SourceDirectory path="src">
            <For each={sdkContext.sdkPackage.clients}>
              {(client) => <ClientContextFile client={client} />}
            </For>
          </SourceDirectory>
        </SdkContextProvider>
      </Output>,
    );

    // Should use core runtime (default)
    expect(result).toContain("@typespec/ts-http-runtime");
    expect(result).not.toContain("@azure-rest/core-client");
  });
});
