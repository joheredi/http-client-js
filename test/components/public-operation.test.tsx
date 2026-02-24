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
import { PublicOperation } from "../../src/components/public-operation.js";
import { SendOperation } from "../../src/components/send-operation.js";
import { DeserializeOperation } from "../../src/components/deserialize-operation.js";
import { OperationOptionsDeclaration } from "../../src/components/operation-options.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { JsonSerializer } from "../../src/components/serialization/json-serializer.js";
import { JsonDeserializer } from "../../src/components/serialization/json-deserializer.js";
import { publicOperationRefkey } from "../../src/utils/refkeys.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

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
});
