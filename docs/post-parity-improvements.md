# Post-Parity Improvements

Improvements identified during the legacy parity investigation that should
be addressed after output parity is achieved.

---

## 1. Remove `flattenClientHierarchy()` (Approach A)

**Priority:** High
**File:** `docs/future-approach-a.md` (detailed proposal)

The current dual-option system (`hierarchy-client` + `enable-operation-group`)
replicates legacy complexity. Removing `flattenClientHierarchy()` entirely
would simplify the emitter by trusting TCGC's hierarchy unconditionally.

- Eliminates `src/utils/flatten-clients.ts`
- Removes `enable-operation-group` option and all 30+ per-spec overrides in
  `eng/scripts/emit-e2e.ts`
- Only 4 versioning tests would need trivial updates
- See `docs/future-approach-a.md` for full rationale and migration path

---

## 2. Fix Non-Discriminated Union Deserialization in Additional Properties

**Priority:** Medium
**Legacy issue:** [autorest.typescript#3122](https://github.com/Azure/autorest.typescript/issues/3122)

The emitter does not generate deserialization callbacks for generated
(inline) unions in additional properties records. When a union like
`WidgetData0 | WidgetData1` contains a variant with `utcDateTime` fields,
the deserializer passes values through as raw strings instead of converting
to `Date` objects.

### Root Cause

`needsTransformation()` in `src/components/serialization/json-serializer.tsx`
(lines 453-466) returns `false` for generated unions (`isGeneratedName`
is `true`), so `deserializeRecord` gets `undefined` as its callback.

### Proposed Fix

Modify `needsTransformation()` to recursively check if any variant in a
generated union requires transformation:

```typescript
case "union":
  // Check if any variant needs transformation (datetime, bytes, models)
  if (type.variantTypes?.some(v => needsTransformation(v))) {
    return true;
  }
  return !!(
    type.name &&
    !type.isGeneratedName &&
    ((type.usage & UsageFlags.Input) !== 0 ||
      (type.usage & UsageFlags.Output) !== 0 ||
      (type.usage & UsageFlags.Exception) !== 0)
  );
```

Then ensure the union deserializer component generates proper discrimination
code for the callback. The existing discrimination strategies already handle:
- Distinct constant values (`kind: "kind0"` vs `kind: "kind1"`)
- Property existence checks (`"end" in item`)
- Array vs non-array (`Array.isArray()`)

### Affected Tests

After fixing, update the 3 e2e tests in
`test/e2e/http/type/property/additional-properties/main.test.ts` to expect
`Date` objects (they already do — just remove the skip/workaround).

### Affected TypeSpec Models

```tsp
model SpreadRecordForNonDiscriminatedUnion  { ...Record<WidgetData0 | WidgetData1>; }
model SpreadRecordForNonDiscriminatedUnion2 { ...Record<WidgetData2 | WidgetData1>; }
model SpreadRecordForNonDiscriminatedUnion3 { ...Record<WidgetData2[] | WidgetData1>; }
```

Where `WidgetData1` has `start: utcDateTime` and `end?: utcDateTime`.
