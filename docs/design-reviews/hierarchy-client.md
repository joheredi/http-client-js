# Design Decision: `hierarchy-client` Emitter Option

> **Date**: 2026-03-04
> **Status**: Implemented
> **Category**: E2E API Surface Audit — Category 4 (Client Methods Moved to Sub-Client Accessors)

---

## Context

The E2E API surface audit ([docs/e2e-api-surface-audit.md](./e2e-api-surface-audit.md), §4) identified that 3 specs (`versioning/added`, `serialization/encoded-name/json`, `versioning/renamedFrom`) produce different client API surfaces in the new emitter vs. the legacy emitter:

```typescript
// Legacy (flat) — operations directly on root client
client.v2InInterface(body, options);
client.send(body);
client.newOpInNewInterface(body);

// New (hierarchical) — operations on sub-client accessors
client.interfaceV2.v2InInterface(body, options);
client.property.send(body);
client.newInterface.newOpInNewInterface(body);
```

## Root Cause

The legacy emitter has a `hierarchy-client` boolean option. In its test suite, **35 out of 36** comparable specs set `hierarchy-client: false`, which causes the legacy to flatten TypeSpec `interface` block operations onto the root client. Only the `routes` spec explicitly sets `hierarchy-client: true` to preserve deep nesting.

The new emitter had no equivalent option — it always preserved the TCGC client hierarchy, creating sub-client accessors for all child clients.

## Approaches Evaluated

### Approach A: Pre-Process Hierarchy (Recommended ✅)

Flatten the TCGC `SdkClientType` tree **before rendering** by moving children's methods to the root client and removing children. All downstream Alloy components work unchanged.

| Aspect | Assessment |
|--------|-----------|
| Change scope | 1 utility function + emitter option wiring |
| Consistency | Guaranteed — all components see the same flat data |
| Component changes | Zero |
| Testing surface | Minimal — one utility to test |

### Approach B: Component-Level Conditional Rendering

Each rendering component (`classical-client.tsx`, `operation-files.tsx`, `classical-operation-groups.tsx`, `operation-options-files.tsx`) checks the `hierarchy-client` option and conditionally flattens its output.

| Aspect | Assessment |
|--------|-----------|
| Change scope | 4–5 components + emitter option wiring |
| Consistency | Risky — all components must agree on flattening |
| Component changes | Significant — each needs branching logic |
| Testing surface | Large — each component needs both-mode tests |

### Decision: Approach A

**Approach A was chosen** because:

1. **Single transformation point** — one function, one place to test and debug
2. **Zero component changes** — existing rendering logic already handles flat clients correctly
3. **Consistency guarantee** — impossible for components to disagree on hierarchy shape
4. **Legacy precedent** — the legacy emitter uses the same pattern (`getMethodHierarchiesMap` pre-processes before rendering)
5. **Future-proof** — new components don't need to know about `hierarchy-client`

## Implementation

### New Emitter Option

```yaml
# tspconfig.yaml
options:
  http-client-js:
    hierarchy-client: false  # default — flatten children onto root client
    # hierarchy-client: true  # preserve sub-client hierarchy
```

- **Type**: `boolean` (optional)
- **Default**: `false` — matches legacy behavior (35/36 specs)
- **Location**: `src/lib.ts` (schema), `src/context/emitter-options-context.tsx` (runtime)

### Flattening Logic (`src/utils/flatten-clients.ts`)

```
flattenClientHierarchy(clients) → for each root client:
  1. Collect all methods from root + all descendants (BFS)
  2. Check for name collisions
  3. If no collisions → return cloned client with all methods, no children
  4. If collisions → preserve original hierarchy (safety fallback)
```

**Name collision safety**: If two child clients have identically-named operations (e.g., both `Container` and `Blob` have `delete`), flattening would produce duplicate function declarations. The utility detects this and preserves the hierarchy for that client. This handles real-world specs like Azure Storage where multiple interfaces share operation names.

### Wiring (`src/emitter.tsx`)

Flattening is applied in `$onEmit` after client renames and before the Alloy render tree:

```
$onEmit:
  1. createSdkContext()
  2. applyClientRenames()           — title map renames
  3. flattenClientHierarchy()       — NEW: flatten when hierarchy-client is false
  4. Render JSX tree with flattened clients
```

### Files Changed

| File | Change |
|------|--------|
| `src/lib.ts` | Added `hierarchy-client` to options schema |
| `src/context/emitter-options-context.tsx` | Added `hierarchyClient` to `EmitterOptionsValue` |
| `src/utils/flatten-clients.ts` | **New** — flattening utility |
| `src/emitter.tsx` | Wire flattening before render; import and pass option |
| `test/e2e/http/versioning/added/main.test.ts` | Updated to use flat access |
| `test/e2e/http/versioning/renamedFrom/main.test.ts` | Updated to use flat access |
| `test/e2e/http/serialization/encoded-name/json/main.test.ts` | Updated to use flat access |

## Migration Guide Notes

For consumers migrating from the legacy emitter:

- **No action needed for most specs** — the default `hierarchy-client: false` matches legacy behavior.
- **Specs with deep operation group nesting** (like `routes`) should set `hierarchy-client: true` in their tspconfig.yaml to preserve the sub-client hierarchy.
- **Name collision safety** — even with `hierarchy-client: false`, specs where flattening would cause duplicate function names automatically preserve their hierarchy.
