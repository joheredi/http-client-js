# handle with optional api-version parameter via custom VersionParameterTrait

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

@service(#{
  title: "DataMapClient",
})
@versioned(DataMapService.Versions)
@server(
  "{endpoint}",
  "DataMap Service",
  {
    @doc("Service endpoint")
    endpoint: url,
  }
)
namespace DataMapService;

enum Versions {
  @doc("API Version 2023-09-01")
  `2023-09-01`,
}

@route("/entities")
@get
op listEntities(
  @doc("The API version to use for this operation.")
  @query("api-version")
  @minLength(1)
  apiVersion?: string,
): {
  @statusCode statusCode: 200;
  @body entities: string[];
};
```

The config would be like:

```yaml
withRawContent: true
ignoreWeirdLine: false
```

## clientContext

```ts clientContext
import {
  type Client as Client_1,
  type ClientOptions as ClientOptions_1,
  getClient as getClient_1,
} from "@typespec/ts-http-runtime";

export interface DataMapServiceContext extends Client_1 {
  /**
   * The API version to use for this operation.
   */
  apiVersion?: string;
}

export interface DataMapServiceClientOptionalParams extends ClientOptions_1 {
  /**
   * The API version to use for this operation.
   */
  apiVersion?: string;
}

export function createDataMapService(
  endpoint: string,
  options: DataMapServiceClientOptionalParams = {},
): DataMapServiceContext {
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
    apiVersion: options.apiVersion ?? "2023-09-01",
  } as DataMapServiceContext;
}
```
