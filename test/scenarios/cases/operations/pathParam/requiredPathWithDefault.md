# Should not generate required constant path parameter

Should generate required constant path parameter in option parameter.

## TypeSpec

This is tsp definition.

```tsp
@doc("show example demo")
@route("/{strDefault}/{numberDefault}")
op read(@path strDefault: "foobar", @path numberDefault: 1): void;
```

## Provide generated operation options

Generated operation options.

```ts models:withOptions
import { OperationOptions } from "@azure-rest/core-client";

/** Optional parameters. */
export interface ReadOptionalParams extends OperationOptions {}
```

## Provide generated operations to call rest-level methods

## Operations

Should generate operations correctly:

```ts operations
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  type OperationOptions as OperationOptions_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions_1 {}

export function _readSend(
  context: Client_1,
  strDefault: "foobar",
  numberDefault: 1,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{strDefault}/{numberDefault}",
    { strDefault: strDefault, numberDefault: numberDefault },
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

/**
 * show example demo
 *
 * @param {Client_1} context
 * @param {"foobar"} strDefault
 * @param {1} numberDefault
 * @param {ReadOptionalParams} options
 */
export async function read(
  context: Client_1,
  strDefault: "foobar",
  numberDefault: 1,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, strDefault, numberDefault, options);
  return _readDeserialize(result);
}
```
