# Copilot Instructions — http-client-js

> These instructions guide LLM agents working on this project. Read this document fully before making any changes.

## Project Overview

This project (`http-client-js`) is a **rewrite** of a legacy TypeSpec emitter (`submodules/autorest.typescript/packages/typespec-ts`) using the **Alloy framework**. The legacy emitter generates TypeScript client libraries for REST services defined with TypeSpec. The rewrite uses Alloy's JSX-based declarative code generation instead of the legacy's fragile string concatenation and ts-morph AST manipulation.

### Goals

1. **Output parity** — The rewritten emitter must produce the same public API surface as the legacy emitter. No breaking changes for existing consumers.
2. **Pure Alloy** — No bridging with legacy code. The rewrite is a clean Alloy implementation.
3. **Composability** — A core emitter that can be extended (e.g., Azure flavor) via JSX composition.
4. **Maintainability** — Reduce complexity, improve reliability, lower cost of new features.

### Pipeline

```
TypeSpec Input → Compiler → TCGC SDK Types → Alloy JSX Components → Symbol Tree → String Output → Files
```

The emitter consumes TCGC's `SdkPackage` object model (from `@azure-tools/typespec-client-generator-core`), which pre-computes language-agnostic data from TypeSpec definitions, and renders TypeScript code through Alloy components.

---

## Repository Structure

```
src/                          # Emitter source code
  index.ts                    # Entry point
  components/                 # Alloy JSX components
test/                         # Shared test infrastructure (test-host.ts, utils.tsx, vitest.d.ts)
submodules/
  alloy/                      # Alloy framework source
    packages/core/             # @alloy-js/core — language-agnostic rendering engine
    packages/typescript/       # @alloy-js/typescript — TypeScript code generation components
  autorest.typescript/         # Legacy emitter (source of truth for expected output)
    packages/typespec-ts/      # The legacy emitter being rewritten
  flight-instructor/           # Reference Alloy emitter (HIGHEST priority for patterns)
    src/typescript/            # Idiomatic Alloy patterns for REST client generation
  typespec/                    # TypeSpec compiler and libraries
    packages/compiler/
    packages/http/
    packages/emitter-framework/
    packages/http-client-js/   # Another reference emitter (lower priority than flight-instructor)
  typespec-azure/
    packages/typespec-client-generator-core/  # TCGC — SDK type model we consume
```

### Source Priority for Patterns

When resolving questions about how to write Alloy code:

1. **`submodules/flight-instructor/src/typescript/`** — Highest priority. Canonical idiomatic usage.
2. **`submodules/alloy/packages/core/` and `packages/typescript/`** — Framework source of truth.
3. **`submodules/typespec/packages/http-client-js/`** — Secondary reference. Uses `@typespec/http-client` (we use TCGC instead), so only reference for Alloy patterns, not data model usage.
4. **`submodules/typespec/packages/http-client-python/`** — Reference for TCGC API consumption only (ignore its YAML serialization approach).
5. **`submodules/autorest.typescript/packages/typespec-ts/`** — Source of truth for expected output behavior. Do NOT copy its code patterns.

**If patterns conflict between sources, prefer flight-instructor.**

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| `@alloy-js/core` | Alloy rendering engine, refkeys, contexts, reactivity |
| `@alloy-js/typescript` | TypeScript-specific components (declarations, imports, source files) |
| TCGC (`@azure-tools/typespec-client-generator-core`) | SDK type model consumed by the emitter |
| TypeSpec Compiler | Compiles `.tsp` files |
| Vitest | Test runner |
| JSX (preserve mode, `jsxImportSource: @alloy-js/core`) | Component syntax |

---

## The Alloy Framework — What You Must Know

Alloy is a **declarative, JSX-based code generation framework**. It is NOT React — there is no DOM, no browser, no event system. JSX is purely a structural description language for code output.

### Core Concepts

#### 1. Refkeys (Most Important Concept)

Refkeys are unique identifiers for declarations that enable automatic cross-file reference resolution and import generation. **You never manually write import statements.**

