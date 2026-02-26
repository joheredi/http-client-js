# Should handle name collision compared with base properties

Should handle name collision compared with base properties.

## TypeSpec

This is tsp definition.

```tsp
model FooProperties {
  bar?: string;
  baz: string;
}

model Test {
  bar?: string;
  baz: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: FooProperties;
}

op foo(body: Test): Test;
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

export interface Test {
  bar?: string;
  baz: string;
  bar?: string;
  baz: string;
}

export interface FooProperties {
  bar?: string;
  baz: string;
}

export interface _FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}
```

# Should handle name collision compared with another flatten property

Should handle name collision compared with another flatten property.

## TypeSpec

This is tsp definition.

```tsp
model FooProperties {
  bar?: string;
  baz: string;
}

model XProperties {
  bar?: string;
  baz: string;
  x: string;
}

model Test {
  result: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: FooProperties;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  anotherProperties?: XProperties;
}

op foo(body: Test): Test;
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

export interface Test {
  result: string;
  bar?: string;
  baz: string;
  bar?: string;
  baz?: string;
  x?: string;
}

export interface FooProperties {
  bar?: string;
  baz: string;
}

export interface XProperties {
  bar?: string;
  baz: string;
  x: string;
}

export interface _FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
    x: item["x"],
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function xPropertiesSerializer(item: XProperties): any {
  return {
    bar: item["bar"],
    baz: item["baz"],
    x: item["x"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
    x: item["x"],
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function xPropertiesDeserializer(item: any): XProperties {
  return {
    bar: item["bar"],
    baz: item["baz"],
    x: item["x"],
  };
}
```

# Should handle one name with multiple collision times

Should handle name collision compared with another flatten property.

## TypeSpec

This is tsp definition.

```tsp
model FooProperties {
  bar?: string;
  baz: string;
}

model XProperties {
  bar?: string;
  baz: string;
  result: string;
}

model Test {
  result: string;
  bar?: string;
  baz: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: FooProperties;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  anotherProperties?: XProperties;
}

op foo(body: Test): Test;
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

export interface Test {
  result: string;
  bar?: string;
  baz: string;
  bar?: string;
  baz: string;
  bar?: string;
  baz?: string;
  result?: string;
}

export interface FooProperties {
  bar?: string;
  baz: string;
}

export interface XProperties {
  bar?: string;
  baz: string;
  result: string;
}

export interface _FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
    result: item["result"],
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function xPropertiesSerializer(item: XProperties): any {
  return {
    bar: item["bar"],
    baz: item["baz"],
    result: item["result"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
    bar: item["bar"],
    baz: item["baz"],
    result: item["result"],
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function xPropertiesDeserializer(item: any): XProperties {
  return {
    bar: item["bar"],
    baz: item["baz"],
    result: item["result"],
  };
}
```

# Should ignore non-model flatten property and handle name collision with model flatten property correctly

Should ignore non-model flatten property (de)serialize it correctly when its name collides with properties from a model-type flatten property.

## TypeSpec

This is tsp definition.

```tsp
model FooProperties {
  name: string;
  prop1: string;
  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  prop2: string;
}

model Test {
  result: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  name: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: FooProperties;
}

op foo(body: Test): Test;
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

export interface Test {
  result: string;
  name: string;
  name: string;
  prop1: string;
  prop2: string;
}

export interface FooProperties {
  name: string;
  prop1: string;
  prop2: string;
}

export interface _FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    name: item["name"],
    name: item["name"],
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    name: item["name"],
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
    name: item["name"],
    name: item["name"],
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    name: item["name"],
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```
