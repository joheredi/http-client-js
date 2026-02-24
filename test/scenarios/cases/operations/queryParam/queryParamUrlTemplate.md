# should serialize name normalize in url query template

## TypeSpec

```tsp
op read(@path pathParam: string, @query("key-name")
    keyName: string, @query("key-version")
    keyVersion: string, @body
    parameters: string): OkResponse;
```

## Operations

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
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions_1 {}

export function _readSend(
  context: Client_1,
  pathParam: string,
  keyName: string,
  keyVersion: string,
  parameters: string,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{pathParam}{?key%2Dname,key%2Dversion}",
    { pathParam: pathParam, "key-name": keyName, "key-version": keyVersion },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "text/plain",
    body: parameters,
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  pathParam: string,
  keyName: string,
  keyVersion: string,
  parameters: string,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(
    context,
    pathParam,
    keyName,
    keyVersion,
    parameters,
    options,
  );
  return _readDeserialize(result);
}
```
