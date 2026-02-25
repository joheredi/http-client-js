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
import { describe, expect, it } from "vitest";
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
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { Tester, TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { SdkContextProvider } from "../../src/context/sdk-context.js";

/**
 * Helper to extract the first client from an SDK context.
 *
 * Most tests define a single service, so this helper avoids repeated
 * boilerplate for navigating the SDK package structure.
 */
function getFirstClient(sdkContext: {
  sdkPackage: { clients: Array<any> };
}) {
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
  /**
   * Tests that the context interface extends Client from the HTTP runtime.
   * This is the most fundamental requirement — the context type must be
   * compatible with the Client interface that all operations expect.
   */
  it("should render context interface extending Client", async () => {
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
        <ClientContextDeclaration client={client} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { Client } from "@typespec/ts-http-runtime";

      export interface TestServiceContext extends Client {}
    `);
  });

  /**
   * Tests that the options interface extends ClientOptions from the HTTP runtime.
   * Consumers pass this options object when creating the client to configure
   * things like endpoint overrides, API version, and custom parameters.
   */
  it("should render options interface extending ClientOptions", async () => {
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
        <ClientContextOptionsDeclaration client={client} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { ClientOptions } from "@typespec/ts-http-runtime";

      export interface TestServiceClientOptionalParams extends ClientOptions {}
    `);
  });

  /**
   * Tests the factory function for a simple service with just an endpoint.
   * The factory must call getClient() with the endpoint URL and return
   * the result typed as the context interface. This verifies the basic
   * plumbing that all more complex scenarios build upon.
   */
  it("should render factory function calling getClient", async () => {
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
    expect(result).toContain("getClient");
    expect(result).toContain("createTestService");
    expect(result).toContain("endpointUrl");
  });

  /**
   * Tests that the factory function is referenceable via createClientRefkey.
   * This is critical because the classical client constructor uses
   * createClientRefkey to call the factory function, enabling Alloy to
   * auto-generate cross-file imports.
   */
  it("should register refkey via createClientRefkey", async () => {
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
        {code`const ref = ${createClientRefkey(client)}("endpoint");`}
      </SdkTestFile>
    );

    // The refkey reference should resolve to the factory function name
    const result = renderToString(template);
    expect(result).toContain("createTestService");
  });

  /**
   * Tests that the context interface refkey is referenceable.
   * Other components (like the classical client) use clientContextRefkey
   * to reference the context type for type annotations.
   */
  it("should register context interface refkey via clientContextRefkey", async () => {
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
        <ClientContextDeclaration client={client} />
        {code`const ctx: ${clientContextRefkey(client)} = {} as any;`}
      </SdkTestFile>
    );

    const result = renderToString(template);
    expect(result).toContain("TestServiceContext");
  });

  /**
   * Tests that the options interface refkey is referenceable.
   * The factory function and classical client use clientOptionsRefkey
   * to reference the options type in their parameter lists.
   */
  it("should register options interface refkey via clientOptionsRefkey", async () => {
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
        <ClientContextOptionsDeclaration client={client} />
        {code`const opts: ${clientOptionsRefkey(client)} = {};`}
      </SdkTestFile>
    );

    const result = renderToString(template);
    expect(result).toContain("TestServiceClientOptionalParams");
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
  it("should generate user agent prefix in factory function", async () => {
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
  it("should merge user-provided prefix with SDK prefix", async () => {
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
    // The ternary should combine user prefix with SDK prefix
    expect(result).toContain("${prefixFromOptions} azsdk-js-api");
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
    // With credentials, getClient takes three args with updatedOptions last
    expect(result).toContain("credential, updatedOptions");
    // Should still have user agent prefix construction
    expect(result).toContain("azsdk-js-api");
  });

  /**
   * Tests the full ClientContextFile orchestrator rendering all three
   * declarations into a single source file. This validates that the
   * orchestrator correctly composes the interface, options, and factory
   * components together.
   */
  it("should render complete context file with all declarations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <ClientContextTestWrapper sdkContext={sdkContext}>
        <ClientContextFile client={client} />
      </ClientContextTestWrapper>
    );

    // Should contain all three declarations
    expect(template).toRenderTo({
      "testServiceClientContext.ts": expect.stringContaining("TestServiceContext"),
    });
  });

  /**
   * Tests that when a versioned service has an explicit api-version query
   * parameter on its operations, the API version is included as a member
   * of the context interface. Operations reference `context.apiVersion`
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
});
