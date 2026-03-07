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
import {
  buildCsvCollection,
  buildPipeCollection,
  buildSsvCollection,
} from "../../../static-helpers/serializationHelpers.js";
import { expandUrlTemplate } from "../../../static-helpers/urlTemplate.js";
import type { TestingContext } from "../../testingClientContext.js";
import type {
  QueryOperationsCreateOptionalParams,
  QueryOperationsReadOptionalParams,
} from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  simpleArray: string[],
  options: QueryOperationsReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/query{?simpleArray,simpleOptionalArray}",
    {
      simpleArray: buildCsvCollection(simpleArray),
      simpleOptionalArray: buildCsvCollection(options?.simpleOptionalArray),
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters(options) });
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
  simpleArray: string[],
  options: QueryOperationsReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, simpleArray, options);
  return _readDeserialize(result);
}

export function _createSend(
  context: TestingContext,
  ssvArray: number[],
  pipeArray: string[],
  options: QueryOperationsCreateOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/query{?ssvArray,ssvOptionalArray,pipeArray}",
    {
      ssvArray: buildSsvCollection(ssvArray),
      ssvOptionalArray: buildSsvCollection(options?.ssvOptionalArray),
      pipeArray: buildPipeCollection(pipeArray),
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .post({ ...operationOptionsToRequestParameters(options) });
}

export async function _createDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function create(
  context: TestingContext,
  ssvArray: number[],
  pipeArray: string[],
  options: QueryOperationsCreateOptionalParams = { requestOptions: {} },
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
import { expandUrlTemplate } from "../../../static-helpers/urlTemplate.js";
import type { TestingContext } from "../../testingClientContext.js";
import type { QueryOperationsReadOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  ssvArray: number[],
  options: QueryOperationsReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/query{?ssvArray*,ssvOptionalArray*}",
    { ssvArray: ssvArray, ssvOptionalArray: options?.ssvOptionalArray },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters(options) });
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
  ssvArray: number[],
  options: QueryOperationsReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, ssvArray, options);
  return _readDeserialize(result);
}
```
