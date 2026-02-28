/**
 * Test suite for the ClassicalClient component.
 *
 * The ClassicalClient generates a class-based wrapper around the modular
 * API layer, providing an object-oriented SDK experience. The class:
 * - Has a private `_client` field holding the modular client context
 * - Exposes a readonly `pipeline` property for direct pipeline access
 * - Delegates constructor parameters to the modular factory function
 * - Contains operation methods that delegate to public API functions
 *
 * What is tested:
 * - Basic class structure with constructor, _client field, and pipeline property.
 * - Constructor calls the factory function via refkey for cross-file imports.
 * - Operation method delegates to public API function via refkey.
 * - Void-returning operation (e.g., DELETE 204) generates correct return type.
 * - Multiple operations render as separate class methods.
 * - Class is referenceable via classicalClientRefkey for cross-file usage.
 * - Operations with path parameters include required params in method signature.
 * - Constructor with credential parameter (API key auth).
 *
 * Why this matters:
 * The classical client is the primary user-facing API surface of the generated
 * SDK. Users instantiate the client class and call its methods to interact with
 * the service. Without correct class generation, the generated SDK has no
 * usable entry point for class-based consumers.
 */
import "@alloy-js/core/testing";
import { Children, code } from "@alloy-js/core";
import { d, renderToString } from "@alloy-js/core/testing";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ClassicalClientDeclaration,
  ClassicalClientFile,
} from "../../src/components/classical-client.js";
import {
  ClientContextDeclaration,
  ClientContextFactory,
  ClientContextOptionsDeclaration,
} from "../../src/components/client-context.js";
import { OperationOptionsDeclaration } from "../../src/components/operation-options.js";
import { PublicOperation } from "../../src/components/public-operation.js";
import { SendOperation } from "../../src/components/send-operation.js";
import { DeserializeOperation } from "../../src/components/deserialize-operation.js";
import { classicalClientRefkey } from "../../src/utils/refkeys.js";
import { createEmitterNamePolicy } from "../../src/utils/name-policy.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import {
  TesterWithService,
  RawTester,
  createSdkContextForTest,
} from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { SdkContextProvider } from "../../src/context/sdk-context.js";

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
 * Test wrapper that provides Output + SdkContext with all dependencies
 * but NO SourceFile — since ClassicalClientFile creates its own SourceFile.
 *
 * Also renders the client context components (context interface, options,
 * and factory) so that cross-file refkey references from the classical
 * client class resolve correctly.
 */
function ClassicalClientTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  const client = props.sdkContext.sdkPackage.clients[0];
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        {/* Render context file so refkeys resolve */}
        <SourceFile path="api/testingClientContext.ts">
          <ClientContextDeclaration client={client} />
          <ClientContextOptionsDeclaration client={client} />
          <ClientContextFactory client={client} />
        </SourceFile>
        {props.children}
      </SdkContextProvider>
    </Output>
  );
}

/**
 * Full test wrapper that renders both context infrastructure and operation
 * declarations alongside the classical client. This is needed for tests
 * that verify operation method delegation, where the public operation
 * functions and options interfaces must exist for refkey resolution.
 */
function FullTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  const client = props.sdkContext.sdkPackage.clients[0];
  const methods = client.methods;
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        {/* Render context file so refkeys resolve */}
        <SourceFile path="api/testingClientContext.ts">
          <ClientContextDeclaration client={client} />
          <ClientContextOptionsDeclaration client={client} />
          <ClientContextFactory client={client} />
        </SourceFile>
        {/* Render operations so public function refkeys resolve */}
        <SourceFile path="api/operations.ts">
          {methods.map((method: any, i: number) => (
            <>
              {i > 0 && "\n\n"}
              <OperationOptionsDeclaration method={method} />
              {"\n\n"}
              <SendOperation method={method} />
              {"\n\n"}
              <DeserializeOperation method={method} />
              {"\n\n"}
              <PublicOperation method={method} />
            </>
          ))}
        </SourceFile>
        {props.children}
      </SdkContextProvider>
    </Output>
  );
}

