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
import {
  type Configuration as Configuration_1,
  configurationDeserializer as configurationDeserializer_1,
} from "../models/models.js";
import type {
  CreateOptionalParams as CreateOptionalParams_1,
  TestQueryOptionalParams as TestQueryOptionalParams_1,
} from "./operations/options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _testQuerySend(
  context: Client_1,
  options: TestQueryOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/api/test{?maxResults,sortOrder,limit,typeMismatch,serverDefault}",
    {
      maxResults: options?.maxResults,
      sortOrder: options?.sortOrder,
      limit: options?.limit,
      typeMismatch: options?.typeMismatch,
      serverDefault: options?.serverDefault,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      "custom-header": options?.customHeader,
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testQueryDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Configuration_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return configurationDeserializer_1(result.body);
}

export async function testQuery(
  context: Client_1,
  options: TestQueryOptionalParams_1 = { requestOptions: {} },
): Promise<Configuration_1> {
  const result = await _testQuerySend(context, options);
  return _testQueryDeserialize(result);
}

export function _createSend(
  context: Client_1,
  options: CreateOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/api/create").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "text/plain",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: options?.body,
  });
}

export async function _createDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function create(
  context: Client_1,
  options: CreateOptionalParams_1 = { requestOptions: {} },
): Promise<string> {
  const result = await _createSend(context, options);
  return _createDeserialize(result);
}
```

# Should not apply client default values for required parameters

## TypeSpec

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
import {
  type Configuration as Configuration_1,
  configurationDeserializer as configurationDeserializer_1,
} from "../models/models.js";
import type {
  CreateRequiredOptionalParams as CreateRequiredOptionalParams_1,
  TestRequiredOptionalParams as TestRequiredOptionalParams_1,
} from "./operations/options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _testRequiredSend(
  context: Client_1,
  limit: number,
  options: TestRequiredOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/api/required{?maxResults,limit}",
    { maxResults: options?.maxResults, limit: limit },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      "custom-header": options?.customHeader,
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testRequiredDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Configuration_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return configurationDeserializer_1(result.body);
}

export async function testRequired(
  context: Client_1,
  limit: number,
  options: TestRequiredOptionalParams_1 = { requestOptions: {} },
): Promise<Configuration_1> {
  const result = await _testRequiredSend(context, limit, options);
  return _testRequiredDeserialize(result);
}

export function _createRequiredSend(
  context: Client_1,
  options: CreateRequiredOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/api/createRequired").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "text/plain",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: options?.body,
  });
}

export async function _createRequiredDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function createRequired(
  context: Client_1,
  options: CreateRequiredOptionalParams_1 = { requestOptions: {} },
): Promise<string> {
  const result = await _createRequiredSend(context, options);
  return _createRequiredDeserialize(result);
}
```
