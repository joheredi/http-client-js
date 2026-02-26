# Should not generate readonly optional body in sample

Should not generate readonly optional body properties in sample as they cannot be set by users.

## TypeSpec

This is tsp definition.

```tsp
@doc("This is a simple model.")
model BodyParameter {
  name: string;
  @doc("This is a readonly optional property.")
  @visibility(Lifecycle.Read)
  sku?: Sku;
}

@doc("SKU details.")
model Sku {
  name: string;
  tier: string;
}

@doc("This is a model with all http request decorator.")
model CompositeRequest {
  @path
  name: string;

  @query
  requiredQuery: string;

  @body
  widget: BodyParameter;
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
    "requiredQuery": "required query",
    "body": {
      "name": "body name",
      "sku": {
        "name": "ManagedOps",
        "tier": "Essential"
      }
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
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions {}
```

## Provide generated operations to call rest-level methods

## Operations

Should generate operations correctly:

```ts operations
import {
  type _ReadResponse,
  _readResponseDeserializer,
  BodyParameter,
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
  widget: BodyParameter,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/{name}{?requiredQuery}",
    { name: name, requiredQuery: requiredQuery },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: bodyParameterSerializer(widget),
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
 * @param {BodyParameter} widget
 * @param {ReadOptionalParams} options
 */
export async function read(
  context: Client,
  name: string,
  requiredQuery: string,
  widget: BodyParameter,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<_ReadResponse> {
  const result = await _readSend(context, name, requiredQuery, widget, options);
  return _readDeserialize(result);
}
```

## Samples

Generate body parameter but exclude readonly optional properties:

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
  const result = await client.read("required path param", "required query", {});
  console.log(result);
}

async function main(): Promise<void> {
  await read();
}

main().catch(console.error);
```
