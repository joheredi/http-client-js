# should handle model property name with capitalized first letter

## TypeSpec

```tsp
model ListCredentialsRequest{
  serviceName: string;
  PROPERTY_NAME: string;
}

@doc("show example demo")
op post(@query QUERY_PARAM?: string, @header HEADER_PARAM?: string,@path PATH_PARAM?: string, @body ListCredentialsRequest?: ListCredentialsRequest): void;
```

Should ingore the warning `@azure-tools/typespec-ts/property-name-normalized`:

```yaml
mustEmptyDiagnostic: false
```

## Example

Raw json files.

```json
{
  "title": "post",
  "operationId": "post",
  "parameters": {
    "QUERY_PARAM": "query",
    "header_param": "header",
    "PATH_PARAM": "path",
    "ListCredentialsRequest": {
      "serviceName": "SSH",
      "PROPERTY_NAME": "name"
    }
  },
  "responses": {
    "200": {}
  }
}
```

## Provide generated operations, models and samples

Operations

```ts operations
import { listCredentialsRequestSerializer } from "../models/models.js";
import { PostOptionalParams } from "./options.js";
import {
  Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";

export function _postSend(
  context: Client,
  options: PostOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "{/PATH_PARAM}{?QUERY_PARAM}",
    { QUERY_PARAM: options?.QUERY_PARAM, PATH_PARAM: options?.PATH_PARAM },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      ...(options?.HEADER_PARAM !== undefined
        ? { header_param: options?.HEADER_PARAM }
        : {}),
      ...options.requestOptions?.headers,
    },
    body: !options?.ListCredentialsRequest
      ? options?.ListCredentialsRequest
      : listCredentialsRequestSerializer(options?.ListCredentialsRequest),
  });
}

export async function _postDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

/**
 * show example demo
 *
 * @param {Client} context
 * @param {PostOptionalParams} options
 */
export async function post(
  context: Client,
  options: PostOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _postSend(context, options);
  return _postDeserialize(result);
}
```

Models

```ts models:withOptions
import type { ListCredentialsRequest } from "../models/models.js";
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the post operation.
 */
export interface PostOptionalParams extends OperationOptions {
  queryParam?: string;
  headerParam?: string;
  pathParam?: string;
  listCredentialsRequest?: ListCredentialsRequest;
}
```

Samples

```ts samples
/** This file path is /samples-dev/postSample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to show example demo
 *
 * @summary show example demo
 * x-ms-original-file: json.json
 */
async function post(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.post({
    QUERY_PARAM: "query",
    HEADER_PARAM: "header",
    PATH_PARAM: "path",
    ListCredentialsRequest: { serviceName: "SSH", PROPERTY_NAME: "name" },
  });
  console.log(result);
}

async function main(): Promise<void> {
  await post();
}

main().catch(console.error);
```
