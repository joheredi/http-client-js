/**
 * Test suite for the SendOperation component.
 *
 * SendOperation generates `_xxxSend` functions that build HTTP requests for
 * each operation. These functions handle URL template expansion, header assembly,
 * query parameter construction, and request body serialization.
 *
 * What is tested:
 * - Basic GET operation generates correct send function with accept header.
 * - POST operation with body serializes the body via the model serializer.
 * - Path parameters appear as function arguments and in URL template expansion.
 * - Query parameters map to options bag and appear in URL template.
 * - Custom header parameters are included in the headers object.
 * - Content-Type and Accept headers are set correctly.
 * - Optional body parameters get null-check guards.
 * - Send function is referenceable via sendOperationRefkey.
 * - Combined path + query parameters work together.
 * - Spread body parameters produce inline object literals with per-property serialization.
 * - @@override parameter grouping names optionalParams bag correctly and accesses model properties.
 * - getOptionsParamName returns "optionalParams" when a method parameter is named "options".
 * - escapeUriTemplateParamName encodes hyphens, colons, dollar signs, and other special chars.
 * - Query parameter keys are percent-encoded to match URI template variable names.
 */
import "@alloy-js/core/testing";
import { Children, code } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import type {
  SdkContext,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { SendOperation, escapeUriTemplateParamName, isRequiredSignatureParameter, isConstantType, getConstantLiteral } from "../../src/components/send-operation.js";
import { getOptionsParamName } from "../../src/components/send-operation.js";
import { OperationOptionsDeclaration } from "../../src/components/operation-options.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { JsonSerializer } from "../../src/components/serialization/json-serializer.js";
import { SerializationHelpersFile } from "../../src/components/static-helpers/serialization-helpers.js";
import { sendOperationRefkey } from "../../src/utils/refkeys.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { EmitterOptionsProvider } from "../../src/context/emitter-options-context.js";
import { TesterWithService, RawTester, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { renderToString } from "@alloy-js/core/testing";

/**
 * Multi-file test wrapper that renders SerializationHelpersFile and a test
 * SourceFile as siblings under the same Output. This is needed when testing
 * components that reference serialization helper refkeys, since Alloy requires
 * the helper declarations to exist for import resolution.
 */
function MultiFileTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <FlavorProvider flavor="core">
        <EmitterOptionsProvider options={{}}>
          <SdkContextProvider sdkContext={props.sdkContext}>
            <SerializationHelpersFile />
            <SourceFile path="test.ts">{props.children}</SourceFile>
          </SdkContextProvider>
        </EmitterOptionsProvider>
      </FlavorProvider>
    </Output>
  );
}

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

