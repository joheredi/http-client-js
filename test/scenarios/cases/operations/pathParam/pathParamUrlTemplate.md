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
  errorResponseDeserializer,
  type KeyBundle,
  keyBundleDeserializer,
} from "../models/models.js";
import { UpdateKeyOptionalParams } from "./options.js";
import {
  Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@azure-rest/core-client";
import { expandUrlTemplate } from "@typespec/ts-http-runtime";

export function _updateKeySend(
  context: Client,
  keyName: string,
  keyVersion: string,
  parameters: string,
  options: UpdateKeyOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/keys/{key-name}/{key-version}{?api%2Dversion}",
    {
      "api%2Dversion": context.apiVersion ?? "2022-05-15-preview",
      "key-name": keyName,
      "key-version": keyVersion,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).patch({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: parameters,
  });
}

export async function _updateKeyDeserialize(
  result: PathUncheckedResponse,
): Promise<KeyBundle> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    error.details = errorResponseDeserializer(result.body);
    throw error;
  }

  return keyBundleDeserializer(result.body);
}

/**
 * The most basic operation.
 *
 * @param {Client} context
 * @param {string} keyName
 * @param {string} keyVersion
 * @param {string} parameters
 * @param {UpdateKeyOptionalParams} options
 */
export async function updateKey(
  context: Client,
  keyName: string,
  keyVersion: string,
  parameters: string,
  options: UpdateKeyOptionalParams = { requestOptions: {} },
): Promise<KeyBundle> {
  const result = await _updateKeySend(
    context,
    keyName,
    keyVersion,
    parameters,
    options,
  );
  return _updateKeyDeserialize(result);
}
```
