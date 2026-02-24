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
import type { BodyParameter as BodyParameter_1 } from "../models/models.js";
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions_1 {
  optionalQuery?: string;
  widget?: BodyParameter_1;
}
```

## Provide generated operations to call rest-level methods

## Operations

Should generate operations correctly:

```ts operations
import {
  bodyParameterSerializer as bodyParameterSerializer_1,
  type ReadResponse as ReadResponse_1,
  readResponseDeserializer as readResponseDeserializer_1,
} from "../models/models.js";
import { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  name: string,
  requiredQuery: string,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{name}{?requiredQuery,optionalQuery}",
    {
      name: name,
      requiredQuery: requiredQuery,
      optionalQuery: options?.optionalQuery,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: !options?.widget
      ? options?.widget
      : bodyParameterSerializer_1(options?.widget),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<ReadResponse_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return readResponseDeserializer_1(result.body);
}

/**
 * show example demo
 *
 * @param {Client_1} context
 * @param {string} name
 * @param {string} requiredQuery
 * @param {ReadOptionalParams_1} options
 */
export async function read(
  context: Client_1,
  name: string,
  requiredQuery: string,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<ReadResponse_1> {
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
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function read(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.read("required path param", "required query", {
    widget: { name: "body name" },
    optionalQuery: "renamed optional query",
  });
  console.log(result);
}

async function main(): Promise<void> {
  await read();
}

main().catch(console.error);
```
