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
export interface _PostRequest {
  code?: string;
  message?: string;
  propA?: _PostRequest | null;
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
  type _PostRequest as _PostRequest_1,
  _postRequestDeserializer as _postRequestDeserializer_1,
  _postRequestSerializer as _postRequestSerializer_1,
} from "../models/models.js";
import type { PostOptionalParams as PostOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _postSend(
  context: Client_1,
  body: _PostRequest_1 | null,
  options: PostOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: _postRequestSerializer_1(body),
  });
}

export async function _postDeserialize(
  result: PathUncheckedResponse_1,
): Promise<_PostRequest_1 | null> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return _postRequestDeserializer_1(result.body);
}

export async function post(
  context: Client_1,
  body: _PostRequest_1 | null,
  options: PostOptionalParams_1 = { requestOptions: {} },
): Promise<_PostRequest_1 | null> {
  const result = await _postSend(context, body, options);
  return _postDeserialize(result);
}
```
