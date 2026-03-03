# E2E API Surface Audit Report

> **Date**: 2026-03-03
> **Methodology**: Extracted rolled-up `.d.ts` from both emitters using `tsc --emitDeclarationOnly` + `@microsoft/api-extractor` (identical pipeline), then compared declaration-level exports.
> **Legacy baseline**: `submodules/autorest.typescript/packages/typespec-ts/test/modularIntegration/generated/` (51 specs)
> **New emitter output**: `test/e2e/generated/` → extracted to `test/e2e/api/` (109 specs, 51 overlap with legacy)

---

## Executive Summary

The new emitter achieves **broad functional parity** with the legacy emitter across all 48 comparable specs (3 have a structural packaging difference). The differences found fall into **9 categories**. The majority of the ~700 raw diffs are **one systemic naming convention change** in operation option params (§2). After deduplicating by root cause, there are approximately **9 distinct issues** to evaluate, of which **3 are intentional improvements**, **4 are naming/convention decisions**, and **2 are likely bugs**.

| Severity | Count | Root Causes |
|----------|-------|-------------|
| Critical | 3 | 1 (versioning spec packaging) |
| High | 673 | 3 (option param naming, option param visibility, casing) |
| Medium | 30 | 3 (union type handling, multipart file types, additional properties) |
| Low / Non-breaking | 38+ | 2 (endpoint addition, client methods moved to sub-clients) |

---

## Category 1: Missing Specs — Versioning/Removed

**Severity: Critical** · **Affected specs: 3** · **Root cause: 1**

The legacy emitter generates three separate packages for versioning/removed:
- `versioning/removed/v1`
- `versioning/removed/v2`
- `versioning/removed/v2preview`

The new emitter generates a single `versioning/removed` package.

**Assessment**: This is a structural packaging decision. The TypeSpec spec defines three versions; the legacy creates one SDK per version while the new emitter creates a single SDK that handles all versions. Both approaches are valid. The new approach mirrors how Azure SDKs typically ship (one package, multiple API versions). **Not a bug — design decision.**

**Recommendation**: Keep the new emitter's approach (single package). Document it as an intentional change in the migration guide.

---

## Category 2: Operation Option Params Naming Convention

**Severity: High** · **Affected items: 600 renamed + 65 unexported** · **Root cause: 2**

### 2a. Naming Pattern Change (600 items)

The legacy prefixes operation option params with the operation group name; the new emitter drops the prefix:

| Spec | Legacy Name | New Name |
|------|-------------|----------|
| `encode/array` | `PropertyCommaDelimitedOptionalParams` | `CommaDelimitedOptionalParams` |
| `encode/bytes` | `HeaderDefaultOptionalParams` | `DefaultOptionalParams` |
| `encode/datetime` | `QueryDefaultOptionalParams` | `DefaultOptionalParams` |
| `type/property/value-types` | `ValueTypesGetBooleanOptionalParams` | `GetBooleanOptionalParams` |

**Pattern**: `{OperationGroup}{OperationName}OptionalParams` → `{OperationName}OptionalParams`

This is consistent across all 600 affected items. The new emitter drops the operation group prefix from option param names.

**Assessment**: This is a **naming convention difference**, not a functional change. The option params have identical shapes. For clients with grouped operations (sub-clients), the legacy's prefix was redundant since the operation already lives under a typed sub-client accessor. However, this could cause **name collisions** when two operation groups have identically-named operations with different params — the current approach relies on the params being declared in separate files and not colliding in the top-level export.

**Recommendation**: Evaluate whether the legacy's prefixed naming should be adopted for safety against collisions, or whether the shorter names are acceptable. If keeping the new convention, document as intentional.

### 2b. Operation Option Params Not Exported (65 items)

For clients **without** sub-client operation groups (flat clients), the operation option params are emitted as `declare interface` instead of `export declare interface`:

