# should generate constructor without subscription ID

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

/** Client.GlobalService Resource Provider management API. */
@armProviderNamespace
@service(#{
  title: "Client.GlobalService management service",
})
@versioned(Client.GlobalService.Versions)
namespace Client.GlobalService;

/** The available API versions. */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_10_01_preview: "2021-10-01-preview",
}

interface Operations extends Azure.ResourceManager.Operations {}
```

The config would be like:

```yaml
withRawContent: true
```

## classicClient

```ts classicClient
import {
  _getOperationsOperations as _getOperationsOperations_1,
  OperationsOperations as OperationsOperations_1,
} from "./classic/operations/index.js";
import {
  createGlobalService as createGlobalService_1,
  type GlobalServiceClientOptionalParams as GlobalServiceClientOptionalParams_1,
  type GlobalServiceContext as GlobalServiceContext_1,
} from "./globalServiceClientContext.js";
import {
  Pipeline as Pipeline_1,
  type TokenCredential as TokenCredential_1,
} from "@typespec/ts-http-runtime";

export class GlobalServiceClient {
  private _client: GlobalServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  /** The operation group for Operations */
  public readonly operations: OperationsOperations_1;

  constructor(
    credential: TokenCredential_1,
    options: GlobalServiceClientOptionalParams_1 = {},
  ) {
    this._client = createGlobalService_1(credential, options);
    this.pipeline = this._client.pipeline;
    this.operations = _getOperationsOperations_1(this._client);
  }
}
```

# should generate constructor requiring subscription ID

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

/** Client.StandardService Resource Provider management API. */
@armProviderNamespace
@service(#{
  title: "Client.StandardService management service",
})
@versioned(Client.StandardService.Versions)
namespace Client.StandardService;

/** The available API versions. */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_10_01_preview: "2021-10-01-preview",
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Standard resource */
model StandardResource is TrackedResource<StandardProperties> {
  ...ResourceNameParameter<StandardResource>;
}

model StandardProperties {
  displayName?: string;
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,
  Provisioning: "Provisioning",
  string,
}

@armResourceOperations
interface StandardResources {
  get is ArmResourceRead<StandardResource>;
}

@autoRoute
op checkNameAvailability is ArmProviderActionSync<
  Request = CheckNameAvailabilityInput,
  Response = CheckNameAvailabilityOutput
>;

model CheckNameAvailabilityInput {
  name: string;
  type: string;
}

model CheckNameAvailabilityOutput {
  @visibility(Lifecycle.Read)
  nameAvailable?: boolean;
  @visibility(Lifecycle.Read)
  reason?: string;
  @visibility(Lifecycle.Read)
  message?: string;
}
```

The config would be like:

```yaml
withRawContent: true
```

## classicClient

```ts classicClient
import { checkNameAvailability as checkNameAvailability_1 } from "./api/operations.js";
import type { CheckNameAvailabilityOptionalParams as CheckNameAvailabilityOptionalParams_1 } from "./api/options.js";
import {
  _getOperationsOperations as _getOperationsOperations_1,
  OperationsOperations as OperationsOperations_1,
} from "./classic/operations/index.js";
import {
  _getStandardResourcesOperations as _getStandardResourcesOperations_1,
  StandardResourcesOperations as StandardResourcesOperations_1,
} from "./classic/standardResources/index.js";
import type {
  CheckNameAvailabilityInput as CheckNameAvailabilityInput_1,
  CheckNameAvailabilityOutput as CheckNameAvailabilityOutput_1,
} from "./models/models.js";
import {
  createStandardService as createStandardService_1,
  type StandardServiceClientOptionalParams as StandardServiceClientOptionalParams_1,
  type StandardServiceContext as StandardServiceContext_1,
} from "./standardServiceClientContext.js";
import {
  Pipeline as Pipeline_1,
  type TokenCredential as TokenCredential_1,
} from "@typespec/ts-http-runtime";

export class StandardServiceClient {
  private _client: StandardServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  /** The operation group for Operations */
  public readonly operations: OperationsOperations_1;
  /** The operation group for StandardResources */
  public readonly standardResources: StandardResourcesOperations_1;

  constructor(
    credential: TokenCredential_1,
    options: StandardServiceClientOptionalParams_1 = {},
  ) {
    this._client = createStandardService_1(credential, options);
    this.pipeline = this._client.pipeline;
    this.operations = _getOperationsOperations_1(this._client);
    this.standardResources = _getStandardResourcesOperations_1(this._client);
  }

  checkNameAvailability(
    body: CheckNameAvailabilityInput_1,
    options: CheckNameAvailabilityOptionalParams_1 = { requestOptions: {} },
  ): Promise<CheckNameAvailabilityOutput_1> {
    return checkNameAvailability_1(this._client, body, options);
  }
}
```

# should generate constructor overloads for mixed tenant-level and subscription-level operations

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

/** Client.MixedService Resource Provider management API. */
@armProviderNamespace
@service(#{
  title: "Client.MixedService management service",
})
@versioned(Client.MixedService.Versions)
namespace Client.MixedService;

/** The available API versions. */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_10_01_preview: "2021-10-01-preview",
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Mixed resource that requires subscription */
model MixedResource is TrackedResource<MixedProperties> {
  ...ResourceNameParameter<MixedResource>;
}

model MixedProperties {
  displayName?: string;
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,
  Provisioning: "Provisioning",
  string,
}

@armResourceOperations
interface MixedResources {
  get is ArmResourceRead<MixedResource>;
}

@route("/providers/Client.MixedService/skus")
@get
op listSkus(): SkuListResult;

model SkuListResult {
  value: Sku[];
}

model Sku {
  name?: string;
  tier?: string;
  capacity?: int32;
}
```

The config would be like:

```yaml
withRawContent: true
```

## classicClient

```ts classicClient
import { listSkus as listSkus_1 } from "./api/operations.js";
import type { ListSkusOptionalParams as ListSkusOptionalParams_1 } from "./api/options.js";
import {
  _getMixedResourcesOperations as _getMixedResourcesOperations_1,
  MixedResourcesOperations as MixedResourcesOperations_1,
} from "./classic/mixedResources/index.js";
import {
  _getOperationsOperations as _getOperationsOperations_1,
  OperationsOperations as OperationsOperations_1,
} from "./classic/operations/index.js";
import {
  createMixedService as createMixedService_1,
  type MixedServiceClientOptionalParams as MixedServiceClientOptionalParams_1,
  type MixedServiceContext as MixedServiceContext_1,
} from "./mixedServiceClientContext.js";
import type { SkuListResult as SkuListResult_1 } from "./models/models.js";
import {
  Pipeline as Pipeline_1,
  type TokenCredential as TokenCredential_1,
} from "@typespec/ts-http-runtime";

export class MixedServiceClient {
  private _client: MixedServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  /** The operation group for Operations */
  public readonly operations: OperationsOperations_1;
  /** The operation group for MixedResources */
  public readonly mixedResources: MixedResourcesOperations_1;

  constructor(
    credential: TokenCredential_1,
    options: MixedServiceClientOptionalParams_1 = {},
  ) {
    this._client = createMixedService_1(credential, options);
    this.pipeline = this._client.pipeline;
    this.operations = _getOperationsOperations_1(this._client);
    this.mixedResources = _getMixedResourcesOperations_1(this._client);
  }

  listSkus(
    options: ListSkusOptionalParams_1 = { requestOptions: {} },
  ): Promise<SkuListResult_1> {
    return listSkus_1(this._client, options);
  }
}
```
