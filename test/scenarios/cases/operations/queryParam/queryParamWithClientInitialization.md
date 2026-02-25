# Optional query parameter with clientInitialization

This scenario tests the generation of TypeScript code for an Azure Resource Manager resource read operation with query parameters, specifically the `$expand` parameter for the SavingsPlanModel.

## TypeSpec

This TypeSpec defines a SavingsPlanModel with an ArmResourceRead operation that includes an optional `$expand` query parameter to expand detail information of some properties.

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
   * The expand query parameter.
   */
  @query("$expand")
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
      @query("$expand")
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
  type Client as Client_1,
  type ClientOptions as ClientOptions_1,
  getClient as getClient_1,
} from "@typespec/ts-http-runtime";

export interface BillingBenefitsContext extends Client_1 {
  /**
   * The expand query parameter.
   */
  $expand?: string;
}

export interface BillingBenefitsClientOptionalParams extends ClientOptions_1 {
  /**
   * The expand query parameter.
   */
  $expand?: string;
}

export function createBillingBenefits(
  endpoint: string,
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
  const clientContext = getClient_1(endpointUrl, updatedOptions);
  return {
    ...clientContext,
    $expand: options.$expand,
  } as BillingBenefitsContext;
}
```

## Operations

```ts operations
import {
  errorResponseDeserializer as errorResponseDeserializer_1,
  type SavingsPlanModel as SavingsPlanModel_1,
  savingsPlanModelDeserializer as savingsPlanModelDeserializer_1,
} from "../models/models.js";
import { GetOptionalParams as GetOptionalParams_1 } from "./savingsPlanModels/options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client_1,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ThisWillBeReplaced/savingsPlanOrders/{savingsPlanOrderId}/savingsPlans/{savingsPlanId}{?api%2Dversion,%24expand}",
    {
      "api-version": apiVersion,
      subscriptionId: subscriptionId,
      resourceGroupName: resourceGroupName,
      savingsPlanOrderId: savingsPlanOrderId,
      savingsPlanId: savingsPlanId,
      $expand: context["$expand"],
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse_1,
): Promise<SavingsPlanModel_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError_1(result);
    error.details = errorResponseDeserializer_1(result.body);
    throw error;
  }

  return savingsPlanModelDeserializer_1(result.body);
}

/**
 * Get savings plan.
 *
 * @param {Client_1} context
 * @param {string} apiVersion
 * @param {string} subscriptionId
 * @param {string} resourceGroupName
 * @param {string} savingsPlanOrderId
 * @param {string} savingsPlanId
 * @param {GetOptionalParams_1} options
 */
export async function get(
  context: Client_1,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): Promise<SavingsPlanModel_1> {
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

# Required query parameter with clientInitialization

This scenario tests the generation of TypeScript code for an Azure Resource Manager resource read operation with query parameters, specifically the `$expand` parameter for the SavingsPlanModel.

## TypeSpec

This TypeSpec defines a SavingsPlanModel with an ArmResourceRead operation that includes an optional `$expand` query parameter to expand detail information of some properties.

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
   * The expand query parameter.
   */
  @query("$expand")
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
      @query("$expand")
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
  type Client as Client_1,
  type ClientOptions as ClientOptions_1,
  getClient as getClient_1,
} from "@typespec/ts-http-runtime";

export interface BillingBenefitsContext extends Client_1 {
  /**
   * The expand query parameter.
   */
  $expand: string;
}

export interface BillingBenefitsClientOptionalParams extends ClientOptions_1 {}

export function createBillingBenefits(
  endpoint: string,
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
  const clientContext = getClient_1(endpointUrl, updatedOptions);
  return { ...clientContext, $expand } as BillingBenefitsContext;
}
```

## Operations

```ts operations
import {
  errorResponseDeserializer as errorResponseDeserializer_1,
  type SavingsPlanModel as SavingsPlanModel_1,
  savingsPlanModelDeserializer as savingsPlanModelDeserializer_1,
} from "../models/models.js";
import { GetOptionalParams as GetOptionalParams_1 } from "./savingsPlanModels/options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client_1,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ThisWillBeReplaced/savingsPlanOrders/{savingsPlanOrderId}/savingsPlans/{savingsPlanId}{?api%2Dversion,%24expand}",
    {
      "api-version": apiVersion,
      subscriptionId: subscriptionId,
      resourceGroupName: resourceGroupName,
      savingsPlanOrderId: savingsPlanOrderId,
      savingsPlanId: savingsPlanId,
      $expand: context["$expand"],
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse_1,
): Promise<SavingsPlanModel_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError_1(result);
    error.details = errorResponseDeserializer_1(result.body);
    throw error;
  }

  return savingsPlanModelDeserializer_1(result.body);
}

/**
 * Get savings plan.
 *
 * @param {Client_1} context
 * @param {string} apiVersion
 * @param {string} subscriptionId
 * @param {string} resourceGroupName
 * @param {string} savingsPlanOrderId
 * @param {string} savingsPlanId
 * @param {GetOptionalParams_1} options
 */
export async function get(
  context: Client_1,
  apiVersion: string,
  subscriptionId: string,
  resourceGroupName: string,
  savingsPlanOrderId: string,
  savingsPlanId: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): Promise<SavingsPlanModel_1> {
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
