## Vitest picking up submodule tests

**Problem:** Running `pnpm test` without restricting test includes caused vitest to discover
and run thousands of tests from `submodules/`, leading to failures unrelated to this project.

**Fix:** Added `test.include: ["test/**/*.test.ts", "test/**/*.test.tsx"]` to `vitest.config.ts`
to scope test discovery to only the project's `test/` directory.

**Date:** 2026-02-24

## TCGC models only appear in sdkPackage.models when referenced by operations

**Problem:** Defining a model in TypeSpec without any operation referencing it causes TCGC
to prune it from `sdkPackage.models`. Tests that declare standalone models and expect them
in the context will see `models.length === 0`.

**Fix:** Always include an operation that references the model in test TypeSpec:
```tsp
model Foo { name: string; }
op getFoo(): Foo;            // ← Foo now appears in sdkPackage.models
```

**Date:** 2026-02-24

## Alloy JSX is lazy — throws occur during rendering, not construction

**Problem:** Testing `expect(() => <MyComponent />).toThrow()` doesn't work because
Alloy's JSX creates component descriptions lazily. Components aren't actually evaluated
until `renderTree()` is called (which `toRenderTo` does internally).

**Fix:** Use `renderToString()` from `@alloy-js/core/testing` to trigger evaluation:
```tsx
import { renderToString } from "@alloy-js/core/testing";
expect(() => renderToString(<MyComponent />)).toThrow("expected error");
```

**Date:** 2026-02-24

## EmitContext requires a `perf` property in tests

**Problem:** Creating an `EmitContext` manually for `createSdkContext()` in tests fails
because the `EmitContext` interface requires a `perf: PerfReporter` property.

**Fix:** Provide a no-op perf reporter:
```ts
const perf = {
  startTimer: (label: string) => ({ end: () => 0 }),
  time: <T,>(label: string, cb: () => T) => cb(),
  timeAsync: <T,>(label: string, cb: () => Promise<T>) => cb(),
  report: () => {},
};
```

**Date:** 2026-02-24

## SdkContext name collision with TCGC import

**Problem:** Naming our Alloy context `SdkContext` conflicts with the TCGC type
`SdkContext` from `@azure-tools/typespec-client-generator-core`. TypeScript reports
TS2395 "Individual declarations in merged declaration must be all exported or all local."

**Fix:** Import the TCGC type with an alias: `import type { SdkContext as TcgcSdkContext }`.

**Date:** 2026-02-24

## Alloy import ordering is NOT alphabetical by package name

**Problem:** When using `toRenderTo` with multi-package imports, assuming alphabetical
ordering by package name causes test failures. For example, expecting `@azure/abort-controller`
before `@azure/core-rest-pipeline` fails if the symbols are referenced in a different order.

**Fix:** Alloy orders imports based on the order externals are registered and symbols
are first encountered during the rendering pass. Write expected imports in the same
order as the package registration in `<Output externals={[...]}>` and the order symbols
appear in the rendered code.

**Date:** 2026-02-24

## Alloy JSDoc renders multi-line format even for short descriptions

**Problem:** When passing a short doc string to Alloy's `doc` prop on
`InterfaceDeclaration` or `InterfaceMember`, the rendered JSDoc always uses
multi-line format:
```ts
/**
 * Short description.
 */
```
Not the single-line `/** Short description. */` format. Tests must match
the multi-line format.

**Fix:** Always expect multi-line JSDoc format in test assertions, even for
single-sentence documentation strings.

**Date:** 2026-02-24

## TCGC subtypes only contain their own properties, not inherited ones

**Problem:** When a model extends a base model (e.g., `Cat extends Pet`),
TCGC's `SdkModelType.properties` array only contains properties declared
directly on the subtype, not properties inherited from the base model.
Tests should not expect inherited properties in the subtype's interface body.

**Fix:** Only assert on properties directly declared on the subtype. The
`extends` clause handles inheritance — consumers access base properties
through the TypeScript type system, not through duplication.

**Date:** 2026-02-24

## Index signature members outside <For> don't get semicolons

**Problem:** When rendering additionalProperties as an `<InterfaceMember indexer=...>`
after the `<For>` block for regular properties, the index signature member does
not automatically get a trailing semicolon. The `<For>` component's `enderPunctuation`
only applies to items inside the For.

**Fix:** Accept the index signature without a trailing semicolon in test assertions.
The Alloy `InterfaceMember` renders the member as `[key: string]: T` without
a terminating semicolon when used outside a `<For>` with `enderPunctuation`.

**Date:** 2026-02-24

## Native TypeSpec enums are always isFixed=true in TCGC

**Problem:** Attempting to create an extensible (isFixed=false) enum using a TypeSpec
`union` type (e.g., `union Status { Active: "active", string }`) does not produce an
`SdkEnumType` in TCGC's `sdkPackage.enums`. TCGC only produces non-fixed enums from
Azure-specific union-as-enum patterns (requiring `@azure-tools/typespec-azure-core`).

**Fix:** When testing the extensible enum code path, modify a normal enum's `isFixed`
property to simulate the extensible case:
```tsx
const enumType = { ...sdkContext.sdkPackage.enums[0], isFixed: false };
```
This tests the component's branching logic without requiring Azure-specific TypeSpec
libraries in the test setup.

**Date:** 2026-02-24

## Alloy EnumMember with jsValue renders correct value syntax

**Problem:** Unclear how Alloy's `<EnumMember>` component renders string vs numeric values.

**Fix:** The `jsValue` prop on `<EnumMember>` uses `<ValueExpression>` internally, which
correctly quotes strings (`= "value"`) and leaves numbers bare (`= 42`). This matches
TypeScript enum member syntax. Use `jsValue` (not `value`) for literal enum member values.

**Date:** 2026-02-24

## TCGC converts string-literal unions to enums

**Problem:** TypeSpec unions of string literals (e.g., `union Foo { a: "a", b: "b" }`)
are converted by TCGC into `SdkEnumType` rather than `SdkUnionType`. Only unions with
mixed types (e.g., `string | int32`) or model/enum variants remain as `SdkUnionType`
in `sdkPackage.unions`. Tests that define string-literal unions and expect them in
`sdkPackage.unions` will find the array empty.

**Fix:** Use mixed-type unions (e.g., `union Foo { s: string, n: int32 }`) in tests
for the `UnionDeclaration` component. String-literal unions should be tested via the
`EnumDeclaration` component instead.

**Date:** 2026-02-24

## sdkPackage.unions array type includes SdkNullableType

**Problem:** The `sdkPackage.unions` array has type `(SdkNullableType | SdkUnionType)[]`,
not just `SdkUnionType[]`. Accessing `unions[0]` and passing it to a component expecting
`SdkUnionType` causes a TypeScript type error because `SdkNullableType` lacks `variantTypes`.

**Fix:** Cast union elements in tests: `sdkContext.sdkPackage.unions[0] as SdkUnionType`.
In production code, filter by `kind === "union"` before passing to `UnionDeclaration`.

**Date:** 2026-02-24
