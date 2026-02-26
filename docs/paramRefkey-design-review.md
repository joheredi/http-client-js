# Design Review: Adopting `paramRefkey` for Parameter Reference Safety

> **Status:** Design review — comparing approaches for improving function parameter reference safety  
> **Context:** Flight-instructor uses a `paramRefkey` utility to create symbolic references to function parameters. http-client-js currently uses hardcoded string literals. This document evaluates adoption approaches.

---

## Background

### Technical Facts Discovered

1. **Alloy natively supports `refkey` on `ParameterDescriptor`** — parameters with refkeys are registered as symbols in the function's scope (confirmed in `FunctionBase.tsx:208-224`)
2. **Same-scope refkey references resolve to just the parameter name** — no import generated (confirmed in `resolution.test.ts:46-65`)
3. **Name policy IS applied to parameter names** — reserved words get `Param` suffix (e.g., `type` → `typeParam`). The refkey tracks the renamed name automatically.
4. **Current code already handles name escaping** via `getEscapedParameterName()` — current risk of name mismatch is LOW but not zero
5. **`paramRefkey` in flight-instructor is purely a utility function** — no Alloy framework changes required to adopt it
6. **`memberRefkey` creates nested member access chains** — resolves symbols through the binder for `options.paramName` patterns

### Current Parameter Reference Patterns

Most parameter references in the codebase are **compound** (parameter + property access):

| Pattern Type | Example | Frequency |
|-------------|---------|-----------|
| **Compound (param.property)** | `context.apiVersion`, `result.body`, `item["propName"]`, `options?.param` | ~80% of all refs |
| **Simple (standalone param)** | `context, id, options` in call forwarding arguments | ~20% of all refs |

**Key insight:** A refkey on the parameter helps with BOTH patterns. For compound access, the refkey renders the parameter name and the property access is appended as a string suffix:

```tsx
// Simple: code`${contextKey}` → renders "context"
// Compound: code`${contextKey}.apiVersion` → renders "context.apiVersion"
// Bracket: code`${itemKey}["${prop.name}"]` → renders `item["propName"]`
```

---

## Approach A: Full Refkey Adoption (Flight-Instructor Aligned)

### Description

Create a `paramRefkey()` utility and systematically replace ALL hardcoded parameter name strings with refkeys. Every `ParameterDescriptor` gets a refkey. Every body reference uses that refkey.

### Implementation

```typescript
// src/utils/param-refkey.ts
import { refkey, memberRefkey, type Refkey } from "@alloy-js/core";

const paramRefkeyId = Symbol("paramRefkey");

export function paramRefkey(param: object, discriminator?: string): Refkey {
  return refkey(param, paramRefkeyId, discriminator);
}
```

### Example Migration — send-operation.tsx

```tsx
// BEFORE
function buildFunctionParameters(method) {
  return [
    { name: "context", type: runtimeLib.Client },
    ...requiredParams.map(p => ({ name: p.name, type: getTypeExpression(p.type) })),
    { name: getOptionsParamName(method), type: optionsType, default: "{ requestOptions: {} }" },
  ];
}

// Body references:
code`return context.path(${pathExpr}).${verb}({ ...${runtimeLib.opToReqParams}(${optionsName}) });`
//         ^^^^^^^ string                                                       ^^^^^^^^^^^ string

// AFTER
function buildFunctionParameters(method) {
  const contextKey = paramRefkey(method, "context");
  const optionsKey = paramRefkey(method, "options");
  const paramKeys = requiredParams.map(p => ({ param: p, key: paramRefkey(p) }));

  return {
    descriptors: [
      { name: "context", type: runtimeLib.Client, refkey: contextKey },
      ...paramKeys.map(({ param, key }) => ({
        name: param.name, type: getTypeExpression(param.type), refkey: key,
      })),
      { name: getOptionsParamName(method), type: optionsType, default: "{ requestOptions: {} }", refkey: optionsKey },
    ],
    contextKey,
    optionsKey,
    paramKeys,
  };
}

// Body references:
code`return ${contextKey}.path(${pathExpr}).${verb}({ ...${runtimeLib.opToReqParams}(${optionsKey}) });`
//         ^^^^^^^^^^^^ refkey                                                       ^^^^^^^^^^^^ refkey
```

