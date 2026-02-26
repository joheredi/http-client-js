# Text parts

## TypeSpec

```tsp
model RequestBody {
  firstName: HttpPart<string>;
  lastName: HttpPart<string>;
}

op doThing(@header contentType: "multipart/form-data", @multipartBody bodyParam: RequestBody): void;
```

## Models

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface RequestBody
 */
export interface RequestBody {
  firstName: string;
  lastName: string;
}

export function requestBodySerializer(item: RequestBody): any {
  return [
    { name: "firstName", body: item["firstName"] },
    { name: "lastName", body: item["lastName"] },
  ];
}
```

## Operations

```ts operations
import { type RequestBody, requestBodySerializer } from "../models/models.js";
import type { DoThingOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _doThingSend(
  context: Client,
  bodyParam: RequestBody,
  options: DoThingOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "multipart/form-data",
    body: requestBodySerializer(bodyParam),
  });
}

export async function _doThingDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function doThing(
  context: Client,
  bodyParam: RequestBody,
  options: DoThingOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _doThingSend(context, bodyParam, options);
  return _doThingDeserialize(result);
}
```

# Optionality

```tsp
model RequestBody {
  lastName?: HttpPart<string>;
}

op doThing(@header contentType: "multipart/form-data", @multipartBody bodyParam: RequestBody): void;
```

## Models

If a part is optional, not specifying a value should cause no part to be sent in the request.

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface RequestBody
 */
export interface RequestBody {
  lastName?: string;
}

export function requestBodySerializer(item: RequestBody): any {
  return [
    ...(item["lastName"] === undefined
      ? []
      : [{ name: "lastName", body: item["lastName"] }]),
  ];
}
```

# Array of text parts

This case is multiple text parts

```tsp
model RequestBody {
  names: HttpPart<string>[];
}

op doThing(@header contentType: "multipart/form-data", @multipartBody bodyParam: RequestBody): void;
```

## Models

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface RequestBody
 */
export interface RequestBody {
  names: string[];
}

export function requestBodySerializer(item: RequestBody): any {
  return [...item["names"].map((x: unknown) => ({ name: "names", body: x }))];
}
```
