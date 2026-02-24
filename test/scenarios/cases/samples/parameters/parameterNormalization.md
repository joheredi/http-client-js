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
import { listCredentialsRequestSerializer as listCredentialsRequestSerializer_1 } from "../models/models.js";
import { PostOptionalParams as PostOptionalParams_1 } from "./options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _postSend(
  context: Client_1,
  options: PostOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "{/PATH_PARAM}{?QUERY_PARAM}",
    { QUERY_PARAM: options?.QUERY_PARAM, PATH_PARAM: options?.PATH_PARAM },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      header_param: options?.HEADER_PARAM,
      ...options.requestOptions?.headers,
    },
    body: !options?.ListCredentialsRequest
      ? options?.ListCredentialsRequest
      : listCredentialsRequestSerializer_1(options?.ListCredentialsRequest),
  });
}

export async function _postDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

/**
 * show example demo
 *
 * @param {Client_1} context
 * @param {PostOptionalParams_1} options
 */
export async function post(
  context: Client_1,
  options: PostOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _postSend(context, options);
  return _postDeserialize(result);
}
```

Models

```ts models:withOptions
import type { ListCredentialsRequest as ListCredentialsRequest_1 } from "../models/models.js";
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the post operation.
 */
export interface PostOptionalParams extends OperationOptions_1 {
  queryParam?: string;
  headerParam?: string;
  pathParam?: string;
  listCredentialsRequest?: ListCredentialsRequest_1;
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
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function post(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  await client.post({
    listCredentialsRequest: { serviceName: "SSH", propertyName: "name" },
    queryParam: "query",
    headerParam: "header",
    pathParam: "path",
  });
}

async function main(): Promise<void> {
  await post();
}

main().catch(console.error);
```
