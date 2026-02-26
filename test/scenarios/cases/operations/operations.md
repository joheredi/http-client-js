# void request body should be omitted

operations void request body should be omitted

## TypeSpec

```tsp
op read(@body param: void): void;
```

## Operations

```ts operations
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/")
    .post({ ...operationOptionsToRequestParameters(options) });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# void response body should be omitted

## TypeSpec

```tsp
op read(): { @body _: void;};
```

## Operations

```ts operations
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context
    .path("/")
    .get({ ...operationOptionsToRequestParameters(options) });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# required & optional & nullable headers

## TypeSpec

```tsp
model Bar {
    prop1: string;
    prop2: int64;
}
@encode(BytesKnownEncoding.base64url)
scalar base64urlBytes extends bytes;
op read(
    @header requiredHeader: string,
    @header optionalHeader?: string,
    @header nullableOptionalHeader?: string | null,
    @header bytesHeader: bytes,
    @header @encode(BytesKnownEncoding.base64) value: bytes,
    #suppress "deprecated" "Legacy test"
    @header
    csvArrayHeader: base64urlBytes[],
    @header optionalCsvArrayHeader?: string[],
    @header utcDateHeader: utcDateTime,
    @header optionalDateHeader?: utcDateTime,
    @header nullableDateHeader?: utcDateTime | null,
    ...Bar): OkResponse;
```

Should ingore the warning `@azure-tools/typespec-ts/unable-serialized-type`:

```yaml
mustEmptyDiagnostic: false
```

## Operations

```ts operations
import { buildCsvCollection } from "../helpers/serializationHelpers.js";
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  requiredHeader: string,
  bytesHeader: Uint8Array,
  value: Uint8Array,
  csvArrayHeader: Uint8Array[],
  utcDateHeader: Date,
  prop1: string,
  prop2: number,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      "required-header": requiredHeader,
      "optional-header": options?.optionalHeader,
      "nullable-optional-header": options?.nullableOptionalHeader,
      "bytes-header": bytesHeader,
      value: value,
      "csv-array-header": buildCsvCollection(csvArrayHeader),
      "optional-csv-array-header": buildCsvCollection(
        options?.optionalCsvArrayHeader,
      ),
      "utc-date-header": utcDateHeader.toUTCString(),
      "optional-date-header":
        options?.optionalDateHeader !== undefined
          ? (options?.optionalDateHeader).toUTCString()
          : undefined,
      "nullable-date-header":
        options?.nullableDateHeader !== undefined
          ? (options?.nullableDateHeader).toUTCString()
          : undefined,
      ...options.requestOptions?.headers,
    },
    body: { prop1: prop1, prop2: prop2 },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: Client,
  requiredHeader: string,
  bytesHeader: Uint8Array,
  value: Uint8Array,
  csvArrayHeader: Uint8Array[],
  utcDateHeader: Date,
  prop1: string,
  prop2: number,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(
    context,
    requiredHeader,
    bytesHeader,
    value,
    csvArrayHeader,
    utcDateHeader,
    prop1,
    prop2,
    options,
  );
  return _readDeserialize(result);
}
```

# should generate code for required nullable header

## TypeSpec

```tsp
op read( @header nullableRequiredHeader: string | null): OkResponse;
```

Should ingore the warning `@azure-tools/typespec-ts/nullable-required-header`:

```yaml
mustEmptyDiagnostic: false
```

## Operations

```ts operations
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  nullableRequiredHeader: string | null,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      "nullable-required-header": nullableRequiredHeader,
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: Client,
  nullableRequiredHeader: string | null,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, nullableRequiredHeader, options);
  return _readDeserialize(result);
}
```

# should generate required model array as request body

## TypeSpec

```tsp
model Bar {
    prop1: string;
    prop2: int64;
}
op read(@body bars?: Bar[]): OkResponse;
```

## Operations

```ts operations
import { barSerializer } from "../models/models.js";
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: !options?.bars
      ? options?.bars
      : options?.bars.map((p: any) => {
          return barSerializer(p);
        }),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should handle `undefined` for named model array as request body

## TypeSpec

```tsp
model Bar {
    prop1: string;
    prop2: int64;
}
op read(@body bars: Bar[]): OkResponse;
```

## Operations

```ts operations
import { type Bar, barSerializer } from "../models/models.js";
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  bars: Bar[],
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: bars.map((p: any) => {
      return barSerializer(p);
    }),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: Client,
  bars: Bar[],
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, bars, options);
  return _readDeserialize(result);
}
```

# should handle `null` for anonymous model array as request body

## TypeSpec

```tsp
model Bar {
    prop1: string;
    prop2: int64;
}
op read(): { a: Bar}[] | null;
```

## Operations

```ts operations
import {
  type _ReadResponse,
  _readResponseDeserializer,
} from "../models/models.js";
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<_ReadResponse[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body.map((p: any) => {
    return _readResponseDeserializer(p);
  });
}

