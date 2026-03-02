# Investigation Plan: Serialization & Options Bugs

---

## Issue 1: Unresolved refkeys for arrays — Design Review

### Problem Statement

Array deserialization produces `<Unresolved Symbol: refkey[...]>` in the generated `.map()` body. The output:

```typescript
return result.map((item) => { return <Unresolved Symbol: refkey[o244⁣sserializer]>(item); });
```

This means `getDeserializationExpression(type.valueType, "item")` produced a `deserializerRefkey(type)` reference for an element type that has **no corresponding declaration** in the render tree.

### Architecture Context

There are **four parallel predicate systems** that must agree on which types have deserializer declarations:

| #   | Function                                       | Location                          | Purpose                                                            |
| --- | ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| 1   | `needsTransformation(type)`                    | json-serializer.tsx:438           | Gates whether array/dict elements need any transformation          |
| 2   | `valueTypeHasNamedDeserializerFn(type)`        | json-deserializer.tsx:605         | Decides inline `.map()` vs named `arrayDeserializerRefkey` helper  |
| 3   | `valueTypeHasNamedDeserializer(type)`          | json-array-record-helpers.tsx:308 | Decides whether to **collect** an array type for helper generation |
| 4   | Guards in `getDeserializationExpression(type)` | json-deserializer.tsx:292         | Decides whether to emit `deserializerRefkey(type)` or passthrough  |

Plus the **rendering pipeline** in `model-files.tsx` that decides which types get `<JsonDeserializer>` / `<JsonUnionDeserializer>` components rendered.

**The invariant**: If predicate #3 says "collect this array" and renders a `<JsonArrayDeserializer>`, then predicate #4 (called inside the helper body) must produce a resolvable refkey. The refkey resolves only if the rendering pipeline emitted a `<JsonDeserializer>` for the element type.

### Gap Analysis

**`needsTransformation` for unions (called without options from deserializer context):**

```
true when: type.name && ((!type.isGeneratedName && Input) || Output || Exception)
```

**`valueTypeHasNamedDeserializerFn` for unions:**

```
true when: type.name && (Output || Exception)
```

**`getDeserializationExpression` union guard:**

```
emit refkey when: type.name && (Output || Exception)
else: passthrough
```

**Model rendering in model-files.tsx:**

```
renders JsonDeserializer when: (Output || Exception) && !isAzureCoreErrorType
```

The predicates #2, #3, and #4 are **consistent with each other** for the standard case. The gap between #1 and #2/#3 (Input-only unions passing `needsTransformation` but failing `valueTypeHasNamedDeserializerFn`) produces a harmless `result.map((p) => p)` — wasteful but not broken.

### Root Cause Hypotheses

Since the standard predicate logic appears consistent, the unresolved refkey likely stems from one of:

**H1: Type instance identity mismatch.** `deserializerRefkey(entity)` uses `refkey(entity, "deserializer")` where `entity` is the JS object reference. If the TCGC model instance referenced by `array.valueType` differs from the instance in `sdkPackage.models` (used to render `<JsonDeserializer>`), the refkeys won't match. This can happen with template instantiations, nullable wrappers that create new inner types, or cross-package type references.

**H2: Model filtered from rendering pipeline.** A model passes the Output/Exception guard in `getDeserializationExpression` but is excluded from the `models` list by `isAzureCoreErrorType` or another filter, so no `<JsonDeserializer>` is rendered.

**H3: Polymorphic model mismatch.** Polymorphic models get `<JsonPolymorphicDeserializer>` which uses `deserializerRefkey(model)` for the switch function and `baseDeserializerRefkey(model)` for the base. If the array references a polymorphic model through `deserializerRefkey`, it resolves to the switch function — should be fine. But edge cases with intermediate base types may exist.

### Approach A: Unified `typeHasDeserializerDeclaration` Predicate (Recommended)

Create a single source-of-truth function that exactly mirrors the rendering pipeline's conditions. Replace all four predicate systems with calls to this one function.

**New function:**

```typescript
// src/utils/serialization-predicates.ts
export function typeHasDeserializerDeclaration(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      if (isAzureCoreErrorType(type)) return false;
      return (
        (type.usage & UsageFlags.Output) !== 0 ||
        (type.usage & UsageFlags.Exception) !== 0
      );
    case "union":
      return !!(
        type.name &&
        ((type.usage & UsageFlags.Output) !== 0 ||
          (type.usage & UsageFlags.Exception) !== 0)
      );
    case "nullable":
      return typeHasDeserializerDeclaration(type.type);
    default:
      return false;
  }
}

export function typeHasSerializerDeclaration(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      if (isAzureCoreErrorType(type)) return false;
      return (type.usage & UsageFlags.Input) !== 0;
    case "union":
      return !!(
        type.name &&
        !type.isGeneratedName &&
        (type.usage & UsageFlags.Input) !== 0
      );
    case "nullable":
      return typeHasSerializerDeclaration(type.type);
    default:
      return false;
  }
}
```

