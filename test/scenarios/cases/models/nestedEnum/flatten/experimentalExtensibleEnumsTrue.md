# Should flatten extensible enum if enabling `experimental-extensible-enums`

Sample generation should arm template and operations successfully.

## TypeSpec

This is tsp definition.

```tsp
import "@typespec/versioning";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Versioning;
using Azure.ResourceManager;

/** Microsoft.Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{
  title: "Microsoft.Contoso management service",
})
@versioned(Microsoft.Contoso.Versions)
namespace Microsoft.Contoso;

/** The available API versions. */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_10_01_preview: "2021-10-01-preview",
}

/** The resource provisioning state. */
union ProvisioningState {
  ResourceProvisioningState,

  /** The resource is being provisioned */
  Provisioning: "Provisioning",

  /** The resource is updating */
  Updating: "Updating",

  /** The resource is being deleted */
  Deleting: "Deleting",

  /** The resource create request has been accepted */
  Accepted: "Accepted",

  string,
}

op foo(
  body: {
    status: ProvisioningState;
  },
): void;
```

Should enable `flatten-union-as-enum` option:

```yaml
withRawContent: true
experimental-extensible-enums: true
```

## Models

Model generated.

```ts models
export interface _FooRequestBody {
  status: ProvisioningState;
}

export interface _FooRequest {
  body: _FooRequestBody;
}

/**
 * The resource provisioning state.
 */
export type ProvisioningState = string;

/**
 * The resource provisioning state.
 */
export enum KnownProvisioningState {
  /**
   * Resource has been created.
   */
  Succeeded = "Succeeded",
  /**
   * Resource creation failed.
   */
  Failed = "Failed",
  /**
   * Resource creation was canceled.
   */
  Canceled = "Canceled",
  /**
   * The resource is being provisioned
   */
  Provisioning = "Provisioning",
  /**
   * The resource is updating
   */
  Updating = "Updating",
  /**
   * The resource is being deleted
   */
  Deleting = "Deleting",
  /**
   * The resource create request has been accepted
   */
  Accepted = "Accepted",
}

/**
 * The available API versions.
 */
export type Versions = "2021-10-01-preview";

export function _fooRequestBodySerializer(item: _FooRequestBody): any {
  return {
    status: item["status"],
  };
}
```
