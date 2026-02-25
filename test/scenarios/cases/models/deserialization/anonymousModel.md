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
  prop: _SimpleModelProp;
}

export interface _SimpleModelProp {
  propA: string;
  propB: _SimpleModelPropPropB;
}

export interface _SimpleModelPropPropB {
  propAa: string;
  propBb: boolean;
}

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    prop: _simpleModelPropDeserializer(item["prop"]),
  };
}

export function _simpleModelPropDeserializer(item: any): _SimpleModelProp {
  return {
    propA: item["propA"],
    propB: _simpleModelPropPropBDeserializer(item["propB"]),
  };
}

export function _simpleModelPropPropBDeserializer(
  item: any,
): _SimpleModelPropPropB {
  return {
    propAA: item["propAA"],
    propBB: item["propBB"],
  };
}
```