### Example Migration — json-serializer.tsx

```tsx
// BEFORE
parameters={[{ name: "item", type: typeRefkey(model) }]}
// ...
const accessor = `item["${prop.name}"]`;
code`${prop.name}: ${getSerializationExpression(prop.type, accessor)}`

// AFTER
const itemKey = paramRefkey(model, "serializerItem");
parameters={[{ name: "item", type: typeRefkey(model), refkey: itemKey }]}
// ...
const accessor = code`${itemKey}["${prop.name}"]`;
code`${prop.name}: ${getSerializationExpression(prop.type, accessor)}`
```

### Example Migration — call forwarding (public-operation.tsx)

```tsx
// BEFORE
function buildCallArguments(method) {
  const args: string[] = ["context"];
  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param)) {
      args.push(getEscapedParameterName(param.name));
    }
  }
  args.push(optionsName);
  return args.join(", ");
}
// Used as: code`await ${sendRef}(${callArgs})`

// AFTER
function buildCallArguments(method, contextKey, paramKeys, optionsKey) {
  return [contextKey, ...paramKeys.map(pk => pk.key), optionsKey];
}
// Used as: code`await ${sendRef}(${callArgs})`
// Alloy renders the array as comma-separated values
```

### Pros

- ✅ **Full alignment with flight-instructor** — the canonical reference implementation
- ✅ **Maximum safety** — name policy changes, conflict resolution, or parameter renames auto-propagate
- ✅ **Catches bugs at render time** — referencing a non-existent parameter produces `<Unresolved Symbol>` instead of silently broken code
- ✅ **Self-documenting** — `${contextKey}` explicitly shows "this references the context parameter"
- ✅ **Eliminates `getEscapedParameterName()` calls** — Alloy handles the name policy automatically
- ✅ **Eliminates `.join(", ")` string building** for call arguments — Alloy renders refkey arrays natively
- ✅ **Leverages Alloy's native ParameterDescriptor.refkey** — proven, tested infrastructure

### Cons

- ❌ **Large refactoring scope** — ~50+ locations across ~15 files
- ❌ **Changes function signatures** — `buildFunctionParameters()` must return refkeys alongside descriptors, changing the API contract of many helper functions
- ❌ **Accessor string patterns need rethinking** — current helpers like `getParameterAccessor()` return strings; they'd need to return `Children` (code template results) instead
- ❌ **Risk of regressions** — touching so many code generation paths requires thorough testing
- ❌ **Some patterns don't map cleanly** — `getParameterAccessor()` has complex branching (API version defaults, client-level params, constant types) that would need careful refactoring

### Effort Estimate: **Large** (~15 files, ~50+ locations, helper function signature changes)

---

## Approach B: Targeted Adoption for Variable-Named Parameters Only

### Description

Create the `paramRefkey()` utility but only adopt it for parameters whose names are **dynamically determined or could conflict**: primarily the `options`/`optionalParams` parameter and `context`. Leave stable, fully-controlled parameters (`item`, `result`) as string literals.

### Implementation

Same utility as Approach A, but applied selectively.

### Migration Scope

| Parameter | Files | Migrate? | Rationale |
|-----------|-------|----------|-----------|
| `options`/`optionalParams` | send-operation, public-operation, classical-client, classical-operation-groups | **YES** | Name varies dynamically via `getOptionsParamName()` |
| `context` | send-operation, public-operation, classical-operation-groups | **YES** | Referenced ~15 times as string; could conflict with user-defined params |
| `item` | json-serializer, json-deserializer, polymorphic-*, xml-*, multipart | No | Fully controlled by us, never conflicts |
| `result` | deserialize-operation, deserialize-headers | No | Fully controlled, never conflicts |
| `credential` | classical-client, client-context | No | Low frequency, stable name |
| Required method params | send-operation, public-operation | **YES** | Forwarded in call arguments; eliminates `getEscapedParameterName()` |

