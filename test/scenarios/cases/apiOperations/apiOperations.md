# should handle contentTypes has binary data in parameters

Api operations should handle contentTypes has binary data

## TypeSpec

```tsp
@route("/uploadFileViaBody")
@post op uploadFileViaBody(
  @header contentType: "application/octet-stream",
  @body body: bytes
): void;
```

## Operations

```ts operations
import type { UploadFileViaBodyOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _uploadFileViaBodySend(
  context: TestingContext,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/uploadFileViaBody").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/octet-stream",
    body: body,
  });
}

export async function _uploadFileViaBodyDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function uploadFileViaBody(
  context: TestingContext,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _uploadFileViaBodySend(context, body, options);
  return _uploadFileViaBodyDeserialize(result);
}
```

# should handle contentTypes has binary data if self defined scalar for upload

## TypeSpec

```tsp
@encode("binary")
scalar BinaryBytes extends bytes;

@route("/uploadFileViaBody")
@post op uploadFileViaBody(
  @header contentType: "application/octet-stream",
  @body body: BinaryBytes
): void;
```

## Operations

```ts operations
import type { UploadFileViaBodyOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _uploadFileViaBodySend(
  context: TestingContext,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/uploadFileViaBody").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/octet-stream",
    body: body,
  });
}

export async function _uploadFileViaBodyDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function uploadFileViaBody(
  context: TestingContext,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _uploadFileViaBodySend(context, body, options);
  return _uploadFileViaBodyDeserialize(result);
}
```

# should handle contentTypes has multiple form data in parameters

## TypeSpec

```tsp
@route("/uploadFile")
@post
op uploadFile(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
        name: HttpPart<string>;
        file: HttpPart<bytes>;
    }
): void;
```

## Models \_UploadFileRequest

```ts models interface _UploadFileRequest
export interface _UploadFileRequest {
  name: string;
  file: Uint8Array;
}
```

## Models function \_uploadFileRequestSerializer

```ts models function _uploadFileRequestSerializer
export function _uploadFileRequestSerializer(item: _UploadFileRequest): any {
  return [
    { name: "name", body: item["name"] },
    createFilePartDescriptor("file", item["file"], "application/octet-stream"),
  ];
}
```

## Operations

```ts operations
import {
  type _UploadFileRequest,
  _uploadFileRequestSerializer,
} from "../models/models.js";
import type { UploadFileOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _uploadFileSend(
  context: TestingContext,
  body: _UploadFileRequest,
  options: UploadFileOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/uploadFile").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "multipart/form-data",
    body: _uploadFileRequestSerializer(body),
  });
}

export async function _uploadFileDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function uploadFile(
  context: TestingContext,
  body: _UploadFileRequest,
  options: UploadFileOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _uploadFileSend(context, body, options);
  return _uploadFileDeserialize(result);
}
```

# should handle contentTypes has multiple form data with part array in parameters

## TypeSpec

```tsp
scalar BinaryBytes extends bytes;

@route("/uploadFiles")
@post
op uploadFiles(
  @header contentType: "multipart/form-data",
  @multipartBody body: {
    files: HttpPart<BinaryBytes>[];
  }
): void;
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { createFilePartDescriptor } from "../static-helpers/multipartHelpers.js";

/**
 * model interface _UploadFilesRequest
 */
export interface _UploadFilesRequest {
  files: Uint8Array[];
}

export function _uploadFilesRequestSerializer(item: _UploadFilesRequest): any {
  return [
    ...item["files"].map((x: unknown) =>
      createFilePartDescriptor("files", x, "application/octet-stream"),
    ),
  ];
}
```

## Operations

```ts operations
import {
  type _UploadFilesRequest,
  _uploadFilesRequestSerializer,
} from "../models/models.js";
import type { UploadFilesOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _uploadFilesSend(
  context: TestingContext,
  body: _UploadFilesRequest,
  options: UploadFilesOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/uploadFiles").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "multipart/form-data",
    body: _uploadFilesRequestSerializer(body),
  });
}

export async function _uploadFilesDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function uploadFiles(
  context: TestingContext,
  body: _UploadFilesRequest,
  options: UploadFilesOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _uploadFilesSend(context, body, options);
  return _uploadFilesDeserialize(result);
}
```

# should handle contentTypes has binary data in response

## TypeSpec

```tsp
@route("/downloadFile")
@post
op downloadFile(): {
  @header contentType: "application/octet-stream";
  @body body: bytes;
};
```

## Operations