```tsx
import { refkey } from "@alloy-js/core";

// Create refkeys — memoized: same args → same refkey
const typeKey = refkey(sdkType);                    // key tied to entity
const serKey = refkey(sdkType, "serializer");       // discriminated key (different artifact, same entity)

// Declare — register a refkey as owned by a declaration
<ts.InterfaceDeclaration name="Foo" refkey={typeKey} export>
  {/* members */}
</ts.InterfaceDeclaration>

// Reference — use in code templates, Alloy resolves imports automatically
code`const result = ${serKey}(input);`
// If serKey's declaration is in a different file, Alloy auto-generates the import
```

#### 2. The `code` Tagged Template

```tsx
import { code } from "@alloy-js/core";

// Refkeys in code templates are live symbolic references (NOT strings)
code`return ${deserializerRefkey}(response.body);`

// Multi-line with automatic indentation
code`
  if (condition) {
    ${someRefkey}(value);
  }
`
```

**NEVER use string concatenation to build code — always use `code` templates.**

#### 3. External Packages

```tsx
import { createPackage } from "@alloy-js/typescript";

export const httpRuntime = createPackage({
  name: "@typespec/ts-http-runtime",
  version: "0.1.0",
  descriptor: {
    ".": { named: ["Client", "getClient", "RestError", "Pipeline"] }
  }
});

// Register in Output, use anywhere — imports auto-generated
<Output externals={[httpRuntime]}>
  {code`const client: ${httpRuntime.Client} = ${httpRuntime.getClient}(endpoint);`}
</Output>
```

#### 4. Context System (Dependency Injection)

```tsx
import { createNamedContext, useContext } from "@alloy-js/core";

// Define context + hook
const SdkCtx = createNamedContext<SdkContextValue>("SdkContext");
export function useSdkContext() {
  const ctx = useContext(SdkCtx);
  if (!ctx) throw new Error("SdkContext not provided");
  return ctx;
}

// Provide at top level
<SdkCtx.Provider value={contextValue}>
  <ChildComponents />  {/* Any depth can consume without prop threading */}
</SdkCtx.Provider>
```

#### 5. Component Composition

Structure components hierarchically: **Top (orchestrators) → Middle (files) → Leaf (declarations)**.

```tsx
// Top — full output
function MyEmitter() {
  return (
    <Output namePolicy={createEmitterNamePolicy()} nameConflictResolver={nameConflictResolver}>
      <SourceDirectory path="src">
        <ModelsFile />
        <OperationsFile />
      </SourceDirectory>
    </Output>
  );
}

// Middle — one file
function OperationsFile() {
  return (
    <ts.SourceFile path="operations.ts">
      <For each={operations} doubleHardline>
        {(op) => <OperationFunction operation={op} />}
      </For>
    </ts.SourceFile>
  );
}

// Leaf — one declaration
function OperationFunction(props: { operation: Operation }) {
  return (
    <ts.FunctionDeclaration name={props.operation.name} refkey={refkey(props.operation)} export async>
      {code`const response = await fetch(url);`}
    </ts.FunctionDeclaration>
  );
}
```

#### 6. Iteration and Conditionals

```tsx
// Use <For> — NOT .map()
<For each={items} doubleHardline>
  {(item) => <ItemComponent item={item} />}
</For>

// Conditional rendering
<Show when={hasBody}>
  {code`const body = JSON.stringify(${serializerRef}(data));`}
</Show>
```

#### 7. Parameter Descriptors

```tsx
// Always use ParameterDescriptor[] arrays
parameters={[
  { name: "endpoint", type: "string" },
  { name: "body", type: requestTypeRefkey },        // refkey → auto-import
  { name: "options", type: optionsRefkey, optional: true },
  { name: "retries", type: "number", default: "3" }, // NOTE: use "default", NOT "initializer"
]}
```

#### 8. Name Policies

This emitter uses a **custom naming policy** (`createEmitterNamePolicy()` in `src/utils/name-policy.ts`) instead of Alloy's default `createTSNamePolicy()`. The custom policy matches legacy autorest.typescript conventions:

- **Functions/variables**: Reserved words get `$` prefix (`$continue`, `$return`)
- **Parameters**: Reserved words get `Param` suffix (`typeParam`, `endpointParam`)
- **Class/interface members**: Reserved words stay bare (valid in JS property context)
- **Enum members**: Custom PascalCase normalization preserving ≤3-char ALL-CAPS segments (`MAX`, `MLD`) and prefixing `_` for leading digits
- **`$DO_NOT_NORMALIZE$` marker**: Strips prefix, skips all normalization

