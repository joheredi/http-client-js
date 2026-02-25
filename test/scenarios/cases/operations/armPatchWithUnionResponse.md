# Should use tcgc response type for operation retrunType

## TypeSpec

```tsp
import "@typespec/rest";
import "@typespec/http";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Rest;
using TypeSpec.Http;
using Azure.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{
  title: "Test ARM Patch Service"
})
namespace Microsoft.TestArmPatch;

model PartnerTopicProperties {
  provisioningState?: string;
  activationState?: string;
}

@doc("Event Grid Partner Topic.")
model PartnerTopic is TrackedResource<PartnerTopicProperties> {
  @key("partnerTopicName")
  @segment("partnerTopics")
  @path
  name: string;
}

@doc("Properties of the Partner Topic update.")
model PartnerTopicUpdateParameters {
  @doc("Tags of the Partner Topic resource.")
  tags?: Record<string>;

  @doc("Identity information for the resource.")
  identity?: {
    type?: string;
    principalId?: string;
  };
}

@armResourceOperations
interface PartnerTopics {
  @patch
  update is ArmCustomPatchSync<
    PartnerTopic,
    PatchModel = PartnerTopicUpdateParameters,
    Response = OkResponse | ArmResourceCreatedSyncResponse<PartnerTopic>
  >;
}
```

```yaml
withRawContent: true
```

## operations

```ts operations
import {
  errorResponseDeserializer as errorResponseDeserializer_1,
  type PartnerTopic as PartnerTopic_1,
  partnerTopicDeserializer as partnerTopicDeserializer_1,
  PartnerTopicUpdateParameters as PartnerTopicUpdateParameters_1,
  partnerTopicUpdateParametersSerializer as partnerTopicUpdateParametersSerializer_1,
} from "../models/models.js";
import { UpdateOptionalParams as UpdateOptionalParams_1 } from "./partnerTopics/options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _updateSend(
  context: Client_1,
  apiVersion: string,
  resourceGroupName: string,
  partnerTopicName: string,
  properties: PartnerTopicUpdateParameters_1,
  options: UpdateOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestArmPatch/partnerTopics/{partnerTopicName}{?api%2Dversion}",
    {
      "api-version": apiVersion,
      subscriptionId: context["subscriptionId"],
      resourceGroupName: resourceGroupName,
      partnerTopicName: partnerTopicName,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).patch({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: partnerTopicUpdateParametersSerializer_1(properties),
  });
}

export async function _updateDeserialize(
  result: PathUncheckedResponse_1,
): Promise<PartnerTopic_1> {
  const expectedStatuses = ["200", "201"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError_1(result);
    error.details = errorResponseDeserializer_1(result.body);
    throw error;
  }

  return partnerTopicDeserializer_1(result.body);
}

/**
 * Update a PartnerTopic
 *
 * @param {Client_1} context
 * @param {string} apiVersion
 * @param {string} resourceGroupName
 * @param {string} partnerTopicName
 * @param {PartnerTopicUpdateParameters_1} properties
 * @param {UpdateOptionalParams_1} options
 */
export async function update(
  context: Client_1,
  apiVersion: string,
  resourceGroupName: string,
  partnerTopicName: string,
  properties: PartnerTopicUpdateParameters_1,
  options: UpdateOptionalParams_1 = { requestOptions: {} },
): Promise<PartnerTopic_1> {
  const result = await _updateSend(
    context,
    apiVersion,
    resourceGroupName,
    partnerTopicName,
    properties,
    options,
  );
  return _updateDeserialize(result);
}
```