| Spec | Unexported Param |
|------|-----------------|
| `authentication/api-key` | `InvalidOptionalParams`, `ValidOptionalParams` |
| `authentication/http/custom` | `InvalidOptionalParams`, `ValidOptionalParams` |
| `authentication/oauth2` | `InvalidOptionalParams`, `ValidOptionalParams` |
| `authentication/union` | `ValidKeyOptionalParams`, `ValidTokenOptionalParams` |
| `parameters/body-optionality` | `RequiredExplicitOptionalParams`, `RequiredImplicitOptionalParams` |
| `routes` | `FixedOptionalParams` |
| `serialization/encoded-name/json` | `GetOptionalParams`, `SendOptionalParams` |
| `server/endpoint/not-defined` | `ValidOptionalParams` |
| `server/path/multiple` | `NoOperationParamsOptionalParams`, `WithOperationPathParamOptionalParams` |
| `server/path/single` | `MyOpOptionalParams` |
| `server/versions/not-versioned` | `WithPathApiVersionOptionalParams`, `WithQueryApiVersionOptionalParams`, `WithoutApiVersionOptionalParams` |
| `server/versions/versioned` | `WithPathApiVersionOptionalParams`, `WithQueryApiVersionOptionalParams`, `WithQueryOldApiVersionOptionalParams`, `WithoutApiVersionOptionalParams` |
| `special-headers/repeatability` | `ImmediateSuccessOptionalParams` |
| `type/model/empty` | `GetEmptyOptionalParams`, `PostRoundTripEmptyOptionalParams`, `PutEmptyOptionalParams` |
| `type/model/inheritance/enum-discriminator` | `GetExtensibleModelMissingDiscriminatorOptionalParams`, `GetExtensibleModelOptionalParams`, `GetExtensibleModelWrongDiscriminatorOptionalParams`, `GetFixedModelMissingDiscriminatorOptionalParams`, `GetFixedModelOptionalParams`, `GetFixedModelWrongDiscriminatorOptionalParams`, `PutExtensibleModelOptionalParams`, `PutFixedModelOptionalParams` |
| `type/model/inheritance/nested-discriminator` | `GetMissingDiscriminatorOptionalParams`, `GetModelOptionalParams`, `GetRecursiveModelOptionalParams`, `GetWrongDiscriminatorOptionalParams`, `PutModelOptionalParams`, `PutRecursiveModelOptionalParams` |
| `type/model/inheritance/not-discriminated` | `GetValidOptionalParams`, `PostValidOptionalParams`, `PutValidOptionalParams` |
| `type/model/inheritance/recursive` | `GetOptionalParams`, `PutOptionalParams` |
| `type/model/inheritance/single-discriminator` | `GetLegacyModelOptionalParams`, `GetMissingDiscriminatorOptionalParams`, `GetModelOptionalParams`, `GetRecursiveModelOptionalParams`, `GetWrongDiscriminatorOptionalParams`, `PutModelOptionalParams`, `PutRecursiveModelOptionalParams` |
| `type/model/usage` | `InputAndOutputOptionalParams`, `InputOptionalParams`, `OutputOptionalParams` |
| `versioning/added` | `V1OptionalParams`, `V2InInterfaceOptionalParams`, `V2OptionalParams` |
| `versioning/madeOptional` | `TestOptionalParams` |
| `versioning/renamedFrom` | `NewOpInNewInterfaceOptionalParams`, `NewOpOptionalParams` |
| `versioning/returnTypeChangedFrom` | `TestOptionalParams` |
| `versioning/typeChangedFrom` | `TestOptionalParams` |

**Assessment**: This is a **breaking change**. Users who import these types to type-annotate their own code will see compile errors. The types are still referenced from method signatures but not accessible for import.

**Recommendation**: These should be exported. This appears to be a **bug** — option params are only exported when they live under an `api/` subdirectory for grouped operations, but are not re-exported for flat clients where they're defined alongside the operations file.

---

## Category 3: Interface/Type Casing Change — `Base64Url` → `Base64url`

**Severity: High** · **Affected items: 10** · **Spec: `encode/bytes`**

