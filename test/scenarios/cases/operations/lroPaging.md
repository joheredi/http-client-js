# Should generate lro and paging operation

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;
@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.Web;
enum Versions {
    v2023_12_01: "2023-12-01",
}
@doc("A web app")
model Site is TrackedResource<SiteProperties> {
    @doc("Name of the app.")
    @key("name")
    @path
    @segment("sites")
    name: string;
}
@doc("Site properties")
model SiteProperties {
    @doc("Current state of the app.")
    state?: string;
}
@doc("Collection of App Service apps - Page type")
model WebAppCollection is Page<Site>;
@armResourceOperations
interface Sites {
    @action("suspend")
    @list
    suspend is Azure.ResourceManager.ArmResourceActionAsyncBase<
        Site,
        Request = void,
        Response = ArmResponse<WebAppCollection> &
            ArmLroLocationHeader<FinalResult = WebAppCollection>,
        BaseParameters = Azure.ResourceManager.Foundations.DefaultBaseParameters<Site>
    >;
}
```

```yaml
withRawContent: true
```

## models

```ts models
/**
 * Collection of App Service apps - Page type
 */
export interface WebAppCollection {
  /**
   * The Site items on this page
   */
  value: Site[];
  /**
   * The link to the next page of items
   */
  nextLink?: string;
}

/**
 * A web app
 */
export interface Site extends TrackedResource {
  /**
   * The resource-specific properties for this resource.
   */
  properties?: SiteProperties;
  /**
   * Name of the app.
   */
  readonly name: string;
}

/**
 * Site properties
 */
export interface SiteProperties {
  /**
   * Current state of the app.
   */
  state?: string;
}

/**
 * The resource model definition for an Azure Resource Manager tracked top level resource which has 'tags' and a 'location'
 */
export interface TrackedResource extends Resource {
  /**
   * Resource tags.
   */
  tags?: Record<string, string>;
  /**
   * The geo-location where the resource lives
   */
  location: string;
}

/**
 * Common fields that are returned in the response for all Azure Resource Manager resources
 */
export interface Resource {
  /**
   * Fully qualified resource ID for the resource. Ex - /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName}
   */
  readonly id?: string;
  /**
   * The name of the resource
   */
  readonly name?: string;
  /**
   * The type of the resource. E.g. "Microsoft.Compute/virtualMachines" or "Microsoft.Storage/storageAccounts"
   */
  readonly type?: string;
  /**
   * Azure Resource Manager metadata containing createdBy and modifiedBy information.
   */
  readonly systemData?: SystemData;
}

/**
 * Metadata pertaining to creation and last modification of the resource.
 */
export interface SystemData {
  /**
   * The identity that created the resource.
   */
  createdBy?: string;
  /**
   * The type of identity that created the resource.
   */
  createdByType?: CreatedByType;
  /**
   * The timestamp of resource creation (UTC).
   */
  createdAt?: Date;
  /**
   * The identity that last modified the resource.
   */
  lastModifiedBy?: string;
  /**
   * The type of identity that last modified the resource.
   */
  lastModifiedByType?: CreatedByType;
  /**
   * The timestamp of resource last modification (UTC)
   */
  lastModifiedAt?: Date;
}

/**
 * Common error response for all Azure Resource Manager APIs to return error details for failed operations.
 */
export interface ErrorResponse {
  /**
   * The error object.
   */
  error?: ErrorDetail;
}

/**
 * The error detail.
 */
export interface ErrorDetail {
  /**
   * The error code.
   */
  readonly code?: string;
  /**
   * The error message.
   */
  readonly message?: string;
  /**
   * The error target.
   */
  readonly target?: string;
  /**
   * The error details.
   */
  readonly details?: ErrorDetail[];
  /**
   * The error additional info.
   */
  readonly additionalInfo?: ErrorAdditionalInfo[];
}

/**
 * The resource management error additional info.
 */
export interface ErrorAdditionalInfo {
  /**
   * The additional info type.
   */
  readonly type?: string;
  /**
   * The additional info.
   */
  readonly info?: any;
}

/**
 * Standard Azure Resource Manager operation status response
 */
export interface ArmOperationStatusResourceProvisioningState {
  /**
   * The operation status
   */
  status: ResourceProvisioningState;
  /**
   * The unique identifier for the operationStatus resource
   */
  id: string;
  /**
   * The name of the  operationStatus resource
   */
  readonly name?: string;
  /**
   * Operation start time
   */
  readonly startTime?: Date;
  /**
   * Operation complete time
   */
  readonly endTime?: Date;
  /**
   * The progress made toward completing the operation
   */
  readonly percentComplete?: number;
  /**
   * Errors that occurred if the operation ended with Canceled or Failed status
   */
  readonly error?: ErrorDetail;
}

/**
 * The kind of entity that created the resource.
 */
export type CreatedByType = string;

/**
 * The kind of entity that created the resource.
 */
export enum KnowncreatedByType {
  /**
   * The entity was created by a user.
   */
  User = "User",
  /**
   * The entity was created by an application.
   */
  Application = "Application",
  /**
   * The entity was created by a managed identity.
   */
  ManagedIdentity = "ManagedIdentity",
  /**
   * The entity was created by a key.
   */
  Key = "Key",
}

