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
  propNumericUnion: string | number;
  propString: string;
  propboolean: boolean;
  propNumber: number;
  propStringOptional?: string;
  propSimpleUnion: string | boolean | number;
  propSimpleUnionOptional?: string | boolean | number;
  propStringLiteral: "A";
  propBooleanLiteral: false;
  propNumberLiteral: 1;
  propStringLiteralOptional?: "A";
  propStringUnion: "A" | "B";
  propStringUnionOptional?: "A" | "B";
  propStringUnionNullable: "A" | "B" | null;
  propStringUnionAsExtensible: "A" | "B";
  propStringUnionAsExtensibleOptional?: "A" | "B";
  propStringUnionAsExtensibleNullable: "A" | "B" | null;
  propStringUnionAsExtensibleOptionalAndNullable?: "A" | "B" | null;
  propMixedTypeLiteral: "A" | false | 1;
  propStringArray: string[];
  propBooleanArray: boolean[];
  propNumberArray: number[];
  propSimpleUnionArray: (string | boolean | number)[];
  propStringArrayOptional?: string[];
  propSimpleUnionArrayOptional?: (string | boolean | number)[];
  propRecordOfString: Record<string, string>;
  propRecordOfDate: Record<string, Date>;
  propRecordOfBoolean: Record<string, boolean>;
  propRecordOfNumber: Record<string, number>;
  propRecordOfSimpleUnion: Record<string, string | boolean | number>;
  propRecordOfStringOptional?: Record<string, string>;
  propRecordOfStringArray: Record<string, string[]>;
  propArrayOfRecordOfString: Record<string, string>[];
  propArrayOfRecordOfStringOptional?: Record<string, string>[];
  propRecordOfUnionArray: Record<string, (string | boolean | number)[]>;
  propRecordOfUnionArrayOptional?: Record<
    string,
    (string | boolean | number)[]
  >;
  propArrayOfRecordOfUnion: Record<string, string | boolean | number>[];
  propArrayOfRecordOfUnionOptional?: Record<
    string,
    string | boolean | number
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
    propSimpleUnionArray: _simpleModelPropSimpleUnionArrayArrayDeserializer(
      item["propSimpleUnionArray"],
    ),
    propStringArrayOptional: item["propStringArrayOptional"],
    propSimpleUnionArrayOptional: !item["propSimpleUnionArrayOptional"]
      ? item["propSimpleUnionArrayOptional"]
      : _simpleModelPropSimpleUnionArrayOptionalArrayDeserializer(
          item["propSimpleUnionArrayOptional"],
        ),
    propRecordOfString: item["propRecordOfString"],
    propRecordOfDate: deserializeRecord(
      item["propRecordOfDate"] as any,
      (v: any) => new Date(v),
    ),
    propRecordOfBoolean: item["propRecordOfBoolean"],
    propRecordOfNumber: item["propRecordOfNumber"],
    propRecordOfSimpleUnion:
      _simpleModelPropRecordOfSimpleUnionRecordDeserializer(
        item["propRecordOfSimpleUnion"] as any,
      ),
    propRecordOfStringOptional: item["propRecordOfStringOptional"],
    propRecordOfStringArray: item["propRecordOfStringArray"],
    propArrayOfRecordOfString: item["propArrayOfRecordOfString"],
    propArrayOfRecordOfStringOptional:
      item["propArrayOfRecordOfStringOptional"],
    propRecordOfUnionArray:
      _simpleModelPropRecordOfUnionArrayArrayRecordDeserializer(
        item["propRecordOfUnionArray"] as any,
      ),
    propRecordOfUnionArrayOptional: !item["propRecordOfUnionArrayOptional"]
      ? item["propRecordOfUnionArrayOptional"]
      : _simpleModelPropRecordOfUnionArrayOptionalArrayRecordDeserializer(
          item["propRecordOfUnionArrayOptional"] as any,
        ),
    propArrayOfRecordOfUnion:
      _simpleModelPropArrayOfRecordOfUnionRecordArrayDeserializer(
        item["propArrayOfRecordOfUnion"],
      ),
    propArrayOfRecordOfUnionOptional: !item["propArrayOfRecordOfUnionOptional"]
      ? item["propArrayOfRecordOfUnionOptional"]
      : _simpleModelPropArrayOfRecordOfUnionOptionalRecordArrayDeserializer(
          item["propArrayOfRecordOfUnionOptional"],
        ),
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

export function _simpleModelPropSimpleUnionArrayArrayDeserializer(
  result: Array<_SimpleModelPropSimpleUnionArray>,
): any[] {
  return result.map((item) => {
    return _simpleModelPropSimpleUnionArrayDeserializer(item);
  });
}

export function _simpleModelPropSimpleUnionArrayOptionalArrayDeserializer(
  result: Array<_SimpleModelPropSimpleUnionArrayOptional>,
): any[] {
  return result.map((item) => {
    return _simpleModelPropSimpleUnionArrayOptionalDeserializer(item);
  });
}

export function _simpleModelPropRecordOfUnionArrayArrayDeserializer(
  result: Array<_SimpleModelPropRecordOfUnionArray>,
): any[] {
  return result.map((item) => {
    return _simpleModelPropRecordOfUnionArrayDeserializer(item);
  });
}

export function _simpleModelPropRecordOfUnionArrayOptionalArrayDeserializer(
  result: Array<_SimpleModelPropRecordOfUnionArrayOptional>,
): any[] {
  return result.map((item) => {
    return _simpleModelPropRecordOfUnionArrayOptionalDeserializer(item);
  });
}

export function _simpleModelPropArrayOfRecordOfUnionRecordArrayDeserializer(
  result: Array<Record<string, _SimpleModelPropArrayOfRecordOfUnion>>,
): any[] {
  return result.map((item) => {
    return _simpleModelPropArrayOfRecordOfUnionRecordDeserializer(item as any);
  });
}

export function _simpleModelPropArrayOfRecordOfUnionOptionalRecordArrayDeserializer(
  result: Array<Record<string, _SimpleModelPropArrayOfRecordOfUnionOptional>>,
): any[] {
  return result.map((item) => {
    return _simpleModelPropArrayOfRecordOfUnionOptionalRecordDeserializer(
      item as any,
    );
  });
}

export function _simpleModelPropRecordOfSimpleUnionRecordDeserializer(
  result: Record<string, _SimpleModelPropRecordOfSimpleUnion>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    _simpleModelPropRecordOfSimpleUnionDeserializer(v),
  );
}

export function _simpleModelPropRecordOfUnionArrayArrayRecordDeserializer(
  result: Record<string, Array<_SimpleModelPropRecordOfUnionArray>>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    _simpleModelPropRecordOfUnionArrayArrayDeserializer(v),
  );
}

export function _simpleModelPropRecordOfUnionArrayOptionalArrayRecordDeserializer(
  result: Record<string, Array<_SimpleModelPropRecordOfUnionArrayOptional>>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    _simpleModelPropRecordOfUnionArrayOptionalArrayDeserializer(v),
  );
}

export function _simpleModelPropArrayOfRecordOfUnionRecordDeserializer(
  result: Record<string, _SimpleModelPropArrayOfRecordOfUnion>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    _simpleModelPropArrayOfRecordOfUnionDeserializer(v),
  );
}

export function _simpleModelPropArrayOfRecordOfUnionOptionalRecordDeserializer(
  result: Record<string, _SimpleModelPropArrayOfRecordOfUnionOptional>,
): Record<string, any> {
  return deserializeRecord(result as any, (v: any) =>
    _simpleModelPropArrayOfRecordOfUnionOptionalDeserializer(v),
  );
}
```
