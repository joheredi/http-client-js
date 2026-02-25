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
import type { UploadFileViaBodyOptionalParams as UploadFileViaBodyOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _uploadFileViaBodySend(
  context: Client_1,
  contentType: "application/octet-stream",
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/uploadFileViaBody").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/octet-stream",
    body: body,
  });
}

export async function _uploadFileViaBodyDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function uploadFileViaBody(
  context: Client_1,
  contentType: "application/octet-stream",
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams_1 = { requestOptions: {} },
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
import type { UploadFileViaBodyOptionalParams as UploadFileViaBodyOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _uploadFileViaBodySend(
  context: Client_1,
  contentType: "application/octet-stream",
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/uploadFileViaBody").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/octet-stream",
    body: body,
  });
}

export async function _uploadFileViaBodyDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function uploadFileViaBody(
  context: Client_1,
  contentType: "application/octet-stream",
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams_1 = { requestOptions: {} },
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
    createFilePartDescriptor_1(
      "file",
      item["file"],
      "application/octet-stream",
    ),
  ];
}
```

## Operations

```ts operations
import {
  type _UploadFileRequest as _UploadFileRequest_1,
  _uploadFileRequestSerializer as _uploadFileRequestSerializer_1,
} from "../models/models.js";
import type { UploadFileOptionalParams as UploadFileOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _uploadFileSend(
  context: Client_1,
  contentType: "multipart/form-data",
  body: _UploadFileRequest_1,
  options: UploadFileOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/uploadFile").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "multipart/form-data",
    body: _uploadFileRequestSerializer_1(body),
  });
}

export async function _uploadFileDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function uploadFile(
  context: Client_1,
  contentType: "multipart/form-data",
  body: _UploadFileRequest_1,
  options: UploadFileOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _uploadFileSend(context, contentType, body, options);
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
import { createFilePartDescriptor as createFilePartDescriptor_1 } from "../helpers/multipartHelpers.js";

export interface _UploadFilesRequest {
  files: Uint8Array[];
}

export function _uploadFilesRequestSerializer(item: _UploadFilesRequest): any {
  return [
    ...item["files"].map((x: unknown) =>
      createFilePartDescriptor_1("files", x, "application/octet-stream"),
    ),
  ];
}
```

## Operations

```ts operations
import {
  type _UploadFilesRequest as _UploadFilesRequest_1,
  _uploadFilesRequestSerializer as _uploadFilesRequestSerializer_1,
} from "../models/models.js";
import type { UploadFilesOptionalParams as UploadFilesOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _uploadFilesSend(
  context: Client_1,
  contentType: "multipart/form-data",
  body: _UploadFilesRequest_1,
  options: UploadFilesOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/uploadFiles").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "multipart/form-data",
    body: _uploadFilesRequestSerializer_1(body),
  });
}

