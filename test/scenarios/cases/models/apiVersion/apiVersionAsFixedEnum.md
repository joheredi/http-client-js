# Should generate as fixed enum if apiVersion enum is referenced by normal operation

Generally we will not recommend that version enum is referenced by normal operation. But if happened we would generate it as normal fixed enum.

## TypeSpec

This is tsp definition.

```tsp
import "@typespec/versioning";
import "@typespec/http";

using TypeSpec.Versioning;
using TypeSpec.Http;

@service(#{
  title: "Microsoft.Contoso management service",
})
@versioned(Microsoft.Contoso.Versions)
namespace Microsoft.Contoso;

/** The available API versions. */
enum Versions {
  /** 2021-10-01-preview version */
  v2021_10_01_preview: "2021-10-01-preview",
}

op foo(@header apiVersion: Versions): void;
```

The config would be like:

```yaml
withRawContent: true
```

## Models

Generate as normal enums.

```ts models
/**
 * The available API versions.
 */
export type Versions = "2021-10-01-preview";

/**
 * The available API versions.
 */
export enum KnownVersions {
  /**
   * 2021-10-01-preview version
   */
  V2021_10_01Preview = "2021-10-01-preview",
}
```

## Operations

Should normal operation with enum parameter:

```ts operations
import type { FooOptionalParams as FooOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _fooSend(
  context: Client_1,
  options: FooOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      "api-version": options?.apiVersion,
      ...options.requestOptions?.headers,
    },
  });
}

export async function _fooDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function foo(
  context: Client_1,
  options: FooOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _fooSend(context, options);
  return _fooDeserialize(result);
}
```
