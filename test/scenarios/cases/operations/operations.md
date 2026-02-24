# void request body should be omitted

operations void request body should be omitted

## TypeSpec

```tsp
op read(@body param: void): void;
```

## Operations

```ts operations
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context
    .path("/")
    .post({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context
    .path("/")
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  requiredHeader: string,
  bytesHeader: Uint8Array,
  value: Uint8Array,
  csvArrayHeader: Uint8Array[],
  utcDateHeader: Date,
  prop1: string,
  prop2: number,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      "required-header": requiredHeader,
      "optional-header": options?.optionalHeader,
      "nullable-optional-header": options?.nullableOptionalHeader,
      "bytes-header": bytesHeader,
      value: value,
      "csv-array-header": csvArrayHeader,
      "optional-csv-array-header": options?.optionalCsvArrayHeader,
      "utc-date-header": utcDateHeader,
      "optional-date-header": options?.optionalDateHeader,
      "nullable-date-header": options?.nullableDateHeader,
      ...options.requestOptions?.headers,
    },
    body: { prop1: prop1, prop2: prop2 },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  requiredHeader: string,
  bytesHeader: Uint8Array,
  value: Uint8Array,
  csvArrayHeader: Uint8Array[],
  utcDateHeader: Date,
  prop1: string,
  prop2: number,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  nullableRequiredHeader: string | null,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      "nullable-required-header": nullableRequiredHeader,
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  nullableRequiredHeader: string | null,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
import { barSerializer as barSerializer_1 } from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: !options?.bars
      ? options?.bars
      : options?.bars.map((p: any) => {
          return barSerializer_1(p);
        }),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
import {
  type Bar as Bar_1,
  barSerializer as barSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  bars: Bar_1[],
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: bars.map((p: any) => {
      return barSerializer_1(p);
    }),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  bars: Bar_1[],
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
  type ReadResponse as ReadResponse_1,
  readResponseDeserializer as readResponseDeserializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<ReadResponse_1[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body.map((p: any) => {
    return readResponseDeserializer_1(p);
  });
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<ReadResponse_1[]> {
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
import {
  type Bar as Bar_1,
  barDeserializer as barDeserializer_1,
  barSerializer as barSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: { accept: "application/json", ...options.requestOptions?.headers },
    body: !options?.bars
      ? options?.bars
      : options?.bars.map((p: any) => {
          return barSerializer_1(p);
        }),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Bar_1[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body.map((p: any) => {
    return barDeserializer_1(p);
  });
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Bar_1[]> {
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
import {
  type Foo as Foo_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
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
  buildPagedAsyncIterator as buildPagedAsyncIterator_1,
  type PagedAsyncIterableIterator as PagedAsyncIterableIterator_1,
} from "../helpers/pagingHelpers.js";
import type { TestOptionalParams as TestOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _testSend(
  context: Client_1,
  options: TestOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export function test(
  context: Client_1,
  options: TestOptionalParams_1 = { requestOptions: {} },
): PagedAsyncIterableIterator_1<string> {
  return buildPagedAsyncIterator_1(
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
  buildPagedAsyncIterator as buildPagedAsyncIterator_1,
  type PagedAsyncIterableIterator as PagedAsyncIterableIterator_1,
} from "../helpers/pagingHelpers.js";
import type { TestOptionalParams as TestOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _testSend(
  context: Client_1,
  options: TestOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export function test(
  context: Client_1,
  options: TestOptionalParams_1 = { requestOptions: {} },
): PagedAsyncIterableIterator_1<string> {
  return buildPagedAsyncIterator_1(
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
export interface TestArrayModel {
  prop: Test[];
}

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
  type TestArrayModel as TestArrayModel_1,
  testArrayModelDeserializer as testArrayModelDeserializer_1,
} from "../models/models.js";
import type { GetOptionalParams as GetOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client_1,
  options: GetOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse_1,
): Promise<TestArrayModel_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return testArrayModelDeserializer_1(result.body);
}

export async function get(
  context: Client_1,
  options: GetOptionalParams_1 = { requestOptions: {} },
): Promise<TestArrayModel_1> {
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
import { deserializeRecord as deserializeRecord_1 } from "../helpers/serializationHelpers.js";

export interface TestDictionary {
  prop: Record<string, Test>;
}

export interface Test {
  prop?: Record<string, Test>;
}

export function testDictionaryDeserializer(item: any): TestDictionary {
  return {
    prop: deserializeRecord_1(item["prop"] as any, (v: any) =>
      testDeserializer(v),
    ),
  };
}

export function testDeserializer(item: any): Test {
  return {
    prop: !item["prop"]
      ? item["prop"]
      : deserializeRecord_1(item["prop"] as any, (v: any) =>
          testDeserializer(v),
        ),
  };
}
```