describe("ClassicalClient", () => {
  /**
   * Tests that share the same TypeSpec input: a simple service with a
   * single @get operation returning a string.
   */
  describe("with simple getItem operation", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let client: ReturnType<typeof getFirstClient>;

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
     * Tests the basic class structure: private _client field, public readonly
     * pipeline property, and constructor that calls the factory function.
     * This is the fundamental structural test — every generated client must
     * have these elements for the SDK to function.
     */
    it("should render class with _client field, pipeline, and constructor", () => {
      const template = (
        <ClassicalClientTestWrapper sdkContext={sdkContext}>
          <SourceFile path="testingClient.ts">
            <ClassicalClientDeclaration client={client} />
          </SourceFile>
        </ClassicalClientTestWrapper>
      );

      const result = renderToString(template);

      // Check for the file containing the client class
      expect(result).toContain("export class TestingClient");
      expect(result).toContain("private _client");
      expect(result).toContain("public readonly pipeline");
      expect(result).toContain("this._client = createTesting");
      expect(result).toContain("this.pipeline = this._client.pipeline");
    });

    /**
     * Tests that the constructor assembles userAgentPrefix with the
     * `azsdk-js-client` tag before calling the factory function. The
     * userAgentPrefix distinguishes classical (class-based) clients from
     * the modular API layer (`azsdk-js-api`), enabling telemetry tracking.
     *
     * The constructor must:
     * 1. Extract any user-provided prefix from options
     * 2. Construct a prefix with `azsdk-js-client`
     * 3. Pass wrapped options with the prefix to the factory function
     *
     * Without this, the HTTP User-Agent header would not include the
     * `azsdk-js-client` tag when the SDK is consumed via the class API.
     */
    it("should assemble userAgentPrefix with azsdk-js-client tag in constructor", () => {
      const template = (
        <ClassicalClientTestWrapper sdkContext={sdkContext}>
          <SourceFile path="testingClient.ts">
            <ClassicalClientDeclaration client={client} />
          </SourceFile>
        </ClassicalClientTestWrapper>
      );

      const result = renderToString(template);

      // Should extract user-provided prefix from options
      expect(result).toContain(
        "const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;",
      );
      // Should construct userAgentPrefix with azsdk-js-client tag
      expect(result).toContain("azsdk-js-client");
      // Should pass wrapped options to factory function
      expect(result).toContain("...options,");
      expect(result).toContain("userAgentOptions: { userAgentPrefix },");
    });

    /**
     * Tests that the constructor calls the factory function via refkey,
     * which enables Alloy to auto-generate cross-file imports. This is
     * critical because the factory function lives in a separate file
     * (api/testingClientContext.ts), and the import must be generated
     * automatically by Alloy's refkey system.
     */
    it("should generate import for factory function via refkey", () => {
      const template = (
        <ClassicalClientTestWrapper sdkContext={sdkContext}>
          <SourceFile path="testingClient.ts">
            <ClassicalClientDeclaration client={client} />
          </SourceFile>
        </ClassicalClientTestWrapper>
      );

      // Check that the output file imports createTesting from the context file
      expect(template).toRenderTo({
        "testingClient.ts": expect.stringContaining("createTesting"),
        "api/testingClientContext.ts": expect.stringContaining("createTesting"),
      });
    });

    /**
     * Tests that an operation method is generated that delegates to the
     * public API function. The class method should NOT be async — it
     * simply returns the promise from the API function. The first argument
     * to the API function is `this._client` (the context).
     */
    it("should render operation method delegating to public API function", () => {
      const template = (
        <FullTestWrapper sdkContext={sdkContext}>
          <SourceFile path="testingClient.ts">
            <ClassicalClientDeclaration client={client} />
          </SourceFile>
        </FullTestWrapper>
      );

      const result = renderToString(template);

      // Should have a method that delegates to the public API function
      expect(result).toContain("getItem(");
      expect(result).toContain("return getItem(this._client,");
    });

    /**
     * Tests that the classical client class is referenceable via
     * classicalClientRefkey. This enables other components (like index
     * files or operation group files) to reference the client class and
     * have Alloy auto-generate imports.
     */
    it("should be referenceable via classicalClientRefkey", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ClassicalClientDeclaration client={client} />
          {code`const ref = new ${classicalClientRefkey(client)}();`}
        </SdkTestFile>
      );

      const result = renderToString(template);
      // The refkey reference should resolve to the class name
      expect(result).toContain("new TestingClient()");
    });

    /**
     * Tests the ClassicalClientFile orchestrator that wraps the class
     * declaration in a source file. Verifies the output file path
     * matches the expected naming convention.
     */
    it("should render ClassicalClientFile with correct filename", () => {
      const template = (
        <FullTestWrapper sdkContext={sdkContext}>
          <ClassicalClientFile client={client} />
        </FullTestWrapper>
      );

      // The file should be rendered with the camelCase client name
      expect(template).toRenderTo({
        "testingClient.ts": expect.stringContaining(
          "export class TestingClient",
        ),
        "api/testingClientContext.ts":
          expect.stringContaining("TestingContext"),
        "api/operations.ts": expect.stringContaining("getItem"),
      });
    });
  });

  /**
   * Tests that a void-returning operation (like DELETE 204) generates
   * the correct return type. Even though the operation returns void,
   * the class method must return `Promise<void>` since the underlying
   * API function is async.
   */
  it("should handle void-returning operation", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @delete op deleteItem(@path id: string): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <FullTestWrapper sdkContext={sdkContext}>
        <SourceFile path="testingClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </FullTestWrapper>
    );

    const result = renderToString(template);

    // Should have void return type wrapped in Promise
    expect(result).toContain("Promise<void>");
    expect(result).toContain("return deleteItem(this._client,");
  });

  /**
   * Tests that multiple operations are rendered as separate class methods.
   * A realistic service has many operations, and each must appear as its
   * own method on the client class.
   */
  it("should render multiple operation methods", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
        @post op createItem(@body body: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <FullTestWrapper sdkContext={sdkContext}>
        <SourceFile path="testingClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </FullTestWrapper>
    );

    const result = renderToString(template);

    // Both operations should appear as methods
    expect(result).toContain("getItem(");
    expect(result).toContain("createItem(");
  });

  /**
   * Tests that operations with path parameters include those parameters
   * as required arguments in the class method signature, and that they
   * are forwarded correctly to the public API function.
   */
  it("should include path parameters in method signature", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(@path id: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <FullTestWrapper sdkContext={sdkContext}>
        <SourceFile path="testingClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </FullTestWrapper>
    );

    const result = renderToString(template);

    // Method should have id parameter and forward it
    expect(result).toContain("getItem(");
    expect(result).toContain("id: string");
    expect(result).toContain("return getItem(this._client, id, options)");
  });
});

