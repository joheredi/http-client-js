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
  type PartnerTopic,
  PartnerTopicUpdateParameters,
} from "../../../models/models.js";
import {
  partnerTopicDeserializer,
  partnerTopicUpdateParametersSerializer,
} from "../../../models/serialization/serialization.js";
import { expandUrlTemplate } from "../../../static-helpers/urlTemplate.js";
import { TestArmPatchContext } from "../../testArmPatchClientContext.js";
import { PartnerTopicsUpdateOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@azure-rest/core-client";

export function _updateSend(
  context: TestArmPatchContext,
  apiVersion: string,
  resourceGroupName: string,
  partnerTopicName: string,
  properties: PartnerTopicUpdateParameters,
  options: PartnerTopicsUpdateOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestArmPatch/partnerTopics/{partnerTopicName}{?api%2Dversion}",
    {
      "api%2Dversion": apiVersion,
      subscriptionId: context["subscriptionId"],
      resourceGroupName: resourceGroupName,
      partnerTopicName: partnerTopicName,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).patch({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: partnerTopicUpdateParametersSerializer(properties),
  });
}

export async function _updateDeserialize(
  result: PathUncheckedResponse,
): Promise<PartnerTopic> {
  const expectedStatuses = ["200", "201"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return partnerTopicDeserializer(result.body);
}

/**
 * Update a PartnerTopic
 *
 * @param {TestArmPatchContext} context
 * @param {string} apiVersion
 * @param {string} resourceGroupName
 * @param {string} partnerTopicName
 * @param {PartnerTopicUpdateParameters} properties
 * @param {PartnerTopicsUpdateOptionalParams} options
 */
export async function update(
  context: TestArmPatchContext,
  apiVersion: string,
  resourceGroupName: string,
  partnerTopicName: string,
  properties: PartnerTopicUpdateParameters,
  options: PartnerTopicsUpdateOptionalParams = { requestOptions: {} },
): Promise<PartnerTopic> {
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
