# Should generate normal path parameter for @path(#{ allowReserved: false }

## TypeSpec

This is tsp definition.

```tsp
@route("annotationWithFalse")
op annotationWithFalse(@path(#{ allowReserved: false }) param: string): void;
```

## Provide generated operations to call rest-level methods

## Operations

Should normal path parameter:

```ts operations
import type { AnnotationWithFalseOptionalParams as AnnotationWithFalseOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _annotationWithFalseSend(
  context: Client_1,
  param: string,
  options: AnnotationWithFalseOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/annotationWithFalse/{param}",
    { param: param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _annotationWithFalseDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function annotationWithFalse(
  context: Client_1,
  param: string,
  options: AnnotationWithFalseOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _annotationWithFalseSend(context, param, options);
  return _annotationWithFalseDeserialize(result);
}
```
