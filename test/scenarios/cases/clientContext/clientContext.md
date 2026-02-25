# handle with no default values in server

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

@server(
  "{endpoint}/client/structure/{client}",
  "",
  {
    @doc("Need to be set as 'http://localhost:3000' in client.")
    endpoint: url,

    @doc("Need to be set as 'default', 'multi-client', 'renamed-operation', 'two-operation-group' in client.")
    client: ClientType = ClientType.Default,
  }
)
@service(#{
  title: "MultiClient"
})
@versioned(Client.Structure.Service.Versions)
namespace Client.Structure.Service;

enum Versions {
  /** Version 2022-08-31 */

  `2022-08-30`,
}

enum ClientType {
  Default: "default",
  MultiClient: "multi-client",
  RenamedOperation: "renamed-operation",
  TwoOperationGroup: "two-operation-group",
}

@route("/one")
@post
op one(): void;
```

The config would be like:

```yaml
withRawContent: true
ignoreWeirdLine: false
```

## clientContext

```ts clientContext
import { type Client as Client_1, type ClientOptions as ClientOptions_1, getClient as getClient_1 } from "@typespec/ts-http-runtime";
import type { ClientType as ClientType_1 } from "./models/models.js";

export interface ServiceContext extends Client_1 {}

export interface ServiceClientOptionalParams extends ClientOptions_1 {
  /**
   * Need to be set as 'default', 'multi-client', 'renamed-operation', 'two-operation-group' in client.
   */
  client?: ClientType_1;
}

export function createService(
  endpoint: string,
  options: ServiceClientOptionalParams = {},
): ServiceContext {
  const client = options.client ?? "default";
  const endpointUrl = options.endpoint ?? `${endpoint}/client/structure/${client}`;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions ? `${prefixFromOptions} azsdk-js-api` : `azsdk-js-api`;
  const updatedOptions = {
  ...options,
  userAgentOptions: { userAgentPrefix },
  };
  return getClient_1(endpointUrl, updatedOptions); as ServiceContext;
}

```

# handle with default values in server

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

@server(
  "{endpoint}/client/structure/{client}",
  "",
  {
    @doc("Need to be set as 'http://localhost:3000' in client.")
    endpoint: url = "http://localhost:3000",

    @doc("Need to be set as 'default', 'multi-client', 'renamed-operation', 'two-operation-group' in client.")
    client: ClientType = ClientType.Default,
  }
)
@service(#{
  title: "MultiClient"
})
@versioned(Client.Structure.Service.Versions)
namespace Client.Structure.Service;

enum Versions {
  /** Version 2022-08-31 */

  `2022-08-30`,
}

enum ClientType {
  Default: "default",
  MultiClient: "multi-client",
  RenamedOperation: "renamed-operation",
  TwoOperationGroup: "two-operation-group",
}

@route("/one")
@post
op one(): void;
```

The config would be like:

```yaml
withRawContent: true
ignoreWeirdLine: false
```

## clientContext

```ts clientContext
import { type Client as Client_1, type ClientOptions as ClientOptions_1, getClient as getClient_1 } from "@typespec/ts-http-runtime";
import type { ClientType as ClientType_1 } from "./models/models.js";

export interface ServiceContext extends Client_1 {}

export interface ServiceClientOptionalParams extends ClientOptions_1 {
  /**
   * Need to be set as 'http://localhost:3000' in client.
   */
  endpoint?: string;
  /**
   * Need to be set as 'default', 'multi-client', 'renamed-operation', 'two-operation-group' in client.
   */
  client?: ClientType_1;
}

export function createService(
  options: ServiceClientOptionalParams = {},
): ServiceContext {
  const endpoint = options.endpoint ?? "http://localhost:3000";
  const client = options.client ?? "default";
  const endpointUrl = options.endpoint ?? `${endpoint}/client/structure/${client}`;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions ? `${prefixFromOptions} azsdk-js-api` : `azsdk-js-api`;
  const updatedOptions = {
  ...options,
  userAgentOptions: { userAgentPrefix },
  };
  return getClient_1(endpointUrl, updatedOptions); as ServiceContext;
}

```

# handle with title config for client Context

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

@server(
  "{endpoint}/client/structure/{client}",
  "",
  {
    @doc("Need to be set as 'http://localhost:3000' in client.")
    endpoint: url,

    @doc("Need to be set as 'default', 'multi-client', 'renamed-operation', 'two-operation-group' in client.")
    client: ClientType = ClientType.Default,
  }
)
@service(#{
  title: "MultiClient"
})
@versioned(Client.Structure.Service.Versions)
namespace Client.Structure.Service;

enum Versions {
  /** Version 2022-08-31 */

  `2022-08-30`,
}

enum ClientType {
  Default: "default",
  MultiClient: "multi-client",
  RenamedOperation: "renamed-operation",
  TwoOperationGroup: "two-operation-group",
}

@route("/one")
@post
op one(): void;
```

The config would be like:

```yaml
typespec-title-map:
  ServiceClient: TestServiceClient
withRawContent: true
ignoreWeirdLine: false
```

## clientContext

```ts clientContext
import { type Client as Client_1, type ClientOptions as ClientOptions_1, getClient as getClient_1 } from "@typespec/ts-http-runtime";
import type { ClientType as ClientType_1 } from "./models/models.js";

export interface ServiceContext extends Client_1 {}

export interface ServiceClientOptionalParams extends ClientOptions_1 {
  /**
   * Need to be set as 'default', 'multi-client', 'renamed-operation', 'two-operation-group' in client.
   */
  client?: ClientType_1;
}

export function createService(
  endpoint: string,
  options: ServiceClientOptionalParams = {},
): ServiceContext {
  const client = options.client ?? "default";
  const endpointUrl = options.endpoint ?? `${endpoint}/client/structure/${client}`;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions ? `${prefixFromOptions} azsdk-js-api` : `azsdk-js-api`;
  const updatedOptions = {
  ...options,
  userAgentOptions: { userAgentPrefix },
  };
  return getClient_1(endpointUrl, updatedOptions); as ServiceContext;
}

```
