# Optional header parameter with clientInitialization

This scenario tests the generation of TypeScript code for an Azure Resource Manager resource read operation with header parameters, specifically the `$expand` parameter for the SavingsPlanModel.

## TypeSpec

This TypeSpec defines a SavingsPlanModel with an ArmResourceRead operation that includes an optional `$expand` header parameter to expand detail information of some properties.

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
using Azure.ResourceManager.Foundations;
using Azure.ClientGenerator.Core;

@service(#{ title: "Billing benefits RP" })
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
namespace Microsoft.BillingBenefits;

model ExpandParameter {
  /**
   * The expand header parameter.
   */
  @header("$expand")
  $expand?: string;
}

model SavingsPlanModelProperties {
  displayName?: string;
  provisioningState?: string;
  commitment?: {
    currencyCode?: string;
    amount?: float64;
  };
  effectiveDateTime?: utcDateTime;
  expiryDateTime?: utcDateTime;
  term?: string;
  billingScope?: string;
}

model ResourceSku {
  name: string;
}

@parentResource(SavingsPlanOrderModel)
model SavingsPlanModel extends Azure.ResourceManager.Foundations.ProxyResource {
  ...ResourceNameParameter<
    Resource = SavingsPlanModel,
    KeyName = "savingsPlanId",
    SegmentName = "savingsPlans",
    NamePattern = ""
  >;

  sku: ResourceSku;

  @doc("The resource-specific properties for this resource.")
  properties?: SavingsPlanModelProperties;
}

model SavingsPlanOrderModel extends Azure.ResourceManager.Foundations.ProxyResource {
  ...ResourceNameParameter<
    Resource = SavingsPlanOrderModel,
    KeyName = "savingsPlanOrderId",
    SegmentName = "savingsPlanOrders",
    NamePattern = ""
  >;
}

@armResourceOperations
interface SavingsPlanModels {
  /**
   * Get savings plan.
   */
  get is ArmResourceRead<
    SavingsPlanModel,
    Parameters = {
      /**
       * May be used to expand the detail information of some properties.
       */
      @header("$expand")
      $expand?: string;
    }
  >;
}

@@clientInitialization(Microsoft.BillingBenefits,
  {
    parameters: ExpandParameter,
  }
);
```

The config would be like:

```yaml
needTCGC: true
withRawContent: true
```

## clientContext

```ts clientContext
import {
  type Client,
  type ClientOptions,
  getClient,
} from "@typespec/ts-http-runtime";

export interface BillingBenefitsContext extends Client {
  /**
   * The expand header parameter.
   */
  $expand?: string;
}

export interface BillingBenefitsClientOptionalParams extends ClientOptions {
  /**
   * The expand header parameter.
   */
  $expand?: string;
}

export function createBillingBenefits(
  endpointParam: string,
  options: BillingBenefitsClientOptionalParams = {},
): BillingBenefitsContext {
  const endpointUrl = options.endpoint ?? endpoint;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions
    ? `${prefixFromOptions} azsdk-js-api`
    : `azsdk-js-api`;
  const updatedOptions = {
    ...options,
    userAgentOptions: { userAgentPrefix },
  };
  const clientContext = getClient(endpointUrl, updatedOptions);
  return {
    ...clientContext,
    $expand: options.$expand,
  } as BillingBenefitsContext;
}
```

## Operations

```ts operations
import {
  errorResponseDeserializer,
  type SavingsPlanModel,
  savingsPlanModelDeserializer,
} from "../models/models.js";
import { GetOptionalParams } from "./savingsPlanModels/options.js";
import {
  Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ThisWillBeReplaced/savingsPlanOrders/{savingsPlanOrderId}/savingsPlans/{savingsPlanId}{?api%2Dversion}",
    {
      "api-version": apiVersion,
      subscriptionId: subscriptionId,
      resourceGroupName: resourceGroupName,
      savingsPlanOrderId: savingsPlanOrderId,
      savingsPlanId: savingsPlanId,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      $expand: options?.$expand,
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse,
): Promise<SavingsPlanModel> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    error.details = errorResponseDeserializer(result.body);
    throw error;
  }

  return savingsPlanModelDeserializer(result.body);
}

/**
 * Get savings plan.
 *
 * @param {Client} context
 * @param {string} apiVersion
 * @param {string} subscriptionId
 * @param {string} resourceGroupName
 * @param {string} savingsPlanOrderId
 * @param {string} savingsPlanId
 * @param {GetOptionalParams} options
 */
