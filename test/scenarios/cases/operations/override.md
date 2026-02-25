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
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the getSecretOriginal operation.
 */
export interface GetSecretOriginalOptionalParams extends OperationOptions_1 {}
```

## Operations

```ts operations
import type { GetSecretOriginalOptionalParams as GetSecretOriginalOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getSecretOriginalSend(
  context: Client_1,
  secretName: string,
  options: GetSecretOriginalOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/secrets/{secretName}{?outContentType}",
    { secretName: secretName, outContentType: "outContentType" },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(options) });
}

export async function _getSecretOriginalDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function getSecretOriginal(
  context: Client_1,
  secretName: string,
  options: GetSecretOriginalOptionalParams_1 = { requestOptions: {} },
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
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the groupOriginal operation.
 */
export interface GroupOriginalOptionalParams extends OperationOptions_1 {}
```

## Operations

```ts operations
import type { GroupParametersOptions as GroupParametersOptions_1 } from "../models/models.js";
import type { GroupOriginalOptionalParams as GroupOriginalOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _groupOriginalSend(
  context: Client_1,
  options: GroupParametersOptions_1,
  optionalParams: GroupOriginalOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/group{?param1,param2}",
    { param1: options.param1, param2: options.param2 },
    { allowReserved: optionalParams?.requestOptions?.skipUrlEncoding },
  );
  return context
    .path(path)
    .get({ ...operationOptionsToRequestParameters_1(optionalParams) });
}

export async function _groupOriginalDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function groupOriginal(
  context: Client_1,
  options: GroupParametersOptions_1,
  optionalParams: GroupOriginalOptionalParams_1 = { requestOptions: {} },
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
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the removeOptionalOriginal operation.
 */
export interface RemoveOptionalOriginalOptionalParams extends OperationOptions_1 {
  param2?: string;
  param4?: string;
}
```

## Operations

```ts operations
import type { RemoveOptionalOriginalOptionalParams as RemoveOptionalOriginalOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _removeOptionalOriginalSend(
  context: Client_1,
  param1: string,
  options: RemoveOptionalOriginalOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/remove-optional/{param1}{?param2,param3}",
    { param1: param1, param2: options?.param2, param3: "param3" },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      param4: options?.param4,
      param5: "param5",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _removeOptionalOriginalDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function removeOptionalOriginal(
  context: Client_1,
  param1: string,
  options: RemoveOptionalOriginalOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _removeOptionalOriginalSend(context, param1, options);
  return _removeOptionalOriginalDeserialize(result);
}
```
