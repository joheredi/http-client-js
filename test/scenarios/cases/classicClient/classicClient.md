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
import { foo } from "./api/operations.js";
import type { FooOptionalParams } from "./api/options.js";
import {
  createService,
  type ServiceClientOptionalParams,
  type ServiceContext,
} from "./serviceClientContext.js";
import { Pipeline } from "@typespec/ts-http-runtime";

export class ServiceClient {
  private _client: ServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpoint: string, options: ServiceClientOptionalParams = {}) {
    this._client = createService(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  foo(options: FooOptionalParams = { requestOptions: {} }): Promise<void> {
    return foo(this._client, options);
  }
}
```