export async function _uploadFilesDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function uploadFiles(
  context: Client_1,
  contentType: "multipart/form-data",
  body: _UploadFilesRequest_1,
  options: UploadFilesOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _uploadFilesSend(context, contentType, body, options);
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
import type { DownloadFileOptionalParams as DownloadFileOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
  stringToUint8Array as stringToUint8Array_1,
} from "@typespec/ts-http-runtime";

export function _downloadFileSend(
  context: Client_1,
  options: DownloadFileOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/downloadFile").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/octet-stream",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _downloadFileDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Uint8Array> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return stringToUint8Array_1(result.body, "base64");
}

export async function downloadFile(
  context: Client_1,
  options: DownloadFileOptionalParams_1 = { requestOptions: {} },
): Promise<Uint8Array> {
  const result = await _downloadFileSend(context, options);
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
import type { DownloadFileOptionalParams as DownloadFileOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
  stringToUint8Array as stringToUint8Array_1,
} from "@typespec/ts-http-runtime";

export function _downloadFileSend(
  context: Client_1,
  options: DownloadFileOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/downloadFile").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/octet-stream",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _downloadFileDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Uint8Array> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return stringToUint8Array_1(result.body, "base64");
}

export async function downloadFile(
  context: Client_1,
  options: DownloadFileOptionalParams_1 = { requestOptions: {} },
): Promise<Uint8Array> {
  const result = await _downloadFileSend(context, options);
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
import type { UploadFileViaBodyOptionalParams as UploadFileViaBodyOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _uploadFileViaBodySend(
  context: Client_1,
  contentType: string,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/uploadFileViaBody").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "*/*",
    body: body,
  });
}

export async function _uploadFileViaBodyDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function uploadFileViaBody(
  context: Client_1,
  contentType: string,
  body: Uint8Array,
  options: UploadFileViaBodyOptionalParams_1 = { requestOptions: {} },
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
import type { TestOptionalParams as TestOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _testSend(
  context: Client_1,
  apiVersion: string,
  options: TestOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{?api%2Dversion}",
    { "api-version": api - version },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function test(
  context: Client_1,
  apiVersion: string,
  options: TestOptionalParams_1 = { requestOptions: {} },
): Promise<string> {
  const result = await _testSend(context, api - version, options);
  return _testDeserialize(result);
}
```

## clientContext

```ts clientContext
import { type Client as Client_1, type ClientOptions as ClientOptions_1, getClient as getClient_1 } from "@typespec/ts-http-runtime";

export interface TestServiceContext extends Client_1 {}

export interface TestServiceClientOptionalParams extends ClientOptions_1 {}

export function createTestService(
  endpoint: string,
  options: TestServiceClientOptionalParams = {},
): TestServiceContext {
  const endpointUrl = options.endpoint ?? endpoint;
  return getClient_1(endpointUrl, options); as TestServiceContext;
}

```

## classicClient

```ts classicClient
import { test as test_1 } from "./api/operations.js";
import type { TestOptionalParams as TestOptionalParams_1 } from "./api/options.js";
import {
  createTestService as createTestService_1,
  type TestServiceClientOptionalParams as TestServiceClientOptionalParams_1,
  type TestServiceContext as TestServiceContext_1,
} from "./testServiceClientContext.js";
import { Pipeline as Pipeline_1 } from "@typespec/ts-http-runtime";

export class TestServiceClient {
  private _client: TestServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  constructor(
    endpoint: string,
    options: TestServiceClientOptionalParams_1 = {},
  ) {
    this._client = createTestService_1(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  test(
    apiVersion: string,
    options: TestOptionalParams_1 = { requestOptions: {} },
  ): Promise<string> {
    return test_1(this._client, api - version, options);
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
import type { TestOptionalParams as TestOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _testSend(
  context: Client_1,
  apiVersion: string,
  options: TestOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{?api%2Dversion}",
    { "api-version": api - version },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function test(
  context: Client_1,
  apiVersion: string,
  options: TestOptionalParams_1 = { requestOptions: {} },
): Promise<string> {
  const result = await _testSend(context, api - version, options);
  return _testDeserialize(result);
}
```

## clientContext

```ts clientContext
import { type Client as Client_1, type ClientOptions as ClientOptions_1, getClient as getClient_1 } from "@typespec/ts-http-runtime";

export interface TestServiceContext extends Client_1 {}

export interface TestServiceClientOptionalParams extends ClientOptions_1 {}

export function createTestService(
  endpoint: string,
  options: TestServiceClientOptionalParams = {},
): TestServiceContext {
  const endpointUrl = options.endpoint ?? endpoint;
  return getClient_1(endpointUrl, options); as TestServiceContext;
}

```

## classicClient

```ts classicClient
import { test as test_1 } from "./api/operations.js";
import type { TestOptionalParams as TestOptionalParams_1 } from "./api/options.js";
import {
  createTestService as createTestService_1,
  type TestServiceClientOptionalParams as TestServiceClientOptionalParams_1,
  type TestServiceContext as TestServiceContext_1,
} from "./testServiceClientContext.js";
import { Pipeline as Pipeline_1 } from "@typespec/ts-http-runtime";

export class TestServiceClient {
  private _client: TestServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  constructor(
    endpoint: string,
    options: TestServiceClientOptionalParams_1 = {},
  ) {
    this._client = createTestService_1(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  test(
    apiVersion: string,
    options: TestOptionalParams_1 = { requestOptions: {} },
  ): Promise<string> {
    return test_1(this._client, api - version, options);
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
import type {
  Test1OptionalParams as Test1OptionalParams_1,
  TestOptionalParams as TestOptionalParams_1,
} from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _testSend(
  context: Client_1,
  apiVersion: string,
  options: TestOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/test{?api%2Dversion}",
    { "api-version": api - version },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function test(
  context: Client_1,
  apiVersion: string,
  options: TestOptionalParams_1 = { requestOptions: {} },
): Promise<string> {
  const result = await _testSend(context, api - version, options);
  return _testDeserialize(result);
}

export function _test1Send(
  context: Client_1,
  options: Test1OptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/test1").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _test1Deserialize(
  result: PathUncheckedResponse_1,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function test1(
  context: Client_1,
  options: Test1OptionalParams_1 = { requestOptions: {} },
): Promise<string> {
  const result = await _test1Send(context, options);
  return _test1Deserialize(result);
}
```

## clientContext

```ts clientContext
import { type Client as Client_1, type ClientOptions as ClientOptions_1, getClient as getClient_1 } from "@typespec/ts-http-runtime";

export interface TestServiceContext extends Client_1 {}

export interface TestServiceClientOptionalParams extends ClientOptions_1 {}

export function createTestService(
  endpoint: string,
  options: TestServiceClientOptionalParams = {},
): TestServiceContext {
  const endpointUrl = options.endpoint ?? endpoint;
  return getClient_1(endpointUrl, options); as TestServiceContext;
}

```

## classicClient

```ts classicClient
import { test as test_1, test1 as test1_1 } from "./api/operations.js";
import type {
  Test1OptionalParams as Test1OptionalParams_1,
  TestOptionalParams as TestOptionalParams_1,
} from "./api/options.js";
import {
  createTestService as createTestService_1,
  type TestServiceClientOptionalParams as TestServiceClientOptionalParams_1,
  type TestServiceContext as TestServiceContext_1,
} from "./testServiceClientContext.js";
import { Pipeline as Pipeline_1 } from "@typespec/ts-http-runtime";

export class TestServiceClient {
  private _client: TestServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  constructor(
    endpoint: string,
    options: TestServiceClientOptionalParams_1 = {},
  ) {
    this._client = createTestService_1(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  test(
    apiVersion: string,
    options: TestOptionalParams_1 = { requestOptions: {} },
  ): Promise<string> {
    return test_1(this._client, api - version, options);
  }

  test1(
    options: Test1OptionalParams_1 = { requestOptions: {} },
  ): Promise<string> {
    return test1_1(this._client, options);
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
  buildPagedAsyncIterator as buildPagedAsyncIterator_1,
  type PagedAsyncIterableIterator as PagedAsyncIterableIterator_1,
} from "../helpers/pagingHelpers.js";
import {
  errorResponseDeserializer as errorResponseDeserializer_1,
  type Operation as Operation_1,
  operationDeserializer as operationDeserializer_1,
} from "../models/models.js";
import { ListOptionalParams as ListOptionalParams_1 } from "./operations/options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _listSend(
  context: Client_1,
  options: ListOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/providers/Microsoft.Contoso/operations{?api%2Dversion}",
    { "api-version": context.apiVersion },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _listDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Operation_1[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError_1(result);
    error.details = errorResponseDeserializer_1(result.body);
    throw error;
  }

  return result.body.map((p: any) => {
    return operationDeserializer_1(p);
  });
}

/**
 * List the operations for the provider
 *
 * @param {Client_1} context
 * @param {ListOptionalParams_1} options
 */
export function list(
  context: Client_1,
  options: ListOptionalParams_1 = { requestOptions: {} },
): PagedAsyncIterableIterator_1<Operation_1> {
  return buildPagedAsyncIterator_1(
    context,
    () => _listSend(context, options),
    _listDeserialize,
    ["200"],
    { itemName: "value" },
  );
}
```
