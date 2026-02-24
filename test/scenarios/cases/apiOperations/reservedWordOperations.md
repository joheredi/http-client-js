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
import {
  type Test as Test_1,
  testDeserializer as testDeserializer_1,
} from "../models/models.js";
import type { ContinueOptionalParams as ContinueOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _continueSend(
  context: Client_1,
  options: ContinueOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _continueDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Test_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return testDeserializer_1(result.body);
}

export async function continue_(
  context: Client_1,
  options: ContinueOptionalParams_1 = { requestOptions: {} },
): Promise<Test_1> {
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
import {
  type Test as Test_1,
  testDeserializer as testDeserializer_1,
} from "../models/models.js";
import type { ReturnOptionalParams as ReturnOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _returnSend(
  context: Client_1,
  options: ReturnOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _returnDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Test_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return testDeserializer_1(result.body);
}

export async function return_(
  context: Client_1,
  options: ReturnOptionalParams_1 = { requestOptions: {} },
): Promise<Test_1> {
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
import {
  type Test as Test_1,
  testDeserializer as testDeserializer_1,
} from "../models/models.js";
import type { GlobalOptionalParams as GlobalOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _globalSend(
  context: Client_1,
  options: GlobalOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _globalDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Test_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return testDeserializer_1(result.body);
}

export async function global(
  context: Client_1,
  options: GlobalOptionalParams_1 = { requestOptions: {} },
): Promise<Test_1> {
  const result = await _globalSend(context, options);
  return _globalDeserialize(result);
}
```
