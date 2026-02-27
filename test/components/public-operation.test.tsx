/**
 * Test suite for the PublicOperation component.
 *
 * PublicOperation generates the public operation functions that consumers
 * of the generated client library call directly. These functions compose
 * the private `_xxxSend` and `_xxxDeserialize` functions into a single
 * callable API entry point.
 *
 * What is tested:
 * - Basic GET operation generates async function that calls send then deserialize.
 * - POST operation with model body forwards all arguments correctly.
 * - Void return type (DELETE 204) generates correct async function.
 * - JSDoc documentation from TypeSpec operation description.
 * - Public function is referenceable via publicOperationRefkey.
 * - Path parameters appear as required function arguments.
 * - Function has same parameter signature as the send function.
 * - Multiple required parameters are forwarded in correct order.
 * - Response headers merged into return type when include-headers-in-response is enabled.
 * - Void-body response with headers returns header object type.
 * - Headers NOT merged when include-headers-in-response is disabled (default).
 * - @@override parameter grouping uses optionalParams and forwards correctly.
 */
import "@alloy-js/core/testing";
import { code, SourceDirectory } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import { beforeAll, describe, expect, it } from "vitest";
import type {
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { PublicOperation } from "../../src/components/public-operation.js";
import { SendOperation } from "../../src/components/send-operation.js";
import { DeserializeOperation } from "../../src/components/deserialize-operation.js";
import { DeserializeHeaders } from "../../src/components/deserialize-headers.js";
import { OperationOptionsDeclaration } from "../../src/components/operation-options.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { JsonSerializer } from "../../src/components/serialization/json-serializer.js";
import { JsonDeserializer } from "../../src/components/serialization/json-deserializer.js";
import { publicOperationRefkey } from "../../src/utils/refkeys.js";
import { httpRuntimeLib, azureCoreLroLib } from "../../src/utils/external-packages.js";
import { TesterWithService, RawTester, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { renderToString } from "@alloy-js/core/testing";
import { PollingHelpersFile } from "../../src/components/static-helpers/polling-helpers.js";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { EmitterOptionsProvider } from "../../src/context/emitter-options-context.js";
import { SdkContextProvider } from "../../src/context/sdk-context.js";

/**
 * Helper to extract the first method from the first client in an SDK context.
 */
function getFirstMethod(
  sdkContext: {
    sdkPackage: {
      clients: Array<{ methods: SdkServiceMethod<SdkHttpOperation>[] }>;
    };
  },
): SdkServiceMethod<SdkHttpOperation> {
  return sdkContext.sdkPackage.clients[0].methods[0];
}

describe("PublicOperation", () => {
  /**
   * Tests the simplest case: a GET operation returning a primitive type.
   * The public function should be async, await the send function, and
   * return the deserialized result. This verifies the basic composition
   * pattern that all standard operations follow.
   */
  it("should render a basic async GET operation", async () => {
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
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the listItems operation.
       */
      export interface ListItemsOptionalParams extends OperationOptions {}

      export function _listItemsSend(
        context: Client,
        options: ListItemsOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        return context.path("/").get({ ...operationOptionsToRequestParameters(options), headers: { accept: "application/json", ...options.requestOptions?.headers } });
      }

      export async function _listItemsDeserialize(
        result: PathUncheckedResponse,
      ): Promise<(string)[]> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return result.body;
      }

      export async function listItems(
        context: Client,
        options: ListItemsOptionalParams = { requestOptions: {} },
      ): Promise<(string)[]> {
        const result = await _listItemsSend(context, options);
        return _listItemsDeserialize(result);
      }
    `);
  });

  /**
   * Tests a POST operation with a model body parameter. The public function
   * must forward the body argument to the send function. This verifies that
   * required parameters are correctly passed through and that model types
   * trigger serializer/deserializer references.
   */
  it("should render POST operation with model body", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Item {
          name: string;
          value: int32;
        }

        @post op ${t.op("createItem")}(@body body: Item): Item;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const itemModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Item",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={itemModel} />
        {"\n\n"}
        <JsonSerializer model={itemModel} />
        {"\n\n"}
        <JsonDeserializer model={itemModel} />
        {"\n\n"}
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * model interface Item
       */
      export interface Item {
        name: string;
        value: number;
      }

      export function itemSerializer(item: Item): any {
        return {
          name: item["name"],
          value: item["value"],
        };
      }

      export function itemDeserializer(item: any): Item {
        return {
          name: item["name"],
          value: item["value"],
        };
      }

      /**
       * Optional parameters for the createItem operation.
       */
      export interface CreateItemOptionalParams extends OperationOptions {}

      export function _createItemSend(
        context: Client,
        body: Item,
        options: CreateItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        return context.path("/").post({ ...operationOptionsToRequestParameters(options), contentType: "application/json", headers: { accept: "application/json", ...options.requestOptions?.headers }, body: itemSerializer(body) });
      }

      export async function _createItemDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Item> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return itemDeserializer(result.body);
      }

      export async function createItem(
        context: Client,
        body: Item,
        options: CreateItemOptionalParams = { requestOptions: {} },
      ): Promise<Item> {
        const result = await _createItemSend(context, body, options);
        return _createItemDeserialize(result);
      }
    `);
  });

  /**
   * Tests a DELETE operation returning void (204 No Content). The public
   * function should return void and still call deserialize (which validates
   * the status code even for void responses). This is important because
   * skipping deserialization would lose error detection.
   */
  it("should render void return type for DELETE 204", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @delete @route("items/{id}") op ${t.op("deleteItem")}(@path id: string): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the deleteItem operation.
       */
      export interface DeleteItemOptionalParams extends OperationOptions {}

      export function _deleteItemSend(
        context: Client,
        id: string,
        options: DeleteItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/items/{id}", { "id": id }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).delete({ ...operationOptionsToRequestParameters(options) });
      }

      export async function _deleteItemDeserialize(
        result: PathUncheckedResponse,
      ): Promise<void> {
        const expectedStatuses = ["204"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return;
      }

      export async function deleteItem(
        context: Client,
        id: string,
        options: DeleteItemOptionalParams = { requestOptions: {} },
      ): Promise<void> {
        const result = await _deleteItemSend(context, id, options);
        return _deleteItemDeserialize(result);
      }
    `);
  });

  /**
   * Tests that JSDoc documentation from the TypeSpec operation description
   * is included in the generated public function. Documentation is important
   * for IDE tooltips and API reference generation.
   */
  it("should include JSDoc documentation from operation description", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        /** Retrieves a greeting message. */
        @get op ${t.op("getGreeting")}(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { Client, createRestError, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getGreeting operation.
       */
      export interface GetGreetingOptionalParams extends OperationOptions {}

      export function _getGreetingSend(
        context: Client,
        options: GetGreetingOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        return context.path("/").get({ ...operationOptionsToRequestParameters(options), headers: { accept: "text/plain", ...options.requestOptions?.headers } });
      }

      export async function _getGreetingDeserialize(
        result: PathUncheckedResponse,
      ): Promise<string> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return result.body;
      }

      /**
       * Retrieves a greeting message.
       *
       * @param {Client} context
       * @param {GetGreetingOptionalParams} options
       */
      export async function getGreeting(
        context: Client,
        options: GetGreetingOptionalParams = { requestOptions: {} },
      ): Promise<string> {
        const result = await _getGreetingSend(context, options);
        return _getGreetingDeserialize(result);
      }
    `);
  });

  /**
   * Tests that the public function is referenceable via publicOperationRefkey.
   * This is essential because the classical client component (task 5.1) needs
   * to reference the public function from method implementations, and the
   * operations orchestrator (task 3.5) needs to organize functions by group.
   */
  it("should be referenceable via publicOperationRefkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getItem")}(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
        {"\n\n"}
        {code`type TestRef = typeof ${publicOperationRefkey(method)}`}
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getItem operation.
       */
      export interface GetItemOptionalParams extends OperationOptions {}

      export function _getItemSend(
        context: Client,
        options: GetItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        return context.path("/").get({ ...operationOptionsToRequestParameters(options), headers: { accept: "text/plain", ...options.requestOptions?.headers } });
      }

      export async function _getItemDeserialize(
        result: PathUncheckedResponse,
      ): Promise<string> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return result.body;
      }

      export async function getItem(
        context: Client,
        options: GetItemOptionalParams = { requestOptions: {} },
      ): Promise<string> {
        const result = await _getItemSend(context, options);
        return _getItemDeserialize(result);
      }

      type TestRef = typeof getItem
    `);
  });

  /**
   * Tests that path parameters appear as required function arguments in the
   * public function signature. This verifies that the public function has
   * the same parameter signature as the send function, which is important
   * for argument forwarding to work correctly.
   */
  it("should include path parameters as required arguments", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get @route("users/{userId}/posts/{postId}") op ${t.op("getPost")}(
          @path userId: string,
          @path postId: string,
        ): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getPost operation.
       */
      export interface GetPostOptionalParams extends OperationOptions {}

      export function _getPostSend(
        context: Client,
        userId: string,
        postId: string,
        options: GetPostOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/users/{userId}/posts/{postId}", { "userId": userId, "postId": postId }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).get({ ...operationOptionsToRequestParameters(options), headers: { accept: "text/plain", ...options.requestOptions?.headers } });
      }

      export async function _getPostDeserialize(
        result: PathUncheckedResponse,
      ): Promise<string> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return result.body;
      }

      export async function getPost(
        context: Client,
        userId: string,
        postId: string,
        options: GetPostOptionalParams = { requestOptions: {} },
      ): Promise<string> {
        const result = await _getPostSend(context, userId, postId, options);
        return _getPostDeserialize(result);
      }
    `);
  });

  /**
   * Tests that the public function correctly handles a POST with a required
   * body and a path parameter together. This is a common pattern in REST APIs
   * (e.g., POST /users/{id}/items with a body). Verifies correct argument
   * ordering in the forwarding call: context, path params, body, options.
   */
  it("should forward body and path parameters correctly", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Item {
          name: string;
        }

        @post @route("users/{userId}/items") op ${t.op("createUserItem")}(
          @path userId: string,
          @body body: Item,
        ): Item;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const itemModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Item",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={itemModel} />
        {"\n\n"}
        <JsonSerializer model={itemModel} />
        {"\n\n"}
        <JsonDeserializer model={itemModel} />
        {"\n\n"}
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * model interface Item
       */
      export interface Item {
        name: string;
      }

      export function itemSerializer(item: Item): any {
        return {
          name: item["name"],
        };
      }

      export function itemDeserializer(item: any): Item {
        return {
          name: item["name"],
        };
      }

      /**
       * Optional parameters for the createUserItem operation.
       */
      export interface CreateUserItemOptionalParams extends OperationOptions {}

      export function _createUserItemSend(
        context: Client,
        userId: string,
        body: Item,
        options: CreateUserItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/users/{userId}/items", { "userId": userId }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).post({ ...operationOptionsToRequestParameters(options), contentType: "application/json", headers: { accept: "application/json", ...options.requestOptions?.headers }, body: itemSerializer(body) });
      }

      export async function _createUserItemDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Item> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return itemDeserializer(result.body);
      }

      export async function createUserItem(
        context: Client,
        userId: string,
        body: Item,
        options: CreateUserItemOptionalParams = { requestOptions: {} },
      ): Promise<Item> {
        const result = await _createUserItemSend(context, userId, body, options);
        return _createUserItemDeserialize(result);
      }
    `);
  });

  /**
   * Tests that a GET operation with only optional query parameters (no required
   * params beyond context) correctly renders with just context and options in
   * the function signature. This is the minimal parameter case for operations
   * that only have optional filtering/pagination parameters.
   */
  it("should handle operation with only optional parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("search")}(@query query?: string, @query limit?: int32): string[];
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the search operation.
       */
      export interface SearchOptionalParams extends OperationOptions {
        query?: string;
        limit?: number;
      }

      export function _searchSend(
        context: Client,
        options: SearchOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/{?query,limit}", { "query": options?.query, "limit": options?.limit }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).get({ ...operationOptionsToRequestParameters(options), headers: { accept: "application/json", ...options.requestOptions?.headers } });
      }

      export async function _searchDeserialize(
        result: PathUncheckedResponse,
      ): Promise<(string)[]> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return result.body;
      }

      export async function search(
        context: Client,
        options: SearchOptionalParams = { requestOptions: {} },
      ): Promise<(string)[]> {
        const result = await _searchSend(context, options);
        return _searchDeserialize(result);
      }
    `);
  });

  describe("User model with response headers", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;
    let method: SdkServiceMethod<SdkHttpOperation>;
    let userModel: (typeof sdkContext.sdkPackage.models)[number];

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model User {
            name: string;
          }

          @get op ${t.op("getUser")}(): User & {@header requestId: string};
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      method = getFirstMethod(sdkContext);
      userModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "User",
      )!;
    });

    /**
     * Tests that when `include-headers-in-response` is enabled and the operation
     * has both a model body and response headers, the public function:
     * 1. Returns an intersection type of the model and header types.
     * 2. Calls both `_xxxDeserializeHeaders` and `_xxxDeserialize`.
     * 3. Spreads the results to merge headers into the response object.
     *
     * This matches the legacy emitter's behavior where consumers receive
     * a single object containing both body and header properties.
     */
    it("should merge response headers into return type when include-headers-in-response is enabled", async () => {
      const template = (
        <SdkTestFile
          sdkContext={sdkContext}
          externals={[httpRuntimeLib]}
          emitterOptions={{ includeHeadersInResponse: true }}
        >
          <ModelInterface model={userModel} />
          {"\n\n"}
          <JsonDeserializer model={userModel} />
          {"\n\n"}
          <OperationOptionsDeclaration method={method} />
          {"\n\n"}
          <SendOperation method={method} />
          {"\n\n"}
          <DeserializeHeaders method={method} />
          {"\n\n"}
          <DeserializeOperation method={method} />
          {"\n\n"}
          <PublicOperation method={method} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import { type Client, createRestError, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

        /**
         * model interface User
         */
        export interface User {
          name: string;
        }

        export function userDeserializer(item: any): User {
          return {
            name: item["name"],
          };
        }

        /**
         * Optional parameters for the getUser operation.
         */
        export interface GetUserOptionalParams extends OperationOptions {}

        export function _getUserSend(
          context: Client,
          options: GetUserOptionalParams = { requestOptions: {} },
        ): StreamableMethod {
          return context.path("/").get({ ...operationOptionsToRequestParameters(options), headers: { accept: "application/json", ...options.requestOptions?.headers } });
        }

        export function _getUserDeserializeHeaders(
          result: PathUncheckedResponse,
        ): { requestId: string } {
          return { requestId: result.headers["request-id"] };
        }

        export async function _getUserDeserialize(
          result: PathUncheckedResponse,
        ): Promise<User> {
          const expectedStatuses = ["200"];
          if (!expectedStatuses.includes(result.status)) {
            throw createRestError(result);
          }

          return userDeserializer(result.body);
        }

        export async function getUser(
          context: Client,
          options: GetUserOptionalParams = { requestOptions: {} },
        ): Promise<User & { requestId: string }> {
          const result = await _getUserSend(context, options);
          const headers = _getUserDeserializeHeaders(result);
          const payload = await _getUserDeserialize(result);
          return { ...payload, ...headers };
        }
      `);
    });

    /**
     * Tests that without `include-headers-in-response` enabled, response headers
     * do NOT affect the public operation function, even when headers exist in
     * the TypeSpec definition. This verifies the feature flag works correctly
     * and the default behavior is preserved (no header merging).
     */
    it("should NOT merge headers when include-headers-in-response is disabled", async () => {
      const template = (
        <SdkTestFile
          sdkContext={sdkContext}
          externals={[httpRuntimeLib]}
          emitterOptions={{ includeHeadersInResponse: false }}
        >
          <ModelInterface model={userModel} />
          {"\n\n"}
          <JsonDeserializer model={userModel} />
          {"\n\n"}
          <OperationOptionsDeclaration method={method} />
          {"\n\n"}
          <SendOperation method={method} />
          {"\n\n"}
          <DeserializeOperation method={method} />
          {"\n\n"}
          <PublicOperation method={method} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import { type Client, createRestError, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

        /**
         * model interface User
         */
        export interface User {
          name: string;
        }

        export function userDeserializer(item: any): User {
          return {
            name: item["name"],
          };
        }

        /**
         * Optional parameters for the getUser operation.
         */
        export interface GetUserOptionalParams extends OperationOptions {}

        export function _getUserSend(
          context: Client,
          options: GetUserOptionalParams = { requestOptions: {} },
        ): StreamableMethod {
          return context.path("/").get({ ...operationOptionsToRequestParameters(options), headers: { accept: "application/json", ...options.requestOptions?.headers } });
        }

        export async function _getUserDeserialize(
          result: PathUncheckedResponse,
        ): Promise<User> {
          const expectedStatuses = ["200"];
          if (!expectedStatuses.includes(result.status)) {
            throw createRestError(result);
          }

          return userDeserializer(result.body);
        }

        export async function getUser(
          context: Client,
          options: GetUserOptionalParams = { requestOptions: {} },
        ): Promise<User> {
          const result = await _getUserSend(context, options);
          return _getUserDeserialize(result);
        }
      `);
    });
  });

  /**
   * Tests that when `include-headers-in-response` is enabled and the operation
   * has only headers (void body), the public function:
   * 1. Returns the header object type (not void).
   * 2. Calls `_xxxDeserialize` for status validation (to detect errors).
   * 3. Returns the spread header deserializer result.
   *
   * This is important because header-only responses (like a DELETE that
   * returns x-request-id) should still provide headers to the consumer.
   */
  it("should return headers object for void-body response with headers", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @delete op ${t.op("deleteUser")}(): {
          @header("x-request-id") requestId: string;
        };
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeHeaders method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, createRestError, type OperationOptions, operationOptionsToRequestParameters, type PathUncheckedResponse, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the deleteUser operation.
       */
      export interface DeleteUserOptionalParams extends OperationOptions {}

      export function _deleteUserSend(
        context: Client,
        options: DeleteUserOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        return context.path("/").delete({ ...operationOptionsToRequestParameters(options) });
      }

      export function _deleteUserDeserializeHeaders(
        result: PathUncheckedResponse,
      ): { requestId: string } {
        return { requestId: result.headers["x-request-id"] };
      }

      export async function _deleteUserDeserialize(
        result: PathUncheckedResponse,
      ): Promise<void> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return;
      }

      export async function deleteUser(
        context: Client,
        options: DeleteUserOptionalParams = { requestOptions: {} },
      ): Promise<{ requestId: string }> {
        const result = await _deleteUserSend(context, options);
        await _deleteUserDeserialize(result);
        return { ..._deleteUserDeserializeHeaders(result) };
      }
    `);
  });

  /**
   * Tests that the public operation function correctly uses "optionalParams"
   * when @@override creates a parameter named "options". Verifies that
   * the call delegation forwards the correct argument names to the send function.
   */
  it("should use optionalParams when @@override parameter is named options", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{
  title: "Override Service"
})
namespace Override;

@route("/group")
@get
op groupOriginal(
  @query param1: string,
  @query param2: string,
): void;

model GroupParametersOptions {
  @query param1: string;
  @query param2: string;
}

op groupCustomized(
  options: GroupParametersOptions,
): void;

@@override(Override.groupOriginal, Override.groupCustomized);
    `);

    const sdkContext = await createSdkContextForTest(program);
    const method = sdkContext.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    const rendered = renderToString(template);
    // Verify the public function uses optionalParams
    expect(rendered).toContain("optionalParams");
    // Verify it forwards options and optionalParams correctly
    expect(rendered).toContain("_groupOriginalSend(context, options, optionalParams)");
    expect(rendered).toContain("_groupOriginalDeserialize(result)");
  });

  /**
   * Tests that constant-type parameters are excluded from the public operation
   * function signature and the call to the send function. This ensures that
   * the public API surface does not expose fixed values as arguments, matching
   * the legacy emitter behavior (SA26).
   */
  it("should exclude constant params from public function and send call", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model StreamingOpts {
          stream: true;
        }
        @post op ${t.op("createStreaming")}(...StreamingOpts): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
        {"\n\n"}
        <PublicOperation method={method} />
      </SdkTestFile>
    );

    const rendered = renderToString(template);
    // Constant param 'stream' should NOT appear in public function signature
    expect(rendered).not.toMatch(/createStreaming\(\s*context: Client,\s*stream: true/);
    // Call to send function should only pass context and options
    expect(rendered).toContain("_createStreamingSend(context, options)");
  });

  /**
   * Tests that an LRO (Long Running Operation) public function includes
   * polling status codes (200, 201, 202) in the expected statuses array
   * and passes apiVersion to the getLongRunningPoller options.
   *
   * The legacy emitter adds polling status codes for non-GET LRO operations:
   * - 200 (completed), 202 (accepted/in-progress) for all
   * - 201 (created) for non-DELETE operations
   *
   * Without these extra codes, the poller rejects valid polling responses.
   * The apiVersion is needed so polling requests carry the correct
   * api-version query parameter. (SA-C34)
   */
  it("should include LRO polling status codes and apiVersion in poller options", async () => {
    const runner = await RawTester.createInstance();
    const { program } = await runner.compile(`
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.TestLro;

enum Versions { v2024_01_01: "2024-01-01" }

model TestResource is TrackedResource<TestResourceProperties> {
  @key("testResourceName") @path @segment("testResources") name: string;
}
model TestResourceProperties { state?: string; }

@armResourceOperations
interface TestResources {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<TestResource>;
}
    `);

    const sdkContext = await createSdkContextForTest(program);
    // ARM clients have nested operation groups — find the LRO method
    const allMethods = sdkContext.sdkPackage.clients.flatMap((c: any) =>
      [...c.methods, ...c.children.flatMap((child: any) => child.methods)]
    );
    const lroMethod = allMethods.find((m: any) => m.kind === "lro");
    expect(lroMethod).toBeDefined();

    // Use custom Output with SourceDirectory to allow PollingHelpersFile
    // (which has its own SourceFile) alongside the operation code.
    const template = (
      <Output
        program={sdkContext.emitContext.program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib, azureCoreLroLib]}
      >
        <FlavorProvider flavor="azure">
          <EmitterOptionsProvider options={{}}>
            <SdkContextProvider sdkContext={sdkContext}>
              <SourceDirectory path="src">
                <PollingHelpersFile />
                <SourceFile path="operations.ts">
                  <OperationOptionsDeclaration method={lroMethod} />
                  {"\n\n"}
                  <SendOperation method={lroMethod} />
                  {"\n\n"}
                  <DeserializeOperation method={lroMethod} />
                  {"\n\n"}
                  <PublicOperation method={lroMethod} />
                </SourceFile>
              </SourceDirectory>
            </SdkContextProvider>
          </EmitterOptionsProvider>
        </FlavorProvider>
      </Output>
    );

    const rendered = renderToString(template);
    // LRO PUT operation should include polling codes: 200, 201, 202
    // The base status code from the PUT response is 200,201. With polling codes added,
    // the array should also contain "202".
    expect(rendered).toContain('"202"');
    // Verify apiVersion is present in poller options
    expect(rendered).toContain('apiVersion: context.apiVersion');
  });
});
