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
import {
  type RequestBody as RequestBody_1,
  requestBodySerializer as requestBodySerializer_1,
} from "../models/models.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  type OperationOptions as OperationOptions_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the doThing operation.
 */
export interface DoThingOptionalParams extends OperationOptions_1 {}

export function _doThingSend(
  context: Client_1,
  contentType: "multipart/form-data",
  bodyParam: RequestBody_1,
  options: DoThingOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "multipart/form-data",
    body: requestBodySerializer_1(bodyParam),
  });
}

export async function _doThingDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function doThing(
  context: Client_1,
  contentType: "multipart/form-data",
  bodyParam: RequestBody_1,
  options: DoThingOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _doThingSend(context, contentType, bodyParam, options);
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
export interface RequestBody {
  names: string[];
}

export function requestBodySerializer(item: RequestBody): any {
  return [...item["names"].map((x: unknown) => ({ name: "names", body: x }))];
}
```
