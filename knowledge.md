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

## TCGC discriminatedSubtypes is a Record, not an array

**Problem:** `SdkModelType.discriminatedSubtypes` has type `Record<string, SdkModelType> | undefined`.
Keys are the discriminator values (e.g., `"cat"`, `"dog"`), values are the subtype models.
It may include transitive subtypes in multi-level hierarchies (e.g., `Animal → Bird → Eagle`
could have both `"bird"` and `"eagle"` as keys on `Animal`).

**Fix:** Use `Object.values(model.discriminatedSubtypes)` to iterate subtypes. Filter by
`subtype.baseModel === model` to get only direct subtypes (not transitive ones). This is
critical for generating correct polymorphic union types at each level of a hierarchy.

**Date:** 2026-02-24

## Discriminator-only models: test assertions must match actual TCGC output

**Problem:** When defining a discriminated base model with a `kind` property and extra
properties, the rendered interface output depends on what TCGC actually includes. Test
assertions that assume all TypeSpec properties appear will fail if TCGC strips or reorganizes
them.

**Fix:** Verify the actual TCGC model properties before writing expected test output.
Use the actual rendered output to drive assertions rather than guessing from TypeSpec input.

**Date:** 2026-02-24

## t.model() marker only works for TypeSpec `model` entities

**Problem:** Using `t.model("Color")` in a `t.code` template where `Color` is defined
as a TypeSpec `enum` (not a `model`) causes a compile error: "Expected Color to be of
kind Model but got (Enum)". Similarly, using `t.model()` for a `union` fails with
"Expected ... to be of kind Model but got (Union)".

**Fix:** Only use `t.model()` for actual TypeSpec model definitions. For enums and unions,
write them as plain strings in the template without markers. Operations referencing them
still work — markers are only needed if you want to extract the entity by marker later.

**Date:** 2026-02-24

## TCGC does not include return-type-only unions in sdkPackage.unions

**Problem:** A TypeSpec union used only as an operation return type (e.g.,
`op getMixed(): MixedType;`) may not appear in `sdkPackage.unions`. Testing
the ModelFiles orchestrator with such a union produces empty output because
`unions.length === 0`.

**Fix:** Use the union as an input parameter (e.g., `op sendMixed(@body value: MixedType): void;`)
to ensure TCGC includes it in `sdkPackage.unions`. This mirrors real-world usage where
unions are typically used in request bodies.

**Date:** 2026-02-24

## Duplicate HTTP operation routes cause compilation errors

**Problem:** Multiple operations with the same HTTP method and route (e.g., two `op` 
declarations that both resolve to `GET /`) cause `@typespec/http/duplicate-operation`
compilation errors.

**Fix:** Give operations different routes using `@route("path")` decorator or different
HTTP methods. Example: `@get op getFoo(): Foo;` and `@get @route("bar") op getBar(): Bar;`

**Date:** 2026-02-24

## Testing multi-file Alloy output with toRenderTo

**Problem:** Components that produce SourceDirectory + SourceFile output can't be tested
with `SdkTestFile` (which wraps in its own SourceFile), and need a different assertion
pattern than single-file tests.

**Fix:** Create a custom test wrapper that provides only `<Output>` and
`<SdkContextProvider>` without a `<SourceFile>`. Use `toRenderTo` with an object
argument where keys are file paths (including directory prefixes) and values are
expected content:
```tsx
expect(template).toRenderTo({
  "models/models.ts": d\`expected content\`,
});
```
For empty output (component returns undefined), use `toRenderTo("")`.

**Date:** 2026-02-24

## Use Alloy ObjectExpression for object literal code generation

**Problem:** Using raw `code` templates with `\n` and `<For>` for object literals
(e.g., serializer return statements) produces poorly formatted output because
Alloy's indentation context doesn't apply properly to raw newlines. Properties
end up at wrong indentation levels and on unexpected lines.

**Fix:** Use Alloy's `ObjectExpression` and `ObjectProperty` components from
`@alloy-js/typescript` instead of raw code templates for object literal rendering.
These components use Alloy's `<Block>` internally, which properly handles indentation
and brace placement:
```tsx
import { ObjectExpression, ObjectProperty } from "@alloy-js/typescript";

// ✅ GOOD — proper formatting
<FunctionDeclaration ...>
  {code`return `}
  <ObjectExpression>
    <For each={properties} comma softline enderPunctuation>
      {(prop) => <ObjectProperty name={wireName} value={valueExpr} />}
    </For>
  </ObjectExpression>
  {code`;`}
</FunctionDeclaration>
```

`ObjectProperty` also uses `PropertyName` internally, which automatically quotes
property names that aren't valid JavaScript identifiers.

**Date:** 2026-02-24

## UsageFlags is a bitmask — use bitwise AND for checks

