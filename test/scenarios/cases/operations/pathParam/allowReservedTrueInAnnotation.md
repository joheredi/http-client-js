# Should generate path allowReserved:true parameter for @path(#{ allowReserved: true }

## TypeSpec

This is tsp definition.

```tsp
@route("annotation")
op annotation(@path(#{ allowReserved: true }) param: string): void;
```

## Provide generated operations to call rest-level methods

## Operations

Should enable `allowReserved:true` for path parameter:

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
 * Optional parameters for the annotation operation.
 */
export interface AnnotationOptionalParams extends OperationOptions_1 {}

export function _annotationSend(
  context: Client_1,
  param: string,
  options: AnnotationOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/annotation/{+param}",
    { param: param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _annotationDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function annotation(
  context: Client_1,
  param: string,
  options: AnnotationOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _annotationSend(context, param, options);
  return _annotationDeserialize(result);
}
```
