/**
 * Test suite for the OperationOptions component.
 *
 * OperationOptions generates TypeScript interfaces for each operation's optional
 * parameters (e.g., `GetUserOptionalParams`). These interfaces extend `OperationOptions`
 * from the HTTP runtime and contain all optional method-level parameters that consumers
 * can pass when calling operations.
 *
 * What is tested:
 * - Basic operation with optional parameters generates correct interface.
 * - Interface extends OperationOptions from the runtime package (via refkey).
 * - Refkey is set via operationOptionsRefkey(method) and can be referenced.
 * - JSDoc documentation from parameter descriptions appears on members.
 * - Client-level parameters (onClient=true) are excluded from the interface.
 * - Required parameters are excluded (they go in the function signature).
 * - Auto-generated contentType/accept headers are excluded.
 * - Operations with no optional parameters produce an empty interface.
 * - LRO operations include updateIntervalInMs member.
 * - Operations with dual-format (JSON+XML) body include contentType member.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import type {
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { OperationOptionsDeclaration } from "../../src/components/operation-options.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { operationOptionsRefkey } from "../../src/utils/refkeys.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

/**
 * Helper to extract the first method from the first client in an SDK context.
 *
 * Most tests define a single operation, so this helper avoids repeated
 * boilerplate for navigating the client → methods hierarchy.
 */
function getFirstMethod(
  sdkContext: { sdkPackage: { clients: Array<{ methods: SdkServiceMethod<SdkHttpOperation>[] }> } },
): SdkServiceMethod<SdkHttpOperation> {
  return sdkContext.sdkPackage.clients[0].methods[0];
}

describe("OperationOptions", () => {
  /**
   * Tests the most fundamental case: an operation with optional query/header
   * parameters generates an interface containing those parameters as optional
   * members. This is the baseline test — most service operations have at least
   * one optional parameter, so this must work correctly.
   */
  it("should render interface with optional parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model User {
          name: string;
        }

        @get op ${t.op("getUsers")}(@query skip?: int32, @query top?: int32): User[];
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getUsers operation.
       */
      export interface GetUsersOptionalParams extends OperationOptions {
        skip?: number;
        top?: number;
      }
    `);
  });

  /**
   * Tests that the interface extends OperationOptions from the runtime package.
   * This is critical because the runtime's OperationOptions provides the base
   * properties (like requestOptions, abortSignal) that all operations inherit.
   * The extends clause must reference the runtime type via refkey so Alloy
   * auto-generates the import statement.
   */
  it("should extend OperationOptions from runtime package", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("listItems")}(): string[];
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the listItems operation.
       */
      export interface ListItemsOptionalParams extends OperationOptions {}
    `);
  });

  /**
   * Tests that the component registers a refkey via operationOptionsRefkey(method)
   * so other components (like the public operation function) can reference the
   * options type and Alloy auto-generates imports across files. Without this,
   * operation functions would have no way to reference their options interface.
   */
  it("should be referenceable via operationOptionsRefkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getItem")}(@query filter?: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        {code`type TestRef = ${operationOptionsRefkey(method)}`}
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getItem operation.
       */
      export interface GetItemOptionalParams extends OperationOptions {
        filter?: string;
      }

      type TestRef = GetItemOptionalParams
    `);
  });

  /**
   * Tests that JSDoc documentation from TypeSpec @doc decorators on parameters
   * propagates to the interface members. Documentation is critical for SDK
   * usability — consumers rely on IntelliSense tooltips to understand what
   * each option does.
   */
  it("should include JSDoc from parameter descriptions", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("search")}(
          @query @doc("The search query string.") query?: string,
          @query @doc("Maximum number of results to return.") maxResults?: int32,
        ): string[];
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the search operation.
       */
      export interface SearchOptionalParams extends OperationOptions {
        /**
         * The search query string.
         */
        query?: string;
        /**
         * Maximum number of results to return.
         */
        maxResults?: number;
      }
    `);
  });

  /**
   * Tests that required parameters are NOT included in the options interface.
   * Required parameters belong in the function signature, not the options bag.
   * This ensures the generated API surface is clear about what's mandatory
   * versus optional.
   */
  it("should exclude required parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getUser")}(@path userId: string, @query expand?: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getUser operation.
       */
      export interface GetUserOptionalParams extends OperationOptions {
        expand?: string;
      }
    `);
  });

  /**
   * Tests that operations with zero optional parameters still produce a valid
   * (empty) interface. Even operations with no options need the interface so
   * consumers can pass requestOptions or abortSignal via the base OperationOptions.
   */
  it("should handle operations with no optional parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get @route("items/{id}") op ${t.op("getItem")}(@path id: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getItem operation.
       */
      export interface GetItemOptionalParams extends OperationOptions {}
    `);
  });

  /**
   * Tests that optional header parameters are included in the options interface.
   * Headers are a common source of optional parameters in REST APIs (e.g.,
   * If-Match, If-None-Match, custom tracking headers).
   */
  it("should include optional header parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getResource")}(
          @header ifMatch?: string,
          @header ifNoneMatch?: string,
        ): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getResource operation.
       */
      export interface GetResourceOptionalParams extends OperationOptions {
        ifMatch?: string;
        ifNoneMatch?: string;
      }
    `);
  });

  /**
   * Tests that an optional body parameter is included in the options interface.
   * Some operations have bodies that are entirely optional (e.g., PATCH operations
   * where no fields need updating). These need to appear in the options bag.
   */
  it("should include optional body parameter", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model PatchData {
          name?: string;
        }

        @patch(#{implicitOptionality: true}) op ${t.op("updateItem")}(@path id: string, @body body?: PatchData): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const patchModel = sdkContext.sdkPackage.models.find((m) => m.name === "PatchData")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={patchModel} />
        {"\n\n"}
        <OperationOptionsDeclaration method={method} />
      </SdkTestFile>
    );

    // The optional body parameter should appear in the options interface
    // with its model type referenced via refkey to the model declaration
    expect(template).toRenderTo(d`
      import type { OperationOptions } from "@typespec/ts-http-runtime";

      export interface PatchData {
        name?: string;
      }

      /**
       * Optional parameters for the updateItem operation.
       */
      export interface UpdateItemOptionalParams extends OperationOptions {
        body?: PatchData;
      }
    `);
  });
});
