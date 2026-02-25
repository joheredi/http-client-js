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
  type ListTestResult,
  listTestResultDeserializer,
} from "../models/models.js";
import type { BarOptionalParams, FooOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _barSend(
  context: Client,
  options: BarOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/list-get").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _barDeserialize(
  result: PathUncheckedResponse,
): Promise<ListTestResult> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return listTestResultDeserializer(result.body);
}

export async function bar(
  context: Client,
  options: BarOptionalParams = { requestOptions: {} },
): Promise<ListTestResult> {
  const result = await _barSend(context, options);
  return _barDeserialize(result);
}

export function _fooSend(
  context: Client,
  options: FooOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/list-post").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _fooDeserialize(
  result: PathUncheckedResponse,
): Promise<ListTestResult> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return listTestResultDeserializer(result.body);
}

export async function foo(
  context: Client,
  options: FooOptionalParams = { requestOptions: {} },
): Promise<ListTestResult> {
  const result = await _fooSend(context, options);
  return _fooDeserialize(result);
}
```
