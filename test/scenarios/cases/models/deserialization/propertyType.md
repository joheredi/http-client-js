# Should generate deserializer for property types

Will prompt all operations into top-level.

## TypeSpec

This is tsp definition.

```tsp
model SimpleModel {
  proNumeric: numeric;
  proNumericArray: numeric[];
  propNumericUnion: string | numeric;
  propString: string;
  propboolean: boolean;
  propNumber: int32;
  propStringOptional?: string;
  propSimpleUnion: string | boolean | int32;
  propSimpleUnionOptional?: string | boolean | int32;
  propStringLiteral: "A";
  propBooleanLiteral: false;
  propNumberLiteral: 1;
  propStringLiteralOptional?: "A";
  propStringUnion: "A" | "B";
  propStringUnionOptional?: "A" | "B";
  propStringUnionNullable: "A" | "B" | null;
  propStringUnionAsExtensible: "A" | "B" | string;
  propStringUnionAsExtensibleOptional?: "A" | "B" | string;
  propStringUnionAsExtensibleNullable: "A" | "B" | string | null;
  propStringUnionAsExtensibleOptionalAndNullable?: "A" | "B" | string | null;
  propMixedTypeLiteral: "A" | false | 1;
  propStringArray: string[];
  propBooleanArray: boolean[];
  propNumberArray: int32[];
  propSimpleUnionArray: (string | boolean | int32)[];
  propStringArrayOptional?: string[];
  propSimpleUnionArrayOptional?: (string | boolean | int32)[];
  propRecordOfString: Record<string>;
  propRecordOfDate: Record<utcDateTime>;
  propRecordOfBoolean: Record<boolean>;
  propRecordOfNumber: Record<int32>;
  propRecordOfSimpleUnion: Record<string | boolean | int32>;
  propRecordOfStringOptional?: Record<string>;
  propRecordOfStringArray: Record<string[]>;
  propArrayOfRecordOfString: Record<string>[];
  propArrayOfRecordOfStringOptional?: Record<string>[];
  propRecordOfUnionArray: Record<(string | boolean | int32)[]>;
  propRecordOfUnionArrayOptional?: Record<(string | boolean | int32)[]>;
  propArrayOfRecordOfUnion: Record<string | boolean | int32>[];
  propArrayOfRecordOfUnionOptional?: Record<string | boolean | int32>[];
  @encodedName("application/json", "prop_encoded")
  propEncoded: string;
  propNestedDict?: Record<Record<unknown>>;
}

@route("/serialize")
interface D {
  op bar(): { @body body: SimpleModel };
}
```

This is the tspconfig.yaml.

