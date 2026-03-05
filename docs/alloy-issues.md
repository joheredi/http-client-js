# Alloy Framework Known Issues

This document tracks known bugs and limitations in the Alloy framework
(`@alloy-js/core`, `@alloy-js/typescript`) that affect this emitter. Each entry
includes a description, the root cause, and how the emitter works around it.

---

## ALLOY-001: Name conflict detection fails when name policy changes casing

**Affects:** `@alloy-js/core` — `SymbolTable.#deconflictNames`

**Symptom:** Two declarations with the same post-policy name (e.g., two
`FunctionDeclaration`s both resolving to `actionGroupDeserializer`) are **not**
detected as conflicting. The output contains duplicate identifiers, causing
TypeScript compilation errors (`TS2393: Duplicate function implementation`).

Interface declarations with the same name (e.g., `ActionGroup`) _are_ correctly
deconflicted (one becomes `ActionGroup_1`), because their PascalCase names are
unchanged by the name policy.

**Root cause:** In `SymbolTable` (`@alloy-js/core/src/symbols/symbol-table.ts`),
the `#deconflictNames` method stores post-policy names in `#namesToDeconflict`
(via `symbol.name`) but filters candidate symbols using the pre-policy name
(`sym.originalName`):

```ts
// symbol-table.ts — onAdd callback
this.#namesToDeconflict.add(symbol.name); // post-policy: "actionGroupDeserializer"

// symbol-table.ts — #deconflictNames
for (const name of this.#namesToDeconflict) {
  const conflictedSymbols = [...this].filter(
    (sym) => sym.originalName === name, // pre-policy: "ActionGroupDeserializer" ≠ "actionGroupDeserializer"
  );
}
```

When the name policy changes casing (e.g., PascalCase → camelCase for
functions), the comparison always fails and conflicts go undetected.

**Workaround:** For **function declarations** (serializers, deserializers, etc.),
pass names to declaration components already in their final camelCase form,
wrapped in `namekey(..., { ignoreNamePolicy: true })`. This ensures
`originalName === name` (both are post-casing), so Alloy's conflict resolver
detects duplicates. See `src/utils/model-name.ts` — `toCamelCaseNamekey()`
helper.

**Not yet worked around for enum members:** Enum member names (e.g., `_10` from
values `10` and `1.0`) go through `normalizePascalCaseName` in the name policy,
which can also produce collisions. The legacy emitter also produces these
duplicates, so the emitter currently matches legacy behavior. A future
workaround could pre-normalize enum member names similarly.
