/**
 * Test suite for the ClientContext component.
 *
 * ClientContext generates the client context infrastructure needed to create
 * and use HTTP clients. It produces three declarations:
 * 1. A context interface (`XxxContext extends Client`) for typing the client instance.
 * 2. An options interface (`XxxClientOptionalParams extends ClientOptions`) for
 *    optional client configuration.
 * 3. A factory function (`createXxx(...)`) that calls `getClient()` to create
 *    the configured client.
 *
 * What is tested:
 * - Simple service generates context interface extending Client.
 * - Simple service generates options interface extending ClientOptions.
 * - Factory function calls getClient() with endpoint URL.
 * - Endpoint with default value extracts from options with fallback.
 * - API version parameter appears in context and options interfaces.
 * - Factory function refkey is referenceable via createClientRefkey.
 * - Context interface refkey is referenceable via clientContextRefkey.
 * - Options interface refkey is referenceable via clientOptionsRefkey.
 *
 * Why this matters:
 * The client context is the foundational infrastructure that all operations
 * depend on. The `context: Client` parameter in every operation function
 * is created by the factory function generated here. Without correct client
 * context generation, the entire generated SDK is unusable.
 */
import "@alloy-js/core/testing";
import { Children, code } from "@alloy-js/core";
import { d, renderToString } from "@alloy-js/core/testing";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ClientContextDeclaration,
  ClientContextOptionsDeclaration,
  ClientContextFactory,
  ClientContextFile,
} from "../../src/components/client-context.js";
import {
  clientContextRefkey,
  clientOptionsRefkey,
  createClientRefkey,
} from "../../src/utils/refkeys.js";
import { createEmitterNamePolicy } from "../../src/utils/name-policy.js";
import {
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureLoggerLib,
} from "../../src/utils/external-packages.js";
import {
  Tester,
  TesterWithService,
  createSdkContextForTest,
} from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { LoggerFile } from "../../src/components/logger-file.js";
import { SourceFile } from "@alloy-js/typescript";

/**
 * Helper to extract the first client from an SDK context.
 *
 * Most tests define a single service, so this helper avoids repeated
 * boilerplate for navigating the SDK package structure.
 */
function getFirstClient(sdkContext: { sdkPackage: { clients: Array<any> } }) {
  return sdkContext.sdkPackage.clients[0];
}

/**
 * Test wrapper for ClientContextFile that provides Output + SdkContext but
 * NO SourceFile — since ClientContextFile creates its own SourceFile.
 *
 * Includes httpRuntimeLib in externals since client context components
 * reference Client, ClientOptions, and getClient from the runtime package.
 */
function ClientContextTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        {props.children}
      </SdkContextProvider>
    </Output>
  );
}