**Usage:**

- `getDeserializationExpression` model/union cases: guard with `typeHasDeserializerDeclaration(type)` before emitting `deserializerRefkey`
- `valueTypeHasNamedDeserializerFn` / `valueTypeHasNamedDeserializer`: delegate to `typeHasDeserializerDeclaration` for model/union cases
- `model-files.tsx`: use same predicate for filtering models/unions to render
- `needsTransformation`: make direction-aware or keep as-is (it gates "any work needed", not "has declaration")

**Changes required:**

1. New file `src/utils/serialization-predicates.ts` with both functions
2. Update `json-deserializer.tsx` `getDeserializationExpression` (model + union cases)
3. Update `json-serializer.tsx` `getSerializationExpression` (model + union cases)
4. Update `json-deserializer.tsx` `valueTypeHasNamedDeserializerFn` (model + union cases)
5. Update `json-serializer.tsx` `valueTypeHasNamedSerializerFn` (model + union cases)
6. Update `json-array-record-helpers.tsx` `valueTypeHasNamedDeserializer` / `valueTypeHasNamedSerializer` (model + union cases)
7. Optionally update `model-files.tsx` filtering to use same predicate

**Pros:**

- Root cause fix — prevents the entire class of predicate inconsistency bugs
- Single place to update when rendering conditions change
- Easy to audit: compare predicate with rendering pipeline
- Existing tests serve as regression safety net

**Cons:**

- Touches 6+ files across the serialization system
- Risk of subtle behavior changes if predicates don't exactly match current behavior
- `model-files.tsx` filtering currently uses inline conditions; changing to shared predicate may be premature

### Approach B: Defensive Expression Generation with Passthrough Fallback

Make `getDeserializationExpression` and `getSerializationExpression` inherently safe by never producing an unresolvable refkey. Add a check before every `deserializerRefkey`/`serializerRefkey` call that verifies the type's conditions match what the rendering pipeline produces. If not, fall back to accessor passthrough.

**Changes:**

```typescript
// In getDeserializationExpression, model case:
case "model":
  if (isAzureCoreErrorType(type)) return accessor;
  if ((type.usage & UsageFlags.Output) === 0 &&
      (type.usage & UsageFlags.Exception) === 0) return accessor;
  return code`${deserializerRefkey(type)}(${accessor})`;
  // ↑ Already exists (lines 297-312) — no change needed here

// In getDeserializationExpression, union case:
case "union":
  if (type.name &&
      ((type.usage & UsageFlags.Output) !== 0 ||
       (type.usage & UsageFlags.Exception) !== 0)) {
    return code`${deserializerRefkey(type)}(${accessor})`;
  }
  return accessor;
  // ↑ Already exists (lines 365-376) — no change needed here
```

The existing guards already look correct. So the fix targets the **array and dict helper bodies** where `getDeserializationExpression` is called but the type might have a declaration rendered with a **different object instance**.

The specific fix: in `JsonArrayDeserializer` and `JsonRecordDeserializer` (json-array-record-helpers.tsx), add a safety check for the element expression:

```typescript
// json-array-record-helpers.tsx JsonArrayDeserializer
const elementExpr = getDeserializationExpression(type.valueType, "item");
// Add: if elementExpr is just the accessor string, skip the .map() entirely
// or use a simpler pattern
```

**But this doesn't actually fix the refkey mismatch if that's the cause.** If the refkey in the expression doesn't match the refkey in the declaration due to object identity issues, no amount of guard logic will help — the issue is at the Alloy level.

**Alternative for H1 (instance mismatch):** Change `deserializerRefkey` to use a string-based identity (like `getTypeSignature`) instead of object identity:

```typescript
export function deserializerRefkey(entity: unknown): Refkey {
  const sig = getTypeSignature(entity);
  return refkey("deserializer", sig); // string-based, not object-based
}
```

**Pros:**

- Minimal changes (just the refkey functions in refkeys.ts)
- Fixes H1 (instance mismatch) by construction
- No risk to predicate logic