export async function get(
  context: Client,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams = { requestOptions: {} },
): Promise<SavingsPlanModel> {
  const result = await _getSend(
    context,
    apiVersion,
    subscriptionId,
    resourceGroupName,
    savingsPlanOrderId,
    savingsPlanId,
    options,
  );
  return _getDeserialize(result);
}
```

# Required header parameter with clientInitialization

This scenario tests the generation of TypeScript code for an Azure Resource Manager resource read operation with header parameters, specifically the `$expand` parameter for the SavingsPlanModel.

## TypeSpec

This TypeSpec defines a SavingsPlanModel with an ArmResourceRead operation that includes an optional `$expand` header parameter to expand detail information of some properties.

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
using Azure.ResourceManager.Foundations;
using Azure.ClientGenerator.Core;

@service(#{ title: "Billing benefits RP" })
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
namespace Microsoft.BillingBenefits;

model ExpandParameter {
  /**
   * The expand header parameter.
   */
  @header("$expand")
  $expand: string;
}

model SavingsPlanModelProperties {
  displayName?: string;
  provisioningState?: string;
  commitment?: {
    currencyCode?: string;
    amount?: float64;
  };
  effectiveDateTime?: utcDateTime;
  expiryDateTime?: utcDateTime;
  term?: string;
  billingScope?: string;
}

model ResourceSku {
  name: string;
}

@parentResource(SavingsPlanOrderModel)
model SavingsPlanModel extends Azure.ResourceManager.Foundations.ProxyResource {
  ...ResourceNameParameter<
    Resource = SavingsPlanModel,
    KeyName = "savingsPlanId",
    SegmentName = "savingsPlans",
    NamePattern = ""
  >;

  sku: ResourceSku;

  @doc("The resource-specific properties for this resource.")
  properties?: SavingsPlanModelProperties;
}

model SavingsPlanOrderModel extends Azure.ResourceManager.Foundations.ProxyResource {
  ...ResourceNameParameter<
    Resource = SavingsPlanOrderModel,
    KeyName = "savingsPlanOrderId",
    SegmentName = "savingsPlanOrders",
    NamePattern = ""
  >;
}

@armResourceOperations
interface SavingsPlanModels {
  /**
   * Get savings plan.
   */
  get is ArmResourceRead<
    SavingsPlanModel,
    Parameters = {
      /**
       * May be used to expand the detail information of some properties.
       */
      @header("$expand")
      $expand?: string;
    }
  >;
}

@@clientInitialization(Microsoft.BillingBenefits,
  {
    parameters: ExpandParameter,
  }
);
```

The config would be like:

```yaml
needTCGC: true
withRawContent: true
```

## clientContext

```ts clientContext
import {
  type Client,
  type ClientOptions,
  getClient,
} from "@typespec/ts-http-runtime";

export interface BillingBenefitsContext extends Client {
  /**
   * The expand header parameter.
   */
  $expand: string;
}

export interface BillingBenefitsClientOptionalParams extends ClientOptions {}

export function createBillingBenefits(
  endpointParam: string,
  options: BillingBenefitsClientOptionalParams = {},
): BillingBenefitsContext {
  const endpointUrl = options.endpoint ?? endpoint;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions
    ? `${prefixFromOptions} azsdk-js-api`
    : `azsdk-js-api`;
  const updatedOptions = {
    ...options,
    userAgentOptions: { userAgentPrefix },
  };
  const clientContext = getClient(endpointUrl, updatedOptions);
  return { ...clientContext, $expand } as BillingBenefitsContext;
}
```

## Operations

```ts operations
import {
  errorResponseDeserializer,
  type SavingsPlanModel,
  savingsPlanModelDeserializer,
} from "../models/models.js";
import { GetOptionalParams } from "./savingsPlanModels/options.js";
import {
  Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ThisWillBeReplaced/savingsPlanOrders/{savingsPlanOrderId}/savingsPlans/{savingsPlanId}{?api%2Dversion}",
    {
      "api-version": apiVersion,
      subscriptionId: subscriptionId,
      resourceGroupName: resourceGroupName,
      savingsPlanOrderId: savingsPlanOrderId,
      savingsPlanId: savingsPlanId,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      $expand: options?.$expand,
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse,
): Promise<SavingsPlanModel> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    error.details = errorResponseDeserializer(result.body);
    throw error;
  }

  return savingsPlanModelDeserializer(result.body);
}

/**
 * Get savings plan.
 *
 * @param {Client} context
 * @param {string} apiVersion
 * @param {string} subscriptionId
 * @param {string} resourceGroupName
 * @param {string} savingsPlanOrderId
 * @param {string} savingsPlanId
 * @param {GetOptionalParams} options
 */
export async function get(
  context: Client,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams = { requestOptions: {} },
): Promise<SavingsPlanModel> {
  const result = await _getSend(
    context,
    apiVersion,
    subscriptionId,
    resourceGroupName,
    savingsPlanOrderId,
    savingsPlanId,
    options,
  );
  return _getDeserialize(result);
}
```