describe("SendOperation", () => {
  describe("basic GET with no parameters", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let method: SdkServiceMethod<SdkHttpOperation>;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          @get op ${t.op("listItems")}(): string[];
        `,
      );
      sdkContext = await createSdkContextForTest(program);
      method = getFirstMethod(sdkContext);
    });

    /**
     * Tests the simplest case: a GET operation with no path parameters and no
     * query parameters. The generated function should use the URI template
     * directly in context.path() without calling expandUrlTemplate. Verifies
     * that the accept header is set based on the response content type.
     */
    it("should render a basic GET send function", async () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <OperationOptionsDeclaration method={method} />
          {"\n\n"}
          <SendOperation method={method} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import { type Client, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

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
      `);
    });

    /**
     * Tests the getOptionsParamName utility function for the standard case.
     * When no method parameter is named "options", returns "options".
     */
    it("should return 'options' when no parameter conflicts", () => {
      expect(getOptionsParamName(method)).toBe("options");
    });
  });

  /**
   * Tests that path parameters appear as required function arguments and
   * are correctly mapped in the expandUrlTemplate call. Path parameters
   * are fundamental — without them, the URL would be wrong and the
   * service call would fail.
   */
  it("should handle path parameters in URL template", async () => {
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
        {"\n\n"}
        <SendOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getItem operation.
       */
      export interface GetItemOptionalParams extends OperationOptions {}

      export function _getItemSend(
        context: Client,
        id: string,
        options: GetItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/items/{id}", { "id": id }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).get({ ...operationOptionsToRequestParameters(options), headers: { accept: "text/plain", ...options.requestOptions?.headers } });
      }
    `);
  });

  /**
   * Tests that optional query parameters are correctly mapped from the
   * options bag and included in the URL template expansion. Query parameters
   * are the most common optional parameters in REST APIs.
   */
  it("should handle query parameters from options", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("listItems")}(@query skip?: int32, @query top?: int32): string[];
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the listItems operation.
       */
      export interface ListItemsOptionalParams extends OperationOptions {
        skip?: number;
        top?: number;
      }

      export function _listItemsSend(
        context: Client,
        options: ListItemsOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/{?skip,top}", { "skip": options?.skip, "top": options?.top }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).get({ ...operationOptionsToRequestParameters(options), headers: { accept: "application/json", ...options.requestOptions?.headers } });
      }
    `);
  });

  /**
   * Tests that POST operations with a required model body correctly serialize
   * the body using the model's serializer function. Body serialization is
   * critical — sending unserialized objects would cause service errors.
   */
  it("should serialize request body for POST operations", async () => {
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
    const itemModel = sdkContext.sdkPackage.models.find((m) => m.name === "Item")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={itemModel} />
        {"\n\n"}
        <JsonSerializer model={itemModel} />
        {"\n\n"}
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

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
    `);
  });

  /**
   * Tests that the send function is referenceable via sendOperationRefkey.
   * This is essential because the public operation function (task 3.4) and
   * the operations orchestrator (task 3.5) need to reference the send function
   * from other components/files.
   */
  it("should be referenceable via sendOperationRefkey", async () => {
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
        {code`type TestRef = typeof ${sendOperationRefkey(method)}`}
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

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

      type TestRef = typeof _getItemSend
    `);
  });

  /**
   * Tests that custom header parameters from the TypeSpec definition are
   * included in the request headers object alongside the accept header.
   * Custom headers are common in REST APIs for things like ETags,
   * conditional requests, and tracing.
   */
  it("should include custom header parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getResource")}(
          @header ifMatch?: string,
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
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getResource operation.
       */
      export interface GetResourceOptionalParams extends OperationOptions {
        ifMatch?: string;
      }

      export function _getResourceSend(
        context: Client,
        options: GetResourceOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        return context.path("/").get({ ...operationOptionsToRequestParameters(options), headers: { accept: "text/plain", "if-match": options?.ifMatch, ...options.requestOptions?.headers } });
      }
    `);
  });

  /**
   * Tests that header parameters with utcDateTime type are encoded to string
   * format in the request headers. HTTP headers are strings, so Date values
   * must be serialized. When TCGC sets `encode: "rfc7231"` on a utcDateTime
   * header parameter (the default for HTTP headers), the value should be
   * encoded with `.toUTCString()` to produce RFC 7231 HTTP-date format.
   *
   * Without this, Date objects would be passed directly as header values,
   * causing runtime errors (headers must be strings) or incorrect formatting.
   */
  it("should encode utcDateTime header parameters with toUTCString", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getResource")}(
          @header("x-date") prop: utcDateTime,
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
      </SdkTestFile>
    );

    const result = renderToString(template);
    // Header value should be encoded with toUTCString for rfc7231 date format
    expect(result).toContain('(prop).toUTCString()');
  });

  /**
   * Tests that optional utcDateTime header parameters get a null guard
   * so that encoding is only applied when the value is defined. This prevents
   * calling `.toUTCString()` on `undefined`, which would throw at runtime.
   */
  it("should encode optional utcDateTime header parameters with null guard", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getResource")}(
          @header("x-date") prop?: utcDateTime,
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
      </SdkTestFile>
    );

    const result = renderToString(template);
    // Optional header must have null guard before encoding
    expect(result).toContain('options?.prop !== undefined ? (options?.prop).toUTCString() : undefined');
  });

  /**
   * Tests that path and query parameters can be combined in a single operation.
   * This is a very common pattern in REST APIs (e.g., GET /items/{id}?expand=details).
   */
  it("should handle combined path and query parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get @route("items/{id}") op ${t.op("getItem")}(
          @path id: string,
          @query expand?: string,
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
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the getItem operation.
       */
      export interface GetItemOptionalParams extends OperationOptions {
        expand?: string;
      }

      export function _getItemSend(
        context: Client,
        id: string,
        options: GetItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/items/{id}{?expand}", { "id": id, "expand": options?.expand }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).get({ ...operationOptionsToRequestParameters(options), headers: { accept: "text/plain", ...options.requestOptions?.headers } });
      }
    `);
  });

  /**
   * Tests that optional body parameters are wrapped with a null check
   * to avoid calling serializers on undefined values. This prevents
   * runtime errors when consumers omit optional bodies (e.g., PATCH
   * operations where no fields need updating).
   */
  it("should wrap optional body with null check", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model PatchData {
          name?: string;
        }

        @patch(#{implicitOptionality: true}) @route("items/{id}") op ${t.op("updateItem")}(@path id: string, @body body?: PatchData): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);
    const patchModel = sdkContext.sdkPackage.models.find((m) => m.name === "PatchData")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <ModelInterface model={patchModel} />
        {"\n\n"}
        <JsonSerializer model={patchModel} />
        {"\n\n"}
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * model interface PatchData
       */
      export interface PatchData {
        name?: string;
      }

      export function patchDataSerializer(item: PatchData): any {
        return {
          name: item["name"],
        };
      }

      /**
       * Optional parameters for the updateItem operation.
       */
      export interface UpdateItemOptionalParams extends OperationOptions {
        body?: PatchData;
      }

      export function _updateItemSend(
        context: Client,
        id: string,
        options: UpdateItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        const path = expandUrlTemplate("/items/{id}", { "id": id }, { allowReserved: options?.requestOptions?.skipUrlEncoding });
        return context.path(path).patch({ ...operationOptionsToRequestParameters(options), contentType: "application/json", headers: { accept: "text/plain", ...options.requestOptions?.headers }, body: !options?.body ? options?.body : patchDataSerializer(options?.body) });
      }
    `);
  });

  /**
   * Tests that spread body parameters produce an inline object literal with
   * per-property serialization. When TypeSpec uses `...Model` to spread model
   * properties into operation parameters, the emitter must construct the body
   * as `{ prop1: val1, prop2: serializeDate(val2) }` rather than calling a
   * model serializer. This is critical because spread anonymous models have
   * no declared serializer function — property-level serialization is the
   * only correct approach.
   */
  it("should handle spread body as inline object literal", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model SpreadData {
          name: string;
          count: int32;
        }

        @post op ${t.op("createItem")}(...SpreadData): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import { type Client, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

      /**
       * Optional parameters for the createItem operation.
       */
      export interface CreateItemOptionalParams extends OperationOptions {}

      export function _createItemSend(
        context: Client,
        name: string,
        count: number,
        options: CreateItemOptionalParams = { requestOptions: {} },
      ): StreamableMethod {
        return context.path("/").post({ ...operationOptionsToRequestParameters(options), contentType: "application/json", body: { "name": name, "count": count } });
      }
    `);
  });

  describe("@@override parameter grouping", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let method: SdkServiceMethod<SdkHttpOperation>;

    beforeAll(async () => {
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
      sdkContext = await createSdkContextForTest(program);
      method = getFirstMethod(sdkContext);
    });

    /**
     * Tests that when @@override groups individual query parameters into a model
     * parameter named "options", the emitter correctly:
     * 1. Renames the optional params bag to "optionalParams" to avoid name conflict
     * 2. Accesses query params through the model parameter (e.g., options.param1)
     * 3. Uses optionalParams for requestOptions access
     *
     * This is critical for Azure SDK @@override patterns where parameters are
     * grouped into option models for better API ergonomics.
     */
    it("should handle @@override parameter grouping with correct naming", async () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <OperationOptionsDeclaration method={method} />
          {"\n\n"}
          <SendOperation method={method} />
        </SdkTestFile>
      );

      const rendered = renderToString(template);
      // Verify optionalParams is used instead of second "options"
      expect(rendered).toContain("optionalParams");
      // Verify model property access through the options parameter
      expect(rendered).toContain("options.param1");
      expect(rendered).toContain("options.param2");
      // Verify optionalParams is used for requestOptions
      expect(rendered).toContain("optionalParams?.requestOptions?.skipUrlEncoding");
      expect(rendered).toContain("operationOptionsToRequestParameters(optionalParams)");
    });

    /**
     * Tests the getOptionsParamName utility function for the override case.
     * When a required method parameter IS named "options" (e.g., from @@override
     * parameter grouping), returns "optionalParams" to avoid name conflicts.
     */
    it("should return 'optionalParams' when @@override creates conflict", () => {
      expect(getOptionsParamName(method)).toBe("optionalParams");
    });
  });

  /**
   * Tests that query parameters with pipe-delimited collection format are
   * wrapped with buildPipeCollection() in the URL template expansion.
   * Without this wrapping, expandUrlTemplate would comma-join the array
   * (RFC 6570 default), producing incorrect wire format (a,b,c instead of a|b|c).
   */
  it("should wrap pipe-delimited query params with buildPipeCollection", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("listItems")}(
          @query
          @encode(ArrayEncoding.pipeDelimited)
          pipeArray: string[];
        ): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <MultiFileTestWrapper sdkContext={sdkContext}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
      </MultiFileTestWrapper>
    );

    const result = renderToString(template);
    expect(result).toContain("buildPipeCollection(pipeArray)");
  });

  /**
   * Tests that query parameters with space-delimited (SSV) collection format
   * are wrapped with buildSsvCollection(). This ensures arrays in query
   * strings use space-separation rather than the default comma-separation.
   */
  it("should wrap ssv query params with buildSsvCollection", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("listItems")}(
          @query
          @encode(ArrayEncoding.spaceDelimited)
          ssvArray: int32[];
        ): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <MultiFileTestWrapper sdkContext={sdkContext}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
      </MultiFileTestWrapper>
    );

    const result = renderToString(template);
    expect(result).toContain("buildSsvCollection(ssvArray)");
  });

  /**
   * Tests that header parameters with CSV collection format are wrapped
   * with buildCsvCollection(). HTTP headers are strings, not arrays, so
   * array values must be joined with commas before being set as a header.
   */
  it("should wrap csv header params with buildCsvCollection", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getResource")}(
          @header(#{name: "x-colors"})
          colors: string[],
        ): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <MultiFileTestWrapper sdkContext={sdkContext}>
        <OperationOptionsDeclaration method={method} />
        {"\n\n"}
        <SendOperation method={method} />
      </MultiFileTestWrapper>
    );

    const result = renderToString(template);
    expect(result).toContain("buildCsvCollection(colors)");
  });

  /**
   * Tests that constant-type parameters (e.g., `stream: true`, `contentType: "application/octet-stream"`)
   * are excluded from the function signature and their literal values are hardcoded
   * in the request body. This is critical for API surface correctness — constants
   * should never be exposed as positional arguments because their values are fixed
   * and cannot be changed by consumers. Matches the legacy emitter behavior (SA26).
   */
  describe("constant parameter handling", () => {
    /**
     * Tests spread body with all-constant properties. When every property
     * of a spread model is a constant type, the function should have NO
     * required positional parameters (only context + options), and the body
     * should contain hardcoded literal values.
     */
    it("should exclude constant-type params from signature and hardcode in body", async () => {
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
        </SdkTestFile>
      );

      const result = renderToString(template);
      // Constant param should NOT appear in function signature as a parameter
      expect(result).not.toMatch(/createStreamingSend\(\s*context: Client,\s*stream: true/);
      // Constant value should be hardcoded in the body (keys are quoted in spread bodies)
      expect(result).toContain('"stream": true');
    });

    /**
     * Tests explicit constant-type @header contentType parameter. When a
     * header is declared with a constant value like `"application/octet-stream"`,
     * it should not appear as a positional argument in the function signature.
     * The content type is already hardcoded in the request options.
     */
    it("should exclude constant contentType header from signature", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          @route("/upload")
          @post op ${t.op("uploadFile")}(
            @header contentType: "application/octet-stream",
            @body body: bytes
          ): void;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const method = getFirstMethod(sdkContext);

      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <OperationOptionsDeclaration method={method} />
          {"\n\n"}
          <SendOperation method={method} />
        </SdkTestFile>
      );

      const result = renderToString(template);
      // contentType constant should NOT be a positional parameter before body
      expect(result).not.toMatch(/uploadFileSend\(\s*context: Client,\s*contentType:/);
      // But contentType should still be in the request options
      expect(result).toContain('contentType: "application/octet-stream"');
      // body should still be a parameter
      expect(result).toContain("body: Uint8Array");
    });

    /**
     * Tests constant path parameters. When a path parameter has a constant
     * type (e.g., `@path strDefault: "foobar"`), it should not appear as a function
     * argument. Instead, the literal value should be used in the URL template
     * expansion object.
     */
    it("should hardcode constant path parameter values in URL expansion", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          @route("/{strDefault}")
          @get op ${t.op("readItem")}(@path strDefault: "foobar"): void;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const method = getFirstMethod(sdkContext);

      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <OperationOptionsDeclaration method={method} />
          {"\n\n"}
          <SendOperation method={method} />
        </SdkTestFile>
      );

      const result = renderToString(template);
      // Constant path param should NOT be in function signature
      expect(result).not.toMatch(/readItemSend\(\s*context: Client,\s*strDefault:/);
      // Literal should be hardcoded in URL expansion (key is quoted in expansion object)
      expect(result).toContain('"strDefault": "foobar"');
    });
  });
});

