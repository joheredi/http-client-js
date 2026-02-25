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
 * - Error body deserialization: @error model body is deserialized into error.details.
 * - Exception header merging: headers are merged into error.details when enabled.
 * - Exception headers only: assigned directly to error.details when no error body.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import type {
  SdkContext,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { DeserializeOperation } from "../../src/components/deserialize-operation.js";
import { DeserializeExceptionHeaders } from "../../src/components/deserialize-headers.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { JsonDeserializer } from "../../src/components/serialization/json-deserializer.js";
import { deserializeOperationRefkey } from "../../src/utils/refkeys.js";
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
    const itemModel = sdkContext.sdkPackage.models.find((m) => m.name === "Item")!;

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
    const itemModel = sdkContext.sdkPackage.models.find((m) => m.name === "Item")!;

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
    const itemModel = sdkContext.sdkPackage.models.find((m) => m.name === "Item")!;

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

      export async function _listItemsDeserialize(
        result: PathUncheckedResponse,
      ): Promise<(Item)[]> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          throw createRestError(result);
        }

        return result.body.map((p: any) => { return itemDeserializer(p); });
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
    const userModel = sdkContext.sdkPackage.models.find((m) => m.name === "User")!;

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
  it("should deserialize error body when @error model exists", async () => {
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
    const widgetModel = sdkContext.sdkPackage.models.find((m) => m.name === "Widget")!;
    const errorModel = sdkContext.sdkPackage.models.find((m) => m.name === "ApiError")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={widgetModel} />
        {"\n\n"}
        <ModelInterface model={errorModel} />
        {"\n\n"}
        <JsonDeserializer model={widgetModel} />
        {"\n\n"}
        <JsonDeserializer model={errorModel} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export interface Widget {
        id: string;
        name: string;
      }

      export interface ApiError {
        code: string;
        message: string;
      }

      export function widgetDeserializer(item: any): Widget {
        return {
          id: item["id"],
          name: item["name"],
        };
      }

      export function apiErrorDeserializer(item: any): ApiError {
        return {
          code: item["code"],
          message: item["message"],
        };
      }

      export async function _getWidgetDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Widget> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          const error = createRestError(result);
          error.details = apiErrorDeserializer(result.body);
          throw error;
        }

        return widgetDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that exception headers are merged into error.details when both
   * an @error model body and exception headers exist and include-headers-in-response
   * is enabled. The legacy emitter pattern spreads the deserialized body and
   * exception headers together: error.details = {...body, ...headers}. This ensures
   * consumers get both the structured error data and the error headers in one place.
   */
  it("should merge exception headers into error.details when enabled", async () => {
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
    const widgetModel = sdkContext.sdkPackage.models.find((m) => m.name === "Widget")!;
    const errorModel = sdkContext.sdkPackage.models.find((m) => m.name === "ApiError")!;

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <ModelInterface model={widgetModel} />
        {"\n\n"}
        <ModelInterface model={errorModel} />
        {"\n\n"}
        <JsonDeserializer model={widgetModel} />
        {"\n\n"}
        <JsonDeserializer model={errorModel} />
        {"\n\n"}
        <DeserializeExceptionHeaders method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export interface Widget {
        id: string;
        name: string;
      }

      export interface ApiError {
        code: string;
        message: string;
        errorCode: string;
      }

      export function widgetDeserializer(item: any): Widget {
        return {
          id: item["id"],
          name: item["name"],
        };
      }

      export function apiErrorDeserializer(item: any): ApiError {
        return {
          code: item["code"],
          message: item["message"],
          errorCode: item["errorCode"],
        };
      }

      export function _getWidgetDeserializeExceptionHeaders(
        result: PathUncheckedResponse,
      ): { errorCode: string } {
        return { errorCode: result.headers["x-ms-error-code"] };
      }

      export async function _getWidgetDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Widget> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          const error = createRestError(result);
          error.details = apiErrorDeserializer(result.body);
          error.details = { ...(error.details as Record<string, unknown>), ..._getWidgetDeserializeExceptionHeaders(result) };
          throw error;
        }

        return widgetDeserializer(result.body);
      }
    `);
  });

  /**
   * Tests that when exception headers exist but there is no error body model,
   * the exception headers are directly assigned to error.details instead of
   * being merged with the body. This handles the case where the error model
   * only has header properties and no body properties.
   */
  it("should assign exception headers directly when no error body", async () => {
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
    const widgetModel = sdkContext.sdkPackage.models.find((m) => m.name === "Widget")!;

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
        <DeserializeExceptionHeaders method={method} />
        {"\n\n"}
        <DeserializeOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { createRestError, type PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export interface Widget {
        id: string;
      }

      export function widgetDeserializer(item: any): Widget {
        return {
          id: item["id"],
        };
      }

      export function _getWidgetDeserializeExceptionHeaders(
        result: PathUncheckedResponse,
      ): { errorCode: string } {
        return { errorCode: result.headers["x-ms-error-code"] };
      }

      export async function _getWidgetDeserialize(
        result: PathUncheckedResponse,
      ): Promise<Widget> {
        const expectedStatuses = ["200"];
        if (!expectedStatuses.includes(result.status)) {
          const error = createRestError(result);
          error.details = _getWidgetDeserializeExceptionHeaders(result);
          throw error;
        }

        return widgetDeserializer(result.body);
      }
    `);
  });
});
