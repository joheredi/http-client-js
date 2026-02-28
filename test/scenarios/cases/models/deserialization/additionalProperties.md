# Should generate deserializer for additional properties for legacy code

## TypeSpec

This is tsp definition.

```tsp
model SimpleModel {
    ...Record<string>;
    propA: string;
    propB: string;
}

@route("/serialize")
interface D {
  op bar(): { @body body: SimpleModel };
}
```

This is the tsp configuration.

```yaml
compatibility-mode: true
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
export interface SimpleModel extends Record<string, string> {
  propA: string;
  propB: string;
}

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    ...item,
    propA: item["propA"],
    propB: item["propB"],
  };
}
```

# Should generate deserializer for additional properties for non-legacy code

## TypeSpec

This is tsp definition.

```tsp
model SimpleModel {
    ...Record<string>;
    propA: string;
    propB: string;
}

model EmptyModel {
    ...Record<string>;
}

model UnionModel {
    ...Record<string>;
    ...Record<int32>;
    propA: string;
    propB: string;
}

model NameConflictModel {
    ...Record<string>;
    additionalProperties: Record<int32>;
    propA: string;
    propB: string;
}

model ObjectAdditionalPropsModel {
    ...Record<string>;
    additionalProperties: {};
    propA: string;
    propB: string;
}

@route("/serialize")
interface D {
  @route("bar")
  op bar(): { @body body: SimpleModel };
  @route("baz")
  op baz(): { @body body: EmptyModel };
  @route("bas")
  op bas(): { @body body: UnionModel };
  @route("bab")
  op bab(): { @body body: NameConflictModel };
  @route("obj")
  op obj(): { @body body: ObjectAdditionalPropsModel };
}
```

This is the tsp configuration.

```yaml
compatibility-mode: false
mustEmptyDiagnostic: false
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

import { deserializeRecord } from "../static-helpers/serializationHelpers.js";

/**
 * model interface SimpleModel
 */
export interface SimpleModel {
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, string>;
}

/**
 * model interface EmptyModel
 */
export interface EmptyModel {
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, string>;
}

/**
 * model interface UnionModel
 */
export interface UnionModel {
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, _UnionModelAdditionalProperty>;
}

/**
 * model interface NameConflictModel
 */
export interface NameConflictModel {
  additionalProperties: Record<string, number>;
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalPropertiesBag?: Record<string, string>;
}

/**
 * model interface ObjectAdditionalPropsModel
 */
export interface ObjectAdditionalPropsModel {
  additionalProperties: Record<string, any>;
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalPropertiesBag?: Record<string, string>;
}

/**
 * model interface _ObjectAdditionalPropsModelAdditionalProperties
 */
export interface _ObjectAdditionalPropsModelAdditionalProperties {}

/**
 * Alias for _UnionModelAdditionalProperty
 */
export type _UnionModelAdditionalProperty = string | number;

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    additionalProperties: deserializeRecord(item, undefined, [
      "propA",
      "propB",
    ]),
    propA: item["propA"],
    propB: item["propB"],
  };
}

export function emptyModelDeserializer(item: any): EmptyModel {
  return {
    additionalProperties: deserializeRecord(item, undefined, []),
  };
}

export function unionModelDeserializer(item: any): UnionModel {
  return {
    additionalProperties: deserializeRecord(
      item,
      (v: any) => _unionModelAdditionalPropertyDeserializer(v),
      ["propA", "propB"],
    ),
    propA: item["propA"],
    propB: item["propB"],
  };
}

export function nameConflictModelDeserializer(item: any): NameConflictModel {
  return {
    additionalPropertiesBag: deserializeRecord(item, undefined, [
      "additionalProperties",
      "propA",
      "propB",
    ]),
    additionalProperties: item["additionalProperties"],
    propA: item["propA"],
    propB: item["propB"],
  };
}

export function objectAdditionalPropsModelDeserializer(
  item: any,
): ObjectAdditionalPropsModel {
  return {
    additionalPropertiesBag: deserializeRecord(item, undefined, [
      "additionalProperties",
      "propA",
      "propB",
    ]),
    additionalProperties:
      _objectAdditionalPropsModelAdditionalPropertiesDeserializer(
        item["additionalProperties"],
      ),
    propA: item["propA"],
    propB: item["propB"],
  };
}

export function _objectAdditionalPropsModelAdditionalPropertiesDeserializer(
  item: any,
): _ObjectAdditionalPropsModelAdditionalProperties {
  return item;
}

export function _unionModelAdditionalPropertyDeserializer(
  item: any,
): _UnionModelAdditionalProperty {
  return item;
}
```
