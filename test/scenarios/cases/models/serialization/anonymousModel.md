# Should generate serializer for anonymous models

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
  op bar(@body body: SimpleModel): void;
}
```

## Provide generated models and its serializer

Generated Models.

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface SimpleModel
 */
export interface SimpleModel {
  prop: _SimpleModelProp;
}

/**
 * model interface _SimpleModelProp
 */
export interface _SimpleModelProp {
  propA: string;
  propB: _SimpleModelPropPropB;
}

/**
 * model interface _SimpleModelPropPropB
 */
export interface _SimpleModelPropPropB {
  propAa: string;
  propBb: boolean;
}
```

```ts serialization
import type {
  _SimpleModelProp,
  _SimpleModelPropPropB,
  SimpleModel,
} from "../models.js";

export function simpleModelSerializer(item: SimpleModel): any {
  return {
    prop: _simpleModelPropSerializer(item["prop"]),
  };
}

export function _simpleModelPropSerializer(item: _SimpleModelProp): any {
  return {
    propA: item["propA"],
    propB: _simpleModelPropPropBSerializer(item["propB"]),
  };
}

export function _simpleModelPropPropBSerializer(
  item: _SimpleModelPropPropB,
): any {
  return {
    propAA: item["propAa"],
    propBB: item["propBb"],
  };
}
```