describe("ClientContext", () => {
  describe("with simple service", () => {
    let sdkContext: SdkContext;
    let client: any;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          @get op getItem(): string;
        `,
      );
      sdkContext = await createSdkContextForTest(program);
      client = getFirstClient(sdkContext);
    });

    /**
     * Tests that the context interface extends Client from the HTTP runtime.
     * This is the most fundamental requirement — the context type must be
     * compatible with the Client interface that all operations expect.
     */
    it("should render context interface extending Client", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextDeclaration client={client} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import type { Client } from "@typespec/ts-http-runtime";

        export interface TestingContext extends Client {}
      `);
    });

    /**
     * Tests that the options interface extends ClientOptions from the HTTP runtime.
     * Consumers pass this options object when creating the client to configure
     * things like endpoint overrides, API version, and custom parameters.
     */
    it("should render options interface extending ClientOptions", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextOptionsDeclaration client={client} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import type { ClientOptions } from "@typespec/ts-http-runtime";

        export interface TestingClientOptionalParams extends ClientOptions {}
      `);
    });

    /**
     * Tests the factory function for a simple service with just an endpoint.
     * The factory must call getClient() with the endpoint URL and return
     * the result typed as the context interface. This verifies the basic
     * plumbing that all more complex scenarios build upon.
     */
    it("should render factory function calling getClient", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextFactory client={client} />
        </SdkTestFile>
      );

      const result = renderToString(template);
      expect(result).toContain("getClient");
      expect(result).toContain("createTesting");
      expect(result).toContain("endpointUrl");
    });

    /**
     * Tests that the factory function is referenceable via createClientRefkey.
     * This is critical because the classical client constructor uses
     * createClientRefkey to call the factory function, enabling Alloy to
     * auto-generate cross-file imports.
     */
    it("should register refkey via createClientRefkey", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextFactory client={client} />
          {code`const ref = ${createClientRefkey(client)}("endpoint");`}
        </SdkTestFile>
      );

      // The refkey reference should resolve to the factory function name
      const result = renderToString(template);
      expect(result).toContain("createTesting");
    });

    /**
     * Tests that the context interface refkey is referenceable.
     * Other components (like the classical client) use clientContextRefkey
     * to reference the context type for type annotations.
     */
    it("should register context interface refkey via clientContextRefkey", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextDeclaration client={client} />
          {code`const ctx: ${clientContextRefkey(client)} = {} as any;`}
        </SdkTestFile>
      );

      const result = renderToString(template);
      expect(result).toContain("TestingContext");
    });

    /**
     * Tests that the options interface refkey is referenceable.
     * The factory function and classical client use clientOptionsRefkey
     * to reference the options type in their parameter lists.
     */
    it("should register options interface refkey via clientOptionsRefkey", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextOptionsDeclaration client={client} />
          {code`const opts: ${clientOptionsRefkey(client)} = {};`}
        </SdkTestFile>
      );

      const result = renderToString(template);
      expect(result).toContain("TestingClientOptionalParams");
    });

    /**
     * Tests that the factory function constructs a user agent prefix and
     * merges it into the options before calling getClient.
     *
     * The user agent prefix identifies the SDK to service teams for telemetry.
     * The generated code should:
     * 1. Extract any user-provided prefix from options
     * 2. Build a prefix with the `azsdk-js-api` tag
     * 3. Create `updatedOptions` with the merged user agent
     * 4. Pass `updatedOptions` to getClient instead of raw `options`
     *
     * This is critical for Azure SDK compliance — without the user agent
     * prefix, service teams cannot identify which SDK version is calling.
     */
    it("should generate user agent prefix in factory function", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextFactory client={client} />
        </SdkTestFile>
      );

      const result = renderToString(template);
      // Should extract prefix from options
      expect(result).toContain("prefixFromOptions");
      expect(result).toContain("options?.userAgentOptions?.userAgentPrefix");
      // Should construct the SDK user agent tag
      expect(result).toContain("azsdk-js-api");
      // Should merge into updatedOptions
      expect(result).toContain("updatedOptions");
      expect(result).toContain("userAgentOptions: { userAgentPrefix }");
      // Should pass updatedOptions to getClient (not raw options)
      expect(result).toContain("getClient(endpointUrl, updatedOptions)");
    });

    /**
     * Tests that the user agent prefix merges with a user-provided prefix
     * when present. The generated ternary should prepend the user's prefix
     * to the SDK identifier tag.
     *
     * This matters because consumers may set their own userAgentPrefix
     * (e.g., for tracking specific applications). The SDK prefix must be
     * appended, not replace the user's prefix.
     */
    it("should merge user-provided prefix with SDK prefix", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextFactory client={client} />
        </SdkTestFile>
      );

      const result = renderToString(template);
      // The ternary should combine user prefix with SDK prefix
      expect(result).toContain("${prefixFromOptions} azsdk-js-api");
    });

    /**
     * Tests the full ClientContextFile orchestrator rendering all three
     * declarations into a single source file. This validates that the
     * orchestrator correctly composes the interface, options, and factory
     * components together.
     */
    it("should render complete context file with all declarations", () => {
      const template = (
        <ClientContextTestWrapper sdkContext={sdkContext}>
          <ClientContextFile client={client} />
        </ClientContextTestWrapper>
      );

      // Should contain all three declarations
      expect(template).toRenderTo({
        "testingClientContext.ts": expect.stringContaining("TestingContext"),
      });
    });

    /**
     * Tests that when flavor is "azure", the factory function includes
     * `loggingOptions` in `updatedOptions` that wires the generated logger
     * into the HTTP pipeline.
     *
     * Azure SDK compliance requires that each package uses its own
     * package-scoped logger (created via `createClientLogger`) for pipeline
     * logging. The `loggingOptions.logger` property defaults to `logger.info`
     * but allows consumer override via `options.loggingOptions?.logger`.
     *
     * Without this, the HTTP pipeline uses the global logger, making it
     * impossible for consumers to filter logs per-package.
     */
    it("should include loggingOptions with logger.info for azure flavor", () => {
      const template = (
        <Output
          program={sdkContext.emitContext.program}
          namePolicy={createTSNamePolicy()}
          externals={[
            azureCoreClientLib,
            azureCorePipelineLib,
            azureCoreAuthLib,
            azureCoreUtilLib,
            azureAbortControllerLib,
            azureLoggerLib,
          ]}
        >
          <SdkContextProvider sdkContext={sdkContext}>
            <FlavorProvider flavor="azure">
              <SourceFile path="test.ts">
                <ClientContextFactory client={client} />
              </SourceFile>
              <LoggerFile packageName="test-service" />
            </FlavorProvider>
          </SdkContextProvider>
        </Output>
      );

      const result = renderToString(template);
      // Should include loggingOptions with logger reference
      expect(result).toContain("loggingOptions");
      expect(result).toContain("options.loggingOptions?.logger ?? logger.info");
    });

    /**
     * Tests that when flavor is "core" (non-Azure), the factory function
     * does NOT include `loggingOptions` in `updatedOptions`.
     *
     * The core/unbranded runtime does not have a package logger concept.
     * Including loggingOptions would reference a non-existent logger module,
     * breaking the generated code for non-Azure SDKs.
     */
    it("should NOT include loggingOptions for core flavor", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClientContextFactory client={client} />
        </SdkTestFile>
      );

      const result = renderToString(template);
      // Should NOT include loggingOptions for core flavor
      expect(result).not.toContain("loggingOptions");
      // But should still have user agent options
      expect(result).toContain("userAgentOptions");
    });
  });

  /**
   * Tests that the factory function uses the name-policy-transformed parameter
   * name for endpoint references in the code body. The emitter's custom name
   * policy transforms "endpoint" to "endpointParam" (since "endpoint" is a
   * reserved SDK parameter name). This test validates that the code body
   * references match the function signature parameter name, preventing
   * "endpoint is not defined" runtime errors.
   *
   * Regression test for SMOKE-3: hardcoded "endpoint" in factory body while
   * the function parameter was "endpointParam" due to the name policy.
   */
  it("should use name-policy-escaped endpoint parameter name in factory body", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );
    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <Output
        program={sdkContext.emitContext.program}
        namePolicy={createEmitterNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <SdkContextProvider sdkContext={sdkContext}>
          <SourceFile path="test.ts">
            <ClientContextFactory client={client} />
          </SourceFile>
        </SdkContextProvider>
      </Output>
    );

    const result = renderToString(template);
    // The function parameter should be "endpointParam" (emitter name policy escaping)
    expect(result).toContain("endpointParam: string");
    // The code body should reference "endpointParam", NOT the raw "endpoint"
    expect(result).toContain("options.endpoint ?? endpointParam");
    // Should NOT have the raw parameter name in a position where it references the parameter
    expect(result).not.toMatch(/\?\?\s+endpoint[^PpUu]/);
  });

  /**
   * Tests that when credential authentication is configured, the factory
   * function passes updatedOptions (with user agent) alongside the credential
   * to getClient. The credential must appear between endpoint and options.
   *
   * This verifies that the user agent prefix works correctly in combination
   * with credential parameters (a common real-world configuration).
   */
  it("should pass updatedOptions with credential to getClient", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(
      t.code`
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-api-key">)
        @service(#{title: "Auth Service"})
        namespace AuthService;

        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ClientContextFactory client={client} />
      </SdkTestFile>
    );

    const result = renderToString(template);
    // Core flavor: credential and authSchemes are merged into options object (2-arg getClient)
    expect(result).toContain("{ ...updatedOptions, credential, authSchemes:");
    expect(result).toContain('kind: "apiKey"');
    expect(result).toContain('apiKeyLocation: "header"');
    expect(result).toContain('name: "x-api-key"');
    // Should still have user agent prefix construction
    expect(result).toContain("azsdk-js-api");
  });

  /**
   * Tests that when a versioned service has an explicit api-version query
   * parameter on its operations, the API version is included as a member
   * of the context interface. Operations reference `(context as any).apiVersion`
   * when building requests, so this property must exist on the context type.
   */
  it("should include API version in context when operations use api-version", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(
      t.code`
        @Versioning.versioned(Versions)
        @service(#{title: "Versioned Service"})
        namespace VersionedService;

        enum Versions {
          v1: "v1",
          v2: "v2",
        }

        @get op getItem(@query apiVersion?: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ClientContextDeclaration client={client} />
      </SdkTestFile>
    );

    const result = renderToString(template);
    expect(result).toContain("apiVersion");
  });

  /**
   * Tests that the factory function always destructures `apiVersion` out of
   * updatedOptions before passing to getClient. This prevents apiVersion from
   * leaking as a client option to the HTTP runtime, which doesn't understand it.
   *
   * The legacy emitter always strips apiVersion from options because it is
   * managed at the client context level, not the HTTP client level. The
   * destructuring pattern `const { apiVersion: _, ...updatedOptions }` ensures
   * apiVersion is separated from the options passed to getClient.
   *
   * Why this matters: without this, apiVersion would be included in the
   * options bag passed to `getClient()`, which could cause unexpected behavior
   * in the HTTP runtime or HTTP pipeline middleware that inspects options.
   */
  it("should destructure apiVersion out of updatedOptions in factory", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ClientContextFactory client={client} />
      </SdkTestFile>
    );

    const result = renderToString(template);
    // Should use destructuring pattern to strip apiVersion
    expect(result).toContain("const { apiVersion: _, ...updatedOptions } = {");
    // Should NOT use the old pattern
    expect(result).not.toMatch(/const updatedOptions = \{/);
  });

  /**
   * Tests that for Azure flavor, the factory function emits a warning when
   * the client does not support client-level apiVersion. This occurs when
   * the client context does not have an apiVersion member — meaning apiVersion
   * is managed at the operation level, not the client level.
   *
   * The warning tells consumers: "This client does not support client
   * api-version, please change it at the operation level". This matches the
   * legacy emitter behavior which always emits this warning for Azure clients
   * without client-level apiVersion.
   *
   * Why this matters: without the warning, consumers would silently pass
   * `options.apiVersion` thinking it affects all operations, when in fact it
   * is ignored. The warning prevents confusion and guides consumers to pass
   * apiVersion per-operation instead.
   */
  it("should emit apiVersion warning for azure flavor without apiVersion in context", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <Output
        program={sdkContext.emitContext.program}
        namePolicy={createTSNamePolicy()}
        externals={[
          azureCoreClientLib,
          azureCorePipelineLib,
          azureCoreAuthLib,
          azureCoreUtilLib,
          azureAbortControllerLib,
          azureLoggerLib,
        ]}
      >
        <SdkContextProvider sdkContext={sdkContext}>
          <FlavorProvider flavor="azure">
            <SourceFile path="test.ts">
              <ClientContextFactory client={client} />
            </SourceFile>
            <LoggerFile packageName="test-service" />
          </FlavorProvider>
        </SdkContextProvider>
      </Output>
    );

    const result = renderToString(template);
    // Should include warning about unsupported client-level apiVersion
    expect(result).toContain("if (options.apiVersion)");
    expect(result).toContain(
      'logger.warning("This client does not support client api-version, please change it at the operation level")',
    );
    // Should return clientContext (not inline return with getClient)
    expect(result).toContain("return clientContext;");
  });

  /**
   * Tests that for core (non-Azure) flavor, the factory function does NOT
   * emit the apiVersion warning, even when the client has no apiVersion
   * in context.
   *
   * The warning is Azure-specific because it requires the generated logger
   * from logger.ts, which only exists for Azure flavor. Core flavor has no
   * package logger, so emitting the warning would reference a non-existent
   * module and break the generated code.
   */
  it("should NOT emit apiVersion warning for core flavor", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ClientContextFactory client={client} />
      </SdkTestFile>
    );

    const result = renderToString(template);
    // Core flavor should NOT have the warning
    expect(result).not.toContain("options.apiVersion");
    expect(result).not.toContain("logger.warning");
  });
});
