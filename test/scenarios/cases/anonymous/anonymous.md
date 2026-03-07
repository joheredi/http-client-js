# should flatten alias if spread in the payload with required parameters

Anonymous model should flatten alias if spread in the payload with required parameters

## TypeSpec

```tsp
alias Foo = {
  prop1: string;
  prop2: int64;
  prop3: utcDateTime;
  prop4: offsetDateTime;
  prop5: Bar;
};
model Bar {
  prop1: string;
  prop2: int64;
}
op read(@path pathParam: string, @query queryParam: string, ...Foo): OkResponse;
```

## Model Bar

```ts models interface Bar
export interface Bar {
  prop1: string;
  prop2: number;
}
```

## Model function barSerializer

```ts serialization function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Operations

```ts operations
import type { Bar } from "../models/models.js";
import { barSerializer } from "../models/serialization/serialization.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop3: Date,
  prop4: string,
  prop5: Bar,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: {
      prop1: prop1,
      prop2: prop2,
      prop3: prop3.toISOString(),
      prop4: prop4,
      prop5: barSerializer(prop5),
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
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop3: Date,
  prop4: string,
  prop5: Bar,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(
    context,
    pathParam,
    queryParam,
    prop1,
    prop2,
    prop3,
    prop4,
    prop5,
    options,
  );
  return _readDeserialize(result);
}
```

# should flatten alias if spread in the payload with optional parameters

## TypeSpec

```tsp
alias Foo = {
    prop1: string;
    prop2: int64;
    prop3?: utcDateTime;
    prop4: offsetDateTime;
    prop5?: Bar;
};
model Bar {
    prop1: string;
    prop2: int64;
}
op read(@path pathParam: string, @query queryParam: string, ...Foo): OkResponse;
```

## Models Bar

```ts models interface Bar
export interface Bar {
  prop1: string;
  prop2: number;
}
```

## Models function barSerializer

```ts serialization function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Models withOptions

```ts models:withOptions
import type { Bar } from "../models/models.js";
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions {
  prop3?: Date;
  prop5?: Bar;
}
```

## Operations

```ts operations
import { barSerializer } from "../models/serialization/serialization.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: {
      prop1: prop1,
      prop2: prop2,
      prop3: !options?.prop3 ? options?.prop3 : (options?.prop3).toISOString(),
      prop4: prop4,
      prop5: !options?.prop5 ? options?.prop5 : barSerializer(options?.prop5),
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
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(
    context,
    pathParam,
    queryParam,
    prop1,
    prop2,
    prop4,
    options,
  );
  return _readDeserialize(result);
}
```

# should flatten alias if spread in the payload with optional parameters with orders

## TypeSpec

```tsp
alias Foo = {
  @path
  prop1: string;
  prop2: int64;
  prop3?: utcDateTime;
  @query
  prop4: offsetDateTime;
  prop5?: Bar;
};
model Bar {
  prop1: string;
  prop2: int64;
}
op read(@path pathParam: string, ...Foo, @query queryParam: string): OkResponse;
```

## Models Bar

```ts models interface Bar
export interface Bar {
  prop1: string;
  prop2: number;
}
```

## Models function barSerializer

```ts serialization function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Bar Model withOptions

```ts models:withOptions
import type { Bar } from "../models/models.js";
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions {
  prop3?: Date;
  prop5?: Bar;
}
```

## Operations

```ts operations
import { barSerializer } from "../models/serialization/serialization.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  pathParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  queryParam: string,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{pathParam}/{prop1}{?prop4,queryParam}",
    {
      pathParam: pathParam,
      prop1: prop1,
      prop4: prop4,
      queryParam: queryParam,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: {
      prop2: prop2,
      prop3: !options?.prop3 ? options?.prop3 : (options?.prop3).toISOString(),
      prop5: !options?.prop5 ? options?.prop5 : barSerializer(options?.prop5),
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
  context: TestingContext,
  pathParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  queryParam: string,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(
    context,
    pathParam,
    prop1,
    prop2,
    prop4,
    queryParam,
    options,
  );
  return _readDeserialize(result);
}
```

# should not flatten model if spread in the payload with required parameters

## TypeSpec

```tsp
model Foo {
  prop1: string;
  prop2: int64;
  prop3: utcDateTime;
  prop4: offsetDateTime;
  prop5: Bar;
}
model Bar {
  prop1: string;
  prop2: int64;
}
op read(@path pathParam: string, @query queryParam: string, @body body: Foo): OkResponse;
```

## Models Bar

```ts models interface Bar
export interface Bar {
  prop1: string;
  prop2: number;
}
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: string;
  prop2: number;
  prop3: Date;
  prop4: string;
  prop5: Bar;
}
```

## Models function barSerializer

```ts serialization function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Models function fooSerializer

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
    prop3: item["prop3"].toISOString(),
    prop4: item["prop4"],
    prop5: barSerializer(item["prop5"]),
  };
}
```

## Operations

```ts operations
import type { Foo } from "../models/models.js";
import { fooSerializer } from "../models/serialization/serialization.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
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
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, pathParam, queryParam, body, options);
  return _readDeserialize(result);
}
```

# should not flatten if body is empty anonymous model({})

## TypeSpec

```tsp
op read(@path pathParam: string, @query queryParam: string, @body body: {}): OkResponse;
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface _ReadRequest
 */