/**
 * The provisioning state of a resource type.
 */
export type ResourceProvisioningState = string;

/**
 * The provisioning state of a resource type.
 */
export enum KnownResourceProvisioningState {
  /**
   * Resource has been created.
   */
  Succeeded = "Succeeded",
  /**
   * Resource creation failed.
   */
  Failed = "Failed",
  /**
   * Resource creation was canceled.
   */
  Canceled = "Canceled",
}

/**
 * Type of Versions
 */
export type Versions = "2023-12-01";

/**
 * Known values of {@link Versions} that the service accepts.
 */
export enum KnownVersions {
  /**
   * 2023-12-01
   */
  V2023_12_01 = "2023-12-01",
}

export function webAppCollectionDeserializer(item: any): WebAppCollection {
  return {
    value: item["value"].map((p: any) => {
      return siteDeserializer(p);
    }),
    nextLink: item["nextLink"],
  };
}

export function siteDeserializer(item: any): Site {
  return {
    properties: !item["properties"]
      ? item["properties"]
      : sitePropertiesDeserializer(item["properties"]),
    name: item["name"],
  };
}

export function sitePropertiesDeserializer(item: any): SiteProperties {
  return {
    state: item["state"],
  };
}

export function trackedResourceDeserializer(item: any): TrackedResource {
  return {
    tags: item["tags"],
    location: item["location"],
  };
}

export function resourceDeserializer(item: any): Resource {
  return {
    id: item["id"],
    name: item["name"],
    type: item["type"],
    systemData: !item["systemData"]
      ? item["systemData"]
      : systemDataDeserializer(item["systemData"]),
  };
}

export function systemDataDeserializer(item: any): SystemData {
  return {
    createdBy: item["createdBy"],
    createdByType: item["createdByType"],
    createdAt: !item["createdAt"]
      ? item["createdAt"]
      : new Date(item["createdAt"]),
    lastModifiedBy: item["lastModifiedBy"],
    lastModifiedByType: item["lastModifiedByType"],
    lastModifiedAt: !item["lastModifiedAt"]
      ? item["lastModifiedAt"]
      : new Date(item["lastModifiedAt"]),
  };
}

export function errorResponseDeserializer(item: any): ErrorResponse {
  return {
    error: !item["error"]
      ? item["error"]
      : errorDetailDeserializer(item["error"]),
  };
}

export function errorDetailDeserializer(item: any): ErrorDetail {
  return {
    code: item["code"],
    message: item["message"],
    target: item["target"],
    details: !item["details"]
      ? item["details"]
      : item["details"].map((p: any) => {
          return errorDetailDeserializer(p);
        }),
    additionalInfo: !item["additionalInfo"]
      ? item["additionalInfo"]
      : item["additionalInfo"].map((p: any) => {
          return errorAdditionalInfoDeserializer(p);
        }),
  };
}

export function errorAdditionalInfoDeserializer(
  item: any,
): ErrorAdditionalInfo {
  return {
    type: item["type"],
    info: item["info"],
  };
}
```

## Operations

```ts operations
import {
  buildPagedAsyncIterator as buildPagedAsyncIterator_1,
  type PagedAsyncIterableIterator as PagedAsyncIterableIterator_1,
} from "../helpers/pagingHelpers.js";
import { getLongRunningPoller as getLongRunningPoller_1 } from "../helpers/pollingHelpers.js";
import {
  type Site as Site_1,
  siteDeserializer as siteDeserializer_1,
} from "../models/models.js";
import { SuspendOptionalParams as SuspendOptionalParams_1 } from "./sites/options.js";
import {
  OperationState as OperationState_1,
  PollerLike as PollerLike_1,
} from "@azure/core-lro";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _suspendSend(
  context: Client_1,
  resourceGroupName: string,
  name: string,
  options: SuspendOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/suspend{?api%2Dversion}",
    {
      "api-version": context.apiVersion,
      subscriptionId: context["subscriptionId"],
      resourceGroupName: resourceGroupName,
      name: name,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _suspendDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Site_1[]> {
  const expectedStatuses = ["200", "202", "201"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body.map((p: any) => {
    return siteDeserializer_1(p);
  });
}

/**
 * A long-running resource action.
 *
 * @param {Client_1} context
 * @param {string} resourceGroupName
 * @param {string} name
 * @param {SuspendOptionalParams_1} options
 */
export function suspend(
  context: Client_1,
  resourceGroupName: string,
  name: string,
  options: SuspendOptionalParams_1 = { requestOptions: {} },
): PagedAsyncIterableIterator_1<Site_1> {
  const initialPagingPoller = getLongRunningPoller_1(
    context,
    async (result: PathUncheckedResponse_1) => result,
    ["200"],
    {
      updateIntervalInMs: options?.updateIntervalInMs,
      abortSignal: options?.abortSignal,
      getInitialResponse: () =>
        _suspendSend(context, resourceGroupName, name, options),
      resourceLocationConfig: "location",
    },
  ) as PollerLike_1<
    OperationState_1<PathUncheckedResponse_1>,
    PathUncheckedResponse_1
  >;

  return buildPagedAsyncIterator_1(
    context,
    async () => await initialPagingPoller,
    _suspendDeserialize,
    ["200"],
    { itemName: "value" },
  );
}
```