```ts operations
import { getBinaryResponse } from "../static-helpers/getBinaryResponse.js";
import type { DownloadFileOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _downloadFileSend(
  context: TestingContext,
  options: DownloadFileOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/downloadFile").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/octet-stream",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _downloadFileDeserialize(
  result: PathUncheckedResponse,
): Promise<Uint8Array> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function downloadFile(
  context: TestingContext,
  options: DownloadFileOptionalParams = { requestOptions: {} },
): Promise<Uint8Array> {
  const streamableMethod = _downloadFileSend(context, options);
  const result = await getBinaryResponse(streamableMethod);
  return _downloadFileDeserialize(result);
}
```

# should handle contentTypes has binary data if self defined scalar for download

## TypeSpec

```tsp
@encode("binary")
scalar BinaryBytes extends bytes;

@route("/downloadFile")
@post
op downloadFile(): {
  @header contentType: "application/octet-stream";
  @body body: BinaryBytes;
};
```

## Operations

```ts operations
import { getBinaryResponse } from "../static-helpers/getBinaryResponse.js";
import type { DownloadFileOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _downloadFileSend(
  context: TestingContext,
  options: DownloadFileOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/downloadFile").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/octet-stream",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _downloadFileDeserialize(
  result: PathUncheckedResponse,
): Promise<Uint8Array> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function downloadFile(
  context: TestingContext,
  options: DownloadFileOptionalParams = { requestOptions: {} },
): Promise<Uint8Array> {
  const streamableMethod = _downloadFileSend(context, options);
  const result = await getBinaryResponse(streamableMethod);
  return _downloadFileDeserialize(result);
}
```

# should handle contentTypes with default value in parameters

Api operations should handle contentTypes has default value

## TypeSpec

```tsp
@route("/uploadFileViaBody")
@post op uploadFileViaBody(
  @header contentType: string = "application/octet-stream",
  @body body: bytes
): void;
```

## Operations

```ts operations
import type { UploadFileViaBodyOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _uploadFileViaBodySend(
  context: TestingContext,
  contentType: string,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/uploadFileViaBody").post({
    ...operationOptionsToRequestParameters(options),
    contentType: contentType,
    body: body,
  });
}

export async function _uploadFileViaBodyDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function uploadFileViaBody(
  context: TestingContext,
  contentType: string,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _uploadFileViaBodySend(
    context,
    contentType,
    body,
    options,
  );
  return _uploadFileViaBodyDeserialize(result);
}
```

# should generate apiVersion if there's a client level apiVersion but without default value

## TypeSpec

```tsp
model ApiVersionParameter {
  @query
  "api-version": string;
}
op test(...ApiVersionParameter): string;
```

## Operations

```ts operations
import type { TestOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { TestingContext } from "../testingClientContext.js";

export function _testSend(
  context: TestingContext,
  apiVersion: string,
  options: TestOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{?api%2Dversion}",
    { "api%2Dversion": apiVersion },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function test(
  context: TestingContext,
  apiVersion: string,
  options: TestOptionalParams = { requestOptions: {} },
): Promise<string> {
  const result = await _testSend(context, apiVersion, options);
  return _testDeserialize(result);
}
```

## clientContext

```ts clientContext
import {
  type Client,
  type ClientOptions,
  getClient,
} from "@typespec/ts-http-runtime";

export interface TestingContext extends Client {}

export interface TestingClientOptionalParams extends ClientOptions {}

export function createTesting(
  endpointParam: string,
  options: TestingClientOptionalParams = {},
): TestingContext {
  const endpointUrl = options.endpoint ?? endpointParam;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions
    ? `${prefixFromOptions} azsdk-js-api`
    : `azsdk-js-api`;
  const { apiVersion: _, ...updatedOptions } = {
    ...options,
    userAgentOptions: { userAgentPrefix },
  };
  return getClient(endpointUrl, updatedOptions) as TestingContext;
}
```

## classicClient

```ts classicClient
import { test } from "./api/operations.js";
import type { TestOptionalParams } from "./api/options.js";
import {
  createTesting,
  type TestingClientOptionalParams,
  type TestingContext,
} from "./testingClientContext.js";
import { Pipeline } from "@typespec/ts-http-runtime";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(
    endpointParam: string,
    options: TestingClientOptionalParams = {},
  ) {
    const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
    const userAgentPrefix = prefixFromOptions
      ? `${prefixFromOptions} azsdk-js-client`
      : `azsdk-js-client`;
    this._client = createTesting(endpointParam, {
      ...options,
      userAgentOptions: { userAgentPrefix },
    });
    this.pipeline = this._client.pipeline;
  }

  test(
    apiVersion: string,
    options: TestOptionalParams = { requestOptions: {} },
  ): Promise<string> {
    return test(this._client, apiVersion, options);
  }
}
```