### Example — Only options + context

```tsx
// send-operation.tsx
const contextKey = paramRefkey(method, "context");
const optionsKey = paramRefkey(method, "options");

// ParameterDescriptor
{ name: "context", type: runtimeLib.Client, refkey: contextKey }
{ name: getOptionsParamName(method), type: optionsType, refkey: optionsKey }

// Body:
code`return ${contextKey}.path(${pathExpr}).${verb}({ ...${runtimeLib.opToReqParams}(${optionsKey}) });`

// But serializers stay as-is:
const accessor = `item["${prop.name}"]`;  // unchanged
```

### Pros

- ✅ **Addresses actual risk areas** — the options parameter name DOES vary dynamically
- ✅ **Moderate effort** — ~6 files, ~25 locations
- ✅ **Lower regression risk** — fewer files touched
- ✅ **Eliminates `getOptionsParamName()` duplication** — the name is in one place (ParameterDescriptor), refkey handles the rest
- ✅ **Partially aligned with flight-instructor** — adopts the pattern for the same high-risk cases

### Cons

- ❌ **Inconsistent** — some parameters use refkeys, others use strings. Developers must know which is which.
- ❌ **Doesn't fully eliminate `getEscapedParameterName()`** — still needed for `item` and `result` references
- ❌ **Half-measure** — if the team decides to go full refkey later, this is throwaway work that was done twice
- ❌ **Serializer accessor patterns unchanged** — misses the opportunity to make `item["propName"]` safer

### Effort Estimate: **Medium** (~6 files, ~25 locations)

---

## Approach C: Centralized Name Constants (No Refkeys)

### Description

Instead of Alloy refkeys, extract parameter name strings into named constants co-located with parameter declarations. Body code references the constant instead of scattered string literals.

### Implementation

```typescript
// In each component that generates a function:
const PARAM_CONTEXT = "context";
const PARAM_OPTIONS = getOptionsParamName(method);

// ParameterDescriptor
{ name: PARAM_CONTEXT, type: runtimeLib.Client }
{ name: PARAM_OPTIONS, type: optionsType }

// Body:
code`return ${PARAM_CONTEXT}.path(${pathExpr}).${verb}({ ...${runtimeLib.opToReqParams}(${PARAM_OPTIONS}) });`
```

### Pros

- ✅ **Minimal effort** — extract constants from existing string literals
- ✅ **Zero framework dependency** — no need to understand refkeys or memberRefkey
- ✅ **Easy to understand** — any developer can follow the pattern
- ✅ **Works with all existing patterns** — bracket notation, optional chaining, template strings all work unchanged
- ✅ **Low regression risk** — mechanical extraction, semantically identical

### Cons

- ❌ **Still strings under the hood** — Alloy can't validate that the constant matches a declared parameter
- ❌ **No `<Unresolved Symbol>` safety net** — a typo in the constant silently generates broken code
- ❌ **Name policy mismatch still possible** — if name policy transforms the parameter name at render time, the constant string won't match
- ❌ **Not aligned with flight-instructor** — diverges further from the canonical pattern
- ❌ **Doesn't leverage Alloy's ParameterDescriptor.refkey** — ignores proven framework capability
- ❌ **Doesn't eliminate `getEscapedParameterName()`** — still needed everywhere

### Effort Estimate: **Small** (~15 files, mechanical extraction)

---

## Comparison Matrix