/**
 * Tests for the isConstantType and getConstantLiteral utility functions.
 *
 * isConstantType checks whether an SdkType is a constant (literal) type.
 * getConstantLiteral returns the JavaScript literal representation of a
 * constant type's value.
 *
 * Why this is important:
 * - These functions are used to detect constant-type parameters and
 *   hardcode their values in generated code instead of exposing them
 *   as function arguments (SA26).
 * - String constants need quote wrapping; numeric/boolean do not.
 */
describe("isConstantType and getConstantLiteral", () => {
  /**
   * Tests that isConstantType returns true for types with kind "constant"
   * and false for other type kinds like "string" or "model".
   */
  it("should identify constant types correctly", () => {
    expect(isConstantType({ kind: "constant", value: true } as any)).toBe(true);
    expect(isConstantType({ kind: "string" } as any)).toBe(false);
    expect(isConstantType({ kind: "model" } as any)).toBe(false);
  });

  /**
   * Tests that string constant values are wrapped in double quotes.
   */
  it("should format string constants with quotes", () => {
    expect(
      getConstantLiteral({
        kind: "constant",
        value: "application/json",
        valueType: { kind: "string" },
      } as any),
    ).toBe('"application/json"');
  });

  /**
   * Tests that boolean constant values are rendered as bare literals.
   */
  it("should format boolean constants without quotes", () => {
    expect(
      getConstantLiteral({
        kind: "constant",
        value: true,
        valueType: { kind: "boolean" },
      } as any),
    ).toBe("true");
  });

  /**
   * Tests that numeric constant values are rendered as bare literals.
   */
  it("should format numeric constants without quotes", () => {
    expect(
      getConstantLiteral({
        kind: "constant",
        value: 42,
        valueType: { kind: "int32" },
      } as any),
    ).toBe("42");
  });
});