export interface _ReadRequest {}
```

```ts serialization
import type { _ReadRequest } from "../models.js";

export function _readRequestSerializer(item: _ReadRequest): any {
  return item;
}
```

## Operations

```ts operations
import { _readRequestSerializer } from "../models/serialization/serialization.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  body: Record<string, any>,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: _readRequestSerializer(body),
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
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  body: Record<string, any>,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, pathParam, queryParam, body, options);
  return _readDeserialize(result);
}
```

# should flatten non-empty anonymous model({ ... })

## TypeSpec

```tsp
model Bar {
  prop1: string;
  prop2: int64;
}
op read(@path pathParam: string, @query queryParam: string, @body test: {
  prop1: string;
  prop2: Bar;
}): OkResponse;
```

## Models Bar

```ts models interface Bar
export interface Bar {
  prop1: string;
  prop2: number;
}
```

## Models function barSerializer

```ts serialization function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Operations

```ts operations
import type { _ReadRequest } from "../models/models.js";
import { _readRequestSerializer } from "../models/serialization/serialization.js";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  test: _ReadRequest,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: _readRequestSerializer(test),
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
  context: TestingContext,
  pathParam: string,
  queryParam: string,
  test: _ReadRequest,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, pathParam, queryParam, test, options);
  return _readDeserialize(result);
}
```

# should generate empty anonymous model({}) as Record<string, any>

## TypeSpec

```tsp
model Test {
  color: {};
}
op read(@body body: Test): void;
```

## Models Test

```ts models interface Test
export interface Test {
  color: Record<string, any>;
}
```

## Models function testSerializer

```ts serialization function testSerializer
export function testSerializer(item: Test): any {
  return {
    color: _testColorSerializer(item["color"]),
  };
}
```

## Operations

```ts operations
import type { Test } from "../models/models.js";
import { testSerializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Test,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: testSerializer(body),
  });
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
  context: TestingContext,
  body: Test,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should generate non-empty anonymous model({ ... })

## TypeSpec

```tsp
model Test {
  color: {
    foo?: string;
  };
}
op read(@bodyRoot body: Test): void;
```

## Models Test

```ts models interface Test
export interface Test {
  color: _TestColor;
}
```

## Models function testSerializer

```ts serialization function testSerializer
export function testSerializer(item: Test): any {
  return {
    color: _testColorSerializer(item["color"]),
  };
}
```

## Operations

```ts operations
import type { Test } from "../models/models.js";
import { testSerializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Test,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: testSerializer(body),
  });
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
  context: TestingContext,
  body: Test,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should map empty anonymous model({}) => Record<string, any>

## TypeSpec

```tsp
op read(): { @body _: {}; };
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface _ReadResponse
 */
export interface _ReadResponse {}
```

```ts serialization
import type { _ReadResponse } from "../models.js";

export function _readResponseDeserializer(item: any): _ReadResponse {
  return item;
}
```

## Operations

```ts operations
import { _readResponseDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
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
): Promise<Record<string, any>> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return _readResponseDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Record<string, any>> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should map empty named model(PublishResult {}) => PublishResult

## TypeSpec

```tsp
model PublishResult {
}
op read(): {@body _: PublishResult};
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface PublishResult
 */
export interface PublishResult {}
```

```ts serialization
import type { PublishResult } from "../models.js";

export function publishResultDeserializer(item: any): PublishResult {
  return item;
}
```

## Operations

```ts operations
import type { PublishResult } from "../models/models.js";
import { publishResultDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
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
): Promise<PublishResult> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return publishResultDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<PublishResult> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should return non-empty anonymous model({ ... })

## TypeSpec

