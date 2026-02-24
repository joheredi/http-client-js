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

```ts models function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
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
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop3: Date,
  prop4: string,
  prop5: Bar_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: {
      prop1: prop1,
      prop2: prop2,
      prop3: prop3.toISOString(),
      prop4: prop4,
      prop5: barSerializer_1(prop5),
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
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop3: Date,
  prop4: string,
  prop5: Bar_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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

```ts models function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Models withOptions

```ts models:withOptions
import type { Bar as Bar_1 } from "../models/models.js";
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions_1 {
  prop3?: Date;
  prop5?: Bar_1;
}
```

## Operations

```ts operations
import { barSerializer as barSerializer_1 } from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: {
      prop1: prop1,
      prop2: prop2,
      prop3: !options?.prop3 ? options?.prop3 : (options?.prop3).toISOString(),
      prop4: prop4,
      prop5: !options?.prop5 ? options?.prop5 : barSerializer_1(options?.prop5),
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
  pathParam: string,
  queryParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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

```ts models function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Bar Model withOptions

```ts models:withOptions
import type { Bar as Bar_1 } from "../models/models.js";
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions_1 {
  prop3?: Date;
  prop5?: Bar_1;
}
```

## Operations

```ts operations
import { barSerializer as barSerializer_1 } from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  pathParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  queryParam: string,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
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
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: {
      prop2: prop2,
      prop3: !options?.prop3 ? options?.prop3 : (options?.prop3).toISOString(),
      prop5: !options?.prop5 ? options?.prop5 : barSerializer_1(options?.prop5),
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
  pathParam: string,
  prop1: string,
  prop2: number,
  prop4: string,
  queryParam: string,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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

```ts models function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Models function fooSerializer

```ts models function fooSerializer
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
import {
  type Foo as Foo_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  pathParam: string,
  queryParam: string,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
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
  pathParam: string,
  queryParam: string,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
export interface ReadRequest {}

export function readRequestSerializer(item: ReadRequest): any {
  return {};
}
```

## Operations

```ts operations
import {
  type ReadRequest as ReadRequest_1,
  readRequestSerializer as readRequestSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  pathParam: string,
  queryParam: string,
  body: ReadRequest_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: readRequestSerializer_1(body),
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
  pathParam: string,
  queryParam: string,
  body: ReadRequest_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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

```ts models function barSerializer
export function barSerializer(item: Bar): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Operations

```ts operations
import {
  type ReadRequest as ReadRequest_1,
  readRequestSerializer as readRequestSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  pathParam: string,
  queryParam: string,
  test: ReadRequest_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{pathParam}{?queryParam}",
    { pathParam: pathParam, queryParam: queryParam },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: readRequestSerializer_1(test),
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
  pathParam: string,
  queryParam: string,
  test: ReadRequest_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
  color: TestColor;
}
```

## Models function testSerializer

```ts models function testSerializer
export function testSerializer(item: Test): any {
  return {
    color: testColorSerializer(item["color"]),
  };
}
```

## Operations

```ts operations
import {
  type Test as Test_1,
  testSerializer as testSerializer_1,
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
  body: Test_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: testSerializer_1(body),
  });
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
  body: Test_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
  color: TestColor;
}
```

## Models function testSerializer

```ts models function testSerializer
export function testSerializer(item: Test): any {
  return {
    color: testColorSerializer(item["color"]),
  };
}
```

## Operations

```ts operations
import {
  type Test as Test_1,
  testSerializer as testSerializer_1,
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
  body: Test_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: testSerializer_1(body),
  });
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
  body: Test_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
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
export interface ReadResponse {}

export function readResponseDeserializer(item: any): ReadResponse {
  return {};
}
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
): Promise<ReadResponse_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return readResponseDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<ReadResponse_1> {
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
export interface PublishResult {}

export function publishResultDeserializer(item: any): PublishResult {
  return {};
}
```

## Operations