/**
 * Tests for the escapeUriTemplateParamName utility function.
 *
 * This function percent-encodes URI template parameter names so that the
 * expansion object keys match the variable names in the RFC 6570 template
 * string. TCGC provides templates with percent-encoded query variable names
 * (e.g., `{?api%2Dversion,%24expand}`), so the keys in the expansion object
 * must be encoded the same way.
 *
 * Why this is important:
 * - The legacy emitter encodes query parameter keys, so output parity requires
 *   the same encoding in the new emitter.
 * - Without encoding, keys like "api-version" won't visually match template
 *   variables like "api%2Dversion", making the generated code inconsistent.
 * - The encoding must match `encodeURIComponent` plus explicit encoding of
 *   hyphens and colons (which `encodeURIComponent` does NOT encode).
 */
describe("escapeUriTemplateParamName", () => {
  /**
   * Hyphens are NOT encoded by encodeURIComponent but must be encoded in URI
   * template variable names. This is the most common case (e.g., "api-version").
   */
  it("should encode hyphens in parameter names", () => {
    expect(escapeUriTemplateParamName("api-version")).toBe("api%2Dversion");
  });

  /**
   * Dollar signs ARE encoded by encodeURIComponent to %24, so they are
   * already handled. This covers OData-style parameters like "$expand".
   */
  it("should encode dollar signs in parameter names", () => {
    expect(escapeUriTemplateParamName("$expand")).toBe("%24expand");
  });

  /**
   * Colons are NOT encoded by encodeURIComponent but must be encoded in URI
   * template variable names. Tests the explicit colon-to-%3A replacement.
   */
  it("should encode colons in parameter names", () => {
    expect(escapeUriTemplateParamName("time:zone")).toBe("time%3Azone");
  });

  /**
   * Plain alphanumeric parameter names (no special characters) should pass
   * through unchanged. This ensures the function is a no-op for simple names.
   */
  it("should leave plain alphanumeric names unchanged", () => {
    expect(escapeUriTemplateParamName("subscriptionId")).toBe("subscriptionId");
  });

  /**
   * Multiple hyphens in a single name should all be encoded.
   */
  it("should encode multiple hyphens", () => {
    expect(escapeUriTemplateParamName("key-name-version")).toBe("key%2Dname%2Dversion");
  });
});
