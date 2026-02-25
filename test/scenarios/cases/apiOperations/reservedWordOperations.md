# should generate reserved words operation with prefix $ continue

## TypeSpec

```tsp
model Test {
  result: string;
}
op continue(): Test;
```

## Operations

```ts operations
import { type Test, testDeserializer } from "../models/models.js";
import type { ContinueOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _continueSend(
  context: Client,
  options: ContinueOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _continueDeserialize(
  result: PathUncheckedResponse,
): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}

export async function continue_(
  context: Client,
  options: ContinueOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _continueSend(context, options);
  return _continueDeserialize(result);
}
```

# should generate reserved words operation with prefix $ return

## TypeSpec

```tsp
model Test {
  result: string;
}
op `return`(): Test;
```

## Operations

```ts operations
import { type Test, testDeserializer } from "../models/models.js";
import type { ReturnOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _returnSend(
  context: Client,
  options: ReturnOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _returnDeserialize(
  result: PathUncheckedResponse,
): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}

export async function return_(
  context: Client,
  options: ReturnOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _returnSend(context, options);
  return _returnDeserialize(result);
}
```

# should generate reserved words operation global

## TypeSpec

```tsp
model Test {
  result: string;
}
op global(): Test;
```

## Operations

```ts operations
import { type Test, testDeserializer } from "../models/models.js";
import type { GlobalOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _globalSend(
  context: Client,
  options: GlobalOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _globalDeserialize(
  result: PathUncheckedResponse,
): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}

export async function global(
  context: Client,
  options: GlobalOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _globalSend(context, options);
  return _globalDeserialize(result);
}
```