**Problem:** Checking `model.usage === UsageFlags.Input` fails for models that
have multiple usage flags (e.g., `Input | Output`). The equality check only
matches models with exactly one flag set.

**Fix:** Use bitwise AND: `(model.usage & UsageFlags.Input) !== 0`. This correctly
matches models that have the Input flag set regardless of other flags:
```typescript
const hasInput = (model.usage & UsageFlags.Input) !== 0;
const hasOutput = (model.usage & UsageFlags.Output) !== 0;
const hasException = (model.usage & UsageFlags.Exception) !== 0;
```

**Date:** 2026-02-24

## Alloy renders `import type` when symbol is only used in type position

**Problem:** When an external package symbol (e.g., `OperationOptions` from `httpRuntimeLib`)
is only used in a type position (e.g., `extends` clause of an interface), Alloy renders
`import type { ... }` instead of `import { ... }`. Test assertions that use the non-type
import syntax will fail.

**Fix:** Always use `import type { ... }` in test assertions when the imported symbol
is only referenced in type positions (extends clauses, type annotations, etc.).

**Date:** 2026-02-24

## Empty Alloy interface bodies render as `{}` on one line

**Problem:** When an `InterfaceDeclaration` has no children (empty interface), Alloy renders
`export interface Foo extends Bar {}` on a single line, NOT with the braces on separate lines.

**Fix:** Use `{}` on the same line in test assertions for empty interfaces:
```tsx
// ✅ Correct
export interface FooOptionalParams extends OperationOptions {}

// ❌ Wrong
export interface FooOptionalParams extends OperationOptions {
}
```

**Date:** 2026-02-24

## Component name collision with external package symbols in JSX

**Problem:** Naming a component the same as an external package symbol (e.g., naming a
component `OperationOptions` when `httpRuntimeLib.OperationOptions` exists) causes
`ReferenceError: OperationOptions is not defined` in some test contexts. Alloy's JSX
resolution can confuse the component function with the external symbol.

**Fix:** Use distinct names for components that would collide with external package symbols.
For example, use `OperationOptionsDeclaration` instead of `OperationOptions` to avoid
collision with `httpRuntimeLib.OperationOptions`.

**Date:** 2026-02-24

## @patch decorator requires explicit implicitOptionality flag

**Problem:** Using `@patch op myOp(@body body?: MyModel): void;` produces a diagnostic
warning: `@typespec/http/patch-implicit-optional: Patch operation stopped applying an
implicit optional transform to the body in 1.0.0.`

**Fix:** Use `@patch(#{implicitOptionality: true})` when the body parameter should be optional:
```tsp
@patch(#{implicitOptionality: true}) op updateItem(@path id: string, @body body?: PatchData): string;
```

**Date:** 2026-02-24

## Alloy code templates with \n produce inconsistent indentation

**Problem:** Using raw `\n` characters inside Alloy `code` template literals for line breaks
produces inconsistent indentation because Alloy's indentation context only applies to
backtick-delimited line breaks, not raw `\n` characters injected via string interpolation.

**Fix:** Avoid raw `\n` in code templates for multiline output. Either:
1. Use backtick line breaks within the code template (Alloy manages indentation)
2. Or render single-line output and let Alloy handle formatting

For the send function's return statement, a single-line format works well:
```tsx
code`return context.path(${pathExpr}).${verb}({ ...${refkey}(options), headers: { ... } });`
```

**Date:** 2026-02-24

## Alloy combines imports from same package with inline `type` annotation

**Problem:** When multiple symbols from the same external package are used (some in
type-only positions, some in value positions), Alloy renders a single import statement
with inline `type` annotations for type-only symbols instead of separate `import` and
`import type` statements.

**Fix:** Expect a single combined import in test assertions:
```tsx
// ✅ Correct expectation
import { type Client, expandUrlTemplate, type OperationOptions, operationOptionsToRequestParameters, type StreamableMethod } from "@typespec/ts-http-runtime";

// ❌ Wrong - Alloy doesn't split imports like this
import type { OperationOptions } from "@typespec/ts-http-runtime";
import { StreamableMethod } from "@typespec/ts-http-runtime";
```

Symbols are sorted alphabetically within the import statement.

**Date:** 2026-02-24

## Alloy FunctionDeclaration formats parameters on separate lines

**Problem:** When a function has 2 or more parameters, Alloy's `FunctionDeclaration`
component renders each parameter on its own line with 2-space indentation, followed
by a closing `) :` on a separate line.

**Fix:** Always expect multi-line parameter formatting in test assertions for functions
with 2+ parameters:
```tsx
// ✅ Correct
export function _getItemSend(
  context: Client,
  options: GetItemOptionalParams = { requestOptions: {} },
): StreamableMethod {

// ❌ Wrong
export function _getItemSend(context: Client, options: GetItemOptionalParams = { requestOptions: {} }): StreamableMethod {
```

**Date:** 2026-02-24
