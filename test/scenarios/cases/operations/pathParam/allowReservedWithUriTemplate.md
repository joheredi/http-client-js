# Should generate path allowReserved:true parameter for {+param}

## TypeSpec

This is tsp definition.

```tsp
@route("template/{+param}")
op template(param: string): void;
```

## Provide generated operations to call rest-level methods

## Operations

Should enable `allowReserved:true` for path parameter:

```ts operations
import type { TemplateOptionalParams as TemplateOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _templateSend(
  context: Client_1,
  param: string,
  options: TemplateOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/template/{+param}",
    { param: param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _templateDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function template(
  context: Client_1,
  param: string,
  options: TemplateOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _templateSend(context, param, options);
  return _templateDeserialize(result);
}
```
