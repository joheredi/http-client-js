# should serialize name normalize in url path template

## TypeSpec

```tsp
alias KeyVaultOperation<
  TParams extends Reflection.Model,
  TResponse,
  Traits extends Reflection.Model = {},
> = Foundations.Operation<TParams, TResponse, Traits>;
model KeyBundle {
  key?: string;
}
#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Foundations.Operation is necessary for Key Vault"
@summary("The update key operation changes specified attributes of a stored key and can be applied to any key type and key version stored in Azure Key Vault.")
@route("/keys/{key-name}/{key-version}")
@patch(#{implicitOptionality: true})
op updateKey is KeyVaultOperation<
  {
    /**
     * The name of key to update.
     */
    @path("key-name")
    keyName: string;

    /**
     * The version of the key to update.
     */
    @path("key-version")
    keyVersion: string;

    /**
     * The parameters of the key to update.
     */
    @body
    parameters: string;
  },
  KeyBundle
>;

```

The config would be like:

```yaml
needAzureCore: true
withVersionedApiVersion: true
```

## Operations

```ts operations
import {
  errorResponseDeserializer as errorResponseDeserializer_1,
  type KeyBundle as KeyBundle_1,
  keyBundleDeserializer as keyBundleDeserializer_1,
} from "../models/models.js";
import { UpdateKeyOptionalParams as UpdateKeyOptionalParams_1 } from "./options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _updateKeySend(
  context: Client_1,
  apiVersion: string,
  keyName: string,
  keyVersion: string,
  parameters: string,
  options: UpdateKeyOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/keys/{key-name}/{key-version}{?api%2Dversion}",
    {
      "api-version": apiVersion,
      "key-name": keyName,
      "key-version": keyVersion,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).patch({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "text/plain",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: parameters,
  });
}

export async function _updateKeyDeserialize(
  result: PathUncheckedResponse_1,
): Promise<KeyBundle_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError_1(result);
    error.details = errorResponseDeserializer_1(result.body);
    throw error;
  }

  return keyBundleDeserializer_1(result.body);
}

/**
 * The most basic operation.
 *
 * @param {Client_1} context
 * @param {string} apiVersion
 * @param {string} keyName
 * @param {string} keyVersion
 * @param {string} parameters
 * @param {UpdateKeyOptionalParams_1} options
 */
export async function updateKey(
  context: Client_1,
  apiVersion: string,
  keyName: string,
  keyVersion: string,
  parameters: string,
  options: UpdateKeyOptionalParams_1 = { requestOptions: {} },
): Promise<KeyBundle_1> {
  const result = await _updateKeySend(
    context,
    apiVersion,
    keyName,
    keyVersion,
    parameters,
    options,
  );
  return _updateKeyDeserialize(result);
}
```
