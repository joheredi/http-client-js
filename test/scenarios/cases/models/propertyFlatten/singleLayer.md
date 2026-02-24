# Should support property flatten with required `properties`

Should support property flatten with required `properties` and its model includes optional and required properties.

## TypeSpec

This is tsp definition.

```tsp
model A {
  x: string;
}
model FooProperties {
  bar?: A[];
  baz: A[];
}

model Test {
  result: string;

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
export interface Test {
  result: string;
  bar?: A[];
  baz: A[];
}

export interface FooProperties {
  bar?: A[];
  baz: A[];
}

export interface A {
  x: string;
}

export interface FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aSerializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aSerializer(p);
    }),
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aSerializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aSerializer(p);
    }),
  };
}

export function aSerializer(item: A): any {
  return {
    x: item["x"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aDeserializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aDeserializer(p);
    }),
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aDeserializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aDeserializer(p);
    }),
  };
}

export function aDeserializer(item: any): A {
  return {
    x: item["x"],
  };
}
```

# Should support property flatten with optional `properties`

Should support property flatten with optional `properties` and its model includes optional and required properties.

## TypeSpec

This is tsp definition.

```tsp
model A {
  x: string;
}
model FooProperties {
  bar?: A[];
  baz: A[];
}

model Test {
  result: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties?: FooProperties;
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
export interface Test {
  result: string;
  bar?: A[];
  baz?: A[];
}

export interface FooProperties {
  bar?: A[];
  baz: A[];
}

export interface A {
  x: string;
}

export interface FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aSerializer(p);
        }),
    baz: !item["baz"]
      ? item["baz"]
      : item["baz"].map((p: any) => {
          return aSerializer(p);
        }),
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aSerializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aSerializer(p);
    }),
  };
}

export function aSerializer(item: A): any {
  return {
    x: item["x"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aDeserializer(p);
        }),
    baz: !item["baz"]
      ? item["baz"]
      : item["baz"].map((p: any) => {
          return aDeserializer(p);
        }),
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aDeserializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aDeserializer(p);
    }),
  };
}

export function aDeserializer(item: any): A {
  return {
    x: item["x"],
  };
}
```

# Should support property flatten with `properties` in nested models

Should support property flatten with optional `properties` and the property is positioned in a nested body model.

## TypeSpec

This is tsp definition.

```tsp
model TestFoo {
  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: FooProperties;
}

model FooProperties {
  bar?: string;
  baz: string;
}

model Test {
  result: string;
  foo: TestFoo;
}

op foo(body: Test): void;
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
export interface Test {
  result: string;
  foo: TestFoo;
}

export interface TestFoo {
  bar?: string;
  baz: string;
}

export interface FooProperties {
  bar?: string;
  baz: string;
}

export interface FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    foo: testFooSerializer(item["foo"]),
  };
}

export function testFooSerializer(item: TestFoo): any {
  return {
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
```

# Should support property flatten with `properties` and it has base model and readOnly visibility property

Should support property flatten with optional `properties` and its model has a parent model.

## TypeSpec

This is tsp definition.

```tsp

model Baz {
  @visibility(Lifecycle.Read)
  readOnlyProp: string;
  baz: string;
}

model FooProperties extends Baz{
  bar?: string;
  baz: "baz";
}

model Test {
  result: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties?: FooProperties;
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
export interface Test {
  result: string;
  bar?: string;
  baz?: "baz";
}

export interface FooProperties extends Baz {
  bar?: string;
  baz: "baz";
}

export interface Baz {
  readonly readOnlyProp: string;
  baz: string;
}

export interface FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
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

export function bazSerializer(item: Baz): any {
  return {
    readOnlyProp: item["readOnlyProp"],
    baz: item["baz"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
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

export function bazDeserializer(item: any): Baz {
  return {
    readOnlyProp: item["readOnlyProp"],
    baz: item["baz"],
  };
}
```

# Should support property flatten with random property name and multiple properties but only single layer

Should support property flatten with optional `identifiers` and its model has a parent model.

## TypeSpec

This is tsp definition.

```tsp

model Baz {
  @visibility(Lifecycle.Read)
  readOnlyProp: string;
  baz: string;
}

model FooProperties extends Baz{
  bar?: string;
  baz: "baz";
}

model TestIdentifiers {
  id: string;
  location?: string;
}

model Test {
  result: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties?: FooProperties;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  identifiers: TestIdentifiers;
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
export interface Test {
  result: string;
  bar?: string;
  baz?: "baz";
  id: string;
  location?: string;
}

export interface FooProperties extends Baz {
  bar?: string;
  baz: "baz";
}

export interface Baz {
  readonly readOnlyProp: string;
  baz: string;
}

export interface TestIdentifiers {
  id: string;
  location?: string;
}

export interface FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    bar: item["bar"],
    baz: item["baz"],
    id: item["id"],
    location: item["location"],
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function bazSerializer(item: Baz): any {
  return {
    readOnlyProp: item["readOnlyProp"],
    baz: item["baz"],
  };
}

export function testIdentifiersSerializer(item: TestIdentifiers): any {
  return {
    id: item["id"],
    location: item["location"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
    bar: item["bar"],
    baz: item["baz"],
    id: item["id"],
    location: item["location"],
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    bar: item["bar"],
    baz: item["baz"],
  };
}

export function bazDeserializer(item: any): Baz {
  return {
    readOnlyProp: item["readOnlyProp"],
    baz: item["baz"],
  };
}

export function testIdentifiersDeserializer(item: any): TestIdentifiers {
  return {
    id: item["id"],
    location: item["location"],
  };
}
```

# Should ignore flatten if non-model property is decorated with flattenProperty

Should ignore flatten property decorator if applied to non-model properties.

## TypeSpec

This is tsp definition.

```tsp
model FooProperties {
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
export interface Test {
  result: string;
  name: string;
  prop1: string;
  prop2: string;
}

export interface FooProperties {
  prop1: string;
  prop2: string;
}

export interface FooRequest {
  body: Test;
}

export function testSerializer(item: Test): any {
  return {
    result: item["result"],
    name: item["name"],
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}

export function testDeserializer(item: any): Test {
  return {
    result: item["result"],
    name: item["name"],
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}

export function fooPropertiesDeserializer(item: any): FooProperties {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```
