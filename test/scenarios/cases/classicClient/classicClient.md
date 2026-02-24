# handle with title config for classic client

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
  title: "MultiClient"
})
@versioned(Client.Structure.Service.Versions)
namespace Client.Structure.Service;

enum Versions {
  /** Version 2022-08-31 */
  `2022-08-30`,
}

op foo(): void;
```

The config would be like:

```yaml
typespec-title-map:
  ServiceClient: TestServiceClient
withRawContent: true
ignoreWeirdLine: false
```

## classicClient

```ts classicClient
import {
  foo as foo_1,
  type FooOptionalParams as FooOptionalParams_1,
} from "./api/operations.js";
import {
  createService as createService_1,
  type ServiceClientOptionalParams as ServiceClientOptionalParams_1,
  type ServiceContext as ServiceContext_1,
} from "./serviceClientContext.js";
import { Pipeline as Pipeline_1 } from "@typespec/ts-http-runtime";

export class ServiceClient {
  private _client: ServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  constructor(endpoint: string, options: ServiceClientOptionalParams_1 = {}) {
    this._client = createService_1(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  foo(options: FooOptionalParams_1 = { requestOptions: {} }): Promise<void> {
    return foo_1(this._client, options);
  }
}
```
