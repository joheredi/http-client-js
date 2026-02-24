# Should generate query parameter with start(\*) character

## TypeSpec

This is tsp definition.

```tsp
@route("primitive?fixed=true{&param*}")
op primitive(param: string): void;

@route("array?fixed=true{&param*}")
op `array`(param: string[]): void;

@route("record?fixed=true{&param*}")
op `record`(param: Record<int32>): void;
```

## Provide generated operations to call rest-level methods

## Operations

Should enable URI template parse for parameters:

```ts operations
import type {
  ArrayOptionalParams as ArrayOptionalParams_1,
  PrimitiveOptionalParams as PrimitiveOptionalParams_1,
  RecordOptionalParams as RecordOptionalParams_1,
} from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _primitiveSend(
  context: Client_1,
  param: string,
  options: PrimitiveOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/primitive?fixed=true{&param*}",
    { param: param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _primitiveDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function primitive(
  context: Client_1,
  param: string,
  options: PrimitiveOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _primitiveSend(context, param, options);
  return _primitiveDeserialize(result);
}

export function _arraySend(
  context: Client_1,
  param: string[],
  options: ArrayOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/array?fixed=true{&param*}",
    { param: param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _arrayDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function array(
  context: Client_1,
  param: string[],
  options: ArrayOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _arraySend(context, param, options);
  return _arrayDeserialize(result);
}

export function _recordSend(
  context: Client_1,
  param: Record<string, number>,
  options: RecordOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/record?fixed=true{&param*}",
    { param: param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _recordDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function record(
  context: Client_1,
  param: Record<string, number>,
  options: RecordOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _recordSend(context, param, options);
  return _recordDeserialize(result);
}
```
