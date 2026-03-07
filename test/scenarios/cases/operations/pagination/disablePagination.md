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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface ListTestResult
 */
export interface ListTestResult {
  tests: Test[];
  next: string;
}

/**
 * model interface Test
 */
export interface Test {
  id: string;
}
```

```ts serialization
import type { ListTestResult, Test } from "../models.js";

export function listTestResultDeserializer(item: any): ListTestResult {
  return {
    tests: testArrayDeserializer(item["tests"]),
    next: item["next"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    id: item["id"],
  };
}

export function testArrayDeserializer(result: Array<Test>): any[] {
  return result.map((item) => {
    return testDeserializer(item);
  });
}
```

## Operations

```ts operations
import type { ListTestResult } from "../models/models.js";
import { listTestResultDeserializer } from "../models/serialization/serialization.js";
import type { BarOptionalParams, FooOptionalParams } from "./options.js";
import type { TestServiceContext } from "./testServiceClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _barSend(
  context: TestServiceContext,
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
  context: TestServiceContext,
  options: BarOptionalParams = { requestOptions: {} },
): Promise<ListTestResult> {
  const result = await _barSend(context, options);
  return _barDeserialize(result);
}

export function _fooSend(
  context: TestServiceContext,
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
  context: TestServiceContext,
  options: FooOptionalParams = { requestOptions: {} },
): Promise<ListTestResult> {
  const result = await _fooSend(context, options);
  return _fooDeserialize(result);
}
```
