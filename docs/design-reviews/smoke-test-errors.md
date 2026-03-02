# Smoke Test Error Report

Generated: 2026-03-01

## Summary

The smoke test (`pnpm test:smoke`) produces **78 TypeScript compile errors** across 5 generated files, all caused by **10 unresolved Alloy refkeys** that render as `<Unresolved Symbol: refkey[...]>` in the output. These errors group into **2 root causes**.

---

## Root Cause A: Send function uses JSON `serializerRefkey` for XML body operations

**78 errors → 6 unresolved symbols across 4 files**

### What happens

`buildBodyExpression()` in `send-operation.tsx` (line ~847) calls `getSerializationExpression()` from `json-serializer.tsx`, which always uses `serializerRefkey(type)` — the JSON serializer refkey. For operations with `contentType: "application/xml"`, the body model should be serialized with `xmlSerializerRefkey(type)` instead.

XML input models are excluded from JSON serializer generation (`model-files.tsx` line ~173: `inputModels.filter(m => !isXml(m))`), so `serializerRefkey(type)` has no owning declaration → unresolved symbol.

### Affected operations

| File                              | Function                    | Body param                 | Should use                              |
| --------------------------------- | --------------------------- | -------------------------- | --------------------------------------- |
| `api/service/operations.ts:14`    | `_setPropertiesSend`        | `storageServiceProperties` | `storageServicePropertiesXmlSerializer` |
| `api/service/operations.ts:155`   | `_getUserDelegationKeySend` | `keyInfo`                  | `keyInfoXmlSerializer`                  |
| `api/blob/operations.ts:806`      | `_setTagsSend`              | `tags`                     | XML serializer for tags                 |
| `api/container/operations.ts:187` | `_setAccessPolicySend`      | `containerAcl`             | XML serializer for containerAcl         |
| `api/blockBlob/operations.ts:185` | `_commitBlockListSend`      | `blocks`                   | `blockLookupListXmlSerializer`          |
| `api/blockBlob/operations.ts:265` | `_querySend`                | `queryRequest`             | `queryRequestXmlSerializer`             |

### Fix approach

`buildBodyExpression()` in `send-operation.tsx` needs to detect XML operations (via content type or body parameter metadata) and use `xmlSerializerRefkey(type)` instead of the default `serializerRefkey(type)`. The XML serializer functions already exist in the generated output — they just aren't referenced.

Key code path:

- `send-operation.tsx` → `buildBodyExpression()` (line ~834)
- Calls `getSerializationExpression()` from `json-serializer.tsx` (line ~303)
- Which uses `serializerRefkey(type)` (line ~313) — always JSON

The fix needs to either:

1. Make `buildBodyExpression()` content-type-aware and branch to XML serializer refkeys, OR
2. Create a unified `getSerializationExpression()` that accepts a serialization format hint

---

## Root Cause B: Array serializer helpers generated for XML-only types reference non-existent JSON serializers

**Contributes to parse errors on models.ts lines 1270, 1274, 1280, 1284 → 4 unresolved symbols**

### What happens

The `JsonArraySerializer` component (`json-array-record-helpers.tsx` line ~60) generates array helper functions like `corsRuleArraySerializer(result)` that internally call `getSerializationExpression(type.valueType, "item")`. For XML-only models (e.g., `CorsRule`, `BlobTag`, `SignedIdentifier`, `ArrowField`), this produces `serializerRefkey(CorsRule)` — but CorsRule only has `corsRuleXmlObjectSerializer`, not `corsRuleSerializer`.

### Affected array serializers

| Function                          | Item type          | Missing serializer                             |
| --------------------------------- | ------------------ | ---------------------------------------------- |
| `corsRuleArraySerializer`         | `CorsRule`         | `corsRuleSerializer` (only XML exists)         |
| `blobTagArraySerializer`          | `BlobTag`          | `blobTagSerializer` (only XML exists)          |
| `signedIdentifierArraySerializer` | `SignedIdentifier` | `signedIdentifierSerializer` (only XML exists) |
| `arrowFieldArraySerializer`       | `ArrowField`       | `arrowFieldSerializer` (only XML exists)       |

### Fix approach

Two possible approaches:

1. **Don't generate JSON array serializers for XML-only types** — filter them out in `model-files.tsx` the same way XML input models are excluded from JSON serializers
2. **Make array serializer reference XML object serializer refkey** when the item type is XML-only — the array serializer's `.map()` callback should call `xmlObjectSerializerRefkey(itemType)` instead of `serializerRefkey(itemType)`

Option 1 is simpler if these array serializers aren't actually referenced anywhere (they'd be dead code since the send function also has unresolved refs for these types). Option 2 is needed if array serializers must work for XML types.

Most likely, **these array serializers shouldn't be generated at all** for XML-only types. XML array serialization is handled inline by `XmlObjectSerializer` (line ~114 of `xml-object-serializer.tsx`), which uses `xmlObjectSerializerRefkey(inner)` directly in the `.map()` call.

---

## Error-to-Root-Cause Mapping

All 78 TS errors are cascade parse errors from these 10 unresolved symbols:

| Unresolved refkey         | File:Line                         | Root Cause |
| ------------------------- | --------------------------------- | ---------- |
| `refkey[o219…serializer]` | `api/service/operations.ts:14`    | A          |
| `refkey[o237…serializer]` | `api/service/operations.ts:155`   | A          |
| `refkey[o243…serializer]` | `api/blob/operations.ts:806`      | A          |
| `refkey[o245…serializer]` | `api/container/operations.ts:187` | A          |
| `refkey[o267…serializer]` | `api/blockBlob/operations.ts:185` | A          |
| `refkey[o270…serializer]` | `api/blockBlob/operations.ts:265` | A          |
| `refkey[o222…serializer]` | `models/models.ts:1270`           | B          |
| `refkey[o244…serializer]` | `models/models.ts:1274`           | B          |
| `refkey[o246…serializer]` | `models/models.ts:1280`           | B          |
| `refkey[o279…serializer]` | `models/models.ts:1284`           | B          |
