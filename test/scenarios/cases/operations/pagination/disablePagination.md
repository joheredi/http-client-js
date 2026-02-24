# Should disable pagination with @disablePageable decorator

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{
  title: "Test Service"
})
namespace testService;

model ListTestResult {
  @pageItems
  tests: Test[];
  @nextLink
  next: string;
}

model Test {
  id: string;
}

@Legacy.nextLinkVerb("GET")
@list
@route("/list-get")
@post
@Azure.ClientGenerator.Core.Legacy.disablePageable
op bar(): ListTestResult;

@Legacy.nextLinkVerb("POST")
@list
@route("/list-post")
@post
@Azure.ClientGenerator.Core.Legacy.disablePageable
op foo(): ListTestResult;
```

The config would be like:

```yaml
withRawContent: true
```

## models

```ts models
export interface ListTestResult {
  tests: Test[];
  next: string;
}

export interface Test {
  id: string;
}

export function listTestResultDeserializer(item: any): ListTestResult {
  return {
    tests: item["tests"].map((p: any) => {
      return testDeserializer(p);
    }),
    next: item["next"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    id: item["id"],
  };
}
```

## Operations

```ts operations
import {
  type ListTestResult as ListTestResult_1,
  listTestResultDeserializer as listTestResultDeserializer_1,
} from "../models/models.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  type OperationOptions as OperationOptions_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the bar operation.
 */
export interface BarOptionalParams extends OperationOptions_1 {}

export function _barSend(
  context: Client_1,
  options: BarOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/list-get").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _barDeserialize(
  result: PathUncheckedResponse_1,
): Promise<ListTestResult_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return listTestResultDeserializer_1(result.body);
}

export async function bar(
  context: Client_1,
  options: BarOptionalParams = { requestOptions: {} },
): Promise<ListTestResult_1> {
  const result = await _barSend(context, options);
  return _barDeserialize(result);
}

/**
 * Optional parameters for the foo operation.
 */
export interface FooOptionalParams extends OperationOptions_1 {}

export function _fooSend(
  context: Client_1,
  options: FooOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/list-post").post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _fooDeserialize(
  result: PathUncheckedResponse_1,
): Promise<ListTestResult_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return listTestResultDeserializer_1(result.body);
}

export async function foo(
  context: Client_1,
  options: FooOptionalParams = { requestOptions: {} },
): Promise<ListTestResult_1> {
  const result = await _fooSend(context, options);
  return _fooDeserialize(result);
}
```
