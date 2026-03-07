# Should apply client default values for optional query, header, and body parameters

## TypeSpec

This tests that query, header, and body parameters with clientDefaultValue are applied when not provided by the user.

```tsp
model Configuration {
  name: string;
}

@route("/api")
interface Operations {
  @get
  @route("/test")
  testQuery(
    @query
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
    maxResults?: int32,

    @query
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("asc")
    sortOrder?: string,

    @header
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("application/json")
    customHeader?: string,

    @query
    limit?: int32,

    @query
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("mismatch")
    typeMismatch?: int32,

    @query
    serverDefault?: int32 = 100
  ): Configuration;

  @post
  @route("/create")
  create(
    @body
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("default-body")
    body?: string
  ): string;
}
```

Enable the TCGC dependency for clientDefaultValue decorator.

```yaml
needTCGC: true
```

## Operations

The generated operations should apply default values for query, header, and body parameters.

```ts operations
import type { Configuration } from "../../../models/models.js";
import { configurationDeserializer } from "../../../models/serialization/serialization.js";
import { expandUrlTemplate } from "../../../static-helpers/urlTemplate.js";
import type { TestingContext } from "../../testingClientContext.js";
import type {
  OperationsCreateOptionalParams,
  OperationsTestQueryOptionalParams,
} from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _testQuerySend(
  context: TestingContext,
  options: OperationsTestQueryOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/api/test{?maxResults,sortOrder,limit,typeMismatch,serverDefault}",
    {
      maxResults: options?.maxResults ?? 10,
      sortOrder: options?.sortOrder ?? "asc",
      limit: options?.limit,
      typeMismatch: options?.typeMismatch,
      serverDefault: options?.serverDefault,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...((options?.customHeader ?? "application/json" !== undefined)
        ? { "custom-header": options?.customHeader ?? "application/json" }
        : {}),
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testQueryDeserialize(
  result: PathUncheckedResponse,
): Promise<Configuration> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return configurationDeserializer(result.body);
}

export async function testQuery(
  context: TestingContext,
  options: OperationsTestQueryOptionalParams = { requestOptions: {} },
): Promise<Configuration> {
  const result = await _testQuerySend(context, options);
  return _testQueryDeserialize(result);
}

export function _createSend(
  context: TestingContext,
  options: OperationsCreateOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/api/create").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: options?.body ?? "default-body",
  });
}

export async function _createDeserialize(
  result: PathUncheckedResponse,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function create(
  context: TestingContext,
  options: OperationsCreateOptionalParams = { requestOptions: {} },
): Promise<string> {
  const result = await _createSend(context, options);
  return _createDeserialize(result);
}
```

# Should apply client default values for required parameters with clientDefaultValue

## TypeSpec

The legacy emitter applies `?? defaultValue` fallbacks for required parameters
that have `@clientDefaultValue`, matching the pattern used for optional parameters.

```tsp
model Configuration {
  name: string;
}

@route("/api")
interface Operations {
  @get
  @route("/required")
  testRequired(
    @query
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
    maxResults: int32,

    @header
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("application/json")
    customHeader: string,

    @query
    limit: int32
  ): Configuration;

  @post
  @route("/createRequired")
  createRequired(
    @body
    @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("default-body")
    body: string
  ): string;
}
```

```yaml
needTCGC: true
```

## Operations

```ts operations
import type { Configuration } from "../../../models/models.js";
import { configurationDeserializer } from "../../../models/serialization/serialization.js";
import { expandUrlTemplate } from "../../../static-helpers/urlTemplate.js";
import type { TestingContext } from "../../testingClientContext.js";
import type {
  OperationsCreateRequiredOptionalParams,
  OperationsTestRequiredOptionalParams,
} from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _testRequiredSend(
  context: TestingContext,
  limit: number,
  options: OperationsTestRequiredOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/api/required{?maxResults,limit}",
    { maxResults: options?.maxResults ?? 10, limit: limit },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      "custom-header": options?.customHeader ?? "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testRequiredDeserialize(
  result: PathUncheckedResponse,
): Promise<Configuration> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return configurationDeserializer(result.body);
}

export async function testRequired(
  context: TestingContext,
  limit: number,
  options: OperationsTestRequiredOptionalParams = { requestOptions: {} },
): Promise<Configuration> {
  const result = await _testRequiredSend(context, limit, options);
  return _testRequiredDeserialize(result);
}

export function _createRequiredSend(
  context: TestingContext,
  options: OperationsCreateRequiredOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/api/createRequired").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: options?.body ?? "default-body",
  });
}

export async function _createRequiredDeserialize(
  result: PathUncheckedResponse,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return result.body;
}

export async function createRequired(
  context: TestingContext,
  options: OperationsCreateRequiredOptionalParams = { requestOptions: {} },
): Promise<string> {
  const result = await _createRequiredSend(context, options);
  return _createRequiredDeserialize(result);
}
```