/**
 * Test suite for ARM constructor overloads (RC22).
 *
 * ARM services require special constructor handling for subscriptionId:
 * - Subscription-level services: subscriptionId is a required parameter
 * - Mixed services (both tenant and subscription ops): constructor overloads
 *   make subscriptionId optional via a polymorphic parameter
 * - Tenant-only services: no subscriptionId at all
 *
 * What is tested:
 * - Subscription-level ARM service includes subscriptionId as required constructor param
 * - Mixed ARM service generates constructor overloads with subscriptionIdOrOptions
 * - Tenant-only ARM service has no subscriptionId in constructor
 * - Factory function receives subscriptionId in the correct position
 *
 * Why this matters:
 * ARM (Azure Resource Manager) services use subscriptionId to scope operations to a
 * user's Azure subscription. Without correct constructor parameter handling, consumers
 * cannot use the generated client for subscription-level operations. The overload pattern
 * for mixed services ensures backward-compatible API surfaces — consumers using only
 * tenant-level operations don't need to provide subscriptionId.
 */
describe("ClassicalClient ARM constructor", () => {
  /**
   * Tests that an ARM service with subscription-level operations (TrackedResource)
   * includes subscriptionId as a required constructor parameter. This ensures
   * the subscriptionId is forwarded to the factory function for URL template resolution.
   *
   * Without this, ARM resource operations would fail because the endpoint URL
   * contains {subscriptionId} but no value is provided.
   */
  it("should include subscriptionId as required constructor param for subscription-level services", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
      import "@typespec/http";
      import "@typespec/rest";
      import "@typespec/versioning";
      import "@azure-tools/typespec-azure-core";
      import "@azure-tools/typespec-azure-resource-manager";

      using TypeSpec.Http;
      using TypeSpec.Rest;
      using TypeSpec.Versioning;
      using Azure.Core;
      using Azure.ResourceManager;

      @armProviderNamespace
      @service(#{ title: "Client.StandardService management service" })
      @versioned(Client.StandardService.Versions)
      namespace Client.StandardService;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        v2021_10_01_preview: "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      model StandardResource is TrackedResource<StandardProperties> {
        ...ResourceNameParameter<StandardResource>;
      }
      model StandardProperties {
        displayName?: string;
        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }
      @lroStatus union ProvisioningState {
        ResourceProvisioningState, Provisioning: "Provisioning", string,
      }
      @armResourceOperations
      interface StandardResources { get is ArmResourceRead<StandardResource>; }
    `);

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <ClassicalClientTestWrapper sdkContext={sdkContext}>
        <SourceFile path="standardServiceClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </ClassicalClientTestWrapper>
    );

    const result = renderToString(template);

    // Should include subscriptionId as a required constructor parameter
    expect(result).toContain("subscriptionId: string");
    // Should forward subscriptionId to the factory function with wrapped options
    expect(result).toContain(
      "createStandardService(credential, subscriptionId, {",
    );
    expect(result).toContain("...options,");
    expect(result).toContain("userAgentOptions: { userAgentPrefix },");
    // Should NOT have constructor overloads
    expect(result).not.toContain("subscriptionIdOrOptions");
  });

  /**
   * Tests that a tenant-only ARM service (no TrackedResource, no subscription ops)
   * does NOT include subscriptionId in the constructor. The global service only
   * has ARM Operations.list which is a standard boilerplate endpoint.
   *
   * This verifies the negative case — subscriptionId should only appear when
   * the client initialization parameters include it.
   */
  it("should not include subscriptionId for tenant-only services", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
      import "@typespec/http";
      import "@typespec/rest";
      import "@typespec/versioning";
      import "@azure-tools/typespec-azure-core";
      import "@azure-tools/typespec-azure-resource-manager";

      using TypeSpec.Http;
      using TypeSpec.Rest;
      using TypeSpec.Versioning;
      using Azure.Core;
      using Azure.ResourceManager;

      @armProviderNamespace
      @service(#{ title: "Client.GlobalService management service" })
      @versioned(Client.GlobalService.Versions)
      namespace Client.GlobalService;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        v2021_10_01_preview: "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}
    `);

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <ClassicalClientTestWrapper sdkContext={sdkContext}>
        <SourceFile path="globalServiceClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </ClassicalClientTestWrapper>
    );

    const result = renderToString(template);

    // Should NOT include subscriptionId
    expect(result).not.toContain("subscriptionId");
    // Should have a simple constructor with credential
    expect(result).toContain("credential");
    expect(result).toContain("GlobalServiceClientOptionalParams");
  });

  /**
   * Tests that a mixed ARM service (both tenant-level and subscription-level ops)
   * generates constructor overloads. The mixed service has:
   * - listSkus: a tenant-level operation (no subscriptionId in path)
   * - MixedResources.get: a subscription-level operation
   *
   * The overloaded constructor allows consumers to use the client without
   * subscriptionId for tenant-level operations, or with subscriptionId for
   * subscription-level operations. This matches the legacy emitter's behavior.
   *
   * The overload pattern uses a `subscriptionIdOrOptions` discriminator parameter
   * that is resolved at runtime via `typeof` checks.
   */
  it("should generate constructor overloads for mixed tenant/subscription services", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
      import "@typespec/http";
      import "@typespec/rest";
      import "@typespec/versioning";
      import "@azure-tools/typespec-azure-core";
      import "@azure-tools/typespec-azure-resource-manager";

      using TypeSpec.Http;
      using TypeSpec.Rest;
      using TypeSpec.Versioning;
      using Azure.Core;
      using Azure.ResourceManager;

      @armProviderNamespace
      @service(#{ title: "Client.MixedService management service" })
      @versioned(Client.MixedService.Versions)
      namespace Client.MixedService;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        v2021_10_01_preview: "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      model MixedResource is TrackedResource<MixedProperties> {
        ...ResourceNameParameter<MixedResource>;
      }
      model MixedProperties {
        displayName?: string;
        @visibility(Lifecycle.Read) provisioningState?: ProvisioningState;
      }
      @lroStatus union ProvisioningState {
        ResourceProvisioningState, Provisioning: "Provisioning", string,
      }
      @armResourceOperations
      interface MixedResources { get is ArmResourceRead<MixedResource>; }

      @route("/providers/Client.MixedService/skus") @get
      op listSkus(): { value: Sku[] };
      model Sku { name?: string; tier?: string; capacity?: int32; }
    `);

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <ClassicalClientTestWrapper sdkContext={sdkContext}>
        <SourceFile path="mixedServiceClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </ClassicalClientTestWrapper>
    );

    const result = renderToString(template);

    // Should have the discriminator parameter in the implementation signature
    expect(result).toContain("subscriptionIdOrOptions");
    // Should have the typeof discriminator logic
    expect(result).toContain('typeof subscriptionIdOrOptions === "string"');
    expect(result).toContain('typeof subscriptionIdOrOptions === "object"');
    // Should pass subscriptionId ?? "" to the factory
    expect(result).toContain('subscriptionId ?? ""');
    // Should have options fallback
    expect(result).toContain("options = options ?? {}");
  });

  /**
   * Tests that the classical client constructor uses the name-policy-escaped
   * endpoint parameter name when calling the factory function. The emitter's
   * custom name policy transforms "endpoint" to "endpointParam" since
   * "endpoint" is a reserved SDK parameter name. The constructor must forward
   * the escaped parameter name to the factory call.
   *
   * Regression test for SMOKE-3: the constructor body used "endpoint" (the raw
   * TCGC name) when calling the factory function, but the constructor
   * parameter was declared as "endpointParam" by the name policy.
   */
  it("should use name-policy-escaped endpoint parameter in factory call", async () => {
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
          <SourceFile path="api/testingClientContext.ts">
            <ClientContextDeclaration client={client} />
            <ClientContextOptionsDeclaration client={client} />
            <ClientContextFactory client={client} />
          </SourceFile>
          <SourceFile path="testingClient.ts">
            <ClassicalClientDeclaration client={client} />
          </SourceFile>
        </SdkContextProvider>
      </Output>
    );

    const result = renderToString(template);
    // The constructor parameter should be "endpointParam" (emitter name policy)
    expect(result).toContain("endpointParam: string");
    // The factory call should use "endpointParam", NOT the raw "endpoint"
    expect(result).toContain("createTesting(endpointParam, {");
  });
});