## Operations

```ts operations
import {
  type TestDictionary as TestDictionary_1,
  testDictionaryDeserializer as testDictionaryDeserializer_1,
} from "../models/models.js";
import type { GetOptionalParams as GetOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client_1,
  options: GetOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse_1,
): Promise<TestDictionary_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return testDictionaryDeserializer_1(result.body);
}

export async function get(
  context: Client_1,
  options: GetOptionalParams_1 = { requestOptions: {} },
): Promise<TestDictionary_1> {
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
  type Endpoint as Endpoint_1,
  endpointDeserializer as endpointDeserializer_1,
  endpointSerializer as endpointSerializer_1,
} from "../models/models.js";
import type { CreateOrUpdateEndpointOptionalParams as CreateOrUpdateEndpointOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _createOrUpdateEndpointSend(
  context: Client_1,
  endpointName: string,
  endpoint: Endpoint_1,
  options: CreateOrUpdateEndpointOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/endpoints/{endpointName}",
    { endpointName: endpointName },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: endpointSerializer_1(endpoint),
  });
}

export async function _createOrUpdateEndpointDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Endpoint_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return endpointDeserializer_1(result.body);
}

export async function createOrUpdateEndpoint(
  context: Client_1,
  endpointName: string,
  endpoint: Endpoint_1,
  options: CreateOrUpdateEndpointOptionalParams_1 = { requestOptions: {} },
): Promise<Endpoint_1> {
  const result = await _createOrUpdateEndpointSend(
    context,
    endpointName,
    endpoint,
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
export interface ListTestResult {
  tests: Test[];
  next: string;
}

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
  buildPagedAsyncIterator as buildPagedAsyncIterator_1,
  type PagedAsyncIterableIterator as PagedAsyncIterableIterator_1,
} from "../helpers/pagingHelpers.js";
import {
  type Test as Test_1,
  testDeserializer as testDeserializer_1,
} from "../models/models.js";
import type {
  BarOptionalParams as BarOptionalParams_1,
  FooOptionalParams as FooOptionalParams_1,
} from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _barSend(
  context: Client_1,
  options: BarOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/list-get").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _barDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Test_1[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body.map((p: any) => {
    return testDeserializer_1(p);
  });
}

export function bar(
  context: Client_1,
  options: BarOptionalParams_1 = { requestOptions: {} },
): PagedAsyncIterableIterator_1<Test_1> {
  return buildPagedAsyncIterator_1(
    context,
    () => _barSend(context, options),
    _barDeserialize,
    ["200"],
    { itemName: "tests" },
  );
}

export function _fooSend(
  context: Client_1,
  options: FooOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/list-post").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _fooDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Test_1[]> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body.map((p: any) => {
    return testDeserializer_1(p);
  });
}

export function foo(
  context: Client_1,
  options: FooOptionalParams_1 = { requestOptions: {} },
): PagedAsyncIterableIterator_1<Test_1> {
  return buildPagedAsyncIterator_1(
    context,
    () => _fooSend(context, options),
    _fooDeserialize,
    ["200"],
    { itemName: "tests" },
  );
}
```