```tsx
import { namekey } from "@alloy-js/core";

// The naming policy applies automatically via Alloy declaration components.
// To preserve exact names (e.g., from @clientName), bypass the policy:
namekey("LROPoller", { ignoreNamePolicy: true })
```

Helpers exported from `src/utils/name-policy.ts`:
- `isReservedOperationName(name)` — check if a name would be escaped as a function
- `getEscapedOperationName(name)` — get the `$`-prefixed name for composing send/deserialize names
- `getEscapedParameterName(name)` — get the `Param`-suffixed name for body accessors

---

## Anti-Patterns — CRITICAL (Do NOT Do These)

These have caused real bugs and repeated review rejections. Every agent MUST avoid them.

### ❌ 1. String-Based Reference Resolution (Regex/Token Scanning)

```tsx
// ❌ FORBIDDEN
const pattern = /\b(serializeRecord|buildCsvCollection)\b/g;
for (const match of text.matchAll(pattern)) { parts.push(helperRefkey(match[0])); }

// ✅ Use refkeys directly
code`return ${helperRefkey("serializeRecord")}(obj, serializer);`
```

### ❌ 2. Manual Import Strings

```tsx
// ❌ FORBIDDEN
const apiImport = `import { create${name} } from "./api/index.js";`;

// ✅ Let Alloy handle imports via refkeys
code`this._client = ${createClientRefkey}(endpoint, options);`
```

### ❌ 3. Manual Import Path Calculation

```tsx
// ❌ FORBIDDEN
const prefix = "../".repeat(depth);
imports.push(`import { ${type} } from "${prefix}api/index.js";`);

// ✅ Reference refkeys — Alloy computes paths
code`${someRefkey}`
```

### ❌ 4. Post-Render String Scanning

```tsx
// ❌ FORBIDDEN — Alloy's tree is finalized, imports can't work
expression.replace(/buildCsvCollection/g, () => resolveReference(...));

// ✅ Build expressions with refs from the start
code`${helperRefkey("buildCsvCollection")}(${items})`
```

### ❌ 5. Monolithic String Blocks

```tsx
// ❌ FORBIDDEN — raw import strings invisible to Alloy
<ts.SourceFile path="client.ts">
  {code`
    import { Pipeline } from "@azure/core-rest-pipeline";
    export class FooClient { ... }
  `}
</ts.SourceFile>

// ✅ Compose with structural components + refkeys
<ts.SourceFile path="client.ts">
  <ts.ClassDeclaration name={clientName} refkey={clientRefkey} export>
    {/* methods using refkeys */}
  </ts.ClassDeclaration>
</ts.SourceFile>
```

### ❌ 6. Separate SourceFiles for Same Path

```tsx
// ❌ BAD — causes self-imports
<ts.SourceFile path="models.ts"><ModelType /></ts.SourceFile>
<ts.SourceFile path="models.ts"><TypeSerializer /></ts.SourceFile>

// ✅ Single SourceFile per output path
<ts.SourceFile path="models.ts">
  <ModelType />
  <TypeSerializer />
</ts.SourceFile>
```

### ❌ 7. Using `.map()` Instead of `<For>`

```tsx
// ❌ BAD — not reactive, no separator support
{items.map(item => <Item data={item} />)}

// ✅ GOOD
<For each={items} comma hardline>
  {(item) => <Item data={item} />}
</For>
```

### ❌ 8. Wrong `refkey` Import

```tsx
// ❌ WRONG — old framework refkey (returns string)
import { refkey } from "../../framework/refkey.js";

// ✅ CORRECT — Alloy refkey (returns Refkey object)
import { refkey } from "@alloy-js/core";
```

### ❌ 9. Unresolved Symbol References in Output

Generated code must **NEVER** contain `<Unresolved Symbol: refkey[...]>` placeholders. These indicate a refkey that was referenced but never declared (i.e., no component registered ownership of that refkey via a `refkey` prop). This is a **critical bug** — the output is broken TypeScript that cannot compile.

