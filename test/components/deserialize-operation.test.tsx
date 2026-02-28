/**
 * Test suite for the DeserializeOperation component.
 *
 * DeserializeOperation generates `_xxxDeserialize` functions that process HTTP
 * responses for each operation. These functions validate response status codes,
 * throw errors for unexpected statuses, and deserialize response bodies.
 *
 * What is tested:
 * - Basic GET returning void generates correct deserialize function with empty return.
 * - GET returning a model deserializes the body via the model deserializer.
 * - GET returning a primitive returns result.body directly.
 * - Multiple status codes are listed in the expectedStatuses array.
 * - Deserialize function is referenceable via deserializeOperationRefkey.
 * - GET returning an array of models maps each element through the deserializer.
 * - Nullable model response wraps deserialization with null check.
 * - createRestError is imported and used for unexpected status codes.
 * - Error handling throws createRestError directly (no error body deserialization).
 * - Error handling throws directly even with exception headers and include-headers-in-response.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { d, renderToString } from "@alloy-js/core/testing";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import type {
  SdkArrayType,
  SdkContext,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { DeserializeOperation } from "../../src/components/deserialize-operation.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { JsonDeserializer } from "../../src/components/serialization/json-deserializer.js";
import { JsonArrayDeserializer } from "../../src/components/serialization/json-array-record-helpers.js";
import { deserializeOperationRefkey } from "../../src/utils/refkeys.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import {
  RawTester,
  Tester,
  TesterWithService,
  createSdkContextForTest,
} from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { EmitterOptionsProvider } from "../../src/context/emitter-options-context.js";

/**
 * Helper to extract the first method from the first client in an SDK context.
 */
function getFirstMethod(sdkContext: {
  sdkPackage: {
    clients: Array<{ methods: SdkServiceMethod<SdkHttpOperation>[] }>;
  };
}): SdkServiceMethod<SdkHttpOperation> {
  return sdkContext.sdkPackage.clients[0].methods[0];
}

