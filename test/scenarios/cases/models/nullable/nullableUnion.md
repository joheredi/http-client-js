# should handle recursive nullable union

## TypeSpec

```tsp
union A {
  null,
  {
    code?: string,
    message?: string,
    propA?: A,
  },
}
op post(@body body: A): { @body body: A };
```

## Models

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface _PostRequest
 */
export interface _PostRequest {
  code?: string;
  message?: string;
  propA?: _PostRequest;
}

export function _postRequestSerializer(item: _PostRequest): any {
  return {
    code: item["code"],
    message: item["message"],
    propA: !item["propA"]
      ? item["propA"]
      : _postRequestSerializer(item["propA"]),
  };
}

export function _postRequestDeserializer(item: any): _PostRequest {
  return {
    code: item["code"],
    message: item["message"],
    propA: !item["propA"]
      ? item["propA"]
      : _postRequestDeserializer(item["propA"]),
  };
}
```

## Operations

```ts operations
import {
  type _PostRequest,
  _postRequestDeserializer,
  _postRequestSerializer,
} from "../models/models.js";
import type { PostOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _postSend(
  context: Client,
  body: _PostRequest | null,
  options: PostOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: _postRequestSerializer(body),
  });
}

export async function _postDeserialize(
  result: PathUncheckedResponse,
): Promise<_PostRequest | null> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return _postRequestDeserializer(result.body);
}

export async function post(
  context: Client,
  body: _PostRequest | null,
  options: PostOptionalParams = { requestOptions: {} },
): Promise<_PostRequest | null> {
  const result = await _postSend(context, body, options);
  return _postDeserialize(result);
}
```