export async function read(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<_ReadResponse[]> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should handle `null` for named array as response body

## TypeSpec

```tsp
model Bar {
    prop1: string;
    prop2: int64;
}
op read(@body bars?: Bar[]): Bar[] | null;
```

## Operations

```ts operations
import { type Bar, barDeserializer, barSerializer } from "../models/models.js";
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: !options?.bars
      ? options?.bars
      : options?.bars.map((p: any) => {
          return barSerializer(p);
        }),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Bar[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body.map((p: any) => {
    return barDeserializer(p);
  });
}

export async function read(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Bar[]> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should handle `undefined`/`null` for array in request body

## TypeSpec

```tsp
model Bar {
    prop1: string;
    prop2: int64;
}
model Foo {
    optionalBars?: Bar[];
    requiredBars: Bar[];
    nullableBars?: Bar[] | null;
    nullableRequiredBars: Bar[] | null;
}
op read(@body body: Foo): OkResponse;
```

## Operations

```ts operations
import { type Foo, fooSerializer } from "../models/models.js";
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: Client,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle `undefined`/`null` for array in response body

## TypeSpec

```tsp
model Bar {
    prop1: string;
    prop2: int64;
}
model Foo {
    optionalBars?: Bar[];
    requiredBars: Bar[];
    nullableBars?: Bar[] | null;
    nullableRequiredBars: Bar[] | null;
}
op read(): Foo;
```

## Operations

```ts operations
import { type Foo, fooDeserializer } from "../models/models.js";
import type { ReadOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should generate paging if @items defined

## TypeSpec

```tsp
@error
model Error {
    code: int32;
    message: string;
}

model Bar {
    @pageItems
    lists: string[];
}
@post
@list
op test(): Error | Bar;
```

The config would be like:

```yaml
needAzureCore: true
```

## Operations

```ts operations
import {
  buildPagedAsyncIterator,
  type PagedAsyncIterableIterator,
} from "../helpers/pagingHelpers.js";
import { errorDeserializer } from "../models/models.js";
import type { TestOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _testSend(
  context: Client,
  options: TestOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse,
): Promise<string[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    error.details = errorDeserializer(result.body);
    throw error;
  }

  return result.body;
}

export function test(
  context: Client,
  options: TestOptionalParams = { requestOptions: {} },
): PagedAsyncIterableIterator<string> {
  return buildPagedAsyncIterator(
    context,
    () => _testSend(context, options),
    _testDeserialize,
    ["200"],
    { itemName: "lists" },
  );
}
```

# should generate paging if have extend model

## TypeSpec

```tsp
@error
model Error {
    code: int32;
    message: string;
}

model Bar {
    @pageItems
    lists: string[];
    @TypeSpec.nextLink
    nextLink: string;
}

model Child extends Bar {
    message: string
}

@post
@list
op test(): Error | Child;
```

The config would be like:

```yaml
needAzureCore: true
```

## Operations

```ts operations
import {
  buildPagedAsyncIterator,
  type PagedAsyncIterableIterator,
} from "../helpers/pagingHelpers.js";
import { errorDeserializer } from "../models/models.js";
import type { TestOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _testSend(
  context: Client,
  options: TestOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse,
): Promise<string[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    error.details = errorDeserializer(result.body);
    throw error;
  }

  return result.body;
}

export function test(
  context: Client,
  options: TestOptionalParams = { requestOptions: {} },
): PagedAsyncIterableIterator<string> {
  return buildPagedAsyncIterator(
    context,
    () => _testSend(context, options),
    _testDeserialize,
    ["200"],
    { itemName: "lists" },
  );
}
```

# should recursive array type

## TypeSpec

```tsp
model Test {
  prop?: Test[];
}
model TestArrayModel {
  prop: Test[];
}
op get(): TestArrayModel;
```

## Models

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface TestArrayModel
 */
export interface TestArrayModel {
  prop: Test[];
}

/**
 * model interface Test
 */
export interface Test {
  prop?: Test[];
}

export function testArrayModelDeserializer(item: any): TestArrayModel {
  return {
    prop: item["prop"].map((p: any) => {
      return testDeserializer(p);
    }),
  };
}

export function testDeserializer(item: any): Test {
  return {
    prop: !item["prop"]
      ? item["prop"]
      : item["prop"].map((p: any) => {
          return testDeserializer(p);
        }),
  };
}
```

## Operations

```ts operations
import {
  type TestArrayModel,
  testArrayModelDeserializer,
} from "../models/models.js";
import type { GetOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client,
  options: GetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse,
): Promise<TestArrayModel> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testArrayModelDeserializer(result.body);
}

export async function get(
  context: Client,
  options: GetOptionalParams = { requestOptions: {} },
): Promise<TestArrayModel> {
  const result = await _getSend(context, options);
  return _getDeserialize(result);
}
```

# should recursive dictionary type

## TypeSpec

```tsp
model Test {
  prop?: Record<Test>;
}
model TestDictionary {
  prop: Record<Test>;
}
op get(): TestDictionary;

```

## models

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { deserializeRecord } from "../helpers/serializationHelpers.js";

/**
 * model interface TestDictionary
 */
export interface TestDictionary {
  prop: Record<string, Test>;
}

/**
 * model interface Test
 */
export interface Test {
  prop?: Record<string, Test>;
}

export function testDictionaryDeserializer(item: any): TestDictionary {
  return {
    prop: deserializeRecord(item["prop"] as any, (v: any) =>
      testDeserializer(v),
    ),
  };
}

export function testDeserializer(item: any): Test {
  return {
    prop: !item["prop"]
      ? item["prop"]
      : deserializeRecord(item["prop"] as any, (v: any) => testDeserializer(v)),
  };
}
```

## Operations

```ts operations
import {
  type TestDictionary,
  testDictionaryDeserializer,
} from "../models/models.js";
import type { GetOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client,
  options: GetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse,
): Promise<TestDictionary> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDictionaryDeserializer(result.body);
}

