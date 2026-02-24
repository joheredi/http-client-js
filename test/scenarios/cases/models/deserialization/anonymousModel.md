# Should generate deserializer for anonymous models

Will prompt all operations into top-level.

## TypeSpec

This is tsp definition.

```tsp
model SimpleModel {
  prop: {
    propA: string;
    propB: {
      propAA: string;
      propBB: boolean
    }
  }
}

@route("/serialize")
interface D {
  op bar(): { @body body: SimpleModel };
}
```

## Provide generated models and its serializer

Generated Models.

```ts models
export interface SimpleModel {
  prop: SimpleModelProp;
}

export interface SimpleModelProp {
  propA: string;
  propB: SimpleModelPropPropB;
}

export interface SimpleModelPropPropB {
  propAa: string;
  propBb: boolean;
}

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    prop: simpleModelPropDeserializer(item["prop"]),
  };
}

export function simpleModelPropDeserializer(item: any): SimpleModelProp {
  return {
    propA: item["propA"],
    propB: simpleModelPropPropBDeserializer(item["propB"]),
  };
}

export function simpleModelPropPropBDeserializer(
  item: any,
): SimpleModelPropPropB {
  return {
    propAA: item["propAA"],
    propBB: item["propBB"],
  };
}
```
