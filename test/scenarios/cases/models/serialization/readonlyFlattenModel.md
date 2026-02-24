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
export interface Solution {
  readonly solutionId?: string;
  readonly title?: string;
  readonly content?: string;
  readonly solutionId?: string;
  readonly title?: string;
  readonly content?: string;
}

export interface SolutionProperties {
  readonly solutionId?: string;
  readonly title?: string;
  readonly content?: string;
}

export function solutionSerializer(item: Solution): any {
  return {
    solutionId: item["solutionId"],
    title: item["title"],
    content: item["content"],
    solutionId: item["solutionId"],
    title: item["title"],
    content: item["content"],
  };
}

export function solutionPropertiesSerializer(item: SolutionProperties): any {
  return {
    solutionId: item["solutionId"],
    title: item["title"],
    content: item["content"],
  };
}
```