**Cons:**

- Changes refkey identity for ALL deserializers, not just arrays — high blast radius
- `getTypeSignature` may not be unique enough for all types (e.g., two models named "Error" in different namespaces would collide)
- Doesn't address predicate inconsistency (H2/H3)
- May break existing tests that rely on object-identity refkeys

### Approach C: Direction-Aware `needsTransformation`

Split `needsTransformation` into `needsSerializationTransformation(type)` and `needsDeserializationTransformation(type)`. The deserialization variant only returns `true` for types that have actual deserializer declarations.

**Changes:**

```typescript
// New: only true if a deserializer declaration is rendered
export function needsDeserializationTransformation(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      if (isAzureCoreErrorType(type)) return false;
      return (
        (type.usage & UsageFlags.Output) !== 0 ||
        (type.usage & UsageFlags.Exception) !== 0
      );
    case "array":
      return needsDeserializationTransformation(type.valueType);
    case "dict":
      return needsDeserializationTransformation(type.valueType);
    case "nullable":
      return needsDeserializationTransformation(type.type);
    case "utcDateTime":
    case "plainDate":
    case "bytes":
      return true;
    case "union":
      return !!(
        type.name &&
        ((type.usage & UsageFlags.Output) !== 0 ||
          (type.usage & UsageFlags.Exception) !== 0)
      );
    default:
      return false;
  }
}
```

**Usage:** Replace `needsTransformation(type)` calls in `getDeserializationExpression` and `wrapWithNullCheck` (deserializer) with `needsDeserializationTransformation(type)`.

**Pros:**

- Closes the gap between "needs transformation" and "has declaration" for deserialization
- No change to serialization path
- Self-documenting: the function name explains it's for deserialization

**Cons:**

- Duplicates most of `needsTransformation` logic with subtle differences
- Two functions that look similar but differ in the union/model cases — easy to confuse
- Doesn't fix H1 (instance mismatch) if that's the root cause
- `wrapWithNullCheck` in the deserializer also calls `needsTransformation` — needs updating too

### Recommendation

**Approach A (Unified Predicate)** is recommended because:

1. It addresses the root cause — inconsistency across 4+ parallel predicate systems
2. It creates a single source of truth that can be audited against the rendering pipeline
3. It prevents future drift when new type kinds are added or rendering conditions change
4. The existing comprehensive test suite (1000+ tests) provides safety for the refactor
5. It follows the pattern already established in `isAzureCoreErrorType` — a single predicate shared across all consumers

**If Approach A is too large**, a practical incremental path:

- Start with Approach A's predicate functions but only wire them into `getDeserializationExpression` and `getSerializationExpression` (the most critical consumers)
- Leave the collection predicates (`valueTypeHasNamedDeserializer/Serializer`) and `needsTransformation` unchanged initially
- This gives immediate safety with minimal blast radius

### Test Strategy

Regardless of approach:

1. Add a test case with a TypeSpec model containing an array of a type that exercises the gap (e.g., an output-only model referenced from an array in a response)
2. Assert no `<Unresolved Symbol` appears in the rendered output
3. Verify the existing `unresolved-symbols.test.tsx` tests still pass
4. Run full `pnpm test` to catch regressions

---

## Issue 2: Deserializer property keys not camelCased — Design Review

### Problem Statement

Deserializer output uses raw TCGC property names instead of name-policy-normalized (camelCase) names:

```typescript
// Current (broken)
export function errorDeserializer(item: any): ErrorModel {
  return {
    Code: item["Code"], // ← Should be "code"
    Message: item["Message"], // ← Should be "message"
  };
}
```

This causes a mismatch: the **model interface** goes through Alloy's name policy (producing camelCase `code`, `message`), but the **deserializer's return object keys** use raw `prop.name` which retains the original TypeSpec casing.

### Architecture Context

**How model interface property names are rendered** (model-interface.tsx line 112):

```tsx
<InterfaceMember
  name={property.name}
  type={propertyType}
  optional={property.optional}
/>
```

Alloy's `InterfaceMember` creates a symbol with `namePolicy: useTSNamePolicy().for("interface-member")`, which applies **camelCase** transformation. So `Code` → `code` in the interface.

**How deserializer return keys are rendered** (json-deserializer.tsx line 157):

```tsx
return <ObjectProperty name={prop.name} value={wrapped} />;
```

Alloy's `ObjectProperty` applies name policy **only when a namekey/refkey is passed** with the name. With a plain string, it passes through as-is. So `Code` stays `Code` in the return object.

