# Should generate optional body in option parameter

Should generate optional body in option parameter.

## TypeSpec

This is tsp definition.

```tsp
@doc("This is a simple model.")
model BodyParameter {
  name: string;
}
@doc("This is a model with all http request decorator.")
model CompositeRequest {
  @path
  name: string;

  @query
  requiredQuery: string;

  @query
  optionalQuery?: string;

  @body
  widget?: BodyParameter;
}

@doc("show example demo")
op read(...CompositeRequest): { @body body: {}};
```

## Example

Raw json files.

```json
{
  "title": "read",
  "operationId": "read",
  "parameters": {
    "name": "required path param",
    "optionalQuery": "renamed optional query",
    "requiredQuery": "required query",
    "body": {
      "name": "body name"
    }
  },
  "responses": {
    "200": {}
  }
}
```

## Provide generated operation options

Generated operation options.

```ts models:withOptions
import type { BodyParameter } from "../models/models.js";
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions {
  optionalQuery?: string;
  widget?: BodyParameter;
}
```

## Provide generated operations to call rest-level methods

## Operations

Should generate operations correctly:

```ts operations
import {
  type _ReadResponse,
  _readResponseDeserializer,
  bodyParameterSerializer,
} from "../models/models.js";
import { ReadOptionalParams } from "./options.js";
import {
  Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client,
  name: string,
  requiredQuery: string,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{name}{?requiredQuery,optionalQuery}",
    {
      name: name,
      requiredQuery: requiredQuery,
      optionalQuery: options?.optionalQuery,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: !options?.widget
      ? options?.widget
      : bodyParameterSerializer(options?.widget),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<_ReadResponse> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return _readResponseDeserializer(result.body);
}

/**
 * show example demo
 *
 * @param {Client} context
 * @param {string} name
 * @param {string} requiredQuery
 * @param {ReadOptionalParams} options
 */
export async function read(
  context: Client,
  name: string,
  requiredQuery: string,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<_ReadResponse> {
  const result = await _readSend(context, name, requiredQuery, options);
  return _readDeserialize(result);
}
```

## Samples

Generate optional body in option parameter:

```ts samples
/** This file path is /samples-dev/readSample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to show example demo
 *
 * @summary show example demo
 * x-ms-original-file: json.json
 */
async function read(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.read("required path param", "required query", {
    optionalQuery: "renamed optional query",
    widget: {},
  });
  console.log(result);
}

async function main(): Promise<void> {
  await read();
}

main().catch(console.error);
```
