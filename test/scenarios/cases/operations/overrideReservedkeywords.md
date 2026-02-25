# should generate parameter name normalization for reserved keywords in spread body operations

## Typespec

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

/** Microsoft.Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{
  title: "Microsoft.Contoso management service",
})
namespace Microsoft.Contoso;

model ResourceNameAvailabilityRequest {
  name: string;
  type: string;
}

@summary("Check if a resource name is available.")
@autoRoute
@action("checknameavailability")
op checkNameAvailability is ArmProviderActionSync<
  Request = ResourceNameAvailabilityRequest,
  Response = void,
  Scope = SubscriptionActionScope
>;

op checkNameAvailabilityCustomized(
  ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ...Azure.ResourceManager.CommonTypes.SubscriptionIdParameter,
  ...Azure.ResourceManager.Legacy.Provider,

  name: string,
  type: string,
): void;

@@override(checkNameAvailability,checkNameAvailabilityCustomized);
```

This is the tspconfig.yaml.

```yaml
withRawContent: true
```

## Operations

```ts operations
import { errorResponseDeserializer as errorResponseDeserializer_1 } from "../models/models.js";
import type { CheckNameAvailabilityOptionalParams as CheckNameAvailabilityOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _checkNameAvailabilitySend(
  context: Client_1,
  apiVersion: string,
  name: string,
  type: string,
  options: CheckNameAvailabilityOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/subscriptions/{subscriptionId}/providers/Microsoft.ThisWillBeReplaced/checknameavailability{?api%2Dversion}",
    { "api-version": apiVersion, subscriptionId: context["subscriptionId"] },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: { name: name, type: type },
  });
}

export async function _checkNameAvailabilityDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError_1(result);
    error.details = errorResponseDeserializer_1(result.body);
    throw error;
  }

  return;
}

export async function checkNameAvailability(
  context: Client_1,
  apiVersion: string,
  name: string,
  type: string,
  options: CheckNameAvailabilityOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _checkNameAvailabilitySend(
    context,
    apiVersion,
    name,
    type,
    options,
  );
  return _checkNameAvailabilityDeserialize(result);
}
```
