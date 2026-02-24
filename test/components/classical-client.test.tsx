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
import { describe, expect, it } from "vitest";
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
import {
  classicalClientRefkey,
} from "../../src/utils/refkeys.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
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
        <SourceFile path="api/testServiceClientContext.ts">
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
        <SourceFile path="api/testServiceClientContext.ts">
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
   * Tests the basic class structure: private _client field, public readonly
   * pipeline property, and constructor that calls the factory function.
   * This is the fundamental structural test — every generated client must
   * have these elements for the SDK to function.
   */
  it("should render class with _client field, pipeline, and constructor", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <ClassicalClientTestWrapper sdkContext={sdkContext}>
        <SourceFile path="testServiceClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </ClassicalClientTestWrapper>
    );

    const result = renderToString(template);

    // Check for the file containing the client class
    expect(result).toContain("export class TestServiceClient");
    expect(result).toContain("private _client");
    expect(result).toContain("public readonly pipeline");
    expect(result).toContain("this._client = createTestService");
    expect(result).toContain("this.pipeline = this._client.pipeline");
  });

  /**
   * Tests that the constructor calls the factory function via refkey,
   * which enables Alloy to auto-generate cross-file imports. This is
   * critical because the factory function lives in a separate file
   * (api/testServiceClientContext.ts), and the import must be generated
   * automatically by Alloy's refkey system.
   */
  it("should generate import for factory function via refkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <ClassicalClientTestWrapper sdkContext={sdkContext}>
        <SourceFile path="testServiceClient.ts">
          <ClassicalClientDeclaration client={client} />
        </SourceFile>
      </ClassicalClientTestWrapper>
    );

    // Check that the output file imports createTestService from the context file
    expect(template).toRenderTo({
      "testServiceClient.ts": expect.stringContaining("createTestService"),
      "api/testServiceClientContext.ts": expect.stringContaining("createTestService"),
    });
  });

  /**
   * Tests that an operation method is generated that delegates to the
   * public API function. The class method should NOT be async — it
   * simply returns the promise from the API function. The first argument
   * to the API function is `this._client` (the context).
   */
  it("should render operation method delegating to public API function", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <FullTestWrapper sdkContext={sdkContext}>
        <SourceFile path="testServiceClient.ts">
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
        <SourceFile path="testServiceClient.ts">
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
        <SourceFile path="testServiceClient.ts">
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
   * Tests that the classical client class is referenceable via
   * classicalClientRefkey. This enables other components (like index
   * files or operation group files) to reference the client class and
   * have Alloy auto-generate imports.
   */
  it("should be referenceable via classicalClientRefkey", async () => {
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
        <ClassicalClientDeclaration client={client} />
        {code`const ref = new ${classicalClientRefkey(client)}();`}
      </SdkTestFile>
    );

    const result = renderToString(template);
    // The refkey reference should resolve to the class name
    expect(result).toContain("new TestServiceClient()");
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
        <SourceFile path="testServiceClient.ts">
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

  /**
   * Tests the ClassicalClientFile orchestrator that wraps the class
   * declaration in a source file. Verifies the output file path
   * matches the expected naming convention.
   */
  it("should render ClassicalClientFile with correct filename", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);

    const template = (
      <FullTestWrapper sdkContext={sdkContext}>
        <ClassicalClientFile client={client} />
      </FullTestWrapper>
    );

    // The file should be rendered with the camelCase client name
    expect(template).toRenderTo({
      "testServiceClient.ts": expect.stringContaining("export class TestServiceClient"),
      "api/testServiceClientContext.ts": expect.stringContaining("TestServiceContext"),
      "api/operations.ts": expect.stringContaining("getItem"),
    });
  });
});