```tsp
model PublishResult {
}
op read(): { foo?: {bar: string | null}};
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface _ReadResponse
 */
export interface _ReadResponse {
  foo?: _ReadResponseFoo;
}

/**
 * model interface _ReadResponseFoo
 */
export interface _ReadResponseFoo {
  bar: string | null;
}
```

```ts serialization
import type { _ReadResponse, _ReadResponseFoo } from "../models.js";

export function _readResponseDeserializer(item: any): _ReadResponse {
  return {
    foo: !item["foo"] ? item["foo"] : _readResponseFooDeserializer(item["foo"]),
  };
}

export function _readResponseFooDeserializer(item: any): _ReadResponseFoo {
  return {
    bar: item["bar"],
  };
}
```

## Operations

```ts operations
import type { _ReadResponse } from "../models/models.js";
import { _readResponseDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
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
): Promise<_ReadResponse> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return _readResponseDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<_ReadResponse> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should map empty anonymous model({}) => Record<string, any> & empty named model(A {}) => Record<string, any>

## TypeSpec

```tsp
model EmptyModel {
}
model ReturnBody {
  emptyAnomyous: {};
  emptyAnomyousArray: {}[];
  emptyAnomyousDict: Record<{}>;
  emptyModel: EmptyModel;
  emptyModelArray: EmptyModel[];
  emptyModelDict: Record<EmptyModel>;
}
op read(): ReturnBody;
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface ReturnBody
 */
export interface ReturnBody {
  emptyAnomyous: Record<string, any>;
  emptyAnomyousArray: Record<string, any>[];
  emptyAnomyousDict: Record<string, Record<string, any>>;
  emptyModel: EmptyModel;
  emptyModelArray: EmptyModel[];
  emptyModelDict: Record<string, EmptyModel>;
}

/**
 * model interface _ReturnBodyEmptyAnomyous
 */
export interface _ReturnBodyEmptyAnomyous {}

/**
 * model interface _ReturnBodyEmptyAnomyousArray
 */
export interface _ReturnBodyEmptyAnomyousArray {}

/**
 * model interface _ReturnBodyEmptyAnomyousDict
 */
export interface _ReturnBodyEmptyAnomyousDict {}

/**
 * model interface EmptyModel
 */
export interface EmptyModel {}
```

```ts serialization
import { deserializeRecord } from "../../static-helpers/serializationHelpers.js";
import type {
  _ReturnBodyEmptyAnomyous,
  _ReturnBodyEmptyAnomyousArray,
  _ReturnBodyEmptyAnomyousDict,
  EmptyModel,
  ReturnBody,
} from "../models.js";

export function returnBodyDeserializer(item: any): ReturnBody {
  return {
    emptyAnomyous: _returnBodyEmptyAnomyousDeserializer(item["emptyAnomyous"]),
    emptyAnomyousArray: _returnBodyEmptyAnomyousArrayArrayDeserializer(
      item["emptyAnomyousArray"],
    ),
    emptyAnomyousDict: _returnBodyEmptyAnomyousDictRecordDeserializer(
      item["emptyAnomyousDict"] as any,
    ),
    emptyModel: emptyModelDeserializer(item["emptyModel"]),
    emptyModelArray: emptyModelArrayDeserializer(item["emptyModelArray"]),
    emptyModelDict: emptyModelRecordDeserializer(item["emptyModelDict"] as any),
  };
}

export function _returnBodyEmptyAnomyousDeserializer(
  item: any,
): _ReturnBodyEmptyAnomyous {
  return item;
}

export function _returnBodyEmptyAnomyousArrayDeserializer(
  item: any,
): _ReturnBodyEmptyAnomyousArray {
  return item;
}

export function _returnBodyEmptyAnomyousDictDeserializer(
  item: any,
): _ReturnBodyEmptyAnomyousDict {
  return item;
}

export function emptyModelDeserializer(item: any): EmptyModel {
  return item;
}

export function _returnBodyEmptyAnomyousArrayArrayDeserializer(
  result: Array<_ReturnBodyEmptyAnomyousArray>,
): any[] {
  return result.map((item) => {
    return _returnBodyEmptyAnomyousArrayDeserializer(item);
  });
}

export function emptyModelArrayDeserializer(result: Array<EmptyModel>): any[] {
  return result.map((item) => {
    return emptyModelDeserializer(item);
  });
}

export function _returnBodyEmptyAnomyousDictRecordDeserializer(
  result: Record<string, _ReturnBodyEmptyAnomyousDict>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    _returnBodyEmptyAnomyousDictDeserializer(v),
  );
}