```yaml
experimental-extensible-enums: true
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
  proNumeric: number;
  proNumericArray: number[];
  propNumericUnion: _SimpleModelPropNumericUnion;
  propString: string;
  propboolean: boolean;
  propNumber: number;
  propStringOptional?: string;
  propSimpleUnion: _SimpleModelPropSimpleUnion;
  propSimpleUnionOptional?: _SimpleModelPropSimpleUnionOptional;
  propStringLiteral: "A";
  propBooleanLiteral: false;
  propNumberLiteral: 1;
  propStringLiteralOptional?: "A";
  propStringUnion: SimpleModelPropStringUnion;
  propStringUnionOptional?: SimpleModelPropStringUnionOptional;
  propStringUnionNullable: SimpleModelPropStringUnionNullable | null;
  propStringUnionAsExtensible: SimpleModelPropStringUnionAsExtensible;
  propStringUnionAsExtensibleOptional?: SimpleModelPropStringUnionAsExtensibleOptional;
  propStringUnionAsExtensibleNullable: SimpleModelPropStringUnionAsExtensibleNullable | null;
  propStringUnionAsExtensibleOptionalAndNullable?: SimpleModelPropStringUnionAsExtensibleOptionalAndNullable | null;
  propMixedTypeLiteral: _SimpleModelPropMixedTypeLiteral;
  propStringArray: string[];
  propBooleanArray: boolean[];
  propNumberArray: number[];
  propSimpleUnionArray: _SimpleModelPropSimpleUnionArray[];
  propStringArrayOptional?: string[];
  propSimpleUnionArrayOptional?: _SimpleModelPropSimpleUnionArrayOptional[];
  propRecordOfString: Record<string, string>;
  propRecordOfDate: Record<string, Date>;
  propRecordOfBoolean: Record<string, boolean>;
  propRecordOfNumber: Record<string, number>;
  propRecordOfSimpleUnion: Record<string, _SimpleModelPropRecordOfSimpleUnion>;
  propRecordOfStringOptional?: Record<string, string>;
  propRecordOfStringArray: Record<string, string[]>;
  propArrayOfRecordOfString: Record<string, string>[];
  propArrayOfRecordOfStringOptional?: Record<string, string>[];
  propRecordOfUnionArray: Record<string, _SimpleModelPropRecordOfUnionArray[]>;
  propRecordOfUnionArrayOptional?: Record<
    string,
    _SimpleModelPropRecordOfUnionArrayOptional[]
  >;
  propArrayOfRecordOfUnion: Record<
    string,
    _SimpleModelPropArrayOfRecordOfUnion
  >[];
  propArrayOfRecordOfUnionOptional?: Record<
    string,
    _SimpleModelPropArrayOfRecordOfUnionOptional
  >[];
  propEncoded: string;
  propNestedDict?: Record<string, Record<string, any>>;
}

/**
 * Type of SimpleModelPropStringUnion
 */
export type SimpleModelPropStringUnion = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionOptional
 */
export type SimpleModelPropStringUnionOptional = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionAsExtensible
 */
export type SimpleModelPropStringUnionAsExtensible = string;

/**
 * Known values of {@link SimpleModelPropStringUnionAsExtensible} that the service accepts.
 */
export enum KnownSimpleModelPropStringUnionAsExtensible {
  /**
   * A
   */
  A = "A",
  /**
   * B
   */
  B = "B",
}

/**
 * Type of SimpleModelPropStringUnionAsExtensibleOptional
 */
export type SimpleModelPropStringUnionAsExtensibleOptional = string;

/**
 * Known values of {@link SimpleModelPropStringUnionAsExtensibleOptional} that the service accepts.
 */
export enum KnownSimpleModelPropStringUnionAsExtensibleOptional {
  /**
   * A
   */
  A = "A",
  /**
   * B
   */
  B = "B",
}

/**
 * Type of SimpleModelPropStringUnionNullable
 */
export type SimpleModelPropStringUnionNullable = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionAsExtensibleNullable
 */
export type SimpleModelPropStringUnionAsExtensibleNullable = string;

/**
 * Known values of {@link SimpleModelPropStringUnionAsExtensibleNullable} that the service accepts.
 */
export enum KnownSimpleModelPropStringUnionAsExtensibleNullable {
  /**
   * A
   */
  A = "A",
  /**
   * B
   */
  B = "B",
}

/**
 * Type of SimpleModelPropStringUnionAsExtensibleOptionalAndNullable
 */
export type SimpleModelPropStringUnionAsExtensibleOptionalAndNullable = string;

/**
 * Known values of {@link SimpleModelPropStringUnionAsExtensibleOptionalAndNullable} that the service accepts.
 */
export enum KnownSimpleModelPropStringUnionAsExtensibleOptionalAndNullable {
  /**
   * A
   */
  A = "A",
  /**
   * B
   */
  B = "B",
}

/**
 * Alias for _SimpleModelPropNumericUnion
 */
export type _SimpleModelPropNumericUnion = string | number;

/**
 * Alias for _SimpleModelPropSimpleUnion
 */
export type _SimpleModelPropSimpleUnion = string | boolean | number;

/**
 * Alias for _SimpleModelPropSimpleUnionOptional
 */
export type _SimpleModelPropSimpleUnionOptional = string | boolean | number;

/**
 * Alias for _SimpleModelPropMixedTypeLiteral
 */
export type _SimpleModelPropMixedTypeLiteral = "A" | false | 1;

/**
 * Alias for _SimpleModelPropSimpleUnionArray
 */
export type _SimpleModelPropSimpleUnionArray = string | boolean | number;

/**
 * Alias for _SimpleModelPropSimpleUnionArrayOptional
 */
export type _SimpleModelPropSimpleUnionArrayOptional =
  | string
  | boolean
  | number;

/**
 * Alias for _SimpleModelPropRecordOfSimpleUnion
 */
export type _SimpleModelPropRecordOfSimpleUnion = string | boolean | number;

/**
 * Alias for _SimpleModelPropRecordOfUnionArray
 */
export type _SimpleModelPropRecordOfUnionArray = string | boolean | number;

/**
 * Alias for _SimpleModelPropRecordOfUnionArrayOptional
 */
export type _SimpleModelPropRecordOfUnionArrayOptional =
  | string
  | boolean
  | number;

/**
 * Alias for _SimpleModelPropArrayOfRecordOfUnion
 */
export type _SimpleModelPropArrayOfRecordOfUnion = string | boolean | number;

/**
 * Alias for _SimpleModelPropArrayOfRecordOfUnionOptional
 */
export type _SimpleModelPropArrayOfRecordOfUnionOptional =
  | string
  | boolean
  | number;

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    proNumeric: item["proNumeric"],
    proNumericArray: item["proNumericArray"],
    propNumericUnion: _simpleModelPropNumericUnionDeserializer(
      item["propNumericUnion"],
    ),
    propString: item["propString"],
    propboolean: item["propboolean"],
    propNumber: item["propNumber"],
    propStringOptional: item["propStringOptional"],
    propSimpleUnion: _simpleModelPropSimpleUnionDeserializer(
      item["propSimpleUnion"],
    ),
    propSimpleUnionOptional: !item["propSimpleUnionOptional"]
      ? item["propSimpleUnionOptional"]
      : _simpleModelPropSimpleUnionOptionalDeserializer(
          item["propSimpleUnionOptional"],
        ),
    propStringLiteral: item["propStringLiteral"],
    propBooleanLiteral: item["propBooleanLiteral"],
    propNumberLiteral: item["propNumberLiteral"],
    propStringLiteralOptional: item["propStringLiteralOptional"],
    propStringUnion: item["propStringUnion"],
    propStringUnionOptional: item["propStringUnionOptional"],
    propStringUnionNullable: item["propStringUnionNullable"],
    propStringUnionAsExtensible: item["propStringUnionAsExtensible"],
    propStringUnionAsExtensibleOptional:
      item["propStringUnionAsExtensibleOptional"],
    propStringUnionAsExtensibleNullable:
      item["propStringUnionAsExtensibleNullable"],
    propStringUnionAsExtensibleOptionalAndNullable:
      item["propStringUnionAsExtensibleOptionalAndNullable"],
    propMixedTypeLiteral: _simpleModelPropMixedTypeLiteralDeserializer(
      item["propMixedTypeLiteral"],
    ),
    propStringArray: item["propStringArray"],
    propBooleanArray: item["propBooleanArray"],
    propNumberArray: item["propNumberArray"],
    propSimpleUnionArray: item["propSimpleUnionArray"].map((p: any) => {
      return _simpleModelPropSimpleUnionArrayDeserializer(p);
    }),
    propStringArrayOptional: item["propStringArrayOptional"],
    propSimpleUnionArrayOptional: !item["propSimpleUnionArrayOptional"]
      ? item["propSimpleUnionArrayOptional"]
      : item["propSimpleUnionArrayOptional"].map((p: any) => {
          return _simpleModelPropSimpleUnionArrayOptionalDeserializer(p);
        }),
    propRecordOfString: item["propRecordOfString"],
    propRecordOfDate: deserializeRecord(
      item["propRecordOfDate"] as any,
      (v: any) => new Date(v),
    ),
    propRecordOfBoolean: item["propRecordOfBoolean"],
    propRecordOfNumber: item["propRecordOfNumber"],
    propRecordOfSimpleUnion: deserializeRecord(
      item["propRecordOfSimpleUnion"] as any,
      (v: any) => _simpleModelPropRecordOfSimpleUnionDeserializer(v),
    ),
    propRecordOfStringOptional: item["propRecordOfStringOptional"],
    propRecordOfStringArray: item["propRecordOfStringArray"],
    propArrayOfRecordOfString: item["propArrayOfRecordOfString"],
    propArrayOfRecordOfStringOptional:
      item["propArrayOfRecordOfStringOptional"],
    propRecordOfUnionArray: deserializeRecord(
      item["propRecordOfUnionArray"] as any,
      (v: any) =>
        v.map((p: any) => {
          return _simpleModelPropRecordOfUnionArrayDeserializer(p);
        }),
    ),
    propRecordOfUnionArrayOptional: !item["propRecordOfUnionArrayOptional"]
      ? item["propRecordOfUnionArrayOptional"]
      : deserializeRecord(
          item["propRecordOfUnionArrayOptional"] as any,
          (v: any) =>
            v.map((p: any) => {
              return _simpleModelPropRecordOfUnionArrayOptionalDeserializer(p);
            }),
        ),
    propArrayOfRecordOfUnion: item["propArrayOfRecordOfUnion"].map((p: any) => {
      return deserializeRecord(p as any, (v: any) =>
        _simpleModelPropArrayOfRecordOfUnionDeserializer(v),
      );
    }),
    propArrayOfRecordOfUnionOptional: !item["propArrayOfRecordOfUnionOptional"]
      ? item["propArrayOfRecordOfUnionOptional"]
      : item["propArrayOfRecordOfUnionOptional"].map((p: any) => {
          return deserializeRecord(p as any, (v: any) =>
            _simpleModelPropArrayOfRecordOfUnionOptionalDeserializer(v),
          );
        }),
    propEncoded: item["prop_encoded"],
    propNestedDict: item["propNestedDict"],
  };
}

export function _simpleModelPropNumericUnionDeserializer(
  item: any,
): _SimpleModelPropNumericUnion {
  return item;
}

export function _simpleModelPropSimpleUnionDeserializer(
  item: any,
): _SimpleModelPropSimpleUnion {
  return item;
}

export function _simpleModelPropSimpleUnionOptionalDeserializer(
  item: any,
): _SimpleModelPropSimpleUnionOptional {
  return item;
}

export function _simpleModelPropMixedTypeLiteralDeserializer(
  item: any,
): _SimpleModelPropMixedTypeLiteral {
  return item;
}

export function _simpleModelPropSimpleUnionArrayDeserializer(
  item: any,
): _SimpleModelPropSimpleUnionArray {
  return item;
}

export function _simpleModelPropSimpleUnionArrayOptionalDeserializer(
  item: any,
): _SimpleModelPropSimpleUnionArrayOptional {
  return item;
}

export function _simpleModelPropRecordOfSimpleUnionDeserializer(
  item: any,
): _SimpleModelPropRecordOfSimpleUnion {
  return item;
}

export function _simpleModelPropRecordOfUnionArrayDeserializer(
  item: any,
): _SimpleModelPropRecordOfUnionArray {
  return item;
}

export function _simpleModelPropRecordOfUnionArrayOptionalDeserializer(
  item: any,
): _SimpleModelPropRecordOfUnionArrayOptional {
  return item;
}

export function _simpleModelPropArrayOfRecordOfUnionDeserializer(
  item: any,
): _SimpleModelPropArrayOfRecordOfUnion {
  return item;
}

export function _simpleModelPropArrayOfRecordOfUnionOptionalDeserializer(
  item: any,
): _SimpleModelPropArrayOfRecordOfUnionOptional {
  return item;
}
```