| Legacy Name | New Name |
|-------------|----------|
| `Base64UrlBytesProperty` | `Base64urlBytesProperty` |
| `Base64UrlArrayBytesProperty` | `Base64urlArrayBytesProperty` |
| `HeaderBase64UrlOptionalParams` | `Base64urlOptionalParams` |
| `HeaderBase64UrlArrayOptionalParams` | `Base64urlArrayOptionalParams` |
| `PropertyBase64UrlOptionalParams` | `Base64urlOptionalParams` |
| `PropertyBase64UrlArrayOptionalParams` | `Base64urlArrayOptionalParams` |
| `QueryBase64UrlOptionalParams` | `Base64urlOptionalParams` |
| `QueryBase64UrlArrayOptionalParams` | `Base64urlArrayOptionalParams` |
| `RequestBodyBase64UrlOptionalParams` | `Base64urlOptionalParams` |
| `ResponseBodyBase64UrlOptionalParams` | `Base64urlOptionalParams` |

**Assessment**: The new emitter uses `Base64url` (lowercase 'u') while the legacy uses `Base64Url` (uppercase 'U'). The IETF standard spells it "base64url" (all lowercase), so the new emitter's casing is arguably more correct. However, this is a **breaking rename** for any consumer using these types.

**Recommendation**: Accept the new casing as correct per the IETF standard. Document as an intentional change.

---

## Category 4: Client Methods Moved to Sub-Client Accessors

**Severity: Low (non-breaking for runtime)** · **Affected specs: 3**

| Spec | Client | Method | What Happened |
|------|--------|--------|---------------|
| `serialization/encoded-name/json` | `JsonClient` | `get`, `send` | Moved to operation group sub-client |
| `versioning/added` | `AddedClient` | `v2InInterface` | Moved to `interfaceV2` sub-client accessor |
| `versioning/renamedFrom` | `RenamedFromClient` | `newOpInNewInterface` | Moved to sub-client accessor |

For example, in `versioning/added`:
```typescript
// Legacy
client.v2InInterface(body, options);

// New
client.interfaceV2.v2InInterface(body, options);
```

**Assessment**: The new emitter correctly creates sub-client accessors for operations defined inside TypeSpec `interface` blocks. The legacy flattened them onto the root client. The new behavior is **more correct** — it preserves the TypeSpec author's grouping intent.

**Recommendation**: Keep the new behavior. Document the access pattern change in the migration guide.

---

## Category 5: Operations Interface Changes

**Severity: Medium** · **Removed: 24, Changed: 162**

### 5a. Removed Operation Interfaces (24)

| Spec | Removed Interface |
|------|-------------------|
| `payload/multipart` | `FormDataFileOperations`, `FormDataHttpPartsContentTypeOperations`, `FormDataHttpPartsNonStringOperations`, `FormDataHttpPartsOperations` |
| `payload/pageable` | `ServerDrivenPaginationContinuationTokenOperations` |
| `routes` | `PathParametersLabelExpansionExplodeOperations`, `PathParametersLabelExpansionOperations`, `PathParametersLabelExpansionStandardOperations`, `PathParametersMatrixExpansionExplodeOperations`, `PathParametersMatrixExpansionOperations`, `PathParametersMatrixExpansionStandardOperations`, `PathParametersPathExpansionExplodeOperations`, `PathParametersPathExpansionOperations`, `PathParametersPathExpansionStandardOperations`, `PathParametersReservedExpansionOperations`, `PathParametersSimpleExpansionExplodeOperations`, `PathParametersSimpleExpansionOperations`, `PathParametersSimpleExpansionStandardOperations`, `QueryParametersQueryContinuationExplodeOperations`, `QueryParametersQueryContinuationOperations`, `QueryParametersQueryContinuationStandardOperations`, `QueryParametersQueryExpansionExplodeOperations`, `QueryParametersQueryExpansionOperations`, `QueryParametersQueryExpansionStandardOperations` |

**Assessment**: The `routes` spec removals (19 interfaces) reflect a **different sub-client hierarchy** in the new emitter. The legacy creates deeply nested sub-client groupings (e.g., `PathParametersLabelExpansionStandard`), while the new emitter uses a flatter hierarchy. The `payload/multipart` removals (4 interfaces) reflect the multipart API redesign. The `payload/pageable` removal reflects the different pagination API.