# shouldn't generate apiVersion if there's a client level apiVersion and with default value

## TypeSpec

```tsp
model ApiVersionParameter {
  @query
  "api-version": string;
}
op test(...ApiVersionParameter): string;
```

The config would be like:

```yaml
mustEmptyDiagnostic: false
needNamespaces: true
needAzureCore: false
withRawContent: false
```

## Operations

```ts operations
import type { TestOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { TestingContext } from "../testingClientContext.js";

export function _testSend(
  context: TestingContext,
  apiVersion: string,
  options: TestOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{?api%2Dversion}",
    { "api%2Dversion": apiVersion },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function test(
  context: TestingContext,
  apiVersion: string,
  options: TestOptionalParams = { requestOptions: {} },
): Promise<string> {
  const result = await _testSend(context, apiVersion, options);
  return _testDeserialize(result);
}
```

## clientContext

```ts clientContext
import {
  type Client,
  type ClientOptions,
  getClient,
} from "@typespec/ts-http-runtime";

export interface TestingContext extends Client {}

export interface TestingClientOptionalParams extends ClientOptions {}

export function createTesting(
  endpointParam: string,
  options: TestingClientOptionalParams = {},
): TestingContext {
  const endpointUrl = options.endpoint ?? endpointParam;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions
    ? `${prefixFromOptions} azsdk-js-api`
    : `azsdk-js-api`;
  const { apiVersion: _, ...updatedOptions } = {
    ...options,
    userAgentOptions: { userAgentPrefix },
  };
  return getClient(endpointUrl, updatedOptions) as TestingContext;
}
```

## classicClient

```ts classicClient
import { test } from "./api/operations.js";
import type { TestOptionalParams } from "./api/options.js";
import {
  createTesting,
  type TestingClientOptionalParams,
  type TestingContext,
} from "./testingClientContext.js";
import { Pipeline } from "@typespec/ts-http-runtime";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(
    endpointParam: string,
    options: TestingClientOptionalParams = {},
  ) {
    const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
    const userAgentPrefix = prefixFromOptions
      ? `${prefixFromOptions} azsdk-js-client`
      : `azsdk-js-client`;
    this._client = createTesting(endpointParam, {
      ...options,
      userAgentOptions: { userAgentPrefix },
    });
    this.pipeline = this._client.pipeline;
  }

  test(
    apiVersion: string,
    options: TestOptionalParams = { requestOptions: {} },
  ): Promise<string> {
    return test(this._client, apiVersion, options);
  }
}
```

# should not generate apiVersion if there's no client level apiVersion

## TypeSpec

```tsp
model ApiVersionParameter {
  @query
  "api-version": string;
}
@route("/test")
op test(...ApiVersionParameter): string;
@route("/test1")
op test1(): string;
```

## Operations

```ts operations
import type { Test1OptionalParams, TestOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { TestingContext } from "../testingClientContext.js";

export function _testSend(
  context: TestingContext,
  apiVersion: string,
  options: TestOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/test{?api%2Dversion}",
    { "api%2Dversion": apiVersion },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function test(
  context: TestingContext,
  apiVersion: string,
  options: TestOptionalParams = { requestOptions: {} },
): Promise<string> {
  const result = await _testSend(context, apiVersion, options);
  return _testDeserialize(result);
}

export function _test1Send(
  context: TestingContext,
  options: Test1OptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/test1").get({
    ...operationOptionsToRequestParameters(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _test1Deserialize(
  result: PathUncheckedResponse,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function test1(
  context: TestingContext,
  options: Test1OptionalParams = { requestOptions: {} },
): Promise<string> {
  const result = await _test1Send(context, options);
  return _test1Deserialize(result);
}
```

## clientContext

```ts clientContext
import {
  type Client,
  type ClientOptions,
  getClient,
} from "@typespec/ts-http-runtime";

export interface TestingContext extends Client {}

export interface TestingClientOptionalParams extends ClientOptions {}

export function createTesting(
  endpointParam: string,
  options: TestingClientOptionalParams = {},
): TestingContext {
  const endpointUrl = options.endpoint ?? endpointParam;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions
    ? `${prefixFromOptions} azsdk-js-api`
    : `azsdk-js-api`;
  const { apiVersion: _, ...updatedOptions } = {
    ...options,
    userAgentOptions: { userAgentPrefix },
  };
  return getClient(endpointUrl, updatedOptions) as TestingContext;
}
```

## classicClient

