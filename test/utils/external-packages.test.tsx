/**
 * Tests for external package definitions in src/utils/external-packages.ts.
 *
 * These tests validate that external package definitions:
 *
 * 1. **Are valid Alloy packages**: Each definition was created via `createPackage()`
 *    and can be registered as an external in the `<Output>` component.
 *
 * 2. **Expose typed refkeys**: Named exports are accessible as properties on the
 *    package object (e.g., `httpRuntimeLib.Client`). These refkeys are used in
 *    `code` templates to generate references that Alloy resolves into import
 *    statements automatically.
 *
 * 3. **Render correct imports**: When package symbols are used in code templates
 *    inside an `<Output>` with the package registered as an external, Alloy
 *    auto-generates the correct `import { X } from "package-name"` statement.
 *
 * 4. **Cover all runtime symbols**: The packages expose all symbols needed by
 *    the emitter (client types, error handling, auth, binary utils, etc.).
 *
 * Without correct package definitions, the emitter would be unable to reference
 * runtime types and functions, resulting in missing imports or broken generated code.
 */
import "@alloy-js/core/testing";
import { Output, code } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import { describe, expect, it } from "vitest";
import {
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureAbortControllerLib,
  azureCoreUtilLib,
  azureCoreAuthLib,
  azureCoreLroLib,
  azureIdentityLib,
} from "../../src/utils/external-packages.js";

