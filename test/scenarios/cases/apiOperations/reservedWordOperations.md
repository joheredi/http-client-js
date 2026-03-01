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
import { ContinueOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { TestingContext } from "../testingClientContext.js";

export function _$continueSend(
  context: TestingContext,
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

export async function _$continueDeserialize(
  result: PathUncheckedResponse,
): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}

/**
 * @fixme continue is a reserved word that cannot be used as an operation name.
 * Please add @clientName("clientName") or @clientName("<JS-Specific-Name>",
 * "javascript") to the operation to override the generated name.
 *
 * @param {TestingContext} context
 * @param {ContinueOptionalParams} options
 */
export async function $continue(
  context: TestingContext,
  options: ContinueOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _$continueSend(context, options);
  return _$continueDeserialize(result);
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
import { ReturnOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { TestingContext } from "../testingClientContext.js";

export function _$returnSend(
  context: TestingContext,
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

export async function _$returnDeserialize(
  result: PathUncheckedResponse,
): Promise<Test> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return testDeserializer(result.body);
}

/**
 * @fixme return is a reserved word that cannot be used as an operation name.
 * Please add @clientName("clientName") or @clientName("<JS-Specific-Name>",
 * "javascript") to the operation to override the generated name.
 *
 * @param {TestingContext} context
 * @param {ReturnOptionalParams} options
 */
export async function $return(
  context: TestingContext,
  options: ReturnOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _$returnSend(context, options);
  return _$returnDeserialize(result);
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
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _globalSend(
  context: TestingContext,
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
  context: TestingContext,
  options: GlobalOptionalParams = { requestOptions: {} },
): Promise<Test> {
  const result = await _globalSend(context, options);
  return _globalDeserialize(result);
}
```