**Common causes:**
- A refkey is created for an entity but the corresponding declaration component is never rendered (e.g., a serializer refkey exists but no `<ts.FunctionDeclaration refkey={serializerRefkey}>` is emitted)
- A refkey discriminator mismatch (e.g., `refkey(type, "serializer")` vs `refkey(type, "serialize")`)
- A component conditionally skips rendering but the refkey is still referenced elsewhere
- Using a refkey from a different render pass or context that isn't connected

**How to prevent:**
- When adding a new refkey reference, always verify the corresponding declaration component exists and will be rendered
- After making changes, run scenario tests and grep output for `Unresolved Symbol` — if any appear, the change is broken
- In CI, assert that no emitted file contains the string `<Unresolved Symbol`

```tsx
// ❌ BUG — referencing a refkey that no declaration owns
const mySerializerKey = refkey(sdkType, "serializer");
code`return ${mySerializerKey}(input);`  // renders as <Unresolved Symbol: refkey[...]>

// ✅ CORRECT — ensure the declaration exists
<ts.FunctionDeclaration name="mySerializer" refkey={mySerializerKey} export>
  {/* implementation */}
</ts.FunctionDeclaration>
// Now the refkey resolves correctly
code`return ${mySerializerKey}(input);`  // renders as mySerializer(input)
```

---

## Gotchas

1. **`returnType` prop** — Accepts `string | Children`. Bare refkeys render their internal ID. Wrap in `code`:
   ```tsx
   // ❌ <ts.FunctionDeclaration returnType={someRefkey}>
   // ✅ <ts.FunctionDeclaration returnType={code`Promise<${someRefkey}>`}>
   ```

2. **String concatenation loses refkeys** — Always use `code` templates:
   ```tsx
   // ❌ `${getReturnType(type)}[]`  → "[object Object][]"
   // ✅ code`${getReturnType(type)}[]`
   ```

3. **Static helpers need refkey declarations** — Every new static helper that other components reference MUST have a registered refkey.

4. **`<For>` callback signature** — `(item, index)` for arrays; `([key, value], index)` for Maps.

5. **Use `default`, NOT `initializer`** for parameter default values (Alloy, not ts-morph).

6. **One SourceFile per output path** — Never duplicate SourceFile elements for the same file path.

---

## Testing

### Framework

- **Vitest** with `@alloy-js/core/testing` custom matchers (`toRenderTo`, `toRenderToAsync`)
- JSX support via `alloyPlugin()` in `vitest.config.ts`
- Tests are **co-located** with source files (e.g., `Component.tsx` → `Component.test.tsx`)

### Test Infrastructure (in `test/`)

| File | Purpose |
|------|---------|
| `test/test-host.ts` | Creates TypeSpec compiler `Tester` instance with library imports |
| `test/utils.tsx` | Test wrappers: `TestFile`, `DeclarationTestFile`, `testHelper()` |
| `test/vitest.d.ts` | Custom matcher type declarations |

### Test Categories

1. **Component Render Tests** (`.test.tsx`) — Compile TypeSpec, render Alloy components, assert output via `toRenderTo()`
2. **Context/Integration Tests** (`.test.tsx`) — Set up context chains, verify context values
3. **Pure Unit Tests** (`.test.ts`) — Standard vitest for pure functions

### Performance: Share Compilations via `beforeAll`

TypeSpec compilation is expensive (~1–2s per call). **Always group tests that use the same TypeSpec input** into a sub-`describe` with a shared `beforeAll` to avoid redundant compilations.

```tsx
// ✅ GOOD — compile once, share across tests
describe("basic model", () => {
  let sdkContext: SdkContext;
  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`model Foo { bar: string; } op get(): Foo;`);
    sdkContext = await createSdkContextForTest(program);
  });
  it("test A", () => { /* use sdkContext */ });
  it("test B", () => { /* use sdkContext */ });
});

// ❌ BAD — compiles the same TypeSpec twice
it("test A", async () => {
  const runner = await TesterWithService.createInstance();
  const { program } = await runner.compile(t.code`model Foo { bar: string; } op get(): Foo;`);
  // ...
});
it("test B", async () => {
  const runner = await TesterWithService.createInstance();
  const { program } = await runner.compile(t.code`model Foo { bar: string; } op get(): Foo;`);
  // ...
});
```

