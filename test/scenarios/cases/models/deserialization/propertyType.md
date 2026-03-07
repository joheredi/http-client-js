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
```

```ts serialization
import { deserializeRecord } from "../../static-helpers/serializationHelpers.js";
import type { SimpleModel } from "../models.js";

export function simpleModelDeserializer(item: any): SimpleModel {
  return {
    proNumeric: item["proNumeric"],
    proNumericArray: item["proNumericArray"],
    propNumericUnion: item["propNumericUnion"],
    propString: item["propString"],
    propboolean: item["propboolean"],
    propNumber: item["propNumber"],
    propStringOptional: item["propStringOptional"],
    propSimpleUnion: item["propSimpleUnion"],
    propSimpleUnionOptional: item["propSimpleUnionOptional"],
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
    propMixedTypeLiteral: item["propMixedTypeLiteral"],
    propStringArray: item["propStringArray"],
    propBooleanArray: item["propBooleanArray"],
    propNumberArray: item["propNumberArray"],
    propSimpleUnionArray: item["propSimpleUnionArray"],
    propStringArrayOptional: item["propStringArrayOptional"],
    propSimpleUnionArrayOptional: item["propSimpleUnionArrayOptional"],
    propRecordOfString: item["propRecordOfString"],
    propRecordOfDate: deserializeRecord(
      item["propRecordOfDate"] as any,
      (v: any) => new Date(v),
    ),
    propRecordOfBoolean: item["propRecordOfBoolean"],
    propRecordOfNumber: item["propRecordOfNumber"],
    propRecordOfSimpleUnion: item["propRecordOfSimpleUnion"],
    propRecordOfStringOptional: item["propRecordOfStringOptional"],
    propRecordOfStringArray: item["propRecordOfStringArray"],
    propArrayOfRecordOfString: item["propArrayOfRecordOfString"],
    propArrayOfRecordOfStringOptional:
      item["propArrayOfRecordOfStringOptional"],
    propRecordOfUnionArray: item["propRecordOfUnionArray"],
    propRecordOfUnionArrayOptional: item["propRecordOfUnionArrayOptional"],
    propArrayOfRecordOfUnion: item["propArrayOfRecordOfUnion"],
    propArrayOfRecordOfUnionOptional: item["propArrayOfRecordOfUnionOptional"],
    propEncoded: item["prop_encoded"],
    propNestedDict: item["propNestedDict"],
  };
}
```
