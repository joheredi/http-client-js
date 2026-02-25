# Should generate serializer for property types

Will prompt all operations into top-level.

## TypeSpec

This is tsp definition.

```tsp
model SimpleModel {
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
  propStringUnionOptioanl: "A" | "B";
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
  propNotNormalizeModel: FOO;
  propNormalizeModel: FOOBAR;
  propRecordOfUnionArrayNotNormalize: Record<NFVIs[]>;
  propUnionArrayNotNormalize: NFVIs[];
  propRecordOfUnionNotNormalize: Record<NFVIs>;
}

@discriminator("nfviType")
model NFVIs {
  name?: string;
  nfviType: string;
}

model AzureCoreNFVIDetails extends NFVIs {
  location?: string;
  nfviType: "AzureCore";
}

model AzureArcK8sClusterNFVIDetails extends NFVIs {
  customLocationId?: string;
  nfviType: "AzureArcKubernetes";
}

model FOOBAR{
  name?: Record<NFVIs[]>;
}

model FOO {
   param?: FOOBAR;
}

@route("/serialize")
interface D {
  op bar(@body body: SimpleModel): void;
}
```

## Provide generated models and its serializer

Generated Models.

```ts models
import { serializeRecord } from "../helpers/serializationHelpers.js";

export interface SimpleModel {
  propString: string;
  propboolean: boolean;
  propNumber: number;
  propStringOptional?: string;
  propSimpleUnion: SimpleModelPropSimpleUnion;
  propSimpleUnionOptional?: SimpleModelPropSimpleUnionOptional;
  propStringLiteral: "A";
  propBooleanLiteral: false;
  propNumberLiteral: 1;
  propStringLiteralOptional?: "A";
  propStringUnion: SimpleModelPropStringUnion;
  propStringUnionOptioanl: SimpleModelPropStringUnionOptioanl;
  propStringUnionNullable: SimpleModelPropStringUnionNullable | null;
  propStringUnionAsExtensible: SimpleModelPropStringUnionAsExtensible;
  propStringUnionAsExtensibleOptional?: SimpleModelPropStringUnionAsExtensibleOptional;
  propStringUnionAsExtensibleNullable: SimpleModelPropStringUnionAsExtensibleNullable | null;
  propStringUnionAsExtensibleOptionalAndNullable?: SimpleModelPropStringUnionAsExtensibleOptionalAndNullable | null;
  propMixedTypeLiteral: SimpleModelPropMixedTypeLiteral;
  propStringArray: string[];
  propBooleanArray: boolean[];
  propNumberArray: number[];
  propSimpleUnionArray: SimpleModelPropSimpleUnionArray[];
  propStringArrayOptional?: string[];
  propSimpleUnionArrayOptional?: SimpleModelPropSimpleUnionArrayOptional[];
  propRecordOfString: Record<string, string>;
  propRecordOfDate: Record<string, Date>;
  propRecordOfBoolean: Record<string, boolean>;
  propRecordOfNumber: Record<string, number>;
  propRecordOfSimpleUnion: Record<string, SimpleModelPropRecordOfSimpleUnion>;
  propRecordOfStringOptional?: Record<string, string>;
  propRecordOfStringArray: Record<string, string[]>;
  propArrayOfRecordOfString: Record<string, string>[];
  propArrayOfRecordOfStringOptional?: Record<string, string>[];
  propRecordOfUnionArray: Record<string, SimpleModelPropRecordOfUnionArray[]>;
  propRecordOfUnionArrayOptional?: Record<
    string,
    SimpleModelPropRecordOfUnionArrayOptional[]
  >;
  propArrayOfRecordOfUnion: Record<
    string,
    SimpleModelPropArrayOfRecordOfUnion
  >[];
  propArrayOfRecordOfUnionOptional?: Record<
    string,
    SimpleModelPropArrayOfRecordOfUnionOptional
  >[];
  propEncoded: string;
  propNotNormalizeModel: Foo;
  propNormalizeModel: Foobar;
  propRecordOfUnionArrayNotNormalize: Record<string, NfvIs[]>;
  propUnionArrayNotNormalize: NfvIs[];
  propRecordOfUnionNotNormalize: Record<string, NfvIs>;
}

export interface Foo {
  param?: Foobar;
}

export interface Foobar {
  name?: Record<string, NfvIs[]>;
}

export interface NfvIs {
  name?: string;
  nfviType: string;
}

/**
 * Alias for `NFVIs`
 */
export type NfvIsUnion =
  | AzureCoreNfviDetails
  | AzureArcK8sClusterNfviDetails
  | NfvIs;

export interface AzureCoreNfviDetails extends NfvIs {
  location?: string;
  nfviType: "AzureCore";
}

export interface AzureArcK8sClusterNfviDetails extends NfvIs {
  customLocationId?: string;
  nfviType: "AzureArcKubernetes";
}

/**
 * Type of SimpleModelPropStringUnion
 */
export type SimpleModelPropStringUnion = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionOptioanl
 */
export type SimpleModelPropStringUnionOptioanl = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionAsExtensible
 */
export type SimpleModelPropStringUnionAsExtensible = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionAsExtensibleOptional
 */
export type SimpleModelPropStringUnionAsExtensibleOptional = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionNullable
 */
export type SimpleModelPropStringUnionNullable = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionAsExtensibleNullable
 */
export type SimpleModelPropStringUnionAsExtensibleNullable = "A" | "B";

/**
 * Type of SimpleModelPropStringUnionAsExtensibleOptionalAndNullable
 */
export type SimpleModelPropStringUnionAsExtensibleOptionalAndNullable =
  | "A"
  | "B";

/**
 * Alias for SimpleModelPropSimpleUnion
 */
export type SimpleModelPropSimpleUnion = string | boolean | number;

/**
 * Alias for SimpleModelPropSimpleUnionOptional
 */
export type SimpleModelPropSimpleUnionOptional = string | boolean | number;

/**
 * Alias for SimpleModelPropMixedTypeLiteral
 */
export type SimpleModelPropMixedTypeLiteral = "A" | false | 1;

/**
 * Alias for SimpleModelPropSimpleUnionArray
 */
export type SimpleModelPropSimpleUnionArray = string | boolean | number;

/**
 * Alias for SimpleModelPropSimpleUnionArrayOptional
 */
export type SimpleModelPropSimpleUnionArrayOptional = string | boolean | number;

/**
 * Alias for SimpleModelPropRecordOfSimpleUnion
 */
export type SimpleModelPropRecordOfSimpleUnion = string | boolean | number;

/**
 * Alias for SimpleModelPropRecordOfUnionArray
 */
export type SimpleModelPropRecordOfUnionArray = string | boolean | number;

/**
 * Alias for SimpleModelPropRecordOfUnionArrayOptional
 */
export type SimpleModelPropRecordOfUnionArrayOptional =
  | string
  | boolean
  | number;

/**
 * Alias for SimpleModelPropArrayOfRecordOfUnion
 */
export type SimpleModelPropArrayOfRecordOfUnion = string | boolean | number;

/**
 * Alias for SimpleModelPropArrayOfRecordOfUnionOptional
 */
export type SimpleModelPropArrayOfRecordOfUnionOptional =
  | string
  | boolean
  | number;

export function simpleModelSerializer(item: SimpleModel): any {
  return {
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
    propStringUnionOptioanl: item["propStringUnionOptioanl"],
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
    propRecordOfDate: serializeRecord(
      item["propRecordOfDate"] as any,
      (v: any) => v.toISOString(),
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
    prop_encoded: item["propEncoded"],
    propNotNormalizeModel: fooSerializer(item["propNotNormalizeModel"]),
    propNormalizeModel: foobarSerializer(item["propNormalizeModel"]),
    propRecordOfUnionArrayNotNormalize: serializeRecord(
      item["propRecordOfUnionArrayNotNormalize"] as any,
      (v: any) =>
        v.map((p: any) => {
          return nfvIsUnionSerializer(p);
        }),
    ),
    propUnionArrayNotNormalize: item["propUnionArrayNotNormalize"].map(
      (p: any) => {
        return nfvIsUnionSerializer(p);
      },
    ),
    propRecordOfUnionNotNormalize: serializeRecord(
      item["propRecordOfUnionNotNormalize"] as any,
      (v: any) => nfvIsUnionSerializer(v),
    ),
  };
}

export function fooSerializer(item: Foo): any {
  return {
    param: !item["param"] ? item["param"] : foobarSerializer(item["param"]),
  };
}

export function foobarSerializer(item: Foobar): any {
  return {
    name: !item["name"]
      ? item["name"]
      : serializeRecord(item["name"] as any, (v: any) =>
          v.map((p: any) => {
            return nfvIsUnionSerializer(p);
          }),
        ),
  };
}

export function azureCoreNfviDetailsSerializer(
  item: AzureCoreNfviDetails,
): any {
  return {
    name: item["name"],
    location: item["location"],
    nfviType: item["nfviType"],
  };
}

export function azureArcK8sClusterNfviDetailsSerializer(
  item: AzureArcK8sClusterNfviDetails,
): any {
  return {
    name: item["name"],
    customLocationId: item["customLocationId"],
    nfviType: item["nfviType"],
  };
}

export function nfvIsSerializer(item: NfvIs): any {
  return {
    name: item["name"],
    nfviType: item["nfviType"],
  };
}

export function nfvIsUnionSerializer(item: NfvIsUnion): any {
  switch (item["nfviType"]) {
    case "AzureCore":
      return azureCoreNfviDetailsSerializer(item as AzureCoreNfviDetails);
    case "AzureArcKubernetes":
      return azureArcK8sClusterNfviDetailsSerializer(
        item as AzureArcK8sClusterNfviDetails,
      );
    default:
      return nfvIsSerializer(item);
  }
}
```
