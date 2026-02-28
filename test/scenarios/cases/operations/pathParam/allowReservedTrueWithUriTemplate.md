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
import type { TemplateOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";

export function _templateSend(
  context: Client,
  param: string,
  options: TemplateOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/template/{+param}",
    { param: param },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters(options) });
}

export async function _templateDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function template(
  context: Client,
  param: string,
  options: TemplateOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _templateSend(context, param, options);
  return _templateDeserialize(result);
}
```
