# Should generate query explode: true parameter for @query(#{ explode: true }

## TypeSpec

This is tsp definition.

```tsp
model SelectQueryParameter {
  @query(#{ explode: true })
  select?: string[];
  @query("bar")
  foo: string;
  @query
  "api-version": string;
}
@route("annotation/optional")
op optional(...SelectQueryParameter): void;

model RequiredSelectQueryParameter {
  @query(#{ explode: true })
  select: string[];
}
@route("annotation/required")
op required(...RequiredSelectQueryParameter): void;
```

## Provide generated operations to call rest-level methods

## Operations

Should enable URI template parse for parameters:

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
 * Optional parameters for the optional operation.
 */
export interface OptionalOptionalParams extends OperationOptions_1 {
  select?: string[];
}

export function _optionalSend(
  context: Client_1,
  foo: string,
  apiVersion: string,
  options: OptionalOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/annotation/optional{?select*,bar,api%2Dversion}",
    { select: options?.select, bar: foo, "api-version": api - version },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _optionalDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function optional(
  context: Client_1,
  foo: string,
  apiVersion: string,
  options: OptionalOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _optionalSend(context, foo, api - version, options);
  return _optionalDeserialize(result);
}

/**
 * Optional parameters for the required operation.
 */
export interface RequiredOptionalParams extends OperationOptions_1 {}

export function _requiredSend(
  context: Client_1,
  select: string[],
  options: RequiredOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/annotation/required{?select*}",
    { select: select },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _requiredDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function required(
  context: Client_1,
  select: string[],
  options: RequiredOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _requiredSend(context, select, options);
  return _requiredDeserialize(result);
}
```
