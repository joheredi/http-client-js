# Should handle flatten model with all readonly properties correctly

## TypeSpec

This is tsp definition.

```tsp

model SolutionProperties {
  @visibility(Lifecycle.Read)
  solutionId?: string;

  @visibility(Lifecycle.Read)
  title?: string;

  @visibility(Lifecycle.Read)
  content?: string;
}
model Solution{
  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: SolutionProperties;
  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  propertiesOptional?: SolutionProperties;
}
op test(@body body:Solution):void;

```

Enable the raw content with TCGC dependency.

```yaml
needTCGC: true
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { areAllPropsUndefined } from "../helpers/serializationHelpers.js";

/**
 * model interface Solution
 */
export interface Solution {
  readonly solutionId?: string;
  readonly title?: string;
  readonly content?: string;
  readonly solutionId?: string;
  readonly title?: string;
  readonly content?: string;
}

/**
 * model interface SolutionProperties
 */
export interface SolutionProperties {
  readonly solutionId?: string;
  readonly title?: string;
  readonly content?: string;
}

export function solutionSerializer(item: Solution): any {
  return {
    properties: _solutionPropertiesSerializer(item),
    propertiesOptional: areAllPropsUndefined(item, [
      "solutionId",
      "title",
      "content",
    ])
      ? undefined
      : _solutionPropertiesOptionalSerializer(item),
  };
}

export function solutionPropertiesSerializer(item: SolutionProperties): any {
  return {
    solutionId: item["solutionId"],
    title: item["title"],
    content: item["content"],
  };
}

export function _solutionPropertiesSerializer(item: Solution): any {
  return {
    solutionId: item["solutionId"],
    title: item["title"],
    content: item["content"],
  };
}

export function _solutionPropertiesOptionalSerializer(item: Solution): any {
  return {
    solutionId: item["solutionId"],
    title: item["title"],
    content: item["content"],
  };
}
```