export async function get(
  context: Client,
  options: GetOptionalParams = { requestOptions: {} },
): Promise<TestDictionary> {
  const result = await _getSend(context, options);
  return _getDeserialize(result);
}
```

# should use correct parameter name (endpointParam) in body serialization for endpoint parameters

## TypeSpec

```tsp
 model Endpoint {
  name: string;
  description?: string;
}

@route("/endpoints/{endpointName}")
op createOrUpdateEndpoint(
  @path endpointName: string,
  @body endpoint: Endpoint
): Endpoint;
```

## models

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Endpoint
 */
export interface Endpoint {
  name: string;
  description?: string;
}

export function endpointSerializer(item: Endpoint): any {
  return {
    name: item["name"],
    description: item["description"],
  };
}

export function endpointDeserializer(item: any): Endpoint {
  return {
    name: item["name"],
    description: item["description"],
  };
}
```

## Operations

```ts operations
import {
  type Endpoint,
  endpointDeserializer,
  endpointSerializer,
} from "../models/models.js";
import type { CreateOrUpdateEndpointOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _createOrUpdateEndpointSend(
  context: Client,
  endpointName: string,
  endpointParam: Endpoint,
  options: CreateOrUpdateEndpointOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/endpoints/{endpointName}",
    { endpointName: endpointName },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: endpointSerializer(endpointParam),
  });
}

export async function _createOrUpdateEndpointDeserialize(
  result: PathUncheckedResponse,
): Promise<Endpoint> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return endpointDeserializer(result.body);
}

export async function createOrUpdateEndpoint(
  context: Client,
  endpointName: string,
  endpointParam: Endpoint,
  options: CreateOrUpdateEndpointOptionalParams = { requestOptions: {} },
): Promise<Endpoint> {
  const result = await _createOrUpdateEndpointSend(
    context,
    endpointName,
    endpointParam,
    options,
  );
  return _createOrUpdateEndpointDeserialize(result);
}
```

# should support POST paging generation from TypeSpec

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{
  title: "Test Service"
})
namespace testService;

model ListTestResult {
  @pageItems
  tests: Test[];
  @nextLink
  next: string;
}

model Test {
  id: string;
}

@Legacy.nextLinkVerb("GET")
@list
@route("/list-get")
@post
op bar(): ListTestResult;

@Legacy.nextLinkVerb("POST")
@list
@route("/list-post")
@post
op foo(): ListTestResult;
```

The config would be like:

```yaml
withRawContent: true
```

## models

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface ListTestResult
 */
export interface ListTestResult {
  tests: Test[];
  next: string;
}

/**
 * model interface Test
 */
export interface Test {
  id: string;
}

export function listTestResultDeserializer(item: any): ListTestResult {
  return {
    tests: item["tests"].map((p: any) => {
      return testDeserializer(p);
    }),
    next: item["next"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    id: item["id"],
  };
}
```

## Operations

```ts operations
import {
  buildPagedAsyncIterator,
  type PagedAsyncIterableIterator,
} from "../helpers/pagingHelpers.js";
import { type Test, testDeserializer } from "../models/models.js";
import type { BarOptionalParams, FooOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _barSend(
  context: Client,
  options: BarOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/list-get").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _barDeserialize(
  result: PathUncheckedResponse,
): Promise<Test[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body.map((p: any) => {
    return testDeserializer(p);
  });
}

export function bar(
  context: Client,
  options: BarOptionalParams = { requestOptions: {} },
): PagedAsyncIterableIterator<Test> {
  return buildPagedAsyncIterator(
    context,
    () => _barSend(context, options),
    _barDeserialize,
    ["200"],
    { itemName: "tests" },
  );
}

export function _fooSend(
  context: Client,
  options: FooOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/list-post").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _fooDeserialize(
  result: PathUncheckedResponse,
): Promise<Test[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body.map((p: any) => {
    return testDeserializer(p);
  });
}

export function foo(
  context: Client,
  options: FooOptionalParams = { requestOptions: {} },
): PagedAsyncIterableIterator<Test> {
  return buildPagedAsyncIterator(
    context,
    () => _fooSend(context, options),
    _fooDeserialize,
    ["200"],
    { itemName: "tests" },
  );
}
```