| Criterion | Approach A (Full Refkey) | Approach B (Targeted Refkey) | Approach C (Constants) |
|-----------|------------------------|----------------------------|----------------------|
| **Safety against name policy changes** | ✅ Full | ⚠️ Partial (high-risk only) | ❌ None |
| **Catches unresolved references** | ✅ Yes (`<Unresolved Symbol>`) | ⚠️ Partial | ❌ No |
| **Flight-instructor alignment** | ✅ Full | ⚠️ Partial | ❌ None |
| **Eliminates `getEscapedParameterName()`** | ✅ Fully | ⚠️ Partially | ❌ No |
| **Eliminates `.join(", ")` arg building** | ✅ Yes | ⚠️ Partially | ❌ No |
| **Refactoring effort** | ❌ Large (~50+ locations) | ⚠️ Medium (~25 locations) | ✅ Small (mechanical) |
| **Regression risk** | ❌ High (many code paths) | ⚠️ Moderate | ✅ Low |
| **Consistency** | ✅ Uniform pattern | ❌ Mixed patterns | ⚠️ Uniform but weak |
| **Developer onboarding** | ⚠️ Must learn refkey pattern | ⚠️ Must learn which params use refkeys | ✅ Easy — just constants |
| **Future-proofing** | ✅ Excellent | ⚠️ Good | ❌ Poor |

---

## Recommendation: **Approach A (Full Refkey Adoption)** with phased rollout

### Rationale

1. **Alloy already supports this natively.** `ParameterDescriptor.refkey` exists, is tested, and works. Not using it means we're ignoring a purpose-built safety feature.

2. **Flight-instructor (highest-priority reference) uses this pattern consistently.** Diverging from the canonical implementation creates knowledge fragmentation and makes it harder for contributors who work across both codebases.

3. **The effort is proportional to the codebase lifetime.** This is a rewrite project that will be maintained long-term. Investing in structural safety now prevents classes of bugs that are hard to diagnose in generated code.

4. **Approach B's inconsistency is worse than either extreme.** A codebase where "some params use refkeys and others don't" is harder to maintain than one with a uniform pattern. Developers would need to constantly check which style applies.

5. **Approach C is a half-measure that doesn't leverage the framework.** If we're going to touch these files anyway, we should get the full benefit.

### Phased Rollout Plan

**Phase 1 — Foundation**
- Create `src/utils/param-refkey.ts` utility
- Add to `src/utils/index.ts` exports
- Write unit tests for the utility

**Phase 2 — High-Risk Parameters (options + context)**
- Migrate `send-operation.tsx` (context + options params)
- Migrate `public-operation.tsx` (context + options forwarding)
- Migrate `classical-operation-groups.tsx` (context + method forwarding)
- This phase eliminates `getOptionsParamName()` duplication and `getEscapedParameterName()` for forwarded args

**Phase 3 — Serialization Parameters (item)**
- Migrate `json-serializer.tsx` / `json-deserializer.tsx`
- Migrate `json-polymorphic-serializer.tsx` / `json-polymorphic-deserializer.tsx`
- Migrate `xml-object-serializer.tsx` / `multipart-serializer.tsx`
- Requires changing accessor string building to use `code` templates with refkeys

**Phase 4 — Remaining Parameters (result, credential, factory params)**
- Migrate `deserialize-operation.tsx` (result param)
- Migrate `deserialize-headers.tsx` (result param)
- Migrate `classical-client.tsx` (constructor params)
- Migrate `client-context.tsx` (factory params)

**Phase 5 — Cleanup**
- Remove `getEscapedParameterName()` if no longer needed
- Remove `getOptionsParamName()` string-based approach if fully replaced
- Update documentation and alloy-guide-final.md

### Key Design Decisions

1. **Accessor building changes from `string` to `Children`.** Functions like `getParameterAccessor()` currently return `string`. They should return `Children` (which `code` templates produce). This is a breaking API change for helper functions but aligns with Alloy's data model.

2. **Call argument forwarding uses refkey arrays.** Instead of `args.push("context"); args.join(", ")`, use `[contextKey, ...paramKeys, optionsKey]` passed to a `code` template. Alloy renders arrays as comma-separated values.

3. **The `paramRefkey()` utility is simpler than flight-instructor's.** We don't need the options-bag `memberRefkey` pattern because our optional parameters are always accessed via the options parameter name + optional chaining (e.g., `options?.param`), not via Alloy member access resolution. The utility just creates a discriminated refkey for the parameter.

4. **Property access remains string-based.** `${contextKey}.apiVersion` and `${itemKey}["${prop.name}"]` use refkey for the base parameter but string for the property. This is correct — properties aren't declared Alloy symbols.
