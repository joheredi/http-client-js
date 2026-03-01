# Skipped E2E Tests Report

> **Date**: 2026-03-01  
> **Total skipped tests**: 88  
> **Test infrastructure**: Vitest e2e tests against Spector mock server (port 3002)  
> **Generated clients**: Pre-generated TypeScript clients in `test/e2e/generated/`

## Executive Summary

All 88 skipped e2e tests fall into **10 root cause categories**. Many tests share the same underlying emitter deficiency, meaning approximately **10 distinct fixes** in the emitter source would unblock all 88 tests. The categories are:

| # | Root Cause | Tests | Complexity |
|---|-----------|-------|-----------|
| 1 | [Content-Type mismatch (text/plain)](#1-content-type-mismatch-textplain-vs-applicationjson) | 6 | Medium |
| 2 | [Query parameter type coercion](#2-query-parameter-type-coercion) | 13 | Medium |
| 3 | [Header parameter type coercion](#3-header-parameter-type-coercion) | 9 | Medium |
| 4 | [Response header deserialization](#4-response-header-deserialization) | 4 | High |
| 5 | [Numeric string encoding (@encode)](#5-numeric-string-encoding-encode) | 3 | Low |
| 6 | [Unresolved refkey for extensible enum arrays](#6-unresolved-refkey-for-extensible-enum-array-serializers) | 12 | Medium |
| 7 | [Additional properties on derived/union types](#7-additional-properties-on-derivedunion-types) | 22 | High |
| 8 | [Parameter name shadows operation function](#8-parameter-name-shadows-operation-function) | 1 | Low |
| 9 | [BigInt / int64 serialization](#9-bigint--int64-serialization) | 2 | Medium |
| 10 | [Nullable model array handling](#10-nullable-model-array-handling) | 2 | Low |
| 11 | [Custom HTTP authentication scheme](#11-custom-http-authentication-scheme) | 2 | Low |
| 12 | [Bytes encoding in query/header/body](#12-bytes-encoding-in-queryheaderbody) | 14 | High |
|   | **Total** | **88** | |

---

## Detailed Test Analysis

---

### 1. Content-Type Mismatch (text/plain vs application/json)

**Tests affected (6):**

| File | Test Name | Line |
|------|-----------|------|
| `type/enum/fixed/main.test.ts` | should put a known enum value | 32 |
| `type/enum/fixed/main.test.ts` | should put an unknown enum value and receive 500 | 37 |
| `type/enum/extensible/main.test.ts` | should put a known enum value | 34 |
| `type/enum/extensible/main.test.ts` | should put an unknown enum value | 39 |
| `type/scalar/main.test.ts` | should put a string value | 29 |
| `type/scalar/main.test.ts` | should put an unknown value | 52 |

**Problem**: The Spector mock server expects `Content-Type: text/plain` for PUT operations on scalar string/enum/unknown endpoints, but the emitter always generates `contentType: "application/json"`.

**Mock server expectations (from mockapi.ts):**
- `type/enum/extensible`: `"Content-Type": "text/plain"` for PUT
- `type/enum/fixed`: `"Content-Type": "application/json"` for PUT  
- `type/scalar/string`: `"Content-Type": "text/plain"` for PUT
- `type/scalar/unknown`: `"Content-Type": "text/plain"` for PUT

**Generated code (all broken):**
```typescript
// All PUT operations generate:
contentType: "application/json", body: body
```

**Root cause**: When a TypeSpec operation accepts a bare scalar (not wrapped in a model), the wire format should use `text/plain`. The emitter doesn't detect this case and defaults to `application/json`.

#### Implementation Design

**Approach A (Recommended): Detect bare scalar body type in operation generation**

In the operation code generation component (`src/components/`), check whether the request body type is a bare scalar (string, enum, unknown). If so, emit `contentType: "text/plain"` instead of `"application/json"`. This is the correct semantic: bare scalars are text, model-wrapped scalars are JSON.

- **Pros**: Correct semantic behavior; aligns with TypeSpec HTTP spec; small, targeted change
- **Cons**: Requires understanding TCGC's type representation to detect "bare scalar body"

**Approach B: Override content-type from TypeSpec `@header` decorator**

Read the content-type from the TypeSpec `@header contentType` decorator if present, and pass it through to the generated code.

- **Pros**: Fully driven by TypeSpec definitions; no heuristic guessing
- **Cons**: TypeSpec may not always specify content-type explicitly; doesn't handle the default case

**Recommendation**: **Approach A**. The TCGC SDK model provides `bodyParam.type.kind` which can be checked for `"string"`, `"enum"`, `"unknown"` to determine if `text/plain` is needed.

---

### 2. Query Parameter Type Coercion

**Tests affected (13):**

| File | Test Name | Line |
|------|-----------|------|
| `encode/datetime/main.test.ts` | default (rfc3339) query param | 21 |
| `encode/datetime/main.test.ts` | rfc3339 query param | 25 |
| `encode/datetime/main.test.ts` | rfc7231 query param | 29 |
| `encode/datetime/main.test.ts` | unixTimestamp query param | 33 |
| `encode/datetime/main.test.ts` | unixTimestamp array query param | 37 |
| `encode/duration/main.test.ts` | int32 seconds query param | 24 |
| `encode/duration/main.test.ts` | float seconds query param | 28 |
| `encode/duration/main.test.ts` | float64 seconds query param | 32 |
| `encode/duration/main.test.ts` | int32 seconds array query param | 36 |
| `encode/bytes/main.test.ts` | default (base64) query param | 51 |
| `encode/bytes/main.test.ts` | base64 query param | 55 |
| `encode/bytes/main.test.ts` | base64url query param | 59 |
| `encode/bytes/main.test.ts` | base64url array query param | 63 |

**Problem**: The emitter passes raw typed values (Date objects, numbers, Uint8Array) directly into `expandUrlTemplate()` without converting them to the wire-format string first.

**Current generated code:**
```typescript
// datetime: passes raw Date object
const path = expandUrlTemplate("/encode/datetime/query/default{?value}", { "value": value })
// duration: passes raw number (works accidentally for some, but type-unsafe)
// bytes: passes raw Uint8Array (serializes to "[object Uint8Array]")
```

**Expected behavior:**
```typescript
// datetime rfc3339: value.toISOString()
// datetime rfc7231: value.toUTCString()
// datetime unixTimestamp: Math.floor(value.getTime() / 1000)
// duration int32/float: value.toString()
// bytes base64: uint8ArrayToString(value, "base64")
// bytes base64url: uint8ArrayToString(value, "base64url")
```

**Mock server expectations:**
- Datetime rfc3339: `value=2022-08-26T18:38:00.000Z`
- Datetime rfc7231: `value=Fri, 26 Aug 2022 14:38:00 GMT`
- Datetime unix: `value=1686566864`
- Duration int32: `input=36`
- Bytes base64: `value=dGVzdA==`

#### Implementation Design

**Approach A (Recommended): Generate format conversion inline before URL template expansion**

In the operation `_send` function generation, add encoding expressions based on the parameter's `@encode` decorator:

```typescript
// Emitter generates:
const encodedValue = value.toISOString(); // for rfc3339
const path = expandUrlTemplate("...{?value}", { "value": encodedValue });
```

- **Pros**: Self-contained, clear, no runtime helper changes needed
- **Cons**: Slightly verbose generated code per query param

**Approach B: Enhance `expandUrlTemplate` to accept type hints**

Pass encoding metadata to `expandUrlTemplate` so it can perform the conversion internally.

- **Pros**: Cleaner generated code
- **Cons**: Changes to a static helper that's shared across all operations; harder to maintain type-specific logic

**Recommendation**: **Approach A**. Query parameters with `@encode` decorators should have their conversion applied before URL template expansion. The emitter already knows the encoding from TCGC's `SdkType.encode` property.

---

### 3. Header Parameter Type Coercion

**Tests affected (9):**

| File | Test Name | Line |
|------|-----------|------|
| `encode/datetime/main.test.ts` | unixTimestamp header | 94 |
| `encode/datetime/main.test.ts` | unixTimestamp array header | 98 |
| `encode/duration/main.test.ts` | int32 seconds header | 104 |
| `encode/duration/main.test.ts` | float seconds header | 108 |
| `encode/duration/main.test.ts` | float64 seconds header | 112 |
| `encode/bytes/main.test.ts` | default (base64) header | 103 |
| `encode/bytes/main.test.ts` | base64 header | 107 |
| `encode/bytes/main.test.ts` | base64url header | 111 |
| `encode/bytes/main.test.ts` | base64url array header | 115 |

**Problem**: Similar to query parameters — raw typed objects are passed directly into the headers object without string conversion.

**Current generated code:**
```typescript
// Duration: passes number directly (needs .toString())
headers: { "duration": duration, ...options.requestOptions?.headers }

// Bytes: passes raw Uint8Array to headers
headers: { "value": value, ...options.requestOptions?.headers }

// Datetime array: passes Date[] to buildCsvCollection
headers: { "value": buildCsvCollection(value), ...options.requestOptions?.headers }
```

**Expected behavior:**
```typescript
// Duration: duration.toString()
// Bytes: uint8ArrayToString(value, "base64")
// Datetime array: buildCsvCollection(value.map(v => Math.floor(v.getTime()/1000).toString()))
```

**Mock server expectations:**
- Duration headers expect string values: `duration: "36"`, `duration: "35.625"`
- Bytes headers expect base64 strings: `value: "dGVzdA=="`
- Datetime unix array header: `value: "1686566864,1686734256"`

#### Implementation Design

**Approach A (Recommended): Generate encoding expressions for header values**

Same approach as query parameters: detect `@encode` decorator on header parameters and generate the appropriate conversion before assignment to the headers object.

- **Pros**: Consistent with query parameter approach; straightforward
- **Cons**: Adds per-parameter conversion code

**Approach B: Create a header serialization helper**

Build a `serializeHeaderValue(value, encoding)` runtime helper that handles all type conversions.

- **Pros**: Centralizes logic; less generated code
- **Cons**: New runtime dependency; harder to tree-shake

**Recommendation**: **Approach A**. Keep it consistent with the query parameter approach. The encoding metadata is available from TCGC.

---

### 4. Response Header Deserialization

**Tests affected (4):**

| File | Test Name | Line |
|------|-----------|------|
| `encode/datetime/main.test.ts` | default (rfc7231) response header | 119 |
| `encode/datetime/main.test.ts` | rfc3339 response header | 131 |
| `encode/datetime/main.test.ts` | rfc7231 response header | 143 |
| `encode/datetime/main.test.ts` | unixTimestamp response header | 155 |

**Problem**: The generated response header operations return `void` and don't extract or parse header values at all. The test works around this with `onResponse` callbacks, but the actual API is broken.

**Current generated code (`responseHeader/operations.ts`):**
```typescript
export async function $default(
  context: DatetimeContext,
  options: DefaultOptionalParams = { requestOptions: {} },
): Promise<void> {  // Returns void — no header values returned
  const result = await _defaultSend(context, options);
  return _defaultDeserialize(result);
}
```

**Expected behavior:**
```typescript
export async function $default(
  context: DatetimeContext,
  options: DefaultOptionalParams = { requestOptions: {} },
): Promise<{ value: Date }> {
  const result = await _defaultSend(context, options);
  return {
    value: new Date(result.headers["value"])  // Parse from rfc7231 string
  };
}
```

**Mock server expectations:**
- `/responseheader/default`: Returns header `value: "Fri, 26 Aug 2022 14:38:00 GMT"`
- `/responseheader/rfc3339`: Returns header `value: "2022-08-26T18:38:00.000Z"`
- `/responseheader/unix-timestamp`: Returns header `value: "1686566864"` (numeric string)

#### Implementation Design

**Approach A (Recommended): Generate response header extraction in deserialize functions**

The emitter should detect operations with `@header` on response properties and generate:
1. A response model type with the header fields
2. A deserializer that reads from `result.headers["name"]` and converts to typed values
3. Return the response model from the operation function

- **Pros**: Full end-to-end typing; standard pattern for response handling
- **Cons**: Requires the emitter to distinguish response headers from response body properties

**Approach B: Return raw response and let callers extract headers**

Return the full `PathUncheckedResponse` and let consumers extract headers manually.

- **Pros**: Simple implementation; flexible
- **Cons**: Breaks the typed API contract; makes every caller do raw extraction

**Recommendation**: **Approach A**. Response headers are part of the operation contract and should be typed. TCGC provides response header metadata via `operation.responses[].headers`.

---

### 5. Numeric String Encoding (@encode)

**Tests affected (3):**

| File | Test Name | Line |
|------|-----------|------|
| `encode/numeric/main.test.ts` | safeint as string | 15 |
| `encode/numeric/main.test.ts` | optional uint32 as string | 21 |
| `encode/numeric/main.test.ts` | uint8 as string | 27 |

**Problem**: The emitter doesn't handle `@encode(string)` on integer types. Serializers/deserializers are no-op passthroughs when they should convert between number and string.

**Current generated code (`models.ts`):**
```typescript
export interface SafeintAsStringProperty {
  value: string;  // Wire type is string, but SDK should accept number
}
export function safeintAsStringPropertySerializer(item: SafeintAsStringProperty): any {
  return { value: item["value"] };  // No conversion!
}
```

**Mock server expectations:**
- POST `/encode/numeric/property/safeint` with body `{ value: "10000000000" }` → 200
- POST `/encode/numeric/property/uint32` with body `{ value: "1" }` → 200
- POST `/encode/numeric/property/uint8` with body `{ value: "255" }` → 200

**Expected behavior:**
```typescript
export interface SafeintAsStringProperty {
  value: number;  // SDK accepts number
}
export function safeintAsStringPropertySerializer(item: SafeintAsStringProperty): any {
  return { value: item["value"].toString() };  // Convert number → string for wire
}
export function safeintAsStringPropertyDeserializer(item: any): SafeintAsStringProperty {
  return { value: Number.parseInt(item["value"]) };  // Convert string → number from wire
}
```

#### Implementation Design

**Approach A (Recommended): Add integer+string encoding case to serialization components**

In `src/components/serialization/json-serializer.tsx` (`getSerializationExpression()`) and `json-deserializer.tsx` (`getDeserializationExpression()`), add handling for `SdkType.kind === "integer"` with `encode === "string"`:

- **Serialization**: `item["value"].toString()`
- **Deserialization**: `Number.parseInt(item["value"])`
- **Model type**: Use `number` (the SDK type), not `string` (the wire type)

- **Pros**: Follows existing pattern for datetime/bytes encoding; small change
- **Cons**: Need to also update model type generation

**Approach B: Use branded types or string wrappers**

Keep `string` as the SDK type and let users manage conversion.

- **Pros**: Zero emitter change for serialization; wire-transparent
- **Cons**: Poor developer experience; doesn't match TypeSpec semantics

**Recommendation**: **Approach A**. The emitter should handle the encode decorator consistently across all types. The existing `utcDateTime` + `@encode(unixTimestamp)` pattern is a direct precedent.

---

### 6. Unresolved Refkey for Extensible Enum Array Serializers

**Tests affected (12):**

| File | Test Name | Line |
|------|-----------|------|
| `encode/array/main.test.ts` | string array comma delimiter | (describe.skip) |
| `encode/array/main.test.ts` | string array space delimiter | (describe.skip) |
| `encode/array/main.test.ts` | string array pipe delimiter | (describe.skip) |
| `encode/array/main.test.ts` | string array newline delimiter | (describe.skip) |
| `encode/array/main.test.ts` | enum array comma delimiter | (describe.skip) |
| `encode/array/main.test.ts` | enum array space delimiter | (describe.skip) |
| `encode/array/main.test.ts` | enum array pipe delimiter | (describe.skip) |
| `encode/array/main.test.ts` | enum array newline delimiter | (describe.skip) |
| `encode/array/main.test.ts` | extensible enum array comma delimiter | (describe.skip) |
| `encode/array/main.test.ts` | extensible enum array space delimiter | (describe.skip) |
| `encode/array/main.test.ts` | extensible enum array pipe delimiter | (describe.skip) |
| `encode/array/main.test.ts` | extensible enum array newline delimiter | (describe.skip) |

**Problem**: The entire `describe.skip` block is caused by **unresolved symbol references** in `models.ts` for extensible enum array serializers. The generated code contains literal `<Unresolved Symbol: refkey[sarraySerializer⁣senum]>` text that causes esbuild parse failures, making the entire client unusable.

**Current generated code (`models.ts` lines 169-197):**
```typescript
export function commaDelimitedExtensibleEnumArrayPropertySerializer(
  item: CommaDelimitedExtensibleEnumArrayProperty,
): any {
  return {
    value: buildCsvCollection(<Unresolved Symbol: refkey[sarraySerializer⁣senum]>(item["value"])),
  };
}
```

**Root cause**: In `src/utils/refkeys.ts`, `getTypeSignature()` returns `"enum"` for ALL enum types (both regular and extensible). The code generates `refkey("arraySerializer", "enum")` but no declaration with that refkey exists because:
1. `valueTypeHasNamedSerializerFn()` returns `true` for extensible enums
2. This triggers the `arraySerializerRefkey(type.valueType)` code path
3. But no `JsonArraySerializer` component is rendered for extensible enums
4. Alloy can't resolve the refkey → outputs the error placeholder

**Mock server expectations:**
Each test POSTs `{ value: "blue,red,green" }` (or space/pipe/newline delimited) and expects the same back.

#### Implementation Design

**Approach A (Recommended): Fix `getTypeSignature()` to include type name**

In `src/utils/refkeys.ts`, change the enum case in `getTypeSignature()` to include the type name:

```typescript
case "enum":
  return `enum:${t.name}`;
```

This ensures each enum type gets a unique refkey, preventing collisions. Then ensure `JsonArraySerializer` is rendered for all enum types that need it.

- **Pros**: Root cause fix; prevents all similar refkey collisions; minimal change
- **Cons**: Need to verify `JsonArraySerializer` rendering logic also handles extensible enums

**Approach B: Skip named serializer for extensible enums**

Change `valueTypeHasNamedSerializerFn()` to return `false` for extensible enums, causing the emitter to use inline `.map()` instead of a named array serializer function.

- **Pros**: Avoids the refkey entirely; quick fix
- **Cons**: Inconsistent behavior between enum types; extensible enums with `.map()` may produce different code patterns

**Recommendation**: **Approach A**. The refkey signature should be unique per type. This is a fundamental correctness issue.

---

### 7. Additional Properties on Derived/Union Types

**Tests affected (22):**

| File | Test Name | Line | Sub-group |
|------|-----------|------|-----------|
| `type/property/additional-properties/main.test.ts` | get derived unknown additional props | 54 | Derived |
| `type/property/additional-properties/main.test.ts` | put derived unknown additional props | 59 | Derived |
| `type/property/additional-properties/main.test.ts` | get discriminated unknown additional props | 76 | Discriminated |
| `type/property/additional-properties/main.test.ts` | put discriminated unknown additional props | 81 | Discriminated |
| `type/property/additional-properties/main.test.ts` | get derived unknown additional props (is) | 113 | Derived |
| `type/property/additional-properties/main.test.ts` | put derived unknown additional props (is) | 118 | Derived |
| `type/property/additional-properties/main.test.ts` | get discriminated unknown additional props (is) | 133 | Discriminated |
| `type/property/additional-properties/main.test.ts` | put discriminated unknown additional props (is) | 138 | Discriminated |
| `type/property/additional-properties/main.test.ts` | get derived different spread string | 419 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | put derived different spread string | 424 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | get derived different spread float | 437 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | put derived different spread float | 442 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | get derived different spread model | 455 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | put derived different spread model | 460 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | get derived different spread model array | 473 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | put derived different spread model array | 478 | DifferentSpread |
| `type/property/additional-properties/main.test.ts` | get non-discriminated union spread | 526 | NonDiscUnion |
| `type/property/additional-properties/main.test.ts` | put non-discriminated union spread | 537 | NonDiscUnion |
| `type/property/additional-properties/main.test.ts` | get non-discriminated union2 spread | 549 | NonDiscUnion |
| `type/property/additional-properties/main.test.ts` | put non-discriminated union2 spread | 564 | NonDiscUnion |
| `type/property/additional-properties/main.test.ts` | get non-discriminated union3 spread | 580 | NonDiscUnion |
| `type/property/additional-properties/main.test.ts` | put non-discriminated union3 spread | 598 | NonDiscUnion |

**Problem**: Three related sub-issues:

**Sub-group A: Derived types (12 tests)**  
Derived type serializers/deserializers don't call `serializeRecord()`/`deserializeRecord()` for the `additionalProperties` bag. Only base types do.

```typescript
// BASE (working) — calls deserializeRecord:
export function extendsUnknownAdditionalPropertiesDeserializer(item: any) {
  return {
    additionalProperties: deserializeRecord(item, undefined, ["name"]),
    name: item["name"],
  };
}

// DERIVED (broken) — missing deserializeRecord:
export function extendsUnknownAdditionalPropertiesDerivedDeserializer(item: any) {
  return {
    name: item["name"],       // ✓
    index: item["index"],     // ✓
    age: item["age"],         // ✓
    // ❌ MISSING: additionalProperties: deserializeRecord(item, undefined, ["name","index","age"])
  };
}
```

**Sub-group B: Discriminated unions (4 tests)**  
Union dispatch correctly routes to derived deserializers, but those derived deserializers have the same missing `additionalProperties` issue as Sub-group A.

**Sub-group C: Non-discriminated unions (6 tests)**  
Union deserializers return `item` as-is without any type discrimination or property transformation:

```typescript
export function _spreadRecordForNonDiscriminatedUnionAdditionalPropertyDeserializer(item: any) {
  return item;  // No discrimination, no deserialization!
}
```

**Mock server expectations:**  
All operations expect proper round-trip of additional properties. For example:
```json
{ "name": "abc", "index": 1, "age": 2.5, "prop1": 32, "prop2": true, "prop3": "abc" }
```
Where `prop1`, `prop2`, `prop3` are additional properties that should be captured in the `additionalProperties` bag.

#### Implementation Design

**Approach A (Recommended): Fix derived type serializer/deserializer generation to include additionalProperties**

In the serialization/deserialization component that generates model serializers:

1. When a type **extends** a base with `additionalProperties`, generate `deserializeRecord()` / `serializeRecord()` calls in the derived serializer with the **combined** set of known property names (base + derived).
2. For discriminated unions, no additional fix needed — the derived deserializer fix cascades.

```typescript
// FIXED derived deserializer:
export function extendsUnknownAdditionalPropertiesDerivedDeserializer(item: any) {
  return {
    additionalProperties: deserializeRecord(item, undefined, ["name", "index", "age"]),
    name: item["name"],
    index: item["index"],
    age: item["age"],
  };
}
```

- **Pros**: Correct semantic behavior; consistent with base type pattern; fixes 16 tests
- **Cons**: Need to walk the type hierarchy to collect all known property names

**Approach B: Delegate to base deserializer + merge derived fields**

Have derived deserializer call the base deserializer and spread additional derived fields:

```typescript
export function derivedDeserializer(item: any) {
  return {
    ...baseDeserializer(item),
    index: item["index"],
    age: item["age"],
  };
}
```

- **Pros**: Reuses base logic; DRY
- **Cons**: Base deserializer's `deserializeRecord` uses only base known props, so additional properties would incorrectly include derived props too

**For non-discriminated unions (Sub-group C):**

This requires the emitter to generate union discrimination logic. Since TCGC does not provide a discriminator for these unions, the emitter would need to use heuristic property checking or `kind` field matching with fallback.

- **Approach C1**: Generate `kind`-based switch with property type checks
- **Approach C2**: Return the raw item with a type assertion (current behavior, incomplete)

**Recommendation**: **Approach A** for derived types (Sub-groups A & B). For non-discriminated unions (Sub-group C), investigate whether TCGC provides enough information to generate proper discrimination; if not, **Approach C1** with best-effort heuristics.

---

### 8. Parameter Name Shadows Operation Function

**Tests affected (1):**

| File | Test Name | Line |
|------|-----------|------|
| `type/model/usage/main.test.ts` | should send an input-only model | 29 |

**Problem**: The generated `usageClient.ts` has a method `input(input: InputRecord, ...)` where the parameter `input` shadows the imported function `input` from `./api/operations.js`. At runtime, `input(this._client, input, options)` calls the parameter (an `InputRecord` object) as a function, causing `TypeError`.

**Current generated code (`usageClient.ts`):**
```typescript
import { input, output, inputAndOutput } from "./api/operations.js";

export class UsageClient {
  input(
    input: InputRecord,  // ← shadows imported function!
    options: InputOptionalParams = { requestOptions: {} },
  ): Promise<void> {
    return input(this._client, input, options);  // ← calls the parameter, not the function!
  }
}
```

**Mock server expectation:**  
POST `/type/model/usage/input` with `{ requiredProp: "example-value" }` → 204

#### Implementation Design

**Approach A (Recommended): Detect and rename conflicting parameters**

In the client class method generation, check if any parameter name matches the operation function name. If so, rename the parameter (e.g., append `Param` suffix or use the model name like `inputRecord`).

- **Pros**: Targeted fix; uses existing name policy infrastructure
- **Cons**: Changes the public API surface for the parameter name

**Approach B: Use import aliases for operation functions**

Import operation functions with a prefix/suffix: `import { input as inputOp } from "./api/operations.js"`.

- **Pros**: Doesn't change the public parameter name; works for all cases
- **Cons**: Adds complexity to import generation; less readable generated code

**Recommendation**: **Approach A**. The existing name policy already handles reserved word conflicts; this extends the pattern to operation name conflicts.

---

### 9. BigInt / int64 Serialization

**Tests affected (2):**

| File | Test Name | Line |
|------|-----------|------|
| `type/dictionary/main.test.ts` | should put a dictionary of int64 values | 47 |
| `type/array/main.test.ts` | should put an array of int64 values | 44 |

**Problem**: The test uses BigInt literals (`0x7fffffffffffffffn`) but the generated code types int64 as `number`. JSON.stringify doesn't support BigInt, causing serialization failures.

**Current generated code:**
```typescript
// Dictionary: accepts Record<string, number> — no BigInt
// Array: accepts Array<number> — no BigInt
body: body  // Direct passthrough, JSON.stringify fails on BigInt
```

**Mock server expectations:**
- Dictionary int64: `{ k1: 9007199254740991, k2: -9007199254740991 }` (Number.MAX/MIN_SAFE_INTEGER)
- Array int64: `[9007199254740991, -9007199254740991]`

#### Implementation Design

**Approach A (Recommended): Use `number` type with safe integer bounds**

Keep int64 as `number` in TypeScript (since most JS ecosystems don't use BigInt) but add documentation that values beyond `Number.MAX_SAFE_INTEGER` lose precision. Fix the test to use `Number.MAX_SAFE_INTEGER` instead of BigInt literals.

- **Pros**: Pragmatic; matches JS ecosystem norms; minimal change
- **Cons**: Silent precision loss for very large integers

**Approach B: Support BigInt with custom serialization**

Use `bigint` type for int64, add custom JSON serialization that converts to string or number.

- **Pros**: Full precision; type-safe
- **Cons**: Major breaking change; BigInt isn't widely supported in all APIs; requires custom serializers

**Recommendation**: **Approach A**. The mock server already uses `Number.MAX_SAFE_INTEGER`, suggesting the tests should be updated to match. This is primarily a test fix, not an emitter fix.

---

### 10. Nullable Model Array Handling

**Tests affected (2):**

| File | Test Name | Line |
|------|-----------|------|
| `type/array/main.test.ts` | should get an array of nullable model values | 174 |
| `type/array/main.test.ts` | should put an array of nullable model values | 181 |

**Problem**: Array serializers/deserializers call model serializer/deserializer on every element including `null`, causing crashes when accessing properties of null.

**Current generated code (`models.ts`):**
```typescript
export function innerModelArrayDeserializer(result: Array<InnerModel>): any[] {
  return result.map((item) => { return innerModelDeserializer(item); });
  //                                                           ↑ crashes when item is null
}

export function innerModelDeserializer(item: any): InnerModel {
  return {
    property: item["property"],  // TypeError: Cannot read property of null
  };
}
```

**Mock server expectations:**
- GET/PUT `/type/array/nullable-model`: `[{property: "hello"}, null, {property: "world"}]`

**Expected behavior:**
```typescript
export function innerModelArrayDeserializer(result: Array<InnerModel | null>): (InnerModel | null)[] {
  return result.map((item) => item === null ? null : innerModelDeserializer(item));
}
```

#### Implementation Design

**Approach A (Recommended): Add null guard in array serializer/deserializer when element type is nullable**

In the array serializer/deserializer generation, check if the element type is `SdkNullableType` (or wrapped in nullable). If so, add a null guard:

```typescript
return result.map((item) => item === null ? null : innerModelDeserializer(item));
```

- **Pros**: Minimal change; correct nullable handling; follows TCGC type model
- **Cons**: Need to detect nullable array elements in the type tree

**Approach B: Always add null guards in array serializers**

Unconditionally guard against null in all array serializer `.map()` callbacks.

- **Pros**: Defensive; prevents future crashes
- **Cons**: Unnecessary code for non-nullable arrays; masks type errors

**Recommendation**: **Approach A**. Only generate null guards when the TCGC type indicates the array element is nullable (`SdkType.kind === "nullable"`).

---

### 11. Custom HTTP Authentication Scheme

**Tests affected (2):**

| File | Test Name | Line |
|------|-----------|------|
| `authentication/http/custom/main.test.ts` | should authenticate with a valid custom key | 37 |
| `authentication/http/custom/main.test.ts` | should return error for an invalid custom key | 50 |

**Problem**: The emitter generates `{ kind: "http", scheme: "sharedaccesskey" }` for custom HTTP auth schemes, but the `@typespec/ts-http-runtime`'s auth policy only recognizes `kind: "apiKey"` for key-based auth and `kind: "http"` for basic/bearer.

**Current generated code (`customClientContext.ts`):**
```typescript
getClient(endpointUrl, {
  ...updatedOptions,
  credential,
  authSchemes: [{ kind: "http", scheme: "sharedaccesskey" }]  // Not recognized by runtime
})
```

**Mock server expectations:**
- GET `/authentication/http/custom/valid`: Header `Authorization: SharedAccessKey valid-key` → 204
- GET `/authentication/http/custom/invalid`: Header `Authorization: SharedAccessKey invalid-key` → 403

**Expected behavior:**
```typescript
authSchemes: [{ kind: "apiKey", apiKeyLocation: "header", name: "Authorization" }]
```

#### Implementation Design

**Approach A (Recommended): Map non-standard HTTP schemes to apiKey auth**

In `src/components/client-context.tsx` (`buildAuthSchemesLiteral()`), check if the HTTP scheme is standard (basic, bearer). If not, emit it as `apiKey` auth in the Authorization header:

```typescript
case "http":
  if (["basic", "bearer"].includes(scheme.scheme.toLowerCase())) {
    return `{ kind: "http", scheme: "${scheme.scheme.toLowerCase()}" }`;
  }
  // Custom scheme → API key in Authorization header
  return `{ kind: "apiKey", apiKeyLocation: "header", name: "Authorization" }`;
```

- **Pros**: Works with existing runtime auth policies; correct behavior
- **Cons**: Loses the scheme name info (but runtime prepends it automatically)

**Approach B: Extend runtime to support custom HTTP schemes**

Add a new auth scheme kind in the runtime that handles custom HTTP schemes.

- **Pros**: Full fidelity; explicit
- **Cons**: Requires runtime changes; scope creep

**Recommendation**: **Approach A**. The runtime's `apiKeyAuthenticationPolicy` already handles key-based auth correctly. Custom HTTP schemes are semantically API keys in the Authorization header.

---

### 12. Bytes Encoding in Query/Header/Body

**Tests affected (14):**

Note: The query (4) and header (4) tests are also counted in categories 2 and 3 above. The additional **body** tests are:

| File | Test Name | Line |
|------|-----------|------|
| `encode/bytes/main.test.ts` | default (base64) JSON body request | 127 |
| `encode/bytes/main.test.ts` | base64 body request | 139 |
| `encode/bytes/main.test.ts` | base64url body request | 143 |
| `encode/bytes/main.test.ts` | default (base64) JSON body response | 155 |
| `encode/bytes/main.test.ts` | octet-stream response | 160 |
| `encode/bytes/main.test.ts` | custom content-type (image/png) response | 165 |

**Problem**: For standalone `@body` parameters that are `bytes` with `@encode`, the emitter doesn't generate encoding/decoding logic. Raw `Uint8Array` objects are passed directly as the HTTP body.

**Current generated code:**
```typescript
// Request body — passes raw Uint8Array
body: context.path(path).post({ body: value })  // No encoding!

// Response body — some cases work
return typeof result.body === "string"
  ? stringToUint8Array(result.body, "base64")  // ✓ JSON string responses work
  : result.body;                                 // ✓ Binary responses work
```

**Mock server expectations:**
- **base64 request body**: Content-Type `application/json`, body `"dGVzdA=="` (JSON string)
- **base64url request body**: Content-Type `application/json`, body `"dGVzdA"` (JSON string)
- **default request body**: Content-Type `application/octet-stream`, raw binary
- **Response bodies**: Return base64 strings in JSON or raw binary based on content-type

#### Implementation Design

**Approach A (Recommended): Generate encoding for standalone bytes body parameters**

When the emitter detects a `@body` parameter of type `bytes` with an `@encode` decorator:
1. **For JSON-encoded bytes** (base64, base64url): Convert `Uint8Array` to encoded string before sending, set `contentType: "application/json"`
2. **For binary bytes** (no encode or octet-stream): Send raw `Uint8Array`, set `contentType: "application/octet-stream"`
3. **For custom content-type** (image/png): Send raw `Uint8Array`, set content-type from TypeSpec

```typescript
// Generated for base64 request body:
const encoded = uint8ArrayToString(value, "base64");
context.path(path).post({ contentType: "application/json", body: JSON.stringify(encoded) });

// Generated for octet-stream:
context.path(path).post({ contentType: "application/octet-stream", body: value });
```

- **Pros**: Handles all content-type/encoding combinations; uses existing runtime helpers
- **Cons**: Complex matrix of content-type × encoding combinations

**Approach B: Always use the property serializer pattern for bytes bodies**

Wrap all bytes bodies in a model and use the existing property serializer infrastructure.

- **Pros**: Reuses working serialization code
- **Cons**: Artificial wrapping; doesn't match TypeSpec semantics for bare `@body bytes`

**Recommendation**: **Approach A**. The emitter needs to handle standalone bytes encoding as a first-class case, parallel to how it handles bytes properties in models.

---

## Cross-Cutting Observations

### Common Root Causes

1. **Missing type-aware coercion for non-JSON contexts**: The emitter handles serialization well for JSON body properties but lacks equivalent logic for query parameters, headers, and standalone body values. Categories 2, 3, 4, and 12 all stem from this gap.

2. **Encoding metadata not propagated to all contexts**: The `@encode` decorator information from TCGC is consumed for property serialization but ignored in query, header, and response header generation. This affects categories 2, 3, 4, 5, and 12.

3. **Inheritance not fully handled in serialization**: Derived types lose additional properties context, and non-discriminated unions lack type discrimination. Category 7 is the most complex fix.

### Suggested Implementation Order

1. **Low-hanging fruit first**: Categories 5 (numeric encode), 8 (name shadowing), 10 (nullable arrays), 11 (custom auth) — 8 tests, minimal complexity
2. **Medium complexity**: Categories 1 (content-type), 2+3 (query/header coercion), 6 (refkey fix), 9 (int64) — 36 tests  
3. **High complexity**: Categories 4 (response headers), 7 (additional properties), 12 (bytes body) — 44 tests

### Files Most Likely to Change

| Emitter Source File | Categories |
|---|---|
| `src/components/serialization/json-serializer.tsx` | 5, 6, 7, 10 |
| `src/components/serialization/json-deserializer.tsx` | 5, 7, 10 |
| `src/components/operations/` (operation generation) | 1, 2, 3, 4, 12 |
| `src/components/client-context.tsx` | 11 |
| `src/components/client.tsx` (or class generation) | 8 |
| `src/utils/refkeys.ts` | 6 |
