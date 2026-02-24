# Should generate optional body `body` in option parameter

Should generate optional body in option parameter.

## TypeSpec

This is tsp definition.

```tsp

import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ClientGenerator.Core;

@armProviderNamespace
@service(#{ title: "HardwareSecurityModules" })
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
namespace Microsoft.HardwareSecurityModules;

enum Versions {
  v2021_10_01_preview: "2021-10-01-preview",
}

model CloudHsmClusterProperties {
  statusMessage?: string;
}

model CloudHsmCluster
  is Azure.ResourceManager.TrackedResource<CloudHsmClusterProperties> {
  ...ResourceNameParameter<
    Resource = CloudHsmCluster,
    KeyName = "cloudHsmClusterName",
    SegmentName = "cloudHsmClusters",
    NamePattern = "^[a-zA-Z0-9-]{3,23}$"
  >;

  identity?: Azure.ResourceManager.CommonTypes.ManagedServiceIdentity;
}

model BackupRequestProperties extends BackupRestoreRequestBaseProperties {}

model BackupRestoreRequestBaseProperties {

  azureStorageBlobContainerUri: url;

  @secret
  token?: string;
}

model BackupResult {
  properties?: BackupResultProperties;
}

model BackupResultProperties {

  azureStorageBlobContainerUri?: url;

  backupId?: string;
}

@armResourceOperations
interface CloudHsmClusters {
  backup is ArmResourceActionAsync<
    CloudHsmCluster,
    BackupRequestProperties,
    ArmResponse<BackupResult> & Azure.Core.RequestIdResponseHeader,
    LroHeaders = ArmAsyncOperationHeader<FinalResult = BackupResult> &
      ArmLroLocationHeader &
      Azure.Core.Foundations.RetryAfterHeader &
      Azure.Core.RequestIdResponseHeader,
    OptionalRequestBody = true
  >;
}
@@clientName(CloudHsmClusters.backup::parameters.body,
  "backupRequestProperties"
);
```

The config would be like:

```yaml
withRawContent: true
```

## Example

Raw json files.

```json for CloudHsmClusters_backup
{
  "title": "CloudHsmClusters_backup",
  "operationId": "CloudHsmClusters_backup",
  "parameters": {
    "api-version": "2025-03-31",
    "body": {
      "azureStorageBlobContainerUri": "sss",
      "token": "aaa"
    },
    "cloudHsmClusterName": "chsm1",
    "resourceGroupName": "rgcloudhsm",
    "subscriptionId": "00000000-0000-0000-0000-000000000000"
  },
  "responses": {}
}
```

## Provide generated operation options

Generated operation options.

```ts models:withOptions
import type { BackupRequestProperties as BackupRequestProperties_1 } from "../models/models.js";
import type { OperationOptions as OperationOptions_1 } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the backup operation.
 */
export interface BackupOptionalParams extends OperationOptions_1 {
  /**
   * Delay to wait until next poll, in milliseconds.
   */
  updateIntervalInMs?: number;
  /**
   * The content of the action request
   */
  backupRequestProperties?: BackupRequestProperties_1;
}
```

## Provide generated operations to call rest-level methods

## Operations

Should generate operations correctly:

```ts operations
import { getLongRunningPoller as getLongRunningPoller_1 } from "../helpers/pollingHelpers.js";
import {
  backupRequestPropertiesSerializer as backupRequestPropertiesSerializer_1,
  BackupResult as BackupResult_1,
  backupResultDeserializer as backupResultDeserializer_1,
} from "../models/models.js";
import { BackupOptionalParams as BackupOptionalParams_1 } from "./cloudHsmClusters/options.js";
import {
  OperationState as OperationState_1,
  PollerLike as PollerLike_1,
} from "@azure/core-lro";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _backupSend(
  context: Client_1,
  resourceGroupName: string,
  cloudHsmClusterName: string,
  options: BackupOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.HardwareSecurityModules/cloudHsmClusters/{cloudHsmClusterName}/backup{?api%2Dversion}",
    {
      "api-version": context.apiVersion,
      subscriptionId: context["subscriptionId"],
      resourceGroupName: resourceGroupName,
      cloudHsmClusterName: cloudHsmClusterName,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: !options?.backupRequestProperties
      ? options?.backupRequestProperties
      : backupRequestPropertiesSerializer_1(options?.backupRequestProperties),
  });
}

export async function _backupDeserialize(
  result: PathUncheckedResponse_1,
): Promise<BackupResult_1> {
  const expectedStatuses = ["202", "200", "201"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return backupResultDeserializer_1(result.body);
}

/**
 * A long-running resource action.
 *
 * @param {Client_1} context
 * @param {string} resourceGroupName
 * @param {string} cloudHsmClusterName
 * @param {BackupOptionalParams_1} options
 */
export function backup(
  context: Client_1,
  resourceGroupName: string,
  cloudHsmClusterName: string,
  options: BackupOptionalParams_1 = { requestOptions: {} },
): PollerLike_1<OperationState_1<BackupResult_1>, BackupResult_1> {
  return getLongRunningPoller_1(context, _backupDeserialize, ["202", "200"], {
    updateIntervalInMs: options?.updateIntervalInMs,
    abortSignal: options?.abortSignal,
    getInitialResponse: () =>
      _backupSend(context, resourceGroupName, cloudHsmClusterName, options),
    resourceLocationConfig: "azure-async-operation",
  }) as PollerLike_1<OperationState_1<BackupResult_1>, BackupResult_1>;
}
```