describe("External Package Definitions", () => {
  /**
   * Validates that httpRuntimeLib exposes all expected symbols as refkey
   * properties. These symbols are the core building blocks for generated
   * client code — if any are missing, the emitter will fail to generate
   * references and the output will have unresolved symbols.
   */
  it("httpRuntimeLib exposes all core runtime symbols", () => {
    // Core client types and factory
    expect(httpRuntimeLib.Client).toBeDefined();
    expect(httpRuntimeLib.ClientOptions).toBeDefined();
    expect(httpRuntimeLib.getClient).toBeDefined();

    // Pipeline
    expect(httpRuntimeLib.Pipeline).toBeDefined();

    // Operation handling
    expect(httpRuntimeLib.OperationOptions).toBeDefined();
    expect(httpRuntimeLib.operationOptionsToRequestParameters).toBeDefined();

    // Response types
    expect(httpRuntimeLib.StreamableMethod).toBeDefined();
    expect(httpRuntimeLib.PathUncheckedResponse).toBeDefined();

    // Error handling
    expect(httpRuntimeLib.RestError).toBeDefined();
    expect(httpRuntimeLib.createRestError).toBeDefined();
    expect(httpRuntimeLib.ErrorModel).toBeDefined();

    // Cancellation
    expect(httpRuntimeLib.AbortSignalLike).toBeDefined();

    // Binary/string conversions
    expect(httpRuntimeLib.uint8ArrayToString).toBeDefined();
    expect(httpRuntimeLib.stringToUint8Array).toBeDefined();

    // Authentication
    expect(httpRuntimeLib.KeyCredential).toBeDefined();
    expect(httpRuntimeLib.isKeyCredential).toBeDefined();
    expect(httpRuntimeLib.TokenCredential).toBeDefined();
  });

  /**
   * Validates that httpRuntimeLib symbols render correctly in code
   * templates and auto-generate the correct import statement.
   *
   * This is the key integration test: it proves that the full pipeline
   * works — package definition → refkey → code template → rendered import.
   * If this fails, the emitter's generated code would have missing imports.
   */
  it("httpRuntimeLib symbols generate correct imports in rendered output", () => {
    const template = (
      <Output externals={[httpRuntimeLib]}>
        <SourceFile path="test.ts">
          {code`const client: ${httpRuntimeLib.Client} = ${httpRuntimeLib.getClient}(endpoint);`}
        </SourceFile>
      </Output>
    );

    expect(template).toRenderTo({
      "test.ts": `
        import { Client, getClient } from "@typespec/ts-http-runtime";

        const client: Client = getClient(endpoint);
      `,
    });
  });

  /**
   * Validates that multiple symbols from the same package are grouped
   * into a single import statement, matching the expected import style
   * for generated TypeScript code.
   */
  it("httpRuntimeLib groups multiple symbols into a single import", () => {
    const template = (
      <Output externals={[httpRuntimeLib]}>
        <SourceFile path="test.ts">
          {code`
            const err = ${httpRuntimeLib.createRestError}(response);
            const str = ${httpRuntimeLib.uint8ArrayToString}(bytes, "utf-8");
            const bytes2 = ${httpRuntimeLib.stringToUint8Array}(str, "utf-8");
          `}
        </SourceFile>
      </Output>
    );

    expect(template).toRenderTo({
      "test.ts": `
        import { createRestError, stringToUint8Array, uint8ArrayToString } from "@typespec/ts-http-runtime";

        const err = createRestError(response);
        const str = uint8ArrayToString(bytes, "utf-8");
        const bytes2 = stringToUint8Array(str, "utf-8");
      `,
    });
  });

  /**
   * Validates that Azure core client package symbols are accessible
   * and distinct from the non-Azure runtime symbols.
   *
   * The emitter switches between httpRuntimeLib and azureCoreClientLib
   * based on the Azure flavor setting. Both must expose the same logical
   * symbols but from different packages.
   */
  it("azureCoreClientLib exposes Azure-specific client symbols", () => {
    expect(azureCoreClientLib.Client).toBeDefined();
    expect(azureCoreClientLib.ClientOptions).toBeDefined();
    expect(azureCoreClientLib.getClient).toBeDefined();
    expect(azureCoreClientLib.RestError).toBeDefined();
    expect(azureCoreClientLib.createRestError).toBeDefined();
    expect(azureCoreClientLib.OperationOptions).toBeDefined();
    expect(azureCoreClientLib.StreamableMethod).toBeDefined();
    expect(azureCoreClientLib.PathUncheckedResponse).toBeDefined();
    expect(azureCoreClientLib.operationOptionsToRequestParameters).toBeDefined();
    expect(azureCoreClientLib.ErrorModel).toBeDefined();
    expect(azureCoreClientLib.ErrorResponse).toBeDefined();
  });

  /**
   * Validates that azureCoreClientLib generates imports from the correct
   * Azure package name (`@azure-rest/core-client`), not from the non-Azure
   * runtime package.
   */
  it("azureCoreClientLib generates imports from @azure-rest/core-client", () => {
    const template = (
      <Output externals={[azureCoreClientLib]}>
        <SourceFile path="test.ts">
          {code`const client: ${azureCoreClientLib.Client} = ${azureCoreClientLib.getClient}(endpoint);`}
        </SourceFile>
      </Output>
    );

    expect(template).toRenderTo({
      "test.ts": `
        import { Client, getClient } from "@azure-rest/core-client";

        const client: Client = getClient(endpoint);
      `,
    });
  });

  /**
   * Validates that all Azure supplementary packages expose the expected
   * symbols. In Azure-flavored SDKs, symbols that come from
   * `@typespec/ts-http-runtime` in vanilla mode are split across multiple
   * Azure packages. Each must be defined correctly.
   */
  it("Azure supplementary packages expose their expected symbols", () => {
    // Pipeline from @azure/core-rest-pipeline
    expect(azureCorePipelineLib.Pipeline).toBeDefined();

    // AbortSignalLike from @azure/abort-controller
    expect(azureAbortControllerLib.AbortSignalLike).toBeDefined();

    // Binary utils from @azure/core-util
    expect(azureCoreUtilLib.uint8ArrayToString).toBeDefined();
    expect(azureCoreUtilLib.stringToUint8Array).toBeDefined();

    // Auth from @azure/core-auth
    expect(azureCoreAuthLib.KeyCredential).toBeDefined();
    expect(azureCoreAuthLib.isKeyCredential).toBeDefined();
    expect(azureCoreAuthLib.TokenCredential).toBeDefined();
  });

  /**
   * Validates that Azure supplementary packages generate imports from their
   * respective package names, not from the core client package.
   */
  it("Azure supplementary packages generate imports from correct packages", () => {
    const template = (
      <Output
        externals={[azureCorePipelineLib, azureAbortControllerLib, azureCoreUtilLib, azureCoreAuthLib]}
      >
        <SourceFile path="test.ts">
          {code`
            const pipeline: ${azureCorePipelineLib.Pipeline} = createPipeline();
            const signal: ${azureAbortControllerLib.AbortSignalLike} = controller.signal;
            const str = ${azureCoreUtilLib.uint8ArrayToString}(bytes, "utf-8");
            const cred: ${azureCoreAuthLib.TokenCredential} = getCredential();
          `}
        </SourceFile>
      </Output>
    );

    expect(template).toRenderTo({
      "test.ts": `
        import { Pipeline } from "@azure/core-rest-pipeline";
        import { AbortSignalLike } from "@azure/abort-controller";
        import { uint8ArrayToString } from "@azure/core-util";
        import { TokenCredential } from "@azure/core-auth";

        const pipeline: Pipeline = createPipeline();
        const signal: AbortSignalLike = controller.signal;
        const str = uint8ArrayToString(bytes, "utf-8");
        const cred: TokenCredential = getCredential();
      `,
    });
  });

  /**
   * Validates that the Azure LRO package exposes all polling-related symbols.
   * These are essential for generating long-running operation support in
   * Azure-flavored SDKs.
   */
  it("azureCoreLroLib exposes all LRO symbols", () => {
    expect(azureCoreLroLib.PollerLike).toBeDefined();
    expect(azureCoreLroLib.OperationState).toBeDefined();
    expect(azureCoreLroLib.deserializeState).toBeDefined();
    expect(azureCoreLroLib.ResourceLocationConfig).toBeDefined();
  });

  /**
   * Validates that the Azure LRO package generates imports from
   * `@azure/core-lro`.
   */
  it("azureCoreLroLib generates imports from @azure/core-lro", () => {
    const template = (
      <Output externals={[azureCoreLroLib]}>
        <SourceFile path="test.ts">
          {code`const poller: ${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<Result>> = await createPoller();`}
        </SourceFile>
      </Output>
    );

    expect(template).toRenderTo({
      "test.ts": `
        import { OperationState, PollerLike } from "@azure/core-lro";

        const poller: PollerLike<OperationState<Result>> = await createPoller();
      `,
    });
  });

  /**
   * Validates that the Azure Identity package exposes DefaultAzureCredential.
   * This is used in sample code generation to show the simplest Azure auth path.
   */
  it("azureIdentityLib exposes DefaultAzureCredential", () => {
    expect(azureIdentityLib.DefaultAzureCredential).toBeDefined();
  });

  /**
   * Validates that multiple external packages can be registered together
   * in a single Output, and each generates imports from its own package.
   *
   * This is the realistic scenario: the emitter registers all required
   * packages as externals, and symbols from different packages used in
   * the same file each get their own import line.
   */
  it("multiple packages can be registered and used together", () => {
    const template = (
      <Output externals={[httpRuntimeLib, azureCoreLroLib]}>
        <SourceFile path="test.ts">
          {code`
            const client: ${httpRuntimeLib.Client} = ${httpRuntimeLib.getClient}(endpoint);
            const poller: ${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<void>> = await poll();
          `}
        </SourceFile>
      </Output>
    );

    expect(template).toRenderTo({
      "test.ts": `
        import { Client, getClient } from "@typespec/ts-http-runtime";
        import { OperationState, PollerLike } from "@azure/core-lro";

        const client: Client = getClient(endpoint);
        const poller: PollerLike<OperationState<void>> = await poll();
      `,
    });
  });
});
