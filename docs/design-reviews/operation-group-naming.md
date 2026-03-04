# Design Decision: Fully-Qualified Operation Group Interface Names

> **Date**: 2026-03-04
> **Status**: Implemented
> **Category**: E2E API Surface Audit — Category 5 (Operations Interface Changes)

---

## Context

The E2E API surface audit ([docs/e2e-api-surface-audit.md](../e2e-api-surface-audit.md), §5a) identified that 19 operation group interfaces from the `routes` spec were missing from the new emitter's public API. These interfaces (e.g., `PathParametersLabelExpansionExplodeOperations`) existed and were exported in the legacy emitter but not in the new emitter.

### Root Cause

Two problems combined:

**1. Name conflicts from short names.** `buildInterfaceName()` used only the TCGC client's leaf name (e.g., `Standard`). When multiple groups share the same leaf name at different hierarchy levels (e.g., `Standard` under `SimpleExpansion`, `PathExpansion`, `LabelExpansion`, etc.), Alloy's name conflict resolver appended arbitrary numbers:

```typescript
// New emitter (before fix) — numbered, non-deterministic
declare interface StandardOperations { ... }
declare interface StandardOperations_2 { ... }
declare interface StandardOperations_3 { ... }

// Legacy emitter — fully qualified, descriptive
export declare interface PathParametersSimpleExpansionStandardOperations { ... }
export declare interface PathParametersPathExpansionStandardOperations { ... }
export declare interface PathParametersLabelExpansionStandardOperations { ... }
```

**2. Missing exports.** The `<SourceFile>` for nested operation group files lacked the `export` prop, so Alloy did not re-export their declarations through the barrel file. The interfaces were internal (`declare interface`) rather than public (`export declare interface`).

### Relationship to Category 4

This issue is related to but distinct from Category 4 ([hierarchy-client.md](./hierarchy-client.md)):

- **Category 4** controls *whether* operation groups exist (the `hierarchy-client` option)
- **Category 5** controls *how* those groups are named and exported once they exist
- Category 5 only manifests for specs that opt into hierarchy (`hierarchy-client: true`, like `routes`)

## Approaches Evaluated

### Approach A: Fully-Qualified Names from Prefix Path (Recommended ✅)

Use the accumulated `prefixes` array in `OperationGroupInfo` (already computed by BFS traversal) to build fully-qualified interface and factory names, matching the legacy emitter's convention.

| Aspect | Assessment |
|--------|-----------|
| Legacy parity | Exact match — same interface names, all exported |
| Change scope | Small — 2 naming functions + 1 JSX prop |
| Name conflicts | Eliminated — fully-qualified names are unique by construction |
| Determinism | Names derived from structural path, not BFS/render order |

### Approach B: Parent-Prefix Names

Use only the parent client name as a prefix (e.g., `LabelExpansionStandardOperations`) instead of the full path.

| Aspect | Assessment |
|--------|-----------|
| Legacy parity | Partial — names shorter than legacy |
| Change scope | Small — similar to Approach A |
| Name conflicts | Reduced but not eliminated |
| Migration burden | Consumers must update operation group type imports |

### Decision: Approach A

**Approach A was chosen** because:

1. **Exact parity** — produces identical interface names and export visibility as legacy
2. **Zero conflicts** — fully-qualified names are unique by construction (each path through the tree is unique)
3. **Data already available** — the `prefixes` array already contains exactly the path segments needed
4. **Deterministic** — names derived from the structural path, not rendering order
5. **No migration burden** — consumers can use the same type names as the legacy emitter

## Implementation

### Naming Functions (`src/components/classical-operation-groups.tsx`)

`buildInterfaceName` and `buildFactoryName` now accept `OperationGroupInfo` (which includes the `prefixes` array) instead of the bare `SdkClientType`:

```
prefixes: ["pathParameters", "labelExpansion", "standard"]
  → PascalCase each: ["PathParameters", "LabelExpansion", "Standard"]
  → join + "Operations": "PathParametersLabelExpansionStandardOperations"
  → factory: "_getPathParametersLabelExpansionStandardOperations"
```

For single-level groups (e.g., `["widgets"]`), this produces the same names as before (`WidgetsOperations`, `_getWidgetsOperations`).

### Export Visibility

Added `export` prop to `<SourceFile>` in `ClassicalOperationGroupFile` so all operation group interfaces are re-exported through the barrel file chain.

### Files Changed

| File | Change |
|------|--------|
| `src/components/classical-operation-groups.tsx` | Updated `buildInterfaceName`, `buildFactoryName` to use prefixes; added `export` to `<SourceFile>` |
| `test/components/classical-operation-groups.test.tsx` | Updated assertions to match fully-qualified names |