Tests that need **unique** TypeSpec input can stay as standalone `it()` blocks.

### Example Component Test

```tsx
import "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";
import { MyComponent } from "./MyComponent.jsx";

describe("MyComponent", () => {
  let sdkContext: SdkContext;
  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      model Widget { id: string; }
      op getWidget(): Widget;
    `);
    sdkContext = await createSdkContextForTest(program);
  });

  it("renders expected output", () => {
    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <MyComponent />
      </SdkTestFile>
    );
    expect(template).toRenderTo(`expected output`);
  });
});
```

### Scenario Tests (Ported from Legacy)

The legacy emitter has scenario tests under `unitTestModular/scenarios/**/*.md`. These use Markdown format with `` ```tsp `` (TypeSpec input) and `` ```typescript `` (expected output) sections. These tests must be ported as-is to validate output parity. Only non-breaking differences (e.g., import ordering) are acceptable.

---

## Development Rules

1. **Scope**: Only the modular path is being rewritten. Ignore RLC, autorest.typescript, and rlc-common packages.
2. **No bridging**: Do NOT bridge legacy code with Alloy. Write pure Alloy components.
3. **Output parity**: The source of truth for expected output is the legacy emitter (`packages/typespec-ts`). Match its public API surface exactly.
4. **Phase isolation**: Separate structural migration (byte-identical output) from behavioral changes. Never mix them.
5. **Idiomatic Alloy**: Follow patterns from flight-instructor. When in doubt, check flight-instructor first.
6. **TCGC consumption**: Reference `submodules/typespec/packages/http-client-python` for how to use TCGC APIs (ignore its YAML/out-of-process approach).
7. **Imports**: NEVER manually write import statements. Always use refkeys.

---

## Alloy Component Quick Reference

### Core (`@alloy-js/core`)

| Component | Purpose |
|-----------|---------|
| `Output` | Root component. Sets up binder, name policy, externals. |
| `SourceDirectory` | Directory in output |
| `SourceFile` | File in output |
| `For` | Iteration with separators (`comma`, `hardline`, `doubleHardline`, `joiner`) |
| `Show` | Conditional rendering (`when`, `fallback`) |
| `Switch`/`Match` | Multi-branch conditional |
| `StatementList` | Joins children with semicolons + hardlines |
| `Block` | Indented block with braces |
| `code` | Tagged template for code with refkey interpolation |

### TypeScript (`@alloy-js/typescript`, imported as `ts`)

| Component | Generates |
|-----------|-----------|
| `ts.SourceFile` | TypeScript source file with auto-imports |
| `ts.FunctionDeclaration` | `function name(params): ReturnType { body }` |
| `ts.InterfaceDeclaration` | `interface Name { members }` |
| `ts.ClassDeclaration` | `class Name { members }` |
| `ts.TypeDeclaration` | `type Name = ...` |
| `ts.EnumDeclaration` | `enum Name { ... }` |
| `ts.VarDeclaration` | `const/let/var name: Type = init` |
| `ts.InterfaceMember` | `name?: type` |
| `ts.ClassField` | Class field with access modifiers |
| `ts.ClassMethod` | Class method |
| `ts.EnumMember` | Enum member |
| `ts.ObjectExpression` | `{ key: value }` |
| `ts.ArrayExpression` | `[items]` |
| `ts.BarrelFile` | Re-export barrel (index.ts) |

### Formatting Intrinsics

| Element | Purpose |
|---------|---------|
| `<hbr />` | Hard line break (always breaks) |
| `<sbr />` | Soft line break (breaks if group doesn't fit) |
| `<indent>` | Indent content |
| `<group>` | Group content for line-breaking decisions |

---

## Key Import Patterns

```typescript
// Core
import { Output, SourceDirectory, For, Show, code, refkey, namekey,
         createNamedContext, useContext, render, writeOutput } from "@alloy-js/core";

// TypeScript components
import * as ts from "@alloy-js/typescript";
import { createTSNamePolicy, tsNameConflictResolver, createPackage } from "@alloy-js/typescript";

// Testing
import "@alloy-js/core/testing/extend-expect";
import { d } from "@alloy-js/core/testing";
```