**How serializer accessors are rendered** (json-serializer.tsx line 157):

```tsx
const accessor = `item["${prop.name}"]`; // reads from client model
```

This reads from the typed model using raw `prop.name`, but the model interface has camelCased the property via name policy. So `item["Code"]` tries to read a property that TypeScript calls `code`.

**Key insight:** There are **two separate issues**:

1. Deserializer return key (`ObjectProperty name`) — not normalized
2. Serializer accessor (`item["${prop.name}"]`) — not normalized

Both must match the name-policy-normalized form that the model interface uses.

**When does this manifest?** Only when TCGC's `prop.name` differs from what camelCase normalization produces. This happens with:

- PascalCase names (`Code` → `code`, `Message` → `message`)
- ALL_CAPS names (`ID` → `id`)
- Names from `@Xml.name` or non-standard TypeSpec conventions

In practice, most TypeSpec specs use camelCase already (TypeSpec convention), so `prop.name` coincidentally matches. The bug surfaces with Storage-style specs where `@Xml.name("Code")` causes TCGC to use PascalCase names.

### Approach A: Apply Name Policy via `namekey()` in ObjectProperty (Recommended)

Wrap `prop.name` in `namekey()` when passing to `ObjectProperty` and use `namekey()` for serializer accessors.

**Changes — Deserializer** (json-deserializer.tsx line 157):

```tsx
// Before:
return <ObjectProperty name={prop.name} value={wrapped} />;

// After:
return <ObjectProperty name={namekey(prop.name)} value={wrapped} />;
```

When `ObjectProperty` receives a `namekey`, it creates a symbol with `namePolicy: useTSNamePolicy().for("object-member-data")`, which applies camelCase — matching the interface member normalization.

**Changes — Serializer** (json-serializer.tsx line 157):
For the serializer accessor `item["${prop.name}"]`, we can't use `namekey()` inside a string template. Instead, we need to apply the same normalization manually:

```tsx
import { camelCase } from "change-case";
const caseOptions = { prefixCharacters: "$_", suffixCharacters: "$_" };
const normalizedName = camelCase(prop.name, caseOptions);
const accessor = `item["${normalizedName}"]`;
```

Or create a utility function that mirrors the name policy:

```tsx
// In src/utils/name-policy.ts (new export)
export function normalizePropertyName(name: string): string {
  return camelCase(name, { prefixCharacters: "$_", suffixCharacters: "$_" });
}
```

**Other affected locations** (grep for `prop.name` in serializer/deserializer string contexts):

- json-deserializer.tsx: `getAdditionalPropertiesDeserializationExpression` keys
- json-deserializer.tsx: flatten deserializer helper property keys
- json-serializer.tsx: all `item["${prop.name}"]` accessors
- json-serializer.tsx: flatten serializer helper `item["${name}"]` accessors
- xml-object-serializer.tsx: `item["${prop.name}"]` accessors

**Pros:**

- Uses Alloy's built-in name policy mechanism for ObjectProperty — guaranteed to match InterfaceMember normalization
- `namekey()` is the canonical Alloy pattern; no custom normalization needed for the deserializer side
- If the name policy ever changes, both InterfaceMember and ObjectProperty will stay in sync

**Cons:**

