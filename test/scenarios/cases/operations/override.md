# Should handle optional parameter filtering when using @@override

Tests that optional parameters are correctly removed from URI templates when using @@override directive.

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{
  title: "KeyVault Service"
})
namespace KeyVault;

// Original operation with outContentType parameter
@route("/secrets/{secretName}")
@get
op getSecretOriginal(
  @path secretName: string,
  @query @clientName("outContentType") outContentType?: string
): void;

// Override operation without outContentType parameter
op getSecret(
  @path secretName: string,
): void;

@@override(KeyVault.getSecretOriginal, KeyVault.getSecret);
```

The config would be like:

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Models with Options

The options interface should be correctly generated:

```ts models:withOptions
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the getSecretOriginal operation.
 */
export interface GetSecretOriginalOptionalParams extends OperationOptions {}
```

## Operations

```ts operations
import type { GetSecretOriginalOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getSecretOriginalSend(
  context: Client,
  secretName: string,
  options: GetSecretOriginalOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/secrets/{secretName}{?outContentType}",
    { secretName: secretName, outContentType: "outContentType" },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters(options) });
}

export async function _getSecretOriginalDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function getSecretOriginal(
  context: Client,
  secretName: string,
  options: GetSecretOriginalOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _getSecretOriginalSend(context, secretName, options);
  return _getSecretOriginalDeserialize(result);
}
```

# Should handle parameter grouping when using @@override

Tests that parameters are correctly grouped into options model when using @@override directive.

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{
  title: "Override Service"
})
namespace Override;

// Original operation with separate query parameters
@route("/group")
@get
op groupOriginal(
  @query param1: string,
  @query param2: string,
): void;

// Override model to group parameters
model GroupParametersOptions {
  @query param1: string;
  @query param2: string;
}

// Override operation with grouped parameters
op groupCustomized(
  options: GroupParametersOptions,
): void;

@@override(Override.groupOriginal, Override.groupCustomized);
```

The config would be like:

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface GroupParametersOptions
 */
export interface GroupParametersOptions {
  param1: string;
  param2: string;
}

export function groupParametersOptionsSerializer(
  item: GroupParametersOptions,
): any {
  return {
    param1: item["param1"],
    param2: item["param2"],
  };
}
```

## Models with Options

The options interface should be correctly generated:

```ts models:withOptions
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the groupOriginal operation.
 */
export interface GroupOriginalOptionalParams extends OperationOptions {}
```

## Operations

```ts operations
import type { GroupParametersOptions } from "../models/models.js";
import type { GroupOriginalOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _groupOriginalSend(
  context: Client,
  options: GroupParametersOptions,
  optionalParams: GroupOriginalOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/group{?param1,param2}",
    { param1: options.param1, param2: options.param2 },
    { allowReserved: optionalParams?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters(optionalParams) });
}

export async function _groupOriginalDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function groupOriginal(
  context: Client,
  options: GroupParametersOptions,
  optionalParams: GroupOriginalOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _groupOriginalSend(context, options, optionalParams);
  return _groupOriginalDeserialize(result);
}
```

# Should handle parameter removal when using @@override

Tests that optional parameters are correctly handled when removed using @@override directive.

## TypeSpec

```tsp
import "@typespec/http";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service(#{
  title: "Override Service"
})
namespace Override;

// Original operation with multiple optional parameters
@route("/remove-optional/{param1}")
@get
op removeOptionalOriginal(
  @path param1: string,
  @query param2?: string,
  @query param3?: string,
  @header param4?: string,
  @header param5?: string,
): void;

// Override operation removing some optional parameters
op removeOptionalCustomized(
  @path param1: string,
  @query param2?: string,
  @header param4?: string,
): void;

@@override(Override.removeOptionalOriginal, Override.removeOptionalCustomized);
```

The config would be like:

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Models with Options

The options interface should only include parameters that exist in the override operation:

```ts models:withOptions
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the removeOptionalOriginal operation.
 */
export interface RemoveOptionalOriginalOptionalParams extends OperationOptions {
  param2?: string;
  param4?: string;
}
```

## Operations

```ts operations
import type { RemoveOptionalOriginalOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _removeOptionalOriginalSend(
  context: Client,
  param1: string,
  options: RemoveOptionalOriginalOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/remove-optional/{param1}{?param2,param3}",
    { param1: param1, param2: options?.param2, param3: "param3" },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      ...(options?.param4 !== undefined ? { param4: options?.param4 } : {}),
      ...("param5" !== undefined ? { param5: "param5" } : {}),
      ...options.requestOptions?.headers,
    },
  });
}

export async function _removeOptionalOriginalDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function removeOptionalOriginal(
  context: Client,
  param1: string,
  options: RemoveOptionalOriginalOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _removeOptionalOriginalSend(context, param1, options);
  return _removeOptionalOriginalDeserialize(result);
}
```
