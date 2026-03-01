# Core flavor paging generates basic async function

Validates that when the SDK flavor is "core", operations marked as paging by TCGC
are rendered as standard async functions returning `Promise<T>` instead of
Azure-specific `PagedAsyncIterableIterator<T>`. Core flavor must not import from
`pagingHelpers.ts` or `@azure-rest/core-client`.

## TypeSpec

```tsp
@error
model Error {
    code: int32;
    message: string;
}

model Bar {
    @pageItems
    lists: string[];
}
@post
@list
op test(): Error | Bar;
```

```yaml
needAzureCore: true
flavor: core
```

## Operations

```ts operations
import { type Bar, barDeserializer } from "../models/models.js";
import type { TestOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import type { TestingContext } from "../testingClientContext.js";

export function _testSend(
  context: TestingContext,
  options: TestOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _testDeserialize(
  result: PathUncheckedResponse,
): Promise<Bar> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return barDeserializer(result.body);
}

export async function test(
  context: TestingContext,
  options: TestOptionalParams = { requestOptions: {} },
): Promise<string[]> {
  const result = await _testSend(context, options);
  return _testDeserialize(result);
}
```

## Client Context — no Azure credentials

```ts clientContext
import {
  type Client,
  type ClientOptions,
  getClient,
} from "@typespec/ts-http-runtime";

export interface TestingContext extends Client {}

export interface TestingClientOptionalParams extends ClientOptions {}

export function createTesting(
  endpointParam: string,
  options: TestingClientOptionalParams = {},
): TestingContext {
  const endpointUrl = options.endpoint ?? endpointParam;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions
    ? `${prefixFromOptions} azsdk-js-api`
    : `azsdk-js-api`;
  const { apiVersion: _, ...updatedOptions } = {
    ...options,
    userAgentOptions: { userAgentPrefix },
  };
  return getClient(endpointUrl, updatedOptions) as TestingContext;
}
```

# Core flavor LRO generates basic async function

Validates that when the SDK flavor is "core", long-running operations detected
by TCGC are rendered as standard async functions returning `Promise<T>` instead
of Azure-specific `PollerLike<OperationState<T>, T>`. Core flavor must not import
from `pollingHelpers.ts` or `@azure/core-lro`.

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.Core.Traits;

#suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
@service
@versioned(Versions)
namespace TestLro {
  alias ServiceTraits = NoRepeatableRequests &
    NoConditionalRequests &
    NoClientRequestId;
  alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

  enum Versions {
    v1: "1.0",
  }

  @resource("users")
  model User {
    @key
    @visibility(Lifecycle.Read)
    name: string;
    role: string;
  }

  op createOrReplace is Operations.LongRunningResourceCreateOrReplace<User>;
}
```

```yaml
withRawContent: true
flavor: core
```

## Operations

```ts operations
import { User, userDeserializer, userSerializer } from "../models/models.js";
import { CreateOrReplaceOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../static-helpers/urlTemplate.js";
import { TestLroContext } from "../testLroClientContext.js";

export function _createOrReplaceSend(
  context: TestLroContext,
  name: string,
  resource: User,
  options: CreateOrReplaceOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/users/{name}{?api%2Dversion}",
    { "api%2Dversion": context.apiVersion ?? "1.0", name: name },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).put({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: userSerializer(resource),
  });
}

export async function _createOrReplaceDeserialize(
  result: PathUncheckedResponse,
): Promise<User> {
  const expectedStatuses = ["201", "200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return userDeserializer(result.body);
}

/**
 * Long-running resource create or replace operation template.
 *
 * @param {TestLroContext} context
 * @param {string} name
 * @param {User} resource
 * @param {CreateOrReplaceOptionalParams} options
 */
export async function createOrReplace(
  context: TestLroContext,
  name: string,
  resource: User,
  options: CreateOrReplaceOptionalParams = { requestOptions: {} },
): Promise<User> {
  const result = await _createOrReplaceSend(context, name, resource, options);
  return _createOrReplaceDeserialize(result);
}
```

# Core flavor LRO+paging generates basic async function

Validates that when the SDK flavor is "core", operations that are both LRO and
paging are rendered as standard async functions. Core flavor must not generate
`pollingHelpers.ts`, `pagingHelpers.ts`, or import `@azure/core-lro`.

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
flavor: core
```

## Operations

```ts operations
import {
  type Site,
  type WebAppCollection,
  webAppCollectionDeserializer,
} from "../../models/models.js";
import { SuspendOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";
import { expandUrlTemplate } from "../../static-helpers/urlTemplate.js";
import { WebContext } from "../../webClientContext.js";

export function _suspendSend(
  context: WebContext,
  resourceGroupName: string,
  name: string,
  options: SuspendOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/suspend{?api%2Dversion}",
    {
      "api%2Dversion": context.apiVersion ?? "2023-12-01",
      subscriptionId: context["subscriptionId"],
      resourceGroupName: resourceGroupName,
      name: name,
    },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _suspendDeserialize(
  result: PathUncheckedResponse,
): Promise<WebAppCollection> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return webAppCollectionDeserializer(result.body);
}

/**
 * A long-running resource action.
 *
 * @param {WebContext} context
 * @param {string} resourceGroupName
 * @param {string} name
 * @param {SuspendOptionalParams} options
 */
export async function suspend(
  context: WebContext,
  resourceGroupName: string,
  name: string,
  options: SuspendOptionalParams = { requestOptions: {} },
): Promise<Site[]> {
  const result = await _suspendSend(context, resourceGroupName, name, options);
  return _suspendDeserialize(result);
}
```