### 5b. Changed Operations Interfaces (162)

The 162 changed operation interfaces are almost entirely due to the **option param rename** from §2a — the method signatures reference the new shorter param names. Functionally identical.

**Recommendation**: The changed interfaces are a consequence of §2a. The removed interfaces in `routes` should be investigated to ensure all operations are still reachable via the new hierarchy.

---

## Category 6: Type & Enum Changes

**Severity: Medium** · **Affected items: 4**

### 6a. `FishUnion` Type — Likely Bug

| Spec | Type | Legacy | New |
|------|------|--------|-----|
| `type/model/inheritance/nested-discriminator` | `FishUnion` | `SharkUnion \| Salmon \| Fish` | `Shark \| Salmon \| Fish` |

The legacy uses `SharkUnion` (which further discriminates between `Shark` subtypes), while the new emitter uses `Shark` directly. This also manifests in member types:

| Interface | Member | Legacy | New |
|-----------|--------|--------|-----|
| `Salmon` | `partner` | `FishUnion` | `Fish` |
| `Salmon` | `friends` | `FishUnion[]` | `Fish[]` |
| `Salmon` | `hate` | `Record<string, FishUnion>` | `Record<string, Fish>` |

**Assessment**: This is a **likely bug** in the new emitter. The nested discriminated union hierarchy is not fully resolved — `SharkUnion` should be used instead of `Shark` to preserve the ability to represent sub-types. Similarly, members typed as `FishUnion` in the legacy are typed as `Fish` (the base type) in the new emitter, which loses type narrowing ability.

The same pattern appears for `BirdUnion` in `single-discriminator`:
| `Eagle` | `partner` | `BirdUnion` | `Bird` |
| `Eagle` | `friends` | `BirdUnion[]` | `Bird[]` |
| `Eagle` | `hate` | `Record<string, BirdUnion>` | `Record<string, Bird>` |

**Recommendation**: **Fix** — use the discriminated union type (`SharkUnion`, `FishUnion`, `BirdUnion`) instead of the base type in member references.

### 6b. `StringExtensibleNamedUnion` — Intentional Improvement

| Spec | Type | Legacy | New |
|------|------|--------|-----|
| `type/union` | `StringExtensibleNamedUnion` | `string` | `"b" \| "c"` |
| `type/union` | `KnownStringExtensibleNamedUnion` | `enum { ... }` | *(removed)* |

**Assessment**: The legacy uses the `Known{Name}` enum + `string` type alias pattern for extensible enums. The new emitter uses a string literal union type directly. The new approach is **more correct and ergonomic** — it provides autocomplete for known values without the indirection of a separate `Known*` enum. The `KnownStringExtensibleNamedUnion` enum removal is expected.

**Recommendation**: Keep the new behavior. Document the `Known*` enum removal in the migration guide.

### 6c. `Shark.sharktype` Discriminator Narrowed

| Interface | Member | Legacy | New |
|-----------|--------|--------|-----|
| `Shark` | `sharktype` | `string` | `"shark"` |

**Assessment**: The new emitter correctly narrows the discriminator to its literal value. This is **more correct** — a discriminator property should have a literal type, not a broad `string`.

**Recommendation**: Keep the new behavior.

---

## Category 7: Multipart File Type Changes

**Severity: Medium** · **Affected items: 12 interfaces** · **Spec: `payload/multipart`**

The file/binary part types have been significantly simplified:

| Interface | Member | Legacy Type | New Type |
|-----------|--------|-------------|----------|
| `MultiPartRequest` | `profileImage` | `FileContents \| { contents: FileContents; contentType?: string; filename?: string }` | `Uint8Array` |
| `ComplexHttpPartsModelRequest` | `profileImage` | `File \| { contents: FileContents; contentType?: string; filename: string }` | `FileRequiredMetaData` |
| `BinaryArrayPartsRequest` | `pictures` | `Array<FileContents \| { contents: FileContents; ... }>` | `Uint8Array[]` |

