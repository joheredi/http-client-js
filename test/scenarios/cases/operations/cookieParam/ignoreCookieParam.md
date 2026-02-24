# Should ignore cookie parameters for now

// TODO: https://github.com/Azure/autorest.typescript/issues/2898

## TypeSpec

This is tsp definition.

```tsp
op test(@cookie token: string): string;
```

Should ingore the warning `@azure-tools/typespec-ts/parameter-type-not-supported`:

```yaml
mustEmptyDiagnostic: false
```

## Provide generated operations to call rest-level methods

## Operations

Should normal path parameter:

```ts operations
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  type OperationOptions as OperationOptions_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the test operation.
 */
export interface TestOptionalParams extends OperationOptions_1 {}

export function _testSend(
  context: Client_1,
  token: string,
  options: TestOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse_1,
): Promise<string> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function test(
  context: Client_1,
  token: string,
  options: TestOptionalParams = { requestOptions: {} },
): Promise<string> {
  const result = await _testSend(context, token, options);
  return _testDeserialize(result);
}
```