describe("DeserializeOperation", () => {
  /**
   * Tests the simplest case: a DELETE operation returning void (204 No Content).
   * The deserialize function should check the status code and return without
   * attempting to deserialize the body. This is critical because calling
   * deserializers on an empty response body would cause runtime errors.
   */
  it("should render a void deserialize function", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @delete op ${t.op("deleteItem")}(): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export async function _deleteItemDeserialize(
        result: PathUncheckedResponse,
      ): Promise<void> {
        const expectedStatuses = ["204"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return;
      }
    `);
  });

  /**
   * Tests that a GET operation returning a model type correctly deserializes
   * the response body via the model's deserializer function. Model deserialization
   * is the most common case — without it, consumers would get raw JSON objects
   * instead of typed SDK model instances.
   */
  it("should deserialize a model response body", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Item {
          name: string;
          value: int32;
        }

        @get op ${t.op("getItem")}(): Item;
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
        <JsonDeserializer model={itemModel} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface Item
       */
      export interface Item {
        name: string;
        value: number;
      }

      export function itemDeserializer(item: any): Item {
        return {
          name: item["name"],
          value: item["value"],
        };
      }

      export async function _getItemDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Item> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return itemDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests for GET operations returning a primitive string type.
   * Validates both the correct deserialization behavior (returning result.body
   * directly) and refkey resolution for this simple return type.
   */
  describe("GET returning primitive string", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let method: SdkServiceMethod<SdkHttpOperation>;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          @get op ${t.op("getName")}(): string;
        `,
      );
      sdkContext = await createSdkContextForTest(program);
      method = getFirstMethod(sdkContext);
    });

    /**
     * Tests that a GET operation returning a primitive type (string) directly
     * returns result.body without calling any deserializer. Primitive types
     * don't need transformation — the HTTP runtime already parses the JSON
     * response into the correct JavaScript type.
     */
    it("should return result.body for primitive response types", async () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <DeserializeOperation method={method} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

        export async function _getNameDeserialize(
          result: PathUncheckedResponse,
        ): Promise<string> {
          const expectedStatuses = ["200"];
          if (!expectedStatuses.includes(result.status)) {
            throw createRestError(result);
          }

          return result.body;
        }
      `);
    });

    /**
     * Tests that the deserialize function is referenceable via deserializeOperationRefkey.
     * This is essential because the public operation function (task 3.4)
     * needs to call the deserialize function from other components/files.
     */
    it("should be referenceable via deserializeOperationRefkey", async () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <DeserializeOperation method={method} />
          {"\n\n"}
          {code`type TestRef = typeof ${deserializeOperationRefkey(method)}`}
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

        export async function _getNameDeserialize(
          result: PathUncheckedResponse,
        ): Promise<string> {
          const expectedStatuses = ["200"];
          if (!expectedStatuses.includes(result.status)) {
            throw createRestError(result);
          }

          return result.body;
        }

        type TestRef = typeof _getNameDeserialize
      `);
    });
  });

  /**
   * Tests that operations with multiple response status codes include all
   * codes in the expectedStatuses array. This is important for operations
   * that can return different status codes for success (e.g., 200 for
   * existing resource, 201 for newly created resource).
   */
  it("should handle multiple status codes", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Item {
          name: string;
        }

        @put op ${t.op("createOrReplace")}(@body body: Item): {
          @statusCode statusCode: 200;
          @body body: Item;
        } | {
          @statusCode statusCode: 201;
          @body body: Item;
        };
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
        <JsonDeserializer model={itemModel} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface Item
       */
      export interface Item {
        name: string;
      }

      export function itemDeserializer(item: any): Item {
        return {
          name: item["name"],
        };
      }

      export async function _createOrReplaceDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Item> {
        const expectedStatuses = ["200", "201"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return itemDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that an array of models is deserialized by mapping each element
   * through the model's deserializer function. Array responses are common
   * in list operations — each element in the array needs individual
   * deserialization to ensure dates, nested models, etc. are transformed.
   */
  it("should deserialize array of model response", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Item {
          name: string;
          createdAt: utcDateTime;
        }

        @get op ${t.op("listItems")}(): Item[];
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const itemModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Item",
    )!;
    const itemArrayType = method.response.type as SdkArrayType;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={itemModel} />
        {"\n\n"}
        <JsonDeserializer model={itemModel} />
        {"\n\n"}
        <JsonArrayDeserializer type={itemArrayType} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface Item
       */
      export interface Item {
        name: string;
        createdAt: Date;
      }

      export function itemDeserializer(item: any): Item {
        return {
          name: item["name"],
          createdAt: new Date(item["createdAt"]),
        };
      }

      export function itemArrayDeserializer(result: Array<Item>): any[] {
        return result.map((item) => { return itemDeserializer(item); });
      }

      export async function _listItemsDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Item[]> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return itemArrayDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that a POST operation with a model response correctly deserializes
   * the response body and includes the appropriate 200 status code. This
   * validates the common create/action pattern where the server returns
   * the created resource.
   */
  it("should handle POST returning a model", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model User {
          id: string;
          email: string;
        }

        @post op ${t.op("createUser")}(@body body: User): User;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const userModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "User",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={userModel} />
        {"\n\n"}
        <JsonDeserializer model={userModel} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface User
       */
      export interface User {
        id: string;
        email: string;
      }

      export function userDeserializer(item: any): User {
        return {
          id: item["id"],
          email: item["email"],
        };
      }

      export async function _createUserDeserialize(
        result: PathUncheckedResponse,
      ): Promise<User> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return userDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that an operation with a 200 + 204 response (optional body) correctly
   * lists both status codes. This pattern is used when an operation may return
   * content (200) or no content (204), which is common in conditional GET requests
   * or resource existence checks.
   */
  it("should handle 200 and 204 status codes together", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("tryGetValue")}(): string | {
          @statusCode statusCode: 204;
        };
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export async function _tryGetValueDeserialize(
        result: PathUncheckedResponse,
      ): Promise<string> {
        const expectedStatuses = ["200", "204"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return result.body;
      }
    `);
  });

  /**
   * Tests that when an operation has an @error model, the error handling path
   * deserializes the error response body into error.details. This is critical
   * because without error body deserialization, consumers cannot access
   * structured error information (error codes, messages, etc.) from the
   * RestError's details property.
   */
  /**
   * Tests that when an @error model exists, the deserialize function still throws
   * createRestError directly WITHOUT deserializing the error body. The legacy emitter
   * pattern does not attach error.details with a deserialized body — it simply throws
   * createRestError(result). This ensures consistency with the legacy emitter's error
   * handling behavior, where error bodies are not deserialized into structured objects.
   */
  it("should throw createRestError directly even with @error model", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @error
        model ApiError {
          code: string;
          message: string;
        }

        model Widget {
          id: string;
          name: string;
        }

        @get op ${t.op("getWidget")}(): Widget | ApiError;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const widgetModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Widget",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={widgetModel} />
        {"\n\n"}
        <JsonDeserializer model={widgetModel} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface Widget
       */
      export interface Widget {
        id: string;
        name: string;
      }

      export function widgetDeserializer(item: any): Widget {
        return {
          id: item["id"],
          name: item["name"],
        };
      }

      export async function _getWidgetDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Widget> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return widgetDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that even when an @error model has exception headers and
   * include-headers-in-response is enabled, the deserialize function still
   * throws createRestError directly without merging exception headers.
   * The legacy emitter pattern does not attach error.details at all.
   */
  it("should throw createRestError directly even with exception headers enabled", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @error
        model ApiError {
          code: string;
          message: string;
          @header("x-ms-error-code") errorCode: string;
        }

        model Widget {
          id: string;
          name: string;
        }

        @get op ${t.op("getWidget")}(): Widget | ApiError;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const widgetModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Widget",
    )!;

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <ModelInterface model={widgetModel} />
        {"\n\n"}
        <JsonDeserializer model={widgetModel} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface Widget
       */
      export interface Widget {
        id: string;
        name: string;
      }

      export function widgetDeserializer(item: any): Widget {
        return {
          id: item["id"],
          name: item["name"],
        };
      }

      export async function _getWidgetDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Widget> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return widgetDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that a paging operation's deserialize function returns the wrapper
   * collection model type (e.g., ItemList) rather than the unwrapped array
   * element type (e.g., Item[]). This is critical for SA-C21 compliance:
   * the paging infrastructure (buildPagedAsyncIterator) expects the deserialize
   * function to return the full wrapper model so it can extract items via
   * the itemName property (e.g., "items") and follow the nextLink for
   * subsequent pages. Without the wrapper type, paging metadata like nextLink
   * would be lost during deserialization.
   */
  it("should return wrapper collection type for paging operations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        using Azure.ClientGenerator.Core;

        model ItemList {
          @pageItems
          items: Item[];
        }

        model Item {
          name: string;
          value: int32;
        }

        @list @post op ${t.op("listItems")}(): ItemList;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const itemModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Item",
    )!;
    const itemListModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "ItemList",
    )!;
    const itemsArrayType = itemListModel.properties.find(
      (p) => p.name === "items",
    )!.type as SdkArrayType;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={itemModel} />
        {"\n\n"}
        <ModelInterface model={itemListModel} />
        {"\n\n"}
        <JsonDeserializer model={itemModel} />
        {"\n\n"}
        <JsonDeserializer model={itemListModel} />
        {"\n\n"}
        <JsonArrayDeserializer type={itemsArrayType} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface Item
       */
      export interface Item {
        name: string;
        value: number;
      }

      /**
       * model interface ItemList
       */
      export interface ItemList {
        items: Item[];
      }

      export function itemDeserializer(item: any): Item {
        return {
          name: item["name"],
          value: item["value"],
        };
      }

      export function itemListDeserializer(item: any): ItemList {
        return {
          items: itemArrayDeserializer(item["items"]),
        };
      }

      export function itemArrayDeserializer(result: Array<Item>): any[] {
        return result.map((item) => { return itemDeserializer(item); });
      }

      export async function _listItemsDeserialize(
        result: PathUncheckedResponse,
      ): Promise<ItemList> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return itemListDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that when exception headers exist but there is no error body model,
   * the exception headers are directly assigned to error.details instead of
   * being merged with the body. This handles the case where the error model
   * only has header properties and no body properties.
   */
  /**
   * Tests that even with exception headers only (no error body), the deserialize
   * function throws createRestError directly. The legacy emitter does not assign
   * exception headers to error.details — it simply throws createRestError(result).
   */
  it("should throw createRestError directly even with exception headers only", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @error
        model ApiError {
          @header("x-ms-error-code") errorCode: string;
        }

        model Widget {
          id: string;
        }

        @get op ${t.op("getWidget")}(): Widget | ApiError;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const widgetModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Widget",
    )!;

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <ModelInterface model={widgetModel} />
        {"\n\n"}
        <JsonDeserializer model={widgetModel} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      /**
       * model interface Widget
       */
      export interface Widget {
        id: string;
      }

      export function widgetDeserializer(item: any): Widget {
        return {
          id: item["id"],
        };
      }

      export async function _getWidgetDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Widget> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return widgetDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that when an @error model has XML serialization decorators and the
   * exception response content type is XML-only, the deserialize function still
   * throws createRestError directly without using any XML deserializer.
   * The legacy emitter does not deserialize error bodies regardless of format.
   */
  it("should throw createRestError directly for XML-only error response", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(
      t.code`
        using TypeSpec.Xml;

        @service(#{title: "Test"})
        namespace Test;

        @error
        model StorageError {
          @Xml.name("Code") code?: string;
          @Xml.name("Message") message?: string;
        }

        model Widget {
          id: string;
          name: string;
        }

        @route("/widgets/{id}")
        @get op ${t.op("getWidget")}(@path id: string): Widget | {
          @header contentType: "application/xml";
          @body body: StorageError;
          @statusCode statusCode: 400;
        };
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <EmitterOptionsProvider options={{}}>
            <SdkContextProvider sdkContext={sdkContext}>
              <SourceFile path="test.ts">
                <DeserializeOperation method={method} />
              </SourceFile>
            </SdkContextProvider>
          </EmitterOptionsProvider>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    // Should NOT use any error deserializer — just throw directly
    expect(result).not.toContain("storageErrorXmlDeserializer");
    expect(result).not.toContain("storageErrorDeserializer");
    expect(result).not.toContain("error.details");
    expect(result).toContain("throw createRestError(result)");
  });

  /**
   * Tests that when an @error model has XML serialization decorators and the
   * exception response supports both JSON and XML content types, the deserialize
   * function still throws createRestError directly without any content-type detection.
   * The legacy emitter does not deserialize error bodies regardless of format.
   */
  it("should throw createRestError directly for dual-format error response", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(
      t.code`
        using TypeSpec.Xml;

        @service(#{title: "Test"})
        namespace Test;

        @error
        model ApiError {
          @Xml.name("Code") code?: string;
          @Xml.name("Message") message?: string;
        }

        model Document {
          id: string;
          content: string;
        }

        @route("/documents/{id}")
        @get op ${t.op("getDocument")}(@path id: string): {
          @header contentType: "application/json" | "application/xml";
          @body body: Document;
        } | {
          @header contentType: "application/json" | "application/xml";
          @body body: ApiError;
          @statusCode statusCode: 400;
        };
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <EmitterOptionsProvider options={{}}>
            <SdkContextProvider sdkContext={sdkContext}>
              <SourceFile path="test.ts">
                <DeserializeOperation method={method} />
              </SourceFile>
            </SdkContextProvider>
          </EmitterOptionsProvider>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);
    // Should NOT include content-type check or any deserializer references
    expect(result).not.toContain('result.headers?.["content-type"]');
    expect(result).not.toContain("isXmlContentType");
    expect(result).not.toContain("apiErrorXmlDeserializer");
    expect(result).not.toContain("apiErrorDeserializer");
    expect(result).not.toContain("error.details");
    expect(result).toContain("throw createRestError(result)");
  });

  /**
   * Tests that Azure flavor LRO operations get extra polling status codes (200, 201, 202)
   * added to the expectedStatuses array. Azure SDK LRO operations use a poller that polls
   * via GET on the same path, and these intermediate responses can return 200/201/202.
   * Without these extra codes, the deserialize function would throw RestError for valid
   * polling responses, breaking the LRO flow.
   */
  it("should include extra LRO status codes for Azure flavor", async () => {
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
namespace Microsoft.TestLroDeserAzure;

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
    const allMethods = sdkContext.sdkPackage.clients.flatMap((c: any) => [
      ...c.methods,
      ...c.children.flatMap((child: any) => child.methods),
    ]);
    const lroMethod = allMethods.find((m: any) => m.kind === "lro");
    expect(lroMethod).toBeDefined();

    const template = (
      <Output
        program={sdkContext.emitContext.program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="azure">
          <EmitterOptionsProvider options={{}}>
            <SdkContextProvider sdkContext={sdkContext}>
              <SourceFile path="test.ts">
                <DeserializeOperation method={lroMethod} />
              </SourceFile>
            </SdkContextProvider>
          </EmitterOptionsProvider>
        </FlavorProvider>
      </Output>
    );

    const rendered = renderToString(template);
    // Azure LRO operations should get extra polling status codes
    expect(rendered).toContain('"200"');
    expect(rendered).toContain('"201"');
    expect(rendered).toContain('"202"');
  });

  /**
   * Tests that core flavor LRO operations do NOT get extra polling status codes.
   * Core flavor treats LRO operations as regular async functions without a poller,
   * so only the status codes explicitly defined in the TypeSpec spec should appear.
   * Adding unnecessary codes would mask real server errors by accepting unexpected
   * responses as valid.
   */
  it("should NOT include extra LRO status codes for core flavor", async () => {
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
namespace Microsoft.TestLroDeserCore;

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
    const allMethods = sdkContext.sdkPackage.clients.flatMap((c: any) => [
      ...c.methods,
      ...c.children.flatMap((child: any) => child.methods),
    ]);
    const lroMethod = allMethods.find((m: any) => m.kind === "lro");
    expect(lroMethod).toBeDefined();

    const template = (
      <Output
        program={sdkContext.emitContext.program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <EmitterOptionsProvider options={{}}>
            <SdkContextProvider sdkContext={sdkContext}>
              <SourceFile path="test.ts">
                <DeserializeOperation method={lroMethod} />
              </SourceFile>
            </SdkContextProvider>
          </EmitterOptionsProvider>
        </FlavorProvider>
      </Output>
    );

    const rendered = renderToString(template);
    // Core flavor should NOT add extra polling status codes
    // The only status code should be what the TypeSpec defines (200 for PUT)
    expect(rendered).not.toContain('"202"');
  });
});
