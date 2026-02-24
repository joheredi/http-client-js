# Idiomatic Alloy Guide — Instructions for LLMs

> This document is the authoritative reference for writing idiomatic code using the **Alloy** framework (`@alloy-js/core` and `@alloy-js/typescript`). It is designed as instructions for LLMs generating or editing Alloy-based TypeScript code emitters.

---

## Source Priority and Conflict Policy

When resolving questions about Alloy patterns, use sources in this order:

1. `submodules/flight-instructor/src/typescript/**` (**highest priority** — canonical idiomatic usage)
2. `submodules/alloy/packages/core/**` and `submodules/alloy/packages/typescript/**` (framework source of truth)
3. `migration-insights.md` (fallback only — may contain outdated patterns)

If patterns conflict or you are unsure, **prefer flight-instructor patterns**.

---

## Table of Contents

1. [What Is Alloy?](#1-what-is-alloy)
2. [Mental Model: JSX for Code Generation, Not UI](#2-mental-model-jsx-for-code-generation-not-ui)
3. [The Rendering Pipeline](#3-the-rendering-pipeline)
4. [Core Concepts](#4-core-concepts)
   - [Children & the `code` Tagged Template](#41-children--the-code-tagged-template)
   - [The Refkey System](#42-the-refkey-system)
   - [The Context System](#43-the-context-system)
   - [Reactivity](#44-reactivity)
   - [Name Policies](#45-name-policies)
   - [Content Slots](#46-content-slots)
5. [Core Components Reference](#5-core-components-reference)
6. [TypeScript Components Reference](#6-typescript-components-reference)
7. [Formatting and Whitespace](#7-formatting-and-whitespace)
8. [Idiomatic Patterns](#8-idiomatic-patterns)
   - [Component Composition](#81-component-composition)
   - [Refkeys in `code` Templates](#82-refkeys-in-code-templates)
   - [Typed Declaration Components](#83-typed-declaration-components)
   - [Parameter Descriptors](#84-parameter-descriptors)
   - [Iteration with `<For>`](#85-iteration-with-for)
   - [Conditional Rendering](#86-conditional-rendering)
   - [Context / Hooks for Shared State](#87-context--hooks-for-shared-state)
   - [External Packages via `createPackage()`](#88-external-packages-via-createpackage)
   - [The `stc` and `sti` Patterns](#89-the-stc-and-sti-patterns)
   - [The `namekey` Pattern](#810-the-namekey-pattern)
   - [NoNamePolicy for Verbatim Names](#811-nonampolicy-for-verbatim-names)
   - [Helper Registration Pattern](#812-helper-registration-pattern)
   - [Factory Pattern for Stateful Components](#813-factory-pattern-for-stateful-components)
   - [Conditional Wrapping with MaybeOptional](#814-conditional-wrapping-with-maybeoptional)
   - [If/Else and Ternary Expression Chains](#815-ifelse-and-ternary-expression-chains)
   - [Serialization Pattern](#816-serialization-pattern)
   - [Declaration Provider Pattern](#817-declaration-provider-pattern)
   - [Type Registry Pattern](#818-type-registry-pattern)
   - [Multi-Line Code with Explicit Newlines](#819-multi-line-code-with-explicit-newlines)
9. [Anti-Patterns — What NOT to Do](#9-anti-patterns--what-not-to-do)
10. [Testing Patterns](#10-testing-patterns)
11. [Gotchas & Hard-Won Lessons](#11-gotchas--hard-won-lessons)
12. [Practical Decision Rules for LLMs](#12-practical-decision-rules-for-llms)
13. [Complete Component Quick Reference](#13-complete-component-quick-reference)

---

## 1. What Is Alloy?

Alloy is a **declarative, JSX-based code generation framework**. It uses a component model similar to React/Solid but instead of generating DOM elements, it generates **source code files**. The framework provides:

- **`@alloy-js/core`** — The rendering engine, reactive system, refkey resolution, context, and built-in structural components (`Output`, `SourceFile`, `SourceDirectory`, `For`, `Show`, `Declaration`, etc.).
- **`@alloy-js/typescript`** — Language-specific components for generating TypeScript code (`FunctionDeclaration`, `InterfaceDeclaration`, `ClassDeclaration`, `VarDeclaration`, etc.).

Key characteristics:
- JSX describes **code structure**, not UI
- A **reactive system** (built on Vue 3 reactivity) tracks dependencies and re-renders when inputs change
- A **symbol system** with refkeys enables automatic cross-file reference resolution and import generation
- **Prettier integration** handles formatting; you describe structure, Alloy handles whitespace

---

## 2. Mental Model: JSX for Code Generation, Not UI

```tsx
// This JSX does NOT render to the browser.
// It generates a TypeScript source file.
<Output>
  <SourceDirectory path="src">
    <ts.SourceFile path="models.ts">
      <ts.InterfaceDeclaration name="User" export>
        <ts.InterfaceMember name="id" type="string" />
        <ts.InterfaceMember name="name" type="string" />
        <ts.InterfaceMember name="email" type="string" optional />
      </ts.InterfaceDeclaration>
    </ts.SourceFile>
  </SourceDirectory>
</Output>
```

This produces a file `src/models.ts`:
```typescript
export interface User {
  id: string;
  name: string;
  email?: string;
}
```

**Key insight:** Every JSX element is a structural description of output code. Components compose to build source files, and Alloy's rendering pipeline converts the component tree into formatted output strings.

---

## 3. The Rendering Pipeline

Alloy processes code through a three-tree architecture:

```
1. Component Tree (JSX)
   ↓ renderTree()
2. Rendered Text Tree (nested string arrays + PrintHooks)
   ↓ printTree() via Prettier
3. Formatted String Output
   ↓ writeOutput()
4. Files on Disk
```

**Phase 1 — Component Tree:** Your JSX components are instantiated. Each component is a function that receives props and returns `Children`.

**Phase 2 — Rendered Text Tree:** Components are evaluated into a nested array structure of strings and formatting hooks. Reactive effects automatically re-run when dependencies change.

**Phase 3 — Formatting:** The text tree is converted to a Prettier AST, then formatted to a string respecting `printWidth`, indentation, and line breaking rules.

**Phase 4 — Output:** `writeOutput()` traverses the output directory structure and writes files.

### Entry Points

```typescript
// Synchronous rendering
const output = render(<MyTree />, options);

// Asynchronous rendering (for async resources)
const output = await renderAsync(<MyTree />, options);

// Write to disk
await writeOutput(output);
```

---

## 4. Core Concepts

### 4.1 Children & the `code` Tagged Template

The `code` tagged template literal is the primary way to emit code strings with embedded references:

```tsx
import { code } from "@alloy-js/core";

// Simple code emission
code`return ${someRefkey}(${paramRefkey});`

// Multi-line with automatic indentation
code`
  if (${conditionRef}) {
    return ${serializerRef}(value);
  }
`
```

**Critical properties of `code`:**
- Interpolated refkeys are **live symbolic references**, not strings
- Alloy automatically generates imports for cross-file refkey resolution
- Indentation in the template is preserved and converted to `<indent>` components
- Line breaks become `<hardline>` components
- **NEVER** use string concatenation to build code — always use `code` templates

The `Children` type is broad:

```typescript
type Child = string | number | boolean | null
  | (() => Children) | Ref | ComponentCreator | IntrinsicElement;
type Children = Child | Children[];
```

### 4.2 The Refkey System

IMPORTANT: You should try to use an object and a discriminator for refkey. Refkey of only string is usually a bad practice

Refkeys are **unique identifiers for declarations** that enable Alloy's automatic cross-file reference resolution and import generation. This is the most important concept in Alloy.

#### Creating Refkeys

```typescript
import { refkey, namekey, memberRefkey } from "@alloy-js/core";

// Base refkey — memoized: same args → same refkey
const myKey = refkey();                     // unique key
const typeKey = refkey(someEntity);         // key tied to entity
const serKey = refkey(someEntity, "ser");   // discriminated key

// Namekey — refkey with a name and naming options
const classKey = namekey("MyClass");

// Member refkey — for member access chains
const memberKey = memberRefkey(classKey, "method");  // MyClass.method
```

**Memoization guarantee:** `refkey(entity, discriminator)` always returns the same refkey for the same arguments.

#### Declaring Refkeys

When you create a declaration component, assign a refkey to "own" it:

```tsx
<ts.InterfaceDeclaration name="Foo" refkey={typeRefkey} export>
  {/* ... */}
</ts.InterfaceDeclaration>
```

This registers `typeRefkey` as owned by this declaration. Any other component that references `typeRefkey` will automatically resolve to this declaration.

#### Referencing Refkeys

```tsx
// In code templates — auto-generates imports when cross-file
code`const result = ${deserializerRefkey}(response.body);`

// As component children
<ts.VarDeclaration name="client" type={clientRefkey}>
  {code`${createClientRef}(endpoint)`}
</ts.VarDeclaration>

// In parameter types
parameters={[{ name: "item", type: typeRefkey }]}
```

#### Cross-File Resolution

When a refkey is referenced from a different file than where it's declared:
1. Alloy finds the declaration that owns the refkey
2. Computes the relative import path
3. Automatically generates the import statement
4. Uses type-only imports when appropriate

**You never manually write import statements.** Alloy handles all imports automatically through the refkey system.

#### External Package References

```typescript
import { createPackage } from "@alloy-js/typescript";

export const httpRuntime = createPackage({
  name: "@typespec/ts-http-runtime",
  version: "0.1.0",
  descriptor: {
    ".": {
      named: ["Client", "getClient", "RestError", "Pipeline"]
    }
  }
});

// Use anywhere — auto-imports from npm package
code`const client: ${httpRuntime.Client} = ${httpRuntime.getClient}(endpoint);`
```

Register external packages in the `<Output>` component:

```tsx
<Output externals={[httpRuntime]}>
  {/* ... */}
</Output>
```

### 4.3 The Context System

Alloy's context system is modeled after React Context but integrated with the reactive system.

#### Creating a Context

```typescript
import { createContext, createNamedContext } from "@alloy-js/core";

// Simple context
const MyContext = createContext<MyContextValue>();

// Named context (preferred — better for debugging)
const MyContext = createNamedContext<MyContextValue>("MyContext");
```

#### Providing Context

```tsx
<MyContext.Provider value={{ endpoint: "https://api.example.com", authSchemes: ["bearer"] }}>
  <ChildComponents />
</MyContext.Provider>
```

#### Consuming Context

```typescript
import { useContext } from "@alloy-js/core";

function MyComponent(props: MyComponentProps) {
  const ctx = useContext(MyContext);
  // ctx is MyContextValue | undefined
}
```

**Best practice:** Create a `useMyContext()` hook that throws if the context is missing:

```typescript
function useMyContext(): MyContextValue {
  const ctx = useContext(MyContext);
  if (!ctx) {
    throw new Error("MyContext not provided. Wrap with <MyContext.Provider>.");
  }
  return ctx;
}
```

Context walks **up the owner chain** (parent scopes) to find the nearest provider. This is automatic and does not require prop threading.

#### Built-in Contexts

| Context | Package | Purpose |
|---------|---------|---------|
| `BinderContext` | core | Access the symbol binder |
| `ScopeContext` | core | Current output scope |
| `DeclarationContext` | core | Symbol being declared |
| `SourceFileContext` | core | Current source file |
| `SourceDirectoryContext` | core | Current directory |
| `NamePolicyContext` | core | Naming transformation policy |
| `FormatOptions` | core | Code formatting options |
| `MemberDeclarationContext` | core | Current member symbol being declared |
| `MemberContext` | core | Owner symbol for new members |

### 4.4 Reactivity

Alloy uses Vue 3's reactivity system (`ref`, `computed`, `effect`, `reactive`, `shallowRef`, `shallowReactive`):

```typescript
import { ref, computed, effect } from "@alloy-js/core";

const count = ref(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log(`Count is ${count.value}, doubled is ${doubled.value}`);
});

count.value = 5; // effect re-runs automatically
```

In the rendering pipeline:
- Components wrapped in effects automatically re-render when reactive dependencies change
- `flushJobs()` batches updates for efficiency
- Reactive sets (`ReactiveUnionSet`) track collections with derived sets and indexes

**For code generation, reactivity means:** When input data changes (e.g., new types added), only the affected parts of the output re-render.

**Use reactive collections** (`shallowReactive(new Map())`, `shallowReactive(new Set())`) when caching generated declaration refs to ensure reactivity is preserved.

### 4.5 Name Policies

Name policies transform declaration names to follow language conventions:

```typescript
import { createTSNamePolicy, tsNameConflictResolver } from "@alloy-js/typescript";

const policy = createTSNamePolicy();
// "my_function" → "myFunction" (camelCase for functions)
// "my_class" → "MyClass" (PascalCase for classes)
// "class" → "class_" (reserved word escaping)
```

**TypeScript naming conventions applied automatically:**
- **PascalCase:** Classes, types, interfaces, enums, enum members
- **camelCase:** Functions, parameters, variables, object/class members
- **Reserved word handling:** Appends `_` suffix for global reserved words; context-safe words (delete, super, typeof) are allowed as properties

**Conflict resolution:** When multiple symbols share a name, `tsNameConflictResolver` adds numeric suffixes (`name`, `name_1`, `name_2`).

Register at the `<Output>` level:

```tsx
<Output namePolicy={createTSNamePolicy()} nameConflictResolver={tsNameConflictResolver}>
  {/* ... */}
</Output>
```

### 4.6 Content Slots

Content slots are reactive wrappers that track whether child content is rendered:

```typescript
import { createContentSlot } from "@alloy-js/core";

const MySlot = createContentSlot();
// MySlot.isEmpty — getter: true if no content rendered
// MySlot.hasContent — getter: true if content is present
// MySlot.ref — reactive ref for dependency tracking
// MySlot.WhenEmpty — component that renders only when slot is empty
// MySlot.WhenHasContent — component that renders only when slot has content
```

Useful for optional sections in templates — render fallback content when the slot is unused.

---

## 5. Core Components Reference

### Structural Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Output` | Root of all output. Sets up binder, name policy, format options. | `externals`, `namePolicy`, `nameConflictResolver`, `basePath`, `printWidth`, `tabWidth` |
| `SourceDirectory` | Declares a directory in output. | `path`, `children` |
| `SourceFile` | Declares a file in output with content. | `path`, `filetype`, `reference`, `header`, `printWidth`, `tabWidth` |
| `Declaration` | Declares a symbol in current scope. | `name`, `refkey`, `symbol`, `metadata`, `children` |
| `MemberDeclaration` | Declares a member symbol. | `name`, `refkey`, `metadata`, `static`, `children` |
| `Scope` | Creates a lexical scope. | `value` or `name`, `metadata`, `children` |
| `MemberScope` | Creates a member scope. | `ownerSymbol`, `children` |

### Rendering Control

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `For` | Iterates collections, rendering per item. | `each`, `children` (callback), `joiner`, `comma`, `semicolon`, `hardline`, `ender` |
| `Show` | Conditional rendering. | `when`, `children`, `fallback` |
| `Switch` / `Match` | Multi-branch conditional. | `when`, `else`, `children` |
| `Wrap` | Conditionally wraps children. | `when`, `with`, `props`, `children` |
| `List` | Renders children with separators. | `joiner`, `comma`, `semicolon`, `line`, `hardline`, `ender` |
| `StatementList` | Joins children with semicolons + hardlines. | `children` |

### Content & Formatting

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Block` | Indented block with braces. | `opener`, `closer`, `newline`, `inline`, `children` |
| `Indent` | Increases indentation. | `nobreak`, `line`, `softline`, `hardline`, `trailingBreak` |
| `Prose` | Text that breaks at word boundaries. | `children` |
| `Name` | Renders current declaration's name. | (none — uses context) |
| `MemberName` | Renders current member declaration's name. | (none — uses context) |
| `ReferenceOrContent` | Reference if symbol exists, else fallback. | `refkey`, `children` (fallback) |

### File Operations

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `CopyFile` | Copies a file to output. | `path`, `src` |
| `TemplateFile` | Template file with variable substitution. | `path`, `src`, `children` (TemplateVariable) |
| `TemplateVariable` | Provides variable value for TemplateFile. | `name`, `value` or `children` |
| `AppendFile` | Appends content to a file at marked regions. | `path`, `regions`, `children` |
| `UpdateFile` | Updates or creates a file using current contents. | `path`, `defaultContent`, `children` (callback) |

---

## 6. TypeScript Components Reference

Import TypeScript components as:
```typescript
import * as ts from "@alloy-js/typescript";
```

### Declarations

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.FunctionDeclaration` | `[async] function name<T>(params): ReturnType { body }` | `name`, `refkey`, `export`, `async`, `parameters`, `typeParameters`, `returnType`, `children` (body) |
| `ts.InterfaceDeclaration` | `interface Name<T> extends Base { members }` | `name`, `refkey`, `export`, `extends`, `typeParameters`, `children` |
| `ts.ClassDeclaration` | `class Name extends Base implements I { members }` | `name`, `refkey`, `export`, `extends`, `implements`, `children` |
| `ts.TypeDeclaration` | `type Name = Type;` | `name`, `refkey`, `export`, `children` |
| `ts.EnumDeclaration` | `enum Name { MEMBER = value }` | `name`, `refkey`, `export`, `jsValue`, `children` |
| `ts.VarDeclaration` | `const\|let\|var name: Type = init;` | `name`, `refkey`, `export`, `const`/`let`/`var`, `type`, `initializer` or `children` |

### Declaration Members

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.InterfaceMember` | `[readonly] name[?]: type` | `name`, `type`, `optional`, `readonly`, `indexer`, `refkey` |
| `ts.InterfaceMethod` | `name<T>(params): ReturnType` | `name`, `refkey`, `async`, `parameters`, `typeParameters`, `returnType` |
| `ts.ClassField` | `[access] [static] name[?]: type [= init]` | `name`, `type`, `optional`, `public`/`private`/`protected`/`static`/`jsPrivate`, `children` (initializer) |
| `ts.ClassMethod` | `[access] [static] [async] name(params): ReturnType { body }` | Same access modifiers + `async`, `parameters`, `returnType`, `children` (body) |
| `ts.EnumMember` | `NAME = value` | `name`, `refkey`, `jsValue` or `value` |

### Functions & Types

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.FunctionExpression` | `[async] function(params) { body }` | `async`, `parameters`, `typeParameters`, `returnType`, `children` |
| `ts.ArrowFunction` | `[async] (params) => { body }` | `async`, `parameters`, `typeParameters`, `returnType`, `children` |
| `ts.FunctionType` | `(params) => ReturnType` | `parameters`, `typeParameters`, `returnType` |
| `ts.CallSignature` | `<T>(params): ReturnType` | `parameters`, `typeParameters`, `returnType` |

### Expressions

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.ObjectExpression` | `{ key: value }` | `jsValue`, `children` |
| `ts.ObjectProperty` | `key: value` | `name` or `nameExpression`, `value` or `jsValue` or `children` |
| `ts.ObjectSpreadProperty` | `...expr` | `value` or `children` |
| `ts.ArrayExpression` | `[item1, item2]` | `jsValue`, `children` |
| `ts.FunctionCallExpression` | `target(args)` | `target`, `args` |
| `ts.NewExpression` | `new Target(args)` | `target`, `args` |
| `ts.MemberExpression` | `obj.prop?.method()` | `children` (MemberExpression.Part) |
| `ts.ValueExpression` | Serialized JS value | `jsValue` |

### Control Flow

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.IfStatement` | `if (cond) { body }` | `condition`, `children` |
| `ts.ElseIfClause` | `else if (cond) { body }` | `condition`, `children` |
| `ts.ElseClause` | `else { body }` | `children` |
| `ts.SwitchStatement` | `switch (expr) { cases }` | `expression`, `children` |
| `ts.CaseClause` | `case expr: body` | `expression` or `jsValue` or `default`, `children`, `break` |
| `ts.TryStatement` | `try { body }` | `children` |
| `ts.CatchClause` | `catch (err) { body }` | `parameter`, `children` |
| `ts.FinallyClause` | `finally { body }` | `children` |

### Scopes & References

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.LexicalScope` | Scope for type/value declarations | `value` or `name` |
| `ts.BlockScope` | `{ block }` with scope | `value` or `name`, `children` |
| `ts.MemberScope` | Member scope for class/interface | `ownerSymbol`, `children` |
| `ts.Reference` | Reference to a declared symbol | `refkey`, `type` (boolean for type-only) |
| `ts.TypeRefContext` | Marks region as type-only references | `children` |

### Package & File

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.SourceFile` | TypeScript source file with auto-imports | `path`, `export` (boolean or string), `header`, `headerComment` |
| `ts.PackageDirectory` | Package with package.json + tsconfig | `name`, `version`, `path`, `tsConfig`, `packages` |
| `ts.PackageJsonFile` | package.json | `name`, `version`, `dependencies`, `scripts`, `exports` |
| `ts.TsConfigJson` | tsconfig.json | `outDir` |
| `ts.BarrelFile` | Re-export barrel (index.ts) | `path`, `export` |

### Documentation

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.JSDoc` | `/** multi-paragraph */` | `children` (array of paragraphs) |
| `ts.JSDocComment` | `/** raw */` | `children` |
| `ts.JSDocExample` | `@example` block | `fenced`, `language`, `children` |
| `ts.JSDocParams` | `@param` tags from array | `parameters` |
| `ts.JSDocParam` | Single `@param` tag | `name`, `type`, `optional`, `defaultValue`, `children` |

### Utilities

| Component | Generates | Key Props |
|-----------|-----------|-----------|
| `ts.CommaList` | Comma-separated items | `children`, `hardline`, `softline` |
| `ts.PropertyName` | Quoted-if-needed property name | `name`, `private` |
| `ts.SingleLineCommentBlock` | `// comment` | `children` |

---

## 7. Formatting and Whitespace

Alloy uses Prettier-like formatting primitives via intrinsic elements:

### Intrinsic Elements

| Element | Purpose |
|---------|---------|
| `<indent>` | Indent content |
| `<group>` | Group content for line-breaking decisions |
| `<br />` | Line break (may be flattened to space) |
| `<hbr />` | Hard line break (always breaks) |
| `<sbr />` | Soft line break (breaks if group doesn't fit) |
| `<lbr />` | Literal line break (no indentation after break) |
| `<ifBreak>` | Content shown only when group breaks |
| `<dedentToRoot>` | Dedent to the root level |

### The `code` Template Tag

Use `code` for multi-line code with automatic indentation:

```tsx
import { code } from "@alloy-js/core";

code`
  if (condition) {
    ${someRefkey}(value);
  }
`
```

The `code` tag:
- Preserves line breaks
- Auto-indents based on nesting level
- Supports refkey interpolation for auto-import

### The `text` Template Tag

Use `text` for inline text that normalizes whitespace to single spaces:

```tsx
import { text } from "@alloy-js/core";

text`Hello ${name}, you have ${count} messages.`
```

---

## 8. Idiomatic Patterns

### 8.1 Component Composition

Structure components hierarchically from top-level orchestrators to leaf renderers:

```tsx
// TOP LEVEL — orchestrates the full output
function MyEmitter(props: { operations: Operation[] }) {
  return (
    <Output namePolicy={createTSNamePolicy()} nameConflictResolver={tsNameConflictResolver}>
      <SourceDirectory path="src">
        <ModelsFile types={props.types} />
        <OperationsFile operations={props.operations} />
      </SourceDirectory>
    </Output>
  );
}

// MIDDLE LEVEL — one file
function OperationsFile(props: { operations: Operation[] }) {
  return (
    <ts.SourceFile path="operations.ts">
      <For each={props.operations} doubleHardline>
        {(op) => <OperationFunction operation={op} />}
      </For>
    </ts.SourceFile>
  );
}

// LEAF LEVEL — one declaration
function OperationFunction(props: { operation: Operation }) {
  const { operation } = props;
  return (
    <ts.FunctionDeclaration
      name={operation.name}
      refkey={refkey(operation)}
      export
      async
      parameters={buildParams(operation)}
      returnType={getReturnType(operation)}
    >
      {code`
        const response = await fetch(${getUrl(operation)});
        return response.json();
      `}
    </ts.FunctionDeclaration>
  );
}
```

**Follow flight-instructor decomposition for file organization:**
- `models.ts` — type declarations
- `serialization.ts` — serializer/deserializer functions
- `rest-code.ts` — operation call code
- `helpers.ts` — shared helper functions (only when needed)

### 8.2 Refkeys in `code` Templates

Always embed refkeys directly in `code` templates. Never stringify them.

```tsx
// ✅ CORRECT — refkeys are live symbolic references
code`const result = ${deserializerRefkey}(response.body);`
code`const client: ${httpRuntime.Client} = ${httpRuntime.getClient}(endpoint);`

// ❌ WRONG — string interpolation loses the symbolic reference
`const result = ${deserializerRefkey.toString()}(response.body);`
```

Multiple refkeys compose naturally:

```tsx
code`
  const client = ${createClientRef}(endpoint, ${optionsRef});
  return ${deserializerRef}(await client.${methodRef}(${paramsRef}));
`
```

### 8.3 Typed Declaration Components

Use declaration components with refkeys for all declarations:

```tsx
<ts.FunctionDeclaration
  name="createUser"
  refkey={createUserRefkey}
  export
  async
  parameters={[
    { name: "user", type: userTypeRefkey },          // refkey → auto-import
    { name: "options", type: "RequestOptions", optional: true }
  ]}
  returnType={code`Promise<${userTypeRefkey}>`}
>
  {/* function body */}
</ts.FunctionDeclaration>
```

**Sub-component pattern** for complex declarations:

```tsx
<ts.FunctionDeclaration name="process" export>
  <ts.FunctionDeclaration.TypeParameters>
    T extends Record&lt;string, unknown&gt;
  </ts.FunctionDeclaration.TypeParameters>
  <ts.FunctionDeclaration.Parameters>
    input: T, options?: ProcessOptions
  </ts.FunctionDeclaration.Parameters>
  <ts.FunctionDeclaration.Body>
    {code`return transform(input);`}
  </ts.FunctionDeclaration.Body>
</ts.FunctionDeclaration>
```

### 8.4 Parameter Descriptors

Always use `ParameterDescriptor[]` arrays for function parameters:

```tsx
const params: ParameterDescriptor[] = [
  { name: "endpoint", type: "string" },
  { name: "id", type: "string" },
  { name: "body", type: requestTypeRefkey },              // refkey for auto-import
  { name: "options", type: optionsTypeRefkey, optional: true },
  { name: "args", type: "unknown[]", rest: true },         // ...args: unknown[]
  { name: "retries", type: "number", default: "3" },       // retries: number = 3
];

<ts.FunctionDeclaration name="doRequest" parameters={params} />
```

**Important:** Alloy uses `default` for default values, NOT `initializer`:

```tsx
// ✅ CORRECT
{ name: "options", default: "{ requestOptions: {} }" }

// ❌ WRONG (ts-morph pattern)
{ name: "options", initializer: "{ requestOptions: {} }" }
```

### 8.5 Iteration with `<For>`

`<For>` is the standard way to iterate collections:

```tsx
// Basic iteration
<For each={operations}>
  {(operation) => <OperationFunction operation={operation} />}
</For>

// With formatting separators
<For each={members} comma hardline enderPunctuation>
  {(member) => <ts.InterfaceMember name={member.name} type={member.type} />}
</For>

// With joiner for union types
<For each={subtypes} joiner=" | ">
  {(subtype) => typeRefkey(subtype)}
</For>

// Double hardline between declarations
<For each={types} doubleHardline>
  {(type) => <ModelDeclaration type={type} />}
</For>

// Iterating Maps
<For each={paramsByGroup}>
  {([groupName, params]) => (
    <ts.InterfaceDeclaration name={groupName}>
      <For each={params} semicolon hardline>
        {(p) => <ts.InterfaceMember name={p.name} type={p.type} />}
      </For>
    </ts.InterfaceDeclaration>
  )}
</For>
```

### 8.6 Conditional Rendering

Use `<Show>` for simple conditionals:

```tsx
<Show when={hasBody}>
  {code`const body = JSON.stringify(${serializerRef}(data));`}
</Show>

// With fallback
<Show when={isAuthenticated} fallback={code`throw new Error("Not authenticated");`}>
  {code`const token = await getToken();`}
</Show>
```

Use `<Switch>`/`<Match>` for multi-branch:

```tsx
<Switch>
  <Match when={type === "string"}>"string"</Match>
  <Match when={type === "number"}>"number"</Match>
  <Match when={type === "boolean"}>"boolean"</Match>
  <Match else>"unknown"</Match>
</Switch>
```

### 8.7 Context / Hooks for Shared State

Define context + hook pairs for dependency injection:

```tsx
// Define
import { createNamedContext, useContext } from "@alloy-js/core";

interface SdkContextValue {
  sdkContext: SdkContext;
  types: Map<Type, Refkey>;
}

const SdkContextAlloy = createNamedContext<SdkContextValue>("SdkContext");

export function useSdkContext(): SdkContext {
  const ctx = useContext(SdkContextAlloy);
  if (!ctx) throw new Error("SdkContext not available");
  return ctx.sdkContext;
}

// Provide (top level)
<SdkContextAlloy.Provider value={{ sdkContext, types }}>
  <ModelFiles />
  <Operations />
</SdkContextAlloy.Provider>

// Consume (any depth — no prop threading needed)
function SomeLeafComponent() {
  const ctx = useSdkContext();
  // use ctx...
}
```

### 8.8 External Packages via `createPackage()`

Define external npm packages for type-safe references:

```typescript
import { createPackage } from "@alloy-js/typescript";

export const httpRuntime = createPackage({
  name: "@typespec/ts-http-runtime",
  version: "0.1.0",
  descriptor: {
    ".": {
      named: ["Client", "getClient", "RestError", "Pipeline", "ClientOptions"]
    },
    "./api": {
      named: ["createRestError"]
    }
  }
});
```

Use anywhere — imports are auto-generated:

```tsx
code`const client: ${httpRuntime.Client} = ${httpRuntime.getClient}(endpoint);`
// Generates: import { Client, getClient } from "@typespec/ts-http-runtime";
```

Register in `<Output>`:

```tsx
<Output externals={[httpRuntime]}>
  {/* ... */}
</Output>
```

### 8.9 The `stc` and `sti` Patterns

`stc` (short-template-component) and `sti` (short-template-item) provide a fluent builder API for creating component instances:

```typescript
import { stc, sti } from "@alloy-js/core";

// stc wraps a custom component
const MyComp = stc(MyComponent);
MyComp({ someProp: "value" }).code`console.log("hello")`;
MyComp({ someProp: "value" }).children(<OtherComponent />);

// sti wraps an intrinsic element
const MyIndent = sti("indent");
MyIndent().code`indented content`;
```

This is useful for concise inline component creation without full JSX syntax.

### 8.10 The `namekey` Pattern

Use `namekey` when you need to control how a name is represented or when the automatic name policy would produce the wrong result:

```tsx
import { namekey } from "@alloy-js/core";

// Preserve exact name (bypass name policy)
<ts.InterfaceDeclaration name={namekey("LROPoller", { ignoreNamePolicy: true })} export>
  {/* "LROPoller" stays as-is, NOT transformed to "lroPoller" */}
</ts.InterfaceDeclaration>
```

**For protocol-fixed names** (e.g., HTTP headers, wire-format keys), always use `ignoreNamePolicy: true`:

```tsx
namekey("Content-Type", { ignoreNamePolicy: true })
```

### 8.11 NoNamePolicy for Verbatim Names

When rendering types from external sources where names should not be transformed:

```tsx
function NoNamePolicy(props: { children: Children }) {
  // Provides a name policy that returns names unchanged
  return (
    <NamePolicyContext.Provider value={identityPolicy}>
      {props.children}
    </NamePolicyContext.Provider>
  );
}

// Usage — names pass through verbatim
<NoNamePolicy>
  <ts.InterfaceDeclaration name="snake_case_name" export>
    <ts.InterfaceMember name="my_property" type="string" />
  </ts.InterfaceDeclaration>
</NoNamePolicy>
```

This pattern is used in flight-instructor when rendering TypeSpec model declarations where the original casing must be preserved.

### 8.12 Helper Registration Pattern

Track helper functions lazily — only include helpers that are actually referenced:

```tsx
// Context for tracking helpers
const HelpersContext = createContext<{ helpers: Set<string> }>();

// Helper component — registers a helper and returns a refkey
function Helper(props: { name: string }) {
  const ctx = useContext(HelpersContext);
  ctx.helpers.add(props.name);
  return refkey(props.name);
}

// HelpersFile — generates helpers file only if helpers were used
function HelpersFile() {
  const ctx = useContext(HelpersContext);
  return (
    <Show when={ctx.helpers.size > 0}>
      <ts.SourceFile path="helpers.ts">
        <For each={[...ctx.helpers]}>
          {(helperName) => <HelperDeclaration name={helperName} />}
        </For>
      </ts.SourceFile>
    </Show>
  );
}
```

### 8.13 Factory Pattern for Stateful Components

Use factory functions to create components with associated mutable state:

```tsx
function createInstructionsBlock() {
  const instructions = shallowReactive<string[]>([]);
  
  function InstructionsBlock() {
    return (
      <Show when={instructions.length > 0}>
        <ts.JSDocComment>
          <For each={instructions} hardline>
            {(instruction) => <Prose>{instruction}</Prose>}
          </For>
        </ts.JSDocComment>
      </Show>
    );
  }
  
  return { instructions, InstructionsBlock };
}

// Usage
const { instructions, InstructionsBlock } = createInstructionsBlock();
instructions.push("Remember to handle auth before calling this function.");
// <InstructionsBlock /> renders the instructions as a JSDoc comment
```

### 8.14 Conditional Wrapping with MaybeOptional

Generate conditional code only when a property is optional:

```tsx
function MaybeOptional(props: { property: Property; variable: string; children: Children }) {
  if (!props.property.optional) {
    return props.children;  // Required — emit children directly
  }
  
  return (
    <ts.IfStatement condition={code`${props.variable} !== undefined`}>
      {props.children}
    </ts.IfStatement>
  );
}

// Usage — wraps in `if` only when property is optional
<MaybeOptional property={param} variable="options.limit">
  {code`queryParams.set("limit", String(options.limit));`}
</MaybeOptional>
```

### 8.15 If/Else and Ternary Expression Chains

For generating cascading if/else or ternary expressions from data:

```tsx
interface Condition {
  test: Children;
  whenTrue: Children;
}

// If/else chain component
function IfElseChain(props: { conditions: Condition[]; whenFalse?: Children }) {
  const [first, ...rest] = props.conditions;
  if (!first) return props.whenFalse;
  
  return (
    <>
      <ts.IfStatement condition={first.test}>
        {first.whenTrue}
      </ts.IfStatement>
      <For each={rest}>
        {(cond) => (
          <ts.ElseIfClause condition={cond.test}>
            {cond.whenTrue}
          </ts.ElseIfClause>
        )}
      </For>
      <Show when={props.whenFalse !== undefined}>
        <ts.ElseClause>
          {props.whenFalse}
        </ts.ElseClause>
      </Show>
    </>
  );
}
```

### 8.16 Serialization Pattern

Bidirectional serialization using composable components:

```tsx
// Direction-aware serialization
interface SerializationProps {
  direction: "toWire" | "fromWire";
  type: Type;
  value: Children;
}

function SerializationExpression(props: SerializationProps) {
  const { direction, type, value } = props;
  
  // Dispatch based on type kind
  if (isScalar(type)) return <ScalarSerialization {...props} />;
  if (isModel(type)) return <ModelSerialization {...props} />;
  if (isUnion(type)) return <UnionSerialization {...props} />;
  
  // Identity — no transformation needed
  return value;
}

// Scalar serialization uses codec pattern
function ScalarSerialization(props: SerializationProps) {
  const { direction, type, value } = props;
  const codec = getCodec(type);
  
  switch (codec.type) {
    case "rfc3339":
      return direction === "toWire"
        ? code`${value}.toISOString()`
        : code`new Date(${value})`;
    case "base64":
      return direction === "toWire"
        ? code`btoa(String.fromCharCode(...${value}))`
        : code`Uint8Array.from(atob(${value}), c => c.charCodeAt(0))`;
    default:
      return value;
  }
}
```

### 8.17 Declaration Provider Pattern

Central management of type declarations and serialization references:

```tsx
interface DeclarationProvider {
  allTypes: Map<Type, Refkey>;
  allSerializationFunctions: Map<Type, { toWire?: Refkey; fromWire?: Refkey }>;
  typeRegistry: TypeRegistry;
  
  typeDeclarationRefkey(type: Type): Refkey;       // Get or create type refkey
  serializationFunctionRefkey(type: Type, direction: "toWire" | "fromWire"): Refkey;
  shouldDeclareType(type: Type): boolean;           // Should this type get a declaration?
}

const DeclarationProviderContext = createNamedContext<DeclarationProvider>("DeclarationProvider");

function useDeclarationProvider(): DeclarationProvider {
  const ctx = useContext(DeclarationProviderContext);
  if (!ctx) throw new Error("DeclarationProviderContext not available");
  return ctx;
}
```

**Use `shallowReactive(new Map())` for caching** to ensure reactivity is preserved when generating declaration refs deterministically.

### 8.18 Type Registry Pattern

Registry-based type dispatch for polymorphic rendering:

```tsx
interface TypeRegistryEntry {
  detect(type: Type): boolean;
  Reference(props: { type: Type }): Children;
  Declaration(props: { type: Type; refkey: Refkey }): Children;
}

class TypeRegistry {
  private entries: TypeRegistryEntry[] = [];
  
  register(entry: TypeRegistryEntry) {
    this.entries.push(entry);
  }
  
  detect(type: Type): TypeRegistryEntry | undefined {
    return this.entries.find(e => e.detect(type));
  }
}

// Register entries in order (first match wins)
registry.register(new ArrayEntry());
registry.register(new RecordEntry());
registry.register(new InterfaceEntry());
registry.register(new UnionEntry());
registry.register(new EnumEntry());
registry.register(new StringEntry());
registry.register(new DateEntry());
```

### 8.19 Multi-Line Code with Explicit Newlines

Use `<hbr />` (hard break) or separate statements for multi-line code:

```tsx
return (
  <>
    <ts.VarDeclaration name="result" refkey={resultKey}>
      {code`await ${sendRef}(${parameterList})`}
    </ts.VarDeclaration>
    <hbr />
    {code`return ${deserializeRef}(${resultKey});`}
  </>
);
```

For code blocks that need explicit line separation:

```tsx
<ts.FunctionDeclaration name="process" async>
  <StatementList>
    {code`const response = await fetch(url);`}
    {code`const data = await response.json();`}
    {code`return ${deserializerRef}(data);`}
  </StatementList>
</ts.FunctionDeclaration>
```

---

## 9. Anti-Patterns — What NOT to Do

### ❌ Anti-Pattern 1: String-Based Reference Resolution

```tsx
// ❌ FORBIDDEN — regex scanning for references
const pattern = /\b(serializeRecord|buildMultiCollection)\b/g;
for (const match of text.matchAll(pattern)) {
  parts.push(helperRefkey(match[0]));
}

// ✅ CORRECT — direct refkey usage
code`return ${helperRefkey("serializeRecord")}(obj, serializer);`
```

**Why it's wrong:** Token-collision bugs, silent misses, defeats Alloy's symbolic system.

### ❌ Anti-Pattern 2: Manual Import-String Calculation

```tsx
// ❌ FORBIDDEN — manual import strings
const apiImport = `import { create${name} } from "./api/index.js";`;
const lroImports = `import { getSimplePoller } from "./static-helpers/simplePollerHelpers.js";`;

// ✅ CORRECT — let Alloy handle imports via refkeys
code`this._client = ${createClientRefkey}(endpoint, options);`
```

**Why it's wrong:** Alloy can't track symbols, results in self-import bugs and stale paths.

### ❌ Anti-Pattern 3: Building Import Paths with String Concatenation

```tsx
// ❌ FORBIDDEN — manual relative path math
const prefix = "../".repeat(maxLayer + 2);
imports.push(`import { ${type} } from "${prefix}api/index.js";`);

// ✅ CORRECT — Alloy computes paths automatically
code`${someRefkey}`
```

**Why it's wrong:** Relative paths change with nesting depth, manual math is error-prone.

### ❌ Anti-Pattern 4: Post-Render String Scanning

```tsx
// ❌ FORBIDDEN — scanning rendered output for patterns
function resolveLegacyReferences(expression: string): Children {
  return expression.replace(/buildCsvCollection/g, () =>
    resolveReference(context, refkey("buildCsvCollection")));
}

// ✅ CORRECT — embed refkeys during rendering
code`${helperRefkey("buildCsvCollection")}(${items})`
```

**Why it's wrong:** Post-render scanning happens after Alloy's tree is finalized; imports can't be generated.

### ❌ Anti-Pattern 5: Monolithic String Blocks

```tsx
// ❌ FORBIDDEN — entire file as one code template with raw import strings
<ts.SourceFile path="client.ts">
  {code`
    import { Pipeline } from "@azure/core-rest-pipeline";
    export class FooClient {
      constructor(endpoint: string) {
        this._client = getClient(endpoint);
      }
    }
  `}
</ts.SourceFile>

// ✅ CORRECT — compose with structural components
<ts.SourceFile path="client.ts">
  <ts.ClassDeclaration name={clientName} refkey={clientRefkey} export>
    <ts.ClassMethod name="constructor" parameters={constructorParams}>
      {code`this._client = ${createClientRef}(endpoint, options);`}
    </ts.ClassMethod>
    <For each={operations} doubleHardline>
      {(op) => <OperationMethod operation={op} />}
    </For>
  </ts.ClassDeclaration>
</ts.SourceFile>
```

**Why it's wrong:** Import strings inside `code` are invisible to Alloy's symbol system. No refkeys on declarations means no cross-file references.

### ❌ Anti-Pattern 6: Using Wrong `refkey` Import

```tsx
// ❌ WRONG — old framework refkey (returns string)
import { refkey } from "../../framework/refkey.js";
refkey("MyModel", "serializer");  // → "refkey_MyModel_serializer"

// ✅ CORRECT — Alloy refkey (returns Refkey object)
import { refkey } from "@alloy-js/core";
refkey(sdkType, "serializer");    // → Refkey object with auto-resolution
```

**VS Code autocomplete may pick the wrong import.** Always verify the import path.

### ❌ Anti-Pattern 7: Separate SourceFiles for Same Path

```tsx
// ❌ BAD — two SourceFile elements for same path → self-imports
<ts.SourceFile path="models.ts">
  <ModelType type={fooType} />
</ts.SourceFile>
<ts.SourceFile path="models.ts">
  <TypeSerializer type={fooType} />  {/* references Foo → generates self-import! */}
</ts.SourceFile>

// ✅ GOOD — single SourceFile for all content at same path
<ts.SourceFile path="models.ts">
  <ModelType type={fooType} />
  <TypeSerializer type={fooType} />
</ts.SourceFile>
```

### ❌ Anti-Pattern 8: Using `.map()` Instead of `<For>`

```tsx
// ❌ BAD — not reactive, no separator support
{items.map(item => <Item data={item} />)}

// ✅ GOOD — reactive, with built-in joining
<For each={items} comma hardline>
  {(item) => <Item data={item} />}
</For>
```

### ❌ Anti-Pattern 9: Emitting Entire Files as Giant `code` Blocks

When declarations/references are needed within the file, decompose into components. Use `code` only for inline expression snippets with symbol interpolation, not for whole-file generation.

---

## 10. Testing Patterns

### Test Framework

Alloy uses **Vitest** with custom matchers from `@alloy-js/core/testing`:

```typescript
import { expect, it, describe } from "vitest";
import "@alloy-js/core/testing/extend-expect";
```

### Rendering Tests

```tsx
import { renderTree, printTree } from "@alloy-js/core";

it("renders interface correctly", () => {
  const tree = renderTree(
    <Output>
      <ts.SourceFile path="test.ts">
        <ts.InterfaceDeclaration name="Foo">
          <ts.InterfaceMember name="bar" type="string" />
        </ts.InterfaceDeclaration>
      </ts.SourceFile>
    </Output>
  );
  expect(printTree(tree)).toContain("interface Foo");
});
```

### Custom Matchers

```tsx
// toRenderTo — validates full output
expect(
  <Output>
    <ts.SourceFile path="test.ts">hello world</ts.SourceFile>
  </Output>
).toRenderTo({ "test.ts": "hello world" });

// toRenderToAsync — for async rendering
await expect(
  <Output>
    <ts.SourceFile path="test.ts">{asyncContent}</ts.SourceFile>
  </Output>
).toRenderToAsync({ "test.ts": "expected" });

// toHaveDiagnostics — validate warnings/errors
expect(element).toHaveDiagnostics([
  { message: /some pattern/, severity: "warning" }
]);
```

### Test Wrappers

```typescript
import { createTSTestWrapper } from "@alloy-js/typescript/testing";

const { Wrapper, defkey } = createTSTestWrapper();

it("tests a component in isolation", () => {
  expect(
    <Wrapper>
      <MyComponent someProp="value" />
    </Wrapper>
  ).toRenderTo("expected output");
});
```

### The `d` (dedent) Template Tag

Use `d` to write expected output with clean indentation:

```tsx
import { d } from "@alloy-js/core/testing";

d`
  interface Foo {
    bar: string;
  }
`
// Equivalent to: "interface Foo {\n  bar: string;\n}"
```

### Reactive Testing

```typescript
import { ref, flushJobs } from "@alloy-js/core";

it("re-renders when reactive value changes", () => {
  const name = ref("Foo");
  const tree = renderTree(<ts.InterfaceDeclaration name={name.value} />);
  
  name.value = "Bar";
  flushJobs();  // Process batched updates
  
  expect(printTree(tree)).toContain("interface Bar");
});
```

---

## 11. Gotchas & Hard-Won Lessons

### Gotcha 1: `returnType` Prop Behavior

`returnType` on `ts.FunctionDeclaration` accepts `string | Children`. Refkeys alone won't work correctly — wrap in `code`:

```tsx
// ❌ WRONG — renders refkey's internal ID as a string
<ts.FunctionDeclaration returnType={someTypeRefkey}>

// ✅ CORRECT — use code template
<ts.FunctionDeclaration returnType={code`Promise<${someTypeRefkey}>`}>

// ✅ ALSO CORRECT — string literal for simple types
<ts.FunctionDeclaration returnType="void">
```

### Gotcha 2: Recursive Type Building with Refkeys

```tsx
// ❌ WRONG — string concatenation loses refkey object
return `${getReturnType(context, type.valueType)}[]`;  // → "[object Object][]"

// ✅ CORRECT — code template preserves refkey
return code`${getReturnType(context, type.valueType)}[]`;
```

### Gotcha 3: Static Helpers Need Refkey Declarations

If you add a new static helper that other components reference, you **MUST** register a refkey for it. Otherwise, consumers can't reference it and fall back to manual import management.

### Gotcha 4: Parameter Types Accept Refkeys

Parameter `type` fields accept refkeys directly — Alloy resolves and imports them automatically:

```tsx
parameters={[
  { name: "item", type: typeRefkey },  // refkey → auto-import
]}
```

### Gotcha 5: `<For>` Callback Signature

`<For each={array}>` passes `(item, index)` to the callback. For Maps, it passes `([key, value], index)`:

```tsx
<For each={myMap}>
  {([key, value], index) => <>{key}: {value}</>}
</For>
```

### Gotcha 6: Content in `code` Templates Is Indentation-Aware

The `code` tagged template automatically handles indentation based on the template literal's formatting. Nested indentation in the template is converted to `<indent>` components:

```tsx
// This preserves the indentation structure
code`
  if (condition) {
    doSomething();
  }
`
// Equivalent to: "if (condition) {\n  doSomething();\n}"
```

### Gotcha 7: Don't Mix Structural and Behavioral Changes

When migrating code to Alloy, separate:
- **Slice A:** Structural migration (byte-identical output) — only change architecture
- **Slice B:** Behavioral changes — dedicated verification

This prevents attribution confusion when regressions occur.

### Gotcha 8: Type Positions Need `TypeRefContext`

References in type positions (e.g., parameter types, return types, extends clauses) should run inside `TypeRefContext` so references emit in type mode. Many TS components handle this automatically, but for custom components ensure type references are correctly marked:

```tsx
<ts.TypeRefContext>
  <ts.Reference refkey={someTypeKey} />
</ts.TypeRefContext>
```

---

## 12. Practical Decision Rules for LLMs

When generating Alloy code, follow these rules:

1. **If a type appears in multiple places**, create/use a shared `refkey` and declaration.
2. **If a wire/protocol key must stay exact**, use `namekey(..., { ignoreNamePolicy: true })`.
3. **If in type position**, wrap with `TypeRefContext` (or use a component that already wraps with `ensureTypeRefContext`).
4. **If behavior depends on optional data**, use `Show` / `For` / componentized branching.
5. **Throw explicit errors** for unsupported states; do not silently swallow invalid cases.
6. **If migration-insights conflicts with flight-instructor usage**, follow flight-instructor.
7. **Never manually write imports** — always use refkeys and let Alloy handle it.
8. **Prefer `createNamedContext`** over `createContext` for better debugging.
9. **Use `code` templates for inline expressions** with symbol interpolation, not for whole-file generation.
10. **One SourceFile per output path** — never duplicate SourceFile elements for the same file path.

---

## 13. Complete Component Quick Reference

### Import Patterns

```typescript
// Core imports
import {
  Output, SourceDirectory, SourceFile, Declaration,
  For, Show, Switch, Match, List, StatementList,
  Block, Indent, Scope, Wrap, Prose,
  code, text, refkey, namekey, memberRefkey,
  createContext, createNamedContext, useContext,
  ref, computed, effect, shallowRef, shallowReactive,
  render, renderAsync, writeOutput,
  children, mapJoin, join,
  stc, sti,
  createContentSlot,
  mergeProps, splitProps, defaultProps,
} from "@alloy-js/core";

// TypeScript imports
import * as ts from "@alloy-js/typescript";
import {
  createTSNamePolicy, tsNameConflictResolver,
  createPackage,
} from "@alloy-js/typescript";

// Testing imports
import "@alloy-js/core/testing/extend-expect";
import { d } from "@alloy-js/core/testing";
import { createTSTestWrapper } from "@alloy-js/typescript/testing";
```

### Minimal Complete Example

```tsx
import { Output, SourceDirectory, For, code, refkey, render, writeOutput } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { createTSNamePolicy, tsNameConflictResolver, createPackage } from "@alloy-js/typescript";

// Define external package
const myLib = createPackage({
  name: "my-lib",
  version: "1.0.0",
  descriptor: { ".": { named: ["helper"] } }
});

// Define types
interface Model { name: string; properties: Property[] }
interface Property { name: string; type: string; optional?: boolean }

function generateCode(models: Model[]) {
  return (
    <Output
      namePolicy={createTSNamePolicy()}
      nameConflictResolver={tsNameConflictResolver}
      externals={[myLib]}
    >
      <SourceDirectory path="src">
        <ts.SourceFile path="models.ts">
          <For each={models} doubleHardline>
            {(model) => {
              const modelKey = refkey(model);
              return (
                <ts.InterfaceDeclaration name={model.name} refkey={modelKey} export>
                  <For each={model.properties} semicolon hardline enderPunctuation>
                    {(prop) => (
                      <ts.InterfaceMember
                        name={prop.name}
                        type={prop.type}
                        optional={prop.optional}
                      />
                    )}
                  </For>
                </ts.InterfaceDeclaration>
              );
            }}
          </For>
        </ts.SourceFile>

        <ts.SourceFile path="utils.ts">
          <ts.FunctionDeclaration name="processModel" export async>
            {code`
              const result = ${myLib.helper}("test");
              return result;
            `}
          </ts.FunctionDeclaration>
        </ts.SourceFile>

        <ts.BarrelFile />
      </SourceDirectory>
    </Output>
  );
}

// Render and write
const output = render(generateCode(myModels));
await writeOutput(output);
```

### Minimal Template to Start New Alloy TS Emitters

```tsx
<Output program={program} namePolicy={createTSNamePolicy()}>
  <SomeContext.Provider value={ctx}>
    <SourceFile path="models.ts">{/* declarations with refkeys */}</SourceFile>
    <SourceFile path="serialization.ts">{/* serializer functions */}</SourceFile>
    <SourceFile path="rest-code.ts">{/* operation call code */}</SourceFile>
  </SomeContext.Provider>
</Output>
```

---

## Summary of Key Principles

1. **Always use refkeys** for cross-referencing declarations. Never manually write imports.
2. **Always use `code` templates** for code strings with embedded references. Never use string concatenation.
3. **Compose with components** — break complex output into small, focused components (TOP → MIDDLE → LEAF).
4. **Use contexts for shared state** — no prop drilling. Define context + hook pairs with fail-fast guards.
5. **Use `<For>`** for all iteration, with appropriate separators (`comma`, `hardline`, `joiner`).
6. **Use `<Show>` and `<Switch>`** for conditional rendering — not ternaries in code templates for structural decisions.
7. **Register external packages** with `createPackage()` — never hardcode import paths for npm packages.
8. **One `<SourceFile>` per output path** — never duplicate SourceFile elements for the same file.
9. **Let Alloy handle formatting** — don't manually add spaces or line breaks except via `<hbr />` and `<StatementList>`.
10. **Test with `toRenderTo`** — validate rendered output against expected strings or file maps.