export function emptyModelRecordDeserializer(
  result: Record<string, EmptyModel>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    emptyModelDeserializer(v),
  );
}
```

## Operations

```ts operations
import type { ReturnBody } from "../models/models.js";
import { returnBodyDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
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
): Promise<ReturnBody> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return returnBodyDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<ReturnBody> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should map non-empty anonymous model({ ... }) => { ... }

## TypeSpec

```tsp
model SimpleModel {
  test: string;
}
model Foz {
  baz: {
    foo: int32[];
    bas: string;
    @encodedName("application/json", "test")
    bar?: SimpleModel[];
    nonemptyAnomyous: { a: string };
    nonemptyAnomyousArray: { b?: Record<string> }[];
    nonemptyAnomyousDict: Record<{ c: int32[]; }>;
  }
}
op read(): Foz;
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Foz
 */
export interface Foz {
  baz: _FozBaz;
}

/**
 * model interface _FozBaz
 */
export interface _FozBaz {
  foo: number[];
  bas: string;
  bar?: SimpleModel[];
  nonemptyAnomyous: _FozBazNonemptyAnomyous;
  nonemptyAnomyousArray: _FozBazNonemptyAnomyousArray[];
  nonemptyAnomyousDict: Record<string, _FozBazNonemptyAnomyousDict>;
}

/**
 * model interface SimpleModel
 */
export interface SimpleModel {
  test: string;
}

/**
 * model interface _FozBazNonemptyAnomyous
 */
export interface _FozBazNonemptyAnomyous {
  a: string;
}

/**
 * model interface _FozBazNonemptyAnomyousArray
 */
export interface _FozBazNonemptyAnomyousArray {
  b?: Record<string, string>;
}

/**
 * model interface _FozBazNonemptyAnomyousDict
 */
export interface _FozBazNonemptyAnomyousDict {
  c: number[];
}
```

```ts serialization
import { deserializeRecord } from "../../static-helpers/serializationHelpers.js";
import type {
  _FozBaz,
  _FozBazNonemptyAnomyous,
  _FozBazNonemptyAnomyousArray,
  _FozBazNonemptyAnomyousDict,
  Foz,
  SimpleModel,
} from "../models.js";

export function fozDeserializer(item: any): Foz {
  return {
    baz: _fozBazDeserializer(item["baz"]),
  };
}

export function _fozBazDeserializer(item: any): _FozBaz {
  return {
    foo: item["foo"],
    bas: item["bas"],
    bar: !item["test"]
      ? item["test"]
      : simpleModelArrayDeserializer(item["test"]),
    nonemptyAnomyous: _fozBazNonemptyAnomyousDeserializer(
      item["nonemptyAnomyous"],
    ),
    nonemptyAnomyousArray: _fozBazNonemptyAnomyousArrayArrayDeserializer(
      item["nonemptyAnomyousArray"],
    ),
    nonemptyAnomyousDict: _fozBazNonemptyAnomyousDictRecordDeserializer(
      item["nonemptyAnomyousDict"] as any,
    ),
  };
}

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    test: item["test"],
  };
}

export function _fozBazNonemptyAnomyousDeserializer(
  item: any,
): _FozBazNonemptyAnomyous {
  return {
    a: item["a"],
  };
}

export function _fozBazNonemptyAnomyousArrayDeserializer(
  item: any,
): _FozBazNonemptyAnomyousArray {
  return {
    b: item["b"],
  };
}

export function _fozBazNonemptyAnomyousDictDeserializer(
  item: any,
): _FozBazNonemptyAnomyousDict {
  return {
    c: item["c"],
  };
}

export function simpleModelArrayDeserializer(
  result: Array<SimpleModel>,
): any[] {
  return result.map((item) => {
    return simpleModelDeserializer(item);
  });
}

export function _fozBazNonemptyAnomyousArrayArrayDeserializer(
  result: Array<_FozBazNonemptyAnomyousArray>,
): any[] {
  return result.map((item) => {
    return _fozBazNonemptyAnomyousArrayDeserializer(item);
  });
}

export function _fozBazNonemptyAnomyousDictRecordDeserializer(
  result: Record<string, _FozBazNonemptyAnomyousDict>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    _fozBazNonemptyAnomyousDictDeserializer(v),
  );
}
```

## Operations

```ts operations
import type { Foz } from "../models/models.js";
import { fozDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
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
): Promise<Foz> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fozDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foz> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```
