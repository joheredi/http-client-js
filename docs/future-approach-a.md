# Future Proposal: Remove `flattenClientHierarchy()` (Approach A)

## Summary

This document proposes a future simplification of the emitter's client
hierarchy handling: remove `flattenClientHierarchy()` and the
`enable-operation-group` option entirely, trusting TCGC to provide the
correct hierarchy unconditionally.

This is NOT a current action item — the emitter currently uses Approach C
(dual-option legacy parity). This document captures the rationale for a
future migration once the team is ready to accept the minor behavioral
differences.

---

## Current State (Approach C)

The emitter replicates the legacy `autorest.typescript` dual-option system:

- **`hierarchy-client`** (default: `false`) — controls nesting depth
- **`enable-operation-group`** (default: auto-detect via collision detection)
  — controls whether operation groups exist

When `hierarchy-client: false` AND `enable-operation-group: false`, all
child operations are flattened onto the root client.

This requires per-spec `enable-operation-group: true` overrides in
`eng/scripts/emit-e2e.ts` for specs that need operation groups but whose
method names don't collide.

---

## Proposed Future State (Approach A)

Delete `src/utils/flatten-clients.ts` and remove:

- The `flattenClientHierarchy()` function
- The `detectNameConflicts()` function
- The `enable-operation-group` emitter option
- All per-spec `enable-operation-group` overrides in `emit-e2e.ts`
- The flatten call in `src/emitter.tsx`

TCGC's hierarchy is preserved unconditionally. The `hierarchy-client`
option becomes a no-op (or is removed).

### Changes: ~15 lines deleted, 0 added

---

## Why This Is Better

### 1. Eliminates Accidental Correctness

The current collision detection (`detectNameConflicts`) is an unreliable
proxy. It preserves groups only when method names happen to collide
(e.g., `type/array` has `get`/`put` in 14 interfaces). Specs with unique
names across groups (e.g., `encode/array` with 12 unique operations) are
not protected — they need explicit `enable-operation-group: true`
overrides.

### 2. Matches Legacy Default

The legacy emitter defaults `hierarchy-client` to `true`, which preserves
the full TCGC hierarchy. The new emitter's default of `false` was a
misunderstanding. Removing flatten effectively makes the new emitter match
the legacy default behavior.

### 3. Reduces Maintenance Burden

The `SPEC_OPTIONS` map in `emit-e2e.ts` currently has 30+ entries for
`enable-operation-group: true`. Every new spec with operation groups needs
a new entry. Approach A eliminates all of them.

### 4. TCGC Is the Source of Truth

TCGC creates children from TypeSpec interfaces, namespaces, and
`@operationGroup` decorators. The emitter should trust this classification
rather than reimplementing detection logic. If TCGC's classification
changes, the emitter automatically adapts.

### 5. Simpler Mental Model

Developers don't need to understand two interacting options. The generated
client always reflects the TypeSpec structure.

---

## Impact: 4 Specs Would Change

Removing flatten affects **only 4 versioning specs** that currently produce
flat methods but would gain operation groups:

| Spec                           | Current Output                     | After Approach A                                |
| ------------------------------ | ---------------------------------- | ----------------------------------------------- |
| `versioning/added`             | `client.v2InInterface(body)`       | `client.interfaceV2.v2InInterface(body)`        |
| `versioning/renamedFrom`       | `client.newOpInNewInterface(body)` | `client.newInterface.newOpInNewInterface(body)` |
| `versioning/removed/v1`        | `client.v1InInterface(body)`       | `client.interfaceV1.v1InInterface(body)`        |
| `versioning/removed/v2preview` | `client.v1InInterface(body)`       | `client.interfaceV1.v1InInterface(body)`        |

All other 104 specs produce identical output.

### Why These 4 Differ

These specs have TypeSpec `interface` blocks (`InterfaceV2`, `NewInterface`,
`InterfaceV1`) with methods that don't collide with root-level methods.
Under Approach C, `detectNameConflicts()` returns `false` → groups
disabled → methods flattened. Under Approach A, TCGC's children are
preserved → groups created.

### Why the Grouped Form Is Acceptable

1. The grouped form preserves the TypeSpec author's intent (they explicitly
   defined an interface boundary)
2. The test updates are trivial (change `client.method()` to
   `client.group.method()`)
3. The grouped form is arguably more correct — `v2InInterface` was named
   with the interface suffix precisely because it was meant to be grouped

---

## Migration Path

1. Remove `src/utils/flatten-clients.ts`
2. Remove flatten import and call from `src/emitter.tsx`
3. Remove `enable-operation-group` from `src/lib.ts` and emitter options
4. Remove all `enable-operation-group` entries from `SPEC_OPTIONS` in
   `eng/scripts/emit-e2e.ts`
5. Update 4 versioning e2e tests to use grouped access
6. Run full test suite to verify
7. Optionally remove or deprecate `hierarchy-client` option

---

## Decision Record

This document was created during the investigation of 157 e2e test failures
caused by `flattenClientHierarchy()` destroying TCGC operation groups.
Three approaches were evaluated:

- **Approach A** (this proposal): Remove flatten entirely
- **Approach B**: Smart flatten based on `__raw.kind` — produced identical
  results to A (TCGC classifies all un-decorated interfaces as
  `SdkOperationGroup`)
- **Approach C** (implemented): Replicate legacy dual-option system

Approach C was chosen for immediate implementation to maintain exact legacy
parity. This document captures the case for migrating to Approach A in the
future.