- Serializer accessors still need manual normalization (can't use `namekey()` in string templates)
- Need to add a `normalizePropertyName()` utility to apply the same camelCase logic
- Need to audit ALL `prop.name` usage in string contexts across both serializers — 10+ locations
- Flatten collision handling in `getEffectiveClientName` may also need normalization

### Approach B: Manual camelCase Normalization Everywhere

Create a shared `normalizePropertyName()` utility and apply it uniformly to all `prop.name` usage in serializers/deserializers.

**New utility** (src/utils/name-policy.ts):

```typescript
import { camelCase } from "change-case";

const CASE_OPTIONS = { prefixCharacters: "$_", suffixCharacters: "$_" };

/**
 * Normalizes a property name to match the name policy's camelCase output.
 * Use this in serializer/deserializer code where namekey() is unavailable
 * (e.g., string template accessors like `item["propName"]`).
 */
export function normalizePropertyName(name: string): string {
  return camelCase(name, CASE_OPTIONS);
}
```

**Changes:**

```tsx
// Deserializer (json-deserializer.tsx)
const normalizedName = normalizePropertyName(prop.name);
return <ObjectProperty name={normalizedName} value={wrapped} />;

// Serializer (json-serializer.tsx)
const normalizedName = normalizePropertyName(prop.name);
const accessor = `item["${normalizedName}"]`;
```

**Pros:**

- Consistent approach for both ObjectProperty names and string accessors
- Single utility function — easy to audit and test
- Works in all contexts (JSX props, string templates, helper functions)
- Can be unit tested independently: `normalizePropertyName("Code") === "code"`

**Cons:**

- Manually reimplements the name policy's camelCase logic — must stay in sync
- If the name policy adds special cases (e.g., reserved word handling for properties), this function must be updated too
- Doesn't use Alloy's symbol system, so won't detect naming conflicts
- If Alloy's `InterfaceMember` ever uses a different naming kind or custom policy, this could drift

### Approach C: Use Alloy's Name Resolution System

Instead of normalizing names manually, use Alloy's `resolveSymbolName()` or `useNamePolicy()` hooks to ask the framework what name a property _would_ get.

**Concept:**

```tsx
const policy = useTSNamePolicy();
const resolvedName = policy.getName("interface-member", prop.name);
const accessor = `item["${resolvedName}"]`;
```

**Pros:**

- Guaranteed to match Alloy's actual name resolution
- Handles all edge cases (reserved words, conflicts) automatically
- Future-proof — any name policy changes are automatically picked up

**Cons:**

- Alloy's `useTSNamePolicy()` is a context hook — may not be available in all utility functions
- The `getName()` or equivalent API may not exist or may require a symbol context
- Property naming depends on context (the containing interface) — calling the policy in isolation may not produce the same result as within an interface context
- High coupling to Alloy internals that could change

### Recommendation

**Approach A (namekey + normalizePropertyName utility)** is recommended:

1. **Deserializer ObjectProperty**: Use `namekey(prop.name)` — this is the canonical Alloy pattern and guarantees the name matches what `InterfaceMember` produces
2. **Serializer string accessors**: Use `normalizePropertyName(prop.name)` — a utility that mirrors the name policy's camelCase transformation
3. **Test**: Verify that `normalizePropertyName("Code") === "code"` and matches `InterfaceMember` output

This hybrid approach uses Alloy's built-in mechanism where possible (JSX props) and a simple utility where string templates require it.

### Test Strategy

1. Add a test with PascalCase property names (e.g., `Code`, `Message`) and verify the deserializer uses camelCase keys
2. Add a test verifying the serializer reads from camelCase accessors
3. Verify existing tests still pass — most TypeSpec inputs already use camelCase, so most tests are unaffected
4. Add an XML test with `@Xml.name("PascalCase")` to verify cross-format consistency

### Files to Change

- `src/utils/name-policy.ts` — add `normalizePropertyName()` export
- `src/components/serialization/json-deserializer.tsx` — line 157 + flatten helper property keys
- `src/components/serialization/json-serializer.tsx` — line 157 + flatten helper accessors
- `src/components/serialization/xml-object-serializer.tsx` — line 70 accessor
- `src/components/serialization/xml-object-deserializer.tsx` — line 86 `propertyName` metadata

---

## Issue 3: XML object serializer doesn't handle optional nested properties — Design Review

### Problem Statement

The XML object serializer unconditionally calls nested serializers without null checks:

```typescript
// Current (broken)
export function blobServicePropertiesXmlObjectSerializer(
  item: BlobServiceProperties,
): XmlSerializedObject {
  return {
    Logging: loggingXmlObjectSerializer(item["logging"]),  // ← crashes if item["logging"] is undefined
    ...
  };
}
```

When `item["logging"]` is `undefined` (because the property is optional in the TypeSpec model), calling `loggingXmlObjectSerializer(undefined)` throws at runtime.

### Architecture Context

**JSON serializer** has `wrapWithNullCheck()` (json-serializer.tsx line 551-564):

```typescript
function wrapWithNullCheck(expression, accessor, property, options): Children {
  const isNullable = property.type.kind === "nullable" || property.optional;
  if (isNullable && needsTransformation(property.type, options)) {
    return code`!${accessor} ? ${accessor} : ${expression}`;
  }
  return expression;
}
```

This generates `!item["logging"] ? item["logging"] : loggingSerializer(item["logging"])`.

**XML object serializer** has NO equivalent (xml-object-serializer.tsx lines 66-77):

```tsx
{
  (prop) => {
    const accessor = `item["${prop.name}"]`;
    const valueExpr = getXmlObjectSerializationExpression(
      prop.type,
      accessor,
      prop,
    );
    return <ObjectProperty name={xmlName} value={valueExpr} />;
  };
}
```

It calls `getXmlObjectSerializationExpression` directly without any null guard.

**Legacy emitter behavior**: The legacy emitter DOES add null checks:

```typescript
// From buildXmlSerializerFunction.ts:
valueExpr = `item["${cleanPropertyName}"] !== undefined
  ? ${nestedSerializer}(item["${cleanPropertyName}"]) : undefined`;
```

**Scope of the issue**: Only `XmlObjectSerializer` is affected. The other XML components:

- `XmlSerializer` (root) — uses metadata-driven `serializeToXml()` runtime helper, which handles null at runtime
- `XmlObjectDeserializer` — uses metadata-driven `deserializeXmlObject()`, handles null at runtime
- `XmlDeserializer` (root) — same runtime approach

### Approach A: Add `wrapWithNullCheck` to XmlObjectSerializer (Recommended)

Add a null guard function mirroring the JSON serializer pattern.

**Changes** (xml-object-serializer.tsx lines 66-77):

```tsx
{
  (prop) => {
    const xmlOpts = prop.serializationOptions?.xml;
    const xmlName = xmlOpts?.name ?? prop.serializedName;
    const accessor = `item["${prop.name}"]`;
    let valueExpr = getXmlObjectSerializationExpression(
      prop.type,
      accessor,
      prop,
    );
    valueExpr = wrapWithXmlNullCheck(valueExpr, accessor, prop);
    return <ObjectProperty name={xmlName} value={valueExpr} />;
  };
}
```

**New function** in xml-object-serializer.tsx:

```typescript
function wrapWithXmlNullCheck(
  expression: Children,
  accessor: string,
  property: SdkModelPropertyType,
): Children {
  const isNullable = property.type.kind === "nullable" || property.optional;
  const needsWrap = isNullable && xmlNeedsTransformation(property.type);
  if (needsWrap) {
    return code`!${accessor} ? ${accessor} : ${expression}`;
  }
  return expression;
}

function xmlNeedsTransformation(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      return true;
    case "array":
      return true;
    case "utcDateTime":
    case "plainDate":
      return true;
    case "bytes":
      return true;
    case "nullable":
      return xmlNeedsTransformation(type.type);
    default:
      return false;
  }
}
```

**Pros:**

- Direct fix, minimal code change (~20 lines added)
- Mirrors the JSON serializer's pattern exactly — consistent approach
- Matches legacy emitter behavior
- Self-contained — doesn't affect any other component

**Cons:**

- Duplicates the `wrapWithNullCheck` pattern (JSON serializer has its own copy)
- `xmlNeedsTransformation` is another predicate that could drift from the actual transformation logic

### Approach B: Extract Shared `wrapWithNullCheck` Utility

Extract the null check logic into a shared utility used by both JSON and XML serializers.

**New utility** (e.g., `src/utils/serialization-utils.ts`):

```typescript
import { Children, code } from "@alloy-js/core";
import type {
  SdkModelPropertyType,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";

export function wrapWithNullCheck(
  expression: Children,
  accessor: string,
  property: SdkModelPropertyType,
  needsTransform: (type: SdkType) => boolean,
): Children {
  const isNullable = property.type.kind === "nullable" || property.optional;
  if (isNullable && needsTransform(property.type)) {
    return code`!${accessor} ? ${accessor} : ${expression}`;
  }
  return expression;
}
```

Then each serializer passes its own `needsTransform` predicate:

```tsx
// JSON serializer
wrapWithNullCheck(expr, accessor, prop, (t) => needsTransformation(t, serOpts));

// XML object serializer
wrapWithNullCheck(expr, accessor, prop, xmlNeedsTransformation);
```

**Pros:**

- DRY — single implementation of the null-check pattern
- Enforces consistent pattern across all serializer types
- Easy to add for any future serializer format

**Cons:**

- Introduces a new shared utility file — adds a layer of indirection
- The JSON serializer's existing `wrapWithNullCheck` also applies to `wrapWithArrayEncoding` — refactoring may touch more code than needed
- The JSON and XML transformation predicates differ (JSON uses `needsTransformation` with options; XML has its own simpler logic), so the shared function needs a callback parameter

### Recommendation

**Approach A (local wrapWithNullCheck)** is recommended because:

1. The fix is self-contained and minimal — only `xml-object-serializer.tsx` changes
2. The JSON serializer's `wrapWithNullCheck` has additional coupling (SerializationOptions, `needsTransformation` with options) that makes extraction complex
3. The XML transformation predicate is simpler than JSON's — a local function is clearer
4. The risk of drift is low since both patterns are simple `!accessor ? accessor : expression`
5. Future refactoring to a shared utility can happen separately if a third format is added

### Test Strategy

1. Add a test with an optional nested model property in XML — verify `!item["propName"] ? item["propName"] : nestedSerializer(item["propName"])` output
2. Add a test with a nullable nested model property
3. Add a test with an optional array-of-models property
4. Verify existing XML tests still pass

### Files to Change

- `src/components/serialization/xml-object-serializer.tsx` — add null check wrapping (~20 lines)

---

## Issue 4: `DeleteOptionalParams` missing `version` property — Design Review

### Problem Statement

A TypeSpec operation using `@apiVersion @header("x-ms-version") version: string` doesn't produce a `version` property in `DeleteOptionalParams`.

### Architecture Context — Updated Analysis

The initial analysis said this was "by design." After deeper investigation, the situation is more nuanced — there are **two distinct sub-issues**:

**Sub-issue 4a: `version` excluded from OptionalParams — By Design ✅**

The `@apiVersion` decorator causes TCGC to set `isApiVersionParam = true`, which `isOptionalParameter()` (operation-options.tsx line 162) intentionally excludes from operation options. The API version is managed at the client level:

- Client constructor accepts the version
- Stored on `context.apiVersion`
- Injected into every request automatically

This is correct behavior and matches the legacy emitter.

**Sub-issue 4b: Header-based API version injection — BUG 🐛**

When the API version is a **header** parameter (`@header("x-ms-version")`), the send function's `getHeaderAccessor()` does NOT correctly handle it:

```typescript
// send-operation.tsx getHeaderAccessor (line 721-747)
function getHeaderAccessor(header, method) {
  const corresponding = header.correspondingMethodParams[0];
  if (corresponding.kind === "method") {
    // No special handling for onClient / isApiVersionParam!
    const isRequired = isRequiredSignatureParameter(corresponding);
    // isRequired returns false (isApiVersionParam → false at line 212)
    const accessor = `${optionsName}?.${corresponding.name}`;
    // ← BUG: generates "options?.version" but version isn't in options!
    return applyClientDefault(accessor, corresponding);
  }
}
```

Compare with `getParameterAccessor` for path/query params (line 366-386), which correctly handles this:

```typescript
function getParameterAccessor(httpParam, method) {
  const correspondingParam = httpParam.correspondingMethodParams[0];
  if (correspondingParam.kind === "method" && correspondingParam.onClient) {
    if (correspondingParam.isApiVersionParam) {
      return "context.apiVersion"; // ← Correct: uses client context
    }
    return `context["${correspondingParam.name}"]`;
  }
}
```

The `getHeaderAccessor` is missing the `onClient` / `isApiVersionParam` check entirely, causing header-based API versions to reference a nonexistent options property instead of `context.apiVersion`.

### Approach A: Add `onClient` Handling to `getHeaderAccessor` (Recommended)

Mirror the `getParameterAccessor` pattern in `getHeaderAccessor`.

**Changes** (send-operation.tsx, inside `getHeaderAccessor`):

```typescript
function getHeaderAccessor(header, method) {
  const corresponding = header.correspondingMethodParams[0];
  if (!corresponding) return `"${header.serializedName}"`;

  if (corresponding.kind === "property") {
    return resolveModelPropertyAccessor(header, method);
  }

  if (corresponding.kind === "method") {
    // NEW: Handle client-level params (apiVersion, custom client params)
    if (corresponding.onClient) {
      if (corresponding.isApiVersionParam) {
        const defaultValue = corresponding.clientDefaultValue;
        if (defaultValue !== undefined) {
          return `context.apiVersion ?? "${defaultValue}"`;
        }
        return "context.apiVersion";
      }
      return `context["${corresponding.name}"]`;
    }

    if (isConstantType(corresponding.type)) {
      return getConstantLiteral(corresponding.type);
    }
    const isRequired = isRequiredSignatureParameter(corresponding);
    const optionsName = getOptionsParamName(method);
    if (isRequired) return getEscapedParameterName(corresponding.name);
    const accessor = `${optionsName}?.${corresponding.name}`;
    return applyClientDefault(accessor, corresponding);
  }

  return `"${header.serializedName}"`;
}
```

**Pros:**

- Direct fix for the bug — header-based API version now correctly uses `context.apiVersion`
- Mirrors the existing pattern in `getParameterAccessor` — consistent behavior across parameter kinds
- Also fixes non-apiVersion `onClient` header parameters (if any exist)
- Small, surgical change in one function

**Cons:**

- Duplicates the `onClient`/`isApiVersionParam` logic from `getParameterAccessor`
- If the apiVersion accessor pattern changes (e.g., different fallback format), two places need updating

### Approach B: Extract Shared `getClientLevelAccessor` Utility

Factor out the client-level parameter accessor logic into a shared function used by both `getParameterAccessor` and `getHeaderAccessor`.

**New utility:**

```typescript
function getClientLevelAccessor(param: SdkMethodParameter): string | undefined {
  if (!param.onClient) return undefined;
  if (param.isApiVersionParam) {
    const defaultValue = param.clientDefaultValue;
    if (defaultValue !== undefined) {
      return `context.apiVersion ?? "${defaultValue}"`;
    }
    return "context.apiVersion";
  }
  return `context["${param.name}"]`;
}
```

**Usage in both functions:**

```typescript
function getHeaderAccessor(header, method) {
  const corresponding = header.correspondingMethodParams[0];
  if (corresponding.kind === "method") {
    const clientAccessor = getClientLevelAccessor(corresponding);
    if (clientAccessor) return clientAccessor;
    // ... rest of existing logic
  }
}

function getParameterAccessor(httpParam, method) {
  const correspondingParam = httpParam.correspondingMethodParams[0];
  if (correspondingParam.kind === "method") {
    const clientAccessor = getClientLevelAccessor(correspondingParam);
    if (clientAccessor) return clientAccessor;
    // ... rest of existing logic
  }
}
```

**Pros:**

- DRY — single definition of client-level accessor logic
- Any future parameter kinds (e.g., cookies with client-level params) automatically benefit
- Easier to maintain — one place to update if the pattern changes

**Cons:**

- Slightly more refactoring — modifying both `getParameterAccessor` and `getHeaderAccessor`
- `getParameterAccessor` currently checks `correspondingParam.kind === "method" && correspondingParam.onClient` before the apiVersion check — the extraction needs to preserve this flow
- Minor risk of breaking existing path/query accessor behavior during refactoring

### Recommendation

**Approach A (inline fix in getHeaderAccessor)** is recommended because:

1. It's a surgical fix — only `getHeaderAccessor` changes, `getParameterAccessor` stays untouched
2. The duplicated logic is small (~10 lines) and unlikely to diverge
3. Lower risk — existing path/query handling remains unchanged
4. The pattern is directly visible in the function — no indirection to follow
5. Approach B can be done later as a cleanup refactor if desired

### Test Strategy

1. Add a test with `@apiVersion @header("x-ms-version") version: string` — verify the send function generates `"x-ms-version": context.apiVersion` in the headers object
2. Add a test with `@apiVersion @header("x-ms-version") version: string` with a default value — verify `context.apiVersion ?? "defaultValue"`
3. Verify existing send operation tests pass (no regression in query/path API version handling)

### Files to Change

- `src/components/send-operation.tsx` — `getHeaderAccessor` function (~10 lines added)

---

## Todos

### todo-1: Fix array unresolved refkeys

- File: `src/components/serialization/json-deserializer.tsx`
- Recommended: Approach A — create unified `typeHasDeserializerDeclaration` predicate
- Incremental: Wire predicate only into `getDeserializationExpression` guards initially

### todo-2: Fix deserializer/serializer property key casing

- Files: `json-deserializer.tsx` (line 157), `json-serializer.tsx` (line 157), `xml-object-serializer.tsx` (line 70), `xml-object-deserializer.tsx` (line 86)
- Recommended: Approach A — `namekey()` for ObjectProperty names + `normalizePropertyName()` utility for string accessors
- Add `normalizePropertyName()` to `src/utils/name-policy.ts`

### todo-3: Add null guard for optional XML nested serializers

- File: `src/components/serialization/xml-object-serializer.tsx`
- Recommended: Approach A — local `wrapWithXmlNullCheck` + `xmlNeedsTransformation` predicate
- ~20 lines added

### todo-4: Fix header-based API version accessor in send function

- File: `src/components/send-operation.tsx` — `getHeaderAccessor` function
- Recommended: Approach A — add `onClient` / `isApiVersionParam` handling mirroring `getParameterAccessor`
- ~10 lines added
- Note: The `version` missing from `DeleteOptionalParams` is **by design** (API version is client-level)
