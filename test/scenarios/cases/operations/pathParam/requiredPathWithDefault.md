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
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions {}
```

## Provide generated operations to call rest-level methods

## Operations

Should generate operations correctly:

```ts operations
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { ReadOptionalParams } from "./options.js";
import { TestingContext } from "./testingClientContext.js";
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
  const path = expandUrlTemplate(
    "/{strDefault}/{numberDefault}",
    { strDefault: "foobar", numberDefault: 1 },
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

/**
 * show example demo
 *
 * @param {TestingContext} context
 * @param {ReadOptionalParams} options
 */
export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```
