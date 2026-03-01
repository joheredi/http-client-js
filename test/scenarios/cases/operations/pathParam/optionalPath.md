# Should support path parameters

## TypeSpec

This is tsp definition.

```tsp
op read(@path param?: string): OkResponse;
```

## Operations

Should normal path parameter:

```ts operations
import type { ReadOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import type { TestingContext } from "../testingClientContext.js";

export function _readSend(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "{/param}",
    { param: options?.param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
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
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

## Options should include optional path parameter

```ts models:withOptions
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions {
  param?: string;
}
```
