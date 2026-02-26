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
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export interface SimpleModel {
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, string>;
}

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
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
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export interface SimpleModel {
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, string>;
}

export interface EmptyModel {
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, string>;
}

export interface UnionModel {
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, UnionModelAdditionalProperty>;
}

export interface NameConflictModel {
  additionalProperties: Record<string, number>;
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalPropertiesBag?: Record<string, string>;
}

export interface ObjectAdditionalPropsModel {
  additionalProperties: _ObjectAdditionalPropsModelAdditionalProperties;
  propA: string;
  propB: string;
  /**
   * Additional properties
   */
  additionalPropertiesBag?: Record<string, string>;
}

export interface _ObjectAdditionalPropsModelAdditionalProperties {}

/**
 * Alias for UnionModelAdditionalProperty
 */
export type UnionModelAdditionalProperty = string | number;

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    propA: item["propA"],
    propB: item["propB"],
  };
}

export function emptyModelDeserializer(item: any): EmptyModel {
  return {};
}

export function unionModelDeserializer(item: any): UnionModel {
  return {
    propA: item["propA"],
    propB: item["propB"],
  };
}

export function nameConflictModelDeserializer(item: any): NameConflictModel {
  return {
    additionalProperties: item["additionalProperties"],
    propA: item["propA"],
    propB: item["propB"],
  };
}

export function objectAdditionalPropsModelDeserializer(
  item: any,
): ObjectAdditionalPropsModel {
  return {
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
  return {};
}
```
