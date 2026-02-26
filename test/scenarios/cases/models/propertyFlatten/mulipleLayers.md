# Flatten transitions are not supported so consecutive transitions will be ignored and we only handle the first layer flattening

Flatten transitions are not supported so the transitions will be ignored.

## TypeSpec

This is tsp definition.

```tsp
model ChildModel {
  description: string;
  age: int32;
}

model NestedFlattenModel {
  name: string;

  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: ChildFlattenModel;
}
model ChildFlattenModel {
  summary: string;

  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: ChildModel;
}

op foo(body: NestedFlattenModel): NestedFlattenModel;
```

Enable the raw content with TCGC dependency.

```yaml
needArmTemplate: true
withVersionedApiVersion: true
needTCGC: true
mustEmptyDiagnostic: false
```

## Models

Model generated.

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export interface NestedFlattenModel {
  name: string;
  summary: string;
  properties: ChildModel;
}

export interface ChildFlattenModel {
  summary: string;
  description: string;
  age: number;
}

export interface ChildModel {
  description: string;
  age: number;
}

export interface _FooRequest {
  body: NestedFlattenModel;
}

/**
 * The available API versions.
 */
export enum KnownVersions {
  /**
   * 2022-05-15-preview
   */
  V20220515Preview = "2022-05-15-preview",
}

export function nestedFlattenModelSerializer(item: NestedFlattenModel): any {
  return {
    name: item["name"],
    summary: item["summary"],
    properties: childModelSerializer(item["properties"]),
  };
}

export function childFlattenModelSerializer(item: ChildFlattenModel): any {
  return {
    summary: item["summary"],
    description: item["description"],
    age: item["age"],
  };
}

export function childModelSerializer(item: ChildModel): any {
  return {
    description: item["description"],
    age: item["age"],
  };
}

export function nestedFlattenModelDeserializer(item: any): NestedFlattenModel {
  return {
    name: item["name"],
    summary: item["summary"],
    properties: childModelDeserializer(item["properties"]),
  };
}

export function childFlattenModelDeserializer(item: any): ChildFlattenModel {
  return {
    summary: item["summary"],
    description: item["description"],
    age: item["age"],
  };
}

export function childModelDeserializer(item: any): ChildModel {
  return {
    description: item["description"],
    age: item["age"],
  };
}
```

# Non-consecutive transitions will be treated as single layer flatten operation and should be handled correctly

Non-consecutive transitions will be treated as first layer flatten operation.

## TypeSpec

This is tsp definition.

```tsp
model ChildModel {
  description: string;
  age: int32;
}

model NestedFlattenModel {
  name: string;

  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: ChildFlattenModel;
}
model ChildFlattenModel {
  summary: string;

  foo: Foo;
}

model Foo {
  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: ChildModel;
}

op foo(body: NestedFlattenModel): NestedFlattenModel;
```

Enable the raw content with TCGC dependency.

```yaml
needArmTemplate: true
withVersionedApiVersion: true
needTCGC: true
```

## Models

Model generated.

```ts models
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export interface NestedFlattenModel {
  name: string;
  summary: string;
  foo: Foo;
}

export interface ChildFlattenModel {
  summary: string;
  foo: Foo;
}

export interface Foo {
  description: string;
  age: number;
}

export interface ChildModel {
  description: string;
  age: number;
}

export interface _FooRequest {
  body: NestedFlattenModel;
}

/**
 * The available API versions.
 */
export enum KnownVersions {
  /**
   * 2022-05-15-preview
   */
  V20220515Preview = "2022-05-15-preview",
}

export function nestedFlattenModelSerializer(item: NestedFlattenModel): any {
  return {
    name: item["name"],
    summary: item["summary"],
    foo: fooSerializer(item["foo"]),
  };
}

export function childFlattenModelSerializer(item: ChildFlattenModel): any {
  return {
    summary: item["summary"],
    foo: fooSerializer(item["foo"]),
  };
}

export function fooSerializer(item: Foo): any {
  return {
    description: item["description"],
    age: item["age"],
  };
}

export function childModelSerializer(item: ChildModel): any {
  return {
    description: item["description"],
    age: item["age"],
  };
}

export function nestedFlattenModelDeserializer(item: any): NestedFlattenModel {
  return {
    name: item["name"],
    summary: item["summary"],
    foo: fooDeserializer(item["foo"]),
  };
}

export function childFlattenModelDeserializer(item: any): ChildFlattenModel {
  return {
    summary: item["summary"],
    foo: fooDeserializer(item["foo"]),
  };
}

export function fooDeserializer(item: any): Foo {
  return {
    description: item["description"],
    age: item["age"],
  };
}

export function childModelDeserializer(item: any): ChildModel {
  return {
    description: item["description"],
    age: item["age"],
  };
}
```