```ts operations
import {
  type PublishResult as PublishResult_1,
  publishResultDeserializer as publishResultDeserializer_1,
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
): Promise<PublishResult_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return publishResultDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<PublishResult_1> {
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
export interface ReadResponse {
  foo?: ReadResponseFoo;
}

export interface ReadResponseFoo {
  bar: string | null;
}

export function readResponseDeserializer(item: any): ReadResponse {
  return {
    foo: !item["foo"] ? item["foo"] : readResponseFooDeserializer(item["foo"]),
  };
}

export function readResponseFooDeserializer(item: any): ReadResponseFoo {
  return {
    bar: item["bar"],
  };
}
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
): Promise<ReadResponse_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return readResponseDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<ReadResponse_1> {
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
import { deserializeRecord as deserializeRecord_1 } from "../helpers/serializationHelpers.js";

export interface ReturnBody {
  emptyAnomyous: ReturnBodyEmptyAnomyous;
  emptyAnomyousArray: ReturnBodyEmptyAnomyousArray[];
  emptyAnomyousDict: Record<string, ReturnBodyEmptyAnomyousDict>;
  emptyModel: EmptyModel;
  emptyModelArray: EmptyModel[];
  emptyModelDict: Record<string, EmptyModel>;
}

export interface ReturnBodyEmptyAnomyous {}

export interface ReturnBodyEmptyAnomyousArray {}

export interface ReturnBodyEmptyAnomyousDict {}

export interface EmptyModel {}

export function returnBodyDeserializer(item: any): ReturnBody {
  return {
    emptyAnomyous: returnBodyEmptyAnomyousDeserializer(item["emptyAnomyous"]),
    emptyAnomyousArray: item["emptyAnomyousArray"].map((p: any) => {
      return returnBodyEmptyAnomyousArrayDeserializer(p);
    }),
    emptyAnomyousDict: deserializeRecord_1(
      item["emptyAnomyousDict"] as any,
      (v: any) => returnBodyEmptyAnomyousDictDeserializer(v),
    ),
    emptyModel: emptyModelDeserializer(item["emptyModel"]),
    emptyModelArray: item["emptyModelArray"].map((p: any) => {
      return emptyModelDeserializer(p);
    }),
    emptyModelDict: deserializeRecord_1(
      item["emptyModelDict"] as any,
      (v: any) => emptyModelDeserializer(v),
    ),
  };
}

export function returnBodyEmptyAnomyousDeserializer(
  item: any,
): ReturnBodyEmptyAnomyous {
  return {};
}

export function returnBodyEmptyAnomyousArrayDeserializer(
  item: any,
): ReturnBodyEmptyAnomyousArray {
  return {};
}

export function returnBodyEmptyAnomyousDictDeserializer(
  item: any,
): ReturnBodyEmptyAnomyousDict {
  return {};
}

export function emptyModelDeserializer(item: any): EmptyModel {
  return {};
}
```

## Operations

```ts operations
import {
  type ReturnBody as ReturnBody_1,
  returnBodyDeserializer as returnBodyDeserializer_1,
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
): Promise<ReturnBody_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return returnBodyDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<ReturnBody_1> {
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
import { deserializeRecord as deserializeRecord_1 } from "../helpers/serializationHelpers.js";

export interface Foz {
  baz: FozBaz;
}

export interface FozBaz {
  foo: number[];
  bas: string;
  bar?: SimpleModel[];
  nonemptyAnomyous: FozBazNonemptyAnomyous;
  nonemptyAnomyousArray: FozBazNonemptyAnomyousArray[];
  nonemptyAnomyousDict: Record<string, FozBazNonemptyAnomyousDict>;
}

export interface SimpleModel {
  test: string;
}

export interface FozBazNonemptyAnomyous {
  a: string;
}

export interface FozBazNonemptyAnomyousArray {
  b?: Record<string, string>;
}

export interface FozBazNonemptyAnomyousDict {
  c: number[];
}

export function fozDeserializer(item: any): Foz {
  return {
    baz: fozBazDeserializer(item["baz"]),
  };
}

export function fozBazDeserializer(item: any): FozBaz {
  return {
    foo: item["foo"],
    bas: item["bas"],
    bar: !item["test"]
      ? item["test"]
      : item["test"].map((p: any) => {
          return simpleModelDeserializer(p);
        }),
    nonemptyAnomyous: fozBazNonemptyAnomyousDeserializer(
      item["nonemptyAnomyous"],
    ),
    nonemptyAnomyousArray: item["nonemptyAnomyousArray"].map((p: any) => {
      return fozBazNonemptyAnomyousArrayDeserializer(p);
    }),
    nonemptyAnomyousDict: deserializeRecord_1(
      item["nonemptyAnomyousDict"] as any,
      (v: any) => fozBazNonemptyAnomyousDictDeserializer(v),
    ),
  };
}

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    test: item["test"],
  };
}

export function fozBazNonemptyAnomyousDeserializer(
  item: any,
): FozBazNonemptyAnomyous {
  return {
    a: item["a"],
  };
}

export function fozBazNonemptyAnomyousArrayDeserializer(
  item: any,
): FozBazNonemptyAnomyousArray {
  return {
    b: item["b"],
  };
}

export function fozBazNonemptyAnomyousDictDeserializer(
  item: any,
): FozBazNonemptyAnomyousDict {
  return {
    c: item["c"],
  };
}
```

## Operations

```ts operations
import {
  type Foz as Foz_1,
  fozDeserializer as fozDeserializer_1,
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
): Promise<Foz_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fozDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foz_1> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```