```ts classicClient
import { test, test1 } from "./api/operations.js";
import type { Test1OptionalParams, TestOptionalParams } from "./api/options.js";
import {
  createTesting,
  type TestingClientOptionalParams,
  type TestingContext,
} from "./testingClientContext.js";
import { Pipeline } from "@typespec/ts-http-runtime";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(
    endpointParam: string,
    options: TestingClientOptionalParams = {},
  ) {
    const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
    const userAgentPrefix = prefixFromOptions
      ? `${prefixFromOptions} azsdk-js-client`
      : `azsdk-js-client`;
    this._client = createTesting(endpointParam, {
      ...options,
      userAgentOptions: { userAgentPrefix },
    });
    this.pipeline = this._client.pipeline;
  }

  test(
    apiVersion: string,
    options: TestOptionalParams = { requestOptions: {} },
  ): Promise<string> {
    return test(this._client, apiVersion, options);
  }

  test1(
    options: Test1OptionalParams = { requestOptions: {} },
  ): Promise<string> {
    return test1(this._client, options);
  }
}
```

# Should generate LRO for ARM operation

Sample generation should arm template and operations successfully.

## TypeSpec

This is tsp definition.

```tsp
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
using Azure.ResourceManager.Foundations;
using OpenAPI;

/** Microsoft.Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{
  title: "Microsoft.Contoso management service",
})
@versioned(Microsoft.Contoso.Versions)
namespace Microsoft.Contoso;

/** The available API versions. */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_10_01_preview: "2021-10-01-preview",
}

interface Operations extends Azure.ResourceManager.Operations {}

@doc("FileShareSnapshot resource")
@parentResource(FileShare)
model FileShareSnapshot
  is Azure.ResourceManager.ProxyResource<FileShareSnapshotProperties> {
  ...ResourceNameParameter<
    Resource = FileShareSnapshot,
    KeyName = "name",
    NamePattern = "^([a-z]|[0-9])([a-z]|[0-9]|(-(?!-))){1,61}([a-z]|[0-9])$",
    SegmentName = "fileShareSnapshots"
  >;
}
model FileShareProperties {
  mountName?: string;

  hostName?: string;
}

@doc("File share resource")
model FileShare is Azure.ResourceManager.TrackedResource<FileShareProperties> {
  @doc("The resource name of the file share, as seen by the administrator through Azure Resource Manager.")
  @pattern("^([a-z]|[0-9])([a-z]|[0-9]|(-(?!-))){1,61}([a-z]|[0-9])$")
  @key("resourceName")
  @path
  @segment("fileShares")
  name: string;
}


model FileShareSnapshotProperties {
  initiatorId?: string;
}

@armResourceOperations
interface FileShareSnapshots {
 updateFileShareSnapshot is ArmCustomPatchAsync<
    FileShareSnapshot,
    ResourceUpdateModel<FileShareSnapshot, FileShareSnapshotProperties>,
    BaseParameters<FileShareSnapshot>,
    Response = ArmAcceptedLroResponse<LroHeaders = ArmAsyncOperationHeader &
      ArmLroLocationHeader<FinalResult = FileShareSnapshot> &
      Azure.Core.Foundations.RetryAfterHeader>
  >;
}
```

The config would be like:

```yaml
withRawContent: true
```

## Operations

```ts operations
import {
  type Operation,
  type OperationListResult,
  operationListResultDeserializer,
} from "../../models/models.js";
import {
  buildPagedAsyncIterator,
  type PagedAsyncIterableIterator,
} from "../../static-helpers/pagingHelpers.js";
import { OperationsListOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@azure-rest/core-client";
import { expandUrlTemplate } from "../../static-helpers/urlTemplate.js";
import { ContosoContext } from "../../contosoClientContext.js";

export function _listSend(
  context: ContosoContext,
  options: OperationsListOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/providers/Microsoft.Contoso/operations{?api%2Dversion}",
    { "api%2Dversion": context.apiVersion ?? "2021-10-01-preview" },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _listDeserialize(
  result: PathUncheckedResponse,
): Promise<OperationListResult> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return operationListResultDeserializer(result.body);
}

/**
 * List the operations for the provider
 *
 * @param {ContosoContext} context
 * @param {OperationsListOptionalParams} options
 */
export function list(
  context: ContosoContext,
  options: OperationsListOptionalParams = { requestOptions: {} },
): PagedAsyncIterableIterator<Operation> {
  return buildPagedAsyncIterator(
    context,
    () => _listSend(context, options),
    _listDeserialize,
    ["200"],
    {
      itemName: "value",
      nextLinkName: "nextLink",
      apiVersion: context.apiVersion ?? "2021-10-01-preview",
    },
  );
}
```