Additionally, `contentType` and `filename` members have been removed from most request interfaces (they were convenience properties on the legacy's inline type).

**Assessment**: The new emitter uses simpler types for multipart binary parts. For non-HTTP-parts scenarios, it uses `Uint8Array` directly. For HTTP-parts scenarios (with required metadata), it uses typed interfaces like `FileRequiredMetaData` and `FileSpecificContentType`. This is a **different but valid approach**. The legacy's inline union type `FileContents | { contents: FileContents; ... }` was more flexible but harder to use correctly.

**Recommendation**: Verify this matches the runtime's multipart handling. If the runtime supports both approaches, the new simpler types are preferable.

---

## Category 8: Additional Properties & Union Type Wrapping

**Severity: Medium** · **Affected items: 11 interfaces**

### 8a. Additional Properties Use Named Types

| Spec | Interface | Member | Legacy | New |
|------|-----------|--------|--------|-----|
| `type/property/additional-properties` | `MultipleSpreadRecord` | `additionalProperties` | `Record<string, string \| number>` | `Record<string, _MultipleSpreadRecordAdditionalProperty>` |
| `type/property/additional-properties` | `SpreadRecordForUnion` | `additionalProperties` | `Record<string, string \| number>` | `Record<string, _SpreadRecordForUnionAdditionalProperty>` |
| `type/property/additional-properties` | `SpreadRecordForNonDiscriminatedUnion` | `additionalProperties` | `Record<string, WidgetData0 \| WidgetData1>` | `Record<string, _SpreadRecordForNonDiscriminatedUnionAdditionalProperty>` |

### 8b. Literal Union Properties Use Named Types

| Spec | Interface | Member | Legacy | New |
|------|-----------|--------|--------|-----|
| `type/property/value-types` | `UnionStringLiteralProperty` | `property` | `"hello" \| "world"` | `UnionStringLiteralPropertyProperty` |
| `type/property/value-types` | `UnionIntLiteralProperty` | `property` | `42 \| 43` | `UnionIntLiteralPropertyProperty` |
| `type/property/value-types` | `UnionFloatLiteralProperty` | `property` | `43.125 \| 46.875` | `UnionFloatLiteralPropertyProperty` |
| `type/property/optionality` | `UnionStringLiteralProperty` | `property` | `"hello" \| "world"` | `UnionStringLiteralPropertyProperty` |
| `type/property/optionality` | `UnionIntLiteralProperty` | `property` | `1 \| 2` | `UnionIntLiteralPropertyProperty` |
| `type/property/optionality` | `UnionFloatLiteralProperty` | `property` | `1.25 \| 2.375` | `UnionFloatLiteralPropertyProperty` |

### 8c. Complex Union Members Use Named Types

| Spec | Interface | Member | Legacy | New |
|------|-----------|--------|--------|-----|
| `type/union` | `EnumsOnlyCases` | `lr` | `"left" \| "right" \| "up" \| "down"` | `EnumsOnlyCasesLr` |
| `type/union` | `MixedLiteralsCases` | `stringLiteral` | `"a" \| 2 \| 3.3 \| true` | `_MixedLiteralsCasesStringLiteral` |
| `type/union` | `MixedTypesCases` | `model` | `Cat \| "a" \| number \| boolean` | `_MixedTypesCasesModel` |
| `type/union` | `StringAndArrayCases` | `string` | `string \| string[]` | `_StringAndArrayCasesString` |

**Assessment**: The new emitter creates **named type aliases** for union types used in properties, rather than inlining the union. This is a **style difference with tradeoffs**:

- **Pro**: Named types are reusable, make complex union types more readable, and generate cleaner serializer/deserializer code
- **Pro**: Named types starting with `_` are internal (non-exported), keeping the public API clean
- **Con**: Adds indirection — consumers must look up the type alias to see the actual union members
- **Con**: Some names are verbose (`_MixedLiteralsCasesStringLiteral`)

**Recommendation**: This is acceptable. The named types resolve to the same underlying union. The underscored types are implementation details.

---

## Category 9: Pagination API Changes

**Severity: Medium** · **Affected items: 3** · **Spec: `payload/pageable`**

| Item | Legacy | New |
|------|--------|-----|
| `PagedAsyncIterableIterator` interface | Exported | Removed |
| `PageSettings` interface | Exported | Removed |
| `ContinuablePage` type | Exported | Removed |
| `ServerDrivenPaginationContinuationTokenOperations` interface | Exported | Removed |

**Assessment**: The legacy emitter exports custom pagination types. The new emitter likely uses a different pagination abstraction (possibly from the runtime). The `payload/pageable` spec has several `not-implemented` e2e scenarios, confirming pagination is still a work-in-progress.

**Recommendation**: Defer — pagination is actively being developed. These types will likely be addressed as part of the pagination implementation.

---

## Non-Breaking Additions

### `endpoint` Property on Client Options (38 specs)

The new emitter adds `endpoint?: string` to all `*ClientOptionalParams` interfaces where the legacy had an empty extension of `ClientOptions`. This is a **non-breaking addition** that gives consumers a typed way to set the endpoint.

### Context Interfaces and Factory Functions (48 specs)

Every spec now exports a `{Name}Context` interface and `create{Name}()` factory function. These enable a functional programming style as an alternative to the class-based client. This is a **non-breaking addition**.

### Serializer/Deserializer Functions (all specs)

Every model type now has exported serializer and deserializer functions (e.g., `modelV1Serializer`, `modelV1Deserializer`). This is a **non-breaking addition** that enables custom serialization scenarios.

### Static Helpers (all specs)

Utility functions for collection formatting, XML serialization, URL template expansion, etc. are now exported from every package. These are **non-breaking additions** but increase the public API surface significantly.

**Recommendation**: Consider whether these utilities should be re-exported from each package or kept as internal implementation details. Exporting them from every package adds noise to the public API.

---

## Recommendations Summary

| # | Category | Action | Priority |
|---|----------|--------|----------|
| 1 | Missing versioning specs | Keep as-is, document design decision | Low |
| 2a | Option param naming convention | **Decide**: keep short names or restore prefixes | High |
| 2b | Option params not exported (65 items) | **Fix**: ensure all operation params are exported | **High** |
| 3 | `Base64Url` → `Base64url` casing | Accept new casing (IETF-correct), document | Medium |
| 4 | Methods moved to sub-clients | Keep as-is (more correct), document | Low |
| 5 | Operations interfaces changed | Consequence of §2a, no separate action needed | Low |
| 6a | `FishUnion`/`BirdUnion` type bug | **Fix**: use union types in member references | **High** |
| 6b | `KnownStringExtensibleNamedUnion` removal | Keep as-is (improvement), document | Low |
| 7 | Multipart file types simplified | Verify runtime compatibility, accept if compatible | Medium |
| 8 | Union types wrapped in named aliases | Accept (style difference, functionally equivalent) | Low |
| 9 | Pagination types missing | Defer — WIP feature | Low |
| — | Static helpers exported everywhere | Consider scoping to reduce public API noise | Medium |

### Top 3 Action Items

1. **Fix the unexported option params** (§2b) — 65 types referenced in method signatures but not importable. This is a clear bug that breaks consumers who type-annotate their code.
2. **Fix the nested discriminated union types** (§6a) — `FishUnion`/`BirdUnion`/`SharkUnion` are collapsed to base types, losing type narrowing. This affects `nested-discriminator` and `single-discriminator` specs.
3. **Decide on option param naming convention** (§2a) — 600 renames from `{Group}{Op}OptionalParams` to `{Op}OptionalParams`. The shorter names are cleaner but risk collisions. This needs a deliberate design decision.

---

## Appendix: How to Reproduce

```bash
# 1. Build the emitter
pnpm build

# 2. Generate e2e client libraries
pnpm emit:e2e

# 3. Extract API surface as .d.ts files
pnpm extract-api:e2e

# 4. Compare a specific spec
diff test/e2e/api/{spec}/src/index.d.ts \
     submodules/autorest.typescript/packages/typespec-ts/test/modularIntegration/generated/{spec}/src/index.d.ts

# 5. Extract with filter
pnpm extract-api:e2e -- --filter type/union
```