## Samples

Generate optional body in option parameter:

```ts samples
/** This file path is /samples-dev/backupSample.ts */
import { HardwareSecurityModulesClient } from "@azure/internal-test";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * This sample demonstrates how to a long-running resource action.
 *
 * @summary a long-running resource action.
 * x-ms-original-file: 2021-10-01-preview/json_for_CloudHsmClusters_backup.json
 */
async function cloudHsmClustersBackup(): Promise<void> {
  const credential = new DefaultAzureCredential();
  const subscriptionId = "00000000-0000-0000-0000-000000000000";
  const client = new HardwareSecurityModulesClient(credential, subscriptionId);
  const result = await client.backup("rgcloudhsm", "chsm1", {
    backupRequestProperties: {
      azureStorageBlobContainerUri: "sss",
      token: "aaa",
    },
  });
  console.log(result);
}

async function main(): Promise<void> {
  await cloudHsmClustersBackup();
}

main().catch(console.error);
```

# Should generate optional body `header` in option parameter

Should generate optional body in option parameter.

## TypeSpec

This is tsp definition.

```tsp
@doc("This is a simple model.")
model BodyParameter {
  name: string;
}
@doc("This is a model with all http request decorator.")
model CompositeRequest {

  @path
  name: string;

  @header
  requiredHeader: string; // required-header

  @header
  @clientName("testHeader", "javascript")
  optionalHeader?: string;

  @query
  requiredQuery: string;

  @query
  optionalQuery?: string;

  @body
  widget?: BodyParameter;
}

@doc("show example demo")
op read(...CompositeRequest): { @body body: {}};
```

## Example

Raw json files.

```json
{
  "title": "read",
  "operationId": "read",
  "parameters": {
    "name": "required path param",
    "required-header": "required header",
    "optional-header": "optional header",
    "optionalQuery": "renamed optional query",
    "requiredQuery": "required query",
    "body": {
      "name": "body name"
    }
  },
  "responses": {
    "200": {}
  }
}
```

## Samples

Generate optional body in option parameter:

```ts samples
/** This file path is /samples-dev/readSample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to show example demo
 *
 * @summary show example demo
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function read(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.read(
    "required path param",
    "required header",
    "required query",
    {
      widget: { name: "body name" },
      testHeader: "optional header",
      optionalQuery: "renamed optional query",
    },
  );
  console.log(result);
}

async function main(): Promise<void> {
  await read();
}

main().catch(console.error);
```

# Should generate sample with a customized name for `path` decorator

Should generate optional body in option parameter.

## TypeSpec

This is tsp definition.

```tsp
@doc("This is a simple model.")
model BodyParameter {
  name: string;
}
@doc("This is a model with all http request decorator.")
model CompositeRequest {
  @path
  @clientName("testName", "javascript")
  name: string;

  @query
  requiredQuery: string;

  @query
  optionalQuery?: string;

  @body
  widget?: BodyParameter;
}

@doc("show example demo")
op read(...CompositeRequest): { @body body: {}};
```

## Example

Raw json files.

```json
{
  "title": "read",
  "operationId": "read",
  "parameters": {
    "name": "required path param",
    "optionalQuery": "renamed optional query",
    "requiredQuery": "required query",
    "body": {
      "name": "body name"
    }
  },
  "responses": {
    "200": {}
  }
}
```

## Samples

Generate optional body in option parameter:

```ts samples
/** This file path is /samples-dev/readSample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to show example demo
 *
 * @summary show example demo
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function read(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.read("required path param", "required query", {
    widget: { name: "body name" },
    optionalQuery: "renamed optional query",
  });
  console.log(result);
}

async function main(): Promise<void> {
  await read();
}

main().catch(console.error);
```
