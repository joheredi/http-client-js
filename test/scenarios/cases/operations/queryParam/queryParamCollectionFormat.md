# Should generate query parameters with different collection format encoding

## TypeSpec

This tests various array query parameter encoding formats using @encode(ArrayEncoding.xxx) decorations.

```tsp
@route("/query")
interface QueryOperations {
  @get
  read(
    @query
    simpleArray: string[];

    @query
    simpleOptionalArray?: string[];
  ): void;

  @post
  create(
    @query
    @encode(ArrayEncoding.spaceDelimited)
    ssvArray: int32[];

    @query
    @encode(ArrayEncoding.spaceDelimited)
    ssvOptionalArray?: int32[];

    @query
    @encode(ArrayEncoding.pipeDelimited)
    pipeArray: string[];
  ): void;
}
```

## Operations

```ts operations
import type {
  CreateOptionalParams as CreateOptionalParams_1,
  ReadOptionalParams as ReadOptionalParams_1,
} from "./queryOperations/options.js";
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
  simpleArray: string[],
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/query{?simpleArray,simpleOptionalArray}",
    {
      simpleArray: simpleArray,
      simpleOptionalArray: options?.simpleOptionalArray,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
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
  simpleArray: string[],
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, simpleArray, options);
  return _readDeserialize(result);
}

export function _createSend(
  context: Client_1,
  ssvArray: number[],
  pipeArray: string[],
  options: CreateOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/query{?ssvArray,ssvOptionalArray,pipeArray}",
    {
      ssvArray: ssvArray,
      ssvOptionalArray: options?.ssvOptionalArray,
      pipeArray: pipeArray,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .post({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _createDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function create(
  context: Client_1,
  ssvArray: number[],
  pipeArray: string[],
  options: CreateOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _createSend(context, ssvArray, pipeArray, options);
  return _createDeserialize(result);
}
```

# Should explode if both explode and collection format encoding are applied to the query parameters

## TypeSpec

```tsp
@route("/query")
interface QueryOperations {
  @get
  read(
    @query(#{explode: true})
    @encode(ArrayEncoding.spaceDelimited)
    ssvArray: int32[];

    @query(#{explode: true})
    @encode(ArrayEncoding.spaceDelimited)
    ssvOptionalArray?: int32[];
  ): void;
}
```

## Operations

```ts operations
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./queryOperations/options.js";
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
  ssvArray: number[],
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/query{?ssvArray*,ssvOptionalArray*}",
    { ssvArray: ssvArray, ssvOptionalArray: options?.ssvOptionalArray },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
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
  ssvArray: number[],
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, ssvArray, options);
  return _readDeserialize(result);
}
```
