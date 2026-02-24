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
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  type OperationOptions as OperationOptions_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the annotationWithFalse operation.
 */
export interface AnnotationWithFalseOptionalParams extends OperationOptions_1 {}

export function _annotationWithFalseSend(
  context: Client_1,
  param: string,
  options: AnnotationWithFalseOptionalParams = { requestOptions: {} },
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
  options: AnnotationWithFalseOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _annotationWithFalseSend(context, param, options);
  return _annotationWithFalseDeserialize(result);
}
```
