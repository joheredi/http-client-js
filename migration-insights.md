## 1. What is the Alloy Migration

### The Old System (ts-morph)

The emitter used **ts-morph** — a TypeScript AST manipulation library. Code generation was imperative:

```typescript
// Old: Build AST nodes imperatively
const sourceFile = project.createSourceFile("models.ts");
const interfaceDecl = sourceFile.addInterface({ name: "Foo", isExported: true });
interfaceDecl.addProperty({ name: "bar", type: "string" });

// Old: Two-phase placeholder resolution
const code = `return ${resolveReference(serializerRefkey(type))}(input);`;
// Binder later scans for "serializerRefkey_TypeName" and adds import
addDeclaration(sourceFile, functionDecl, serializerRefkey(type));
binder.resolveAllReferences();
```

**Problems:** Fragile string-based resolution, manual import tracking, no cross-file reference safety, hard to compose.

### The New System (Alloy JSX)

**Alloy** (`@alloy-js/core` + `@alloy-js/typescript`) uses JSX to build an in-memory symbol tree, then renders to files. It is NOT React — there's no DOM, no browser, no event system. JSX is purely a structural description language for code output.

```tsx
// New: Declarative JSX components
<ts.SourceFile path="models.ts">
  <ts.InterfaceDeclaration name="Foo" refkey={typeRefkey(fooType)} export>
    <ts.InterfaceMember name="bar" type="string" />
  </ts.InterfaceDeclaration>
</ts.SourceFile>

// New: Refkeys resolve automatically — imports computed by framework
code`return ${serializerRefkey(type)}(input);`
// Alloy finds the declaration, computes the path, generates the import
```

### The Core Pipeline

```
TypeSpec Input → Compiler → TCGC SDK Types → Alloy JSX Components → Symbol Tree → String Output → Files
```

---

### 2. Alloy Emitter Data Flow

```
$onEmit (compiler hook)
|
├─ generateModularSources()
└─ emitAlloyOutput() → writeOutput() with JSX tree
     ├─ <Output> (name policy, externals)
     └─ <SdkContextProvider> (DI for SDK context)
          ├─ <Logger />
          ├─ <ModelFiles />  (types + serializers + XML in unified files)
          ├─ <Operations />  (per-group operation functions)
          ├─ For each client:
          │   ├─ <OperationOptions />
          │   ├─ <RestorePoller />
          │   ├─ <ClientContext />
          │   ├─ <ClassicalClient />
          │   └─ <ClassicalOperationGroups />
          ├─ <RootIndex />
          ├─ <SubpathIndex />
          ├─ <StaticHelperFiles />
          └─ <Samples /> (if generate-sample: true)
```

## 3. The Alloy Framework — Mental Model

### Core Pipeline

1. **JSX Rendering → Symbol Tree**: JSX elements create tree nodes representing code declarations, references, and source files
2. **Refkey Resolution**: Every refkey used as a child (reference) is matched to its owning declaration
3. **Auto-Import**: Cross-file references automatically generate import statements
4. **writeOutput**: Renders the symbol tree to strings and writes files

### Key Alloy Elements

From `@alloy-js/typescript`:
- `<ts.SourceFile path="models.ts">` — defines an output file
- `<ts.FunctionDeclaration>` — a function with name, params, return type
- `<ts.InterfaceDeclaration>` — a TypeScript interface
- `<ts.TypeDeclaration>` — a `type X = ...` alias
- `<ts.EnumDeclaration>` — a TypeScript enum
- `<ts.ClassDeclaration>` — a TypeScript class

From `@alloy-js/core`:
- `<For each={items}>` — iteration (replaces `.map()`)
- `<Show when={condition}>` — conditional rendering
- `` code`...` `` — tagged template for inline code with embedded refkeys
- `refkey(entity, discriminator)` — creates symbolic pointers
- `createNamedContext()` / `useContext()` — dependency injection

### The `code` Tagged Template

```tsx
import { code } from "@alloy-js/core";

// Refkeys interpolated directly — Alloy resolves them
code`return ${serializerRefkey}(${paramRefkey});`
// Produces: return fooSerializer(item);
// AND: import { fooSerializer } from "./models/models.js";
```

**Critical property:** `code` templates treat interpolated refkeys as live symbolic references, not string concatenation. Alloy tracks them and resolves imports.

---


## 5. The Refkey System — Deep Dive

This is the **single most important concept** in Alloy. Refkeys replace ALL manual import calculation.

### Creating Refkeys

```tsx
import { refkey, Refkey } from "@alloy-js/core";

// Entity-bound refkey — same entity always returns same refkey
const key3 = refkey(sdkType);                    // stable per sdkType instance
const key4 = refkey(sdkType, "serializer");      // different discriminator = different key
const key5 = refkey(sdkType, "deserializer");    // yet another distinct key
const key6 = refkey(sdkType, "serializer");      // SAME as key4 (same entity + discriminator)
```

### The `refkey(entity, discriminator)` Pattern

A single TCGC type needs multiple generated artifacts. Each gets the same base entity but a different discriminator:

```tsx
// Type declarations
typeRefkey(type)             → refkey(type)                    // interface
polymorphicTypeRefkey(type)  → refkey(type, "polymorphicType") // union alias
knownValuesRefkey(type)      → refkey(type, "knownValues")     // KnownValues enum

// JSON serialization
serializerRefkey(type)       → refkey(type, "serializer")      // serializer function
deserializerRefkey(type)     → refkey(type, "deserializer")    // deserializer function
baseSerializerRefkey(type)   → refkey(type, "baseSerializer")  // discriminated union base
baseDeserializerRefkey(type) → refkey(type, "baseDeserializer")

// XML serialization
xmlSerializerRefkey(type)           → refkey(type, "xmlSerializer")
xmlObjectSerializerRefkey(type)     → refkey(type, "xmlObjectSerializer")
xmlDeserializerRefkey(type)         → refkey(type, "xmlDeserializer")
xmlObjectDeserializerRefkey(type)   → refkey(type, "xmlObjectDeserializer")

// Static helpers
serializationHelperRefkey("name")   → refkey("StaticHelpers", "Serialization", name)
xmlHelperRefkey("name")             → refkey("StaticHelpers", "Xml", name)
pagingHelperRefkey("name")          → refkey("StaticHelpers", "Paging", name)
pollingHelperRefkey("name")         → refkey("StaticHelpers", "Polling", name)
```

### How Declarations Create Targets

When a `<ts.FunctionDeclaration>` receives a `refkey` prop, it registers that refkey as owned by that declaration in that file:

```tsx
// In models.ts — declaration OWNS the refkey
<ts.InterfaceDeclaration name="Foo" refkey={typeRefkey(type)} export>
  {/* members */}
</ts.InterfaceDeclaration>

// In serializers.ts — owns a different refkey for same type
<ts.FunctionDeclaration
  name="fooSerializer"
  refkey={serializerRefkey(type)}
  export
  parameters={[{ name: "item", type: typeRefkey(type) }]}
>
  {/* body */}
</ts.FunctionDeclaration>
```

### How Cross-File References Resolve

```tsx
// In operations.ts — REFERENCES the serializer from models.ts
<ts.FunctionDeclaration name="createFoo" export>
  {code`const body = ${serializerRefkey(bodyType)}(options.body);`}
  {/* ↑ Alloy sees serializerRefkey(bodyType) as a reference.
       It finds the declaration in models.ts.
       It auto-generates: import { fooSerializer } from "./models/models.js"; */}
</ts.FunctionDeclaration>
```

Resolution chain:
1. `serializerRefkey(bodyType)` appears as interpolated value in `code` template
2. Alloy looks up which declaration owns that refkey → finds it in `models.ts`
3. Current file is `operations.ts` → different file → needs import
4. Alloy computes the relative path and emits the import
5. If the reference were in `models.ts` itself → same file → **no import emitted**

### External Package References

```tsx
export const httpRuntimeLib = createPackage({
  name: "@typespec/ts-http-runtime",
  version: "0.1.0",
  descriptor: {
    ".": {
      named: ["Client", "ClientOptions", "Pipeline", "getClient", "RestError", ...]
    }
  }
});

// Register in Output component
<EFOutput externals={[httpRuntimeLib, azureCoreAuthLib, ...]}>

// Use anywhere — auto-imports from npm
code`const client: ${httpRuntimeLib.Client} = ${httpRuntimeLib.getClient}(endpoint);`
// → import { Client, getClient } from "@typespec/ts-http-runtime";
```

### CRITICAL: Two Different `refkey` Functions Exist

```typescript
// OLD framework (NEVER use in Alloy components):
import { refkey } from "../../framework/refkey.js";  // returns string
const key = refkey("MyModel", "serializer");  // "refkey_MyModel_serializer"

// Alloy (ALWAYS use in components):
import { refkey } from "@alloy-js/core";  // returns Refkey object
const key = refkey(sdkType, "serializer");
```

VS Code autocompletion may pick the wrong import. The `"StaticHelpers"` prefix acts as a namespace fence.

---

## 6. Anti-Patterns — CRITICAL

These patterns cause real bugs, gate rejections, and multi-round remediation cycles. **Every agent MUST avoid them.**

### Anti-Pattern 1: String-Based Reference Resolution (Regex/Token Scanning)

```tsx
// ❌ DO NOT DO THIS — from Operations.tsx before remediation
const staticHelperNamePattern = /\b(serializeRecord|buildMultiCollection|...)\b/g;

function resolveStaticHelperRefs(text: string): Children {
  const parts: Children[] = [];
  for (const match of text.matchAll(staticHelperNamePattern)) {
    parts.push(serializationHelperRefkey(match[0]));
  }
  return <>{parts}</>;
}
```

**Why it's bad:** Token-collision bugs, silent misses, defeats Alloy's symbolic system. Rejected in **5 consecutive gate reviews**.

```tsx
// ✅ CORRECT — refkey used directly where the helper is needed
code`return ${serializationHelperRefkey("serializeRecord")}(obj, serializer);`
```

### Anti-Pattern 2: Manual Import-String Calculation/Assembly

```tsx
// ❌ DO NOT DO THIS
const apiImport = `import { create${name} } from "./api/index.js";`;
const lroImports = `import { getSimplePoller } from "./static-helpers/simplePollerHelpers.js";`;
```

**Why it's bad:** Alloy can't track symbols for deduplication, path calculation is fragile, name collisions not detected, self-imports not suppressed. We had ~35 self-import bugs from this.

```tsx
// ✅ CORRECT — use refkeys, let Alloy resolve imports
<ts.ClassDeclaration name={clientName} export refkey={classicalClientRefkey(client)}>
  {code`this._client = ${createClientRefkey(client)}(endpoint, options);`}
</ts.ClassDeclaration>
```

### Anti-Pattern 3: Building Import Paths with String Concatenation

```tsx
// ❌ DO NOT DO THIS
const prefix = "../".repeat(maxLayer + 2);
imports.push(`import { ${rlcClientType} } from "${prefix}api/index.js";`);
```

**Why it's bad:** Relative paths change based on nesting depth, manual path math is error-prone.

```tsx
// ✅ CORRECT — reference the refkey directly, Alloy computes the path
code`${serializationHelperRefkey("serializeRecord")}(obj, serializer)`
```

### Anti-Pattern 4: Post-Render String Scanning (`resolveReference`)

```tsx
// ❌ DO NOT DO THIS
function resolveLegacyExpressionReferences(expression: string): Children {
  return expression.replace(/buildCsvCollection/g, () => {
    return resolveReference(context, refkey("buildCsvCollection"));
  });
}
```

**Why it's bad:** Post-render scanning means Alloy's tree is finalized, references aren't tracked, imports can't work.

```tsx
// ✅ CORRECT — build the expression with refs from the start
code`${serializationHelperRefkey("buildCsvCollection")}(${items})`
```

### Anti-Pattern 5: Monolithic String Blocks

```tsx
// ❌ DO NOT DO THIS — one giant code template for entire file
<ts.SourceFile path="client.ts">
  {code`
    import { Pipeline } from "@azure/core-rest-pipeline";
    export class FooClient {
      constructor(endpoint: string) { ... }
      getFoo(id: string): Promise<Foo> { return getFoo(this._client, id); }
    }
  `}
</ts.SourceFile>
```

**Why it's bad:** Imports are raw strings Alloy can't manage, no refkeys on declarations, can't reference this client from elsewhere.

```tsx
// ✅ CORRECT — compose with structural components
<ts.SourceFile path="client.ts">
  <ts.ClassDeclaration name={clientName} refkey={classicalClientRefkey(client)} export>
    <ts.FunctionDeclaration name="constructor" parameters={params}>
      {code`this._client = ${createClientRefkey(client)}(endpoint, options);`}
    </ts.FunctionDeclaration>
    <For each={operations} doubleHardline>
      {(op) => <ClassicalOperationMethod operation={op} />}
    </For>
  </ts.ClassDeclaration>
</ts.SourceFile>
```

### Anti-Pattern 6: Mixing Structural and Behavioral Changes

**Why it's bad:** Impossible to attribute regressions, review burden multiplied, rollback granularity lost.

**Correct:** Phase-gated isolated changes:
- **Slice A:** Structural refkey/architecture-only migration (output should be byte-identical)
- **Slice B:** Behavioral changes with dedicated verification

---
## 7. Idiomatic Alloy Patterns

### Pattern 1: Refkeys as Children in `code` Templates

```tsx
code`const result = ${deserializerRefkey(responseType)}(response.body);`

// Multiple refkeys in one template
code`const client = ${httpRuntimeLib.getClient}(endpoint, ${clientOptionsRefkey});`
```

### Pattern 2: Typed Declaration Components

```tsx
<ts.FunctionDeclaration
  name="fooSerializer"
  refkey={serializerRefkey(fooType)}
  export
  parameters={[
    { name: "item", type: typeRefkey(fooType) },  // type is a refkey → auto-import
    { name: "options", type: "SerializerOptions", optional: true }
  ]}
  returnType="Record<string, unknown>"
>
  {/* function body */}
</ts.FunctionDeclaration>
```

### Pattern 3: Component Composition

```tsx
// TOP → MIDDLE → LEAF decomposition
function Operations() {
  return (
    <For each={operationGroups}>
      {([key, operations]) => (
        <ts.SourceFile path={filepath}>
          <For each={operations}>
            {(op) => (
              <>
                <SendFunction operation={op} />
                <DeserializeFunction operation={op} />
                <PublicOperation operation={op} />
              </>
            )}
          </For>
        </ts.SourceFile>
      )}
    </For>
  );
}
```

### Pattern 4: External Packages via `createPackage()`

```tsx
export const httpRuntimeLib = createPackage({
  name: "@typespec/ts-http-runtime",
  version: "0.1.0",
  descriptor: {
    ".": { named: ["Client", "getClient", "RestError", ...] }
  }
});

// Register in Output, use anywhere
code`const client: ${httpRuntimeLib.Client} = ${httpRuntimeLib.getClient}(endpoint);`
```

### Pattern 5: `ParameterDescriptor[]` for Function Parameters

```tsx
// ❌ WRONG — will silently produce wrong output
<ts.FunctionDeclaration parameters={{ item: typeRef }} />

// ✅ CORRECT — ParameterDescriptor[] format
<ts.FunctionDeclaration parameters={[{ name: "item", type: typeRef }]} />

// Type can be refkey, string, or JSX
<ts.FunctionDeclaration parameters={[
  { name: "item", type: refkey(type) },           // refkey → auto-import
  { name: "options", type: "SerializerOptions" },  // string literal
  { name: "body", type: <TypeExpression type={bodyType} /> },  // JSX element
]} />
```

Note: Alloy uses `default` not `initializer` for default values:
```tsx
// ❌ ts-morph shape: { name: "options", initializer: "{ requestOptions: {} }" }
// ✅ Alloy shape:    { name: "options", default: "{ requestOptions: {} }" }
```

### Pattern 6: `<For>` for Iteration

```tsx
<For each={operations} doubleHardline>
  {(operation) => <OperationDeclaration operation={operation} />}
</For>

// With formatting
<For each={members} comma hardline enderPunctuation>
  {(member) => <ts.EnumMember name={member.name} jsValue={member.value} />}
</For>

// Joiner for union types
<For each={subtypes} joiner=" | ">
  {(subtype) => typeRefkey(subtype)}
</For>
```

### Pattern 7: Context/Hooks for Shared State

```tsx
// DEFINE
export const SdkContextAlloy = createNamedContext<SdkContextValue>("SdkContext");
export function useSdkContext(): SdkContext {
  return useContext(SdkContextAlloy).sdkContext;
}

// PROVIDE (top-level)
<SdkContextAlloy.Provider value={contextValue}>
  <ModelFiles />
  <Operations />
</SdkContextAlloy.Provider>

// CONSUME (any depth — no prop threading)
function SomeLeafComponent() {
  const sdkContext = useSdkContext();
  // ...
}
```

### Pattern 8: The `namekey` Pattern for Preserving Names

```tsx
import { namekey } from "@alloy-js/core";

// Without namekey: Alloy might transform "LRO" → "lro" or "HTTPClient" → "httpClient"
function preservedName(name: string) {
  return namekey(name, { ignoreNamePolicy: true });
}

<ts.InterfaceDeclaration name={preservedName("LROPoller")} export>
```

### Pattern 9: Multi-Line Code with Explicit Newlines

```tsx
// Use <hbr /> for explicit line breaks between code blocks
// Use <VarDeclaration> to emit a var declaration and refernece the new var
return (
  <>
    <VarDeclaration refkey={nameKey("result")}>
       {code`await ${sendRef}(${parameterList});`}
    </VarDeclaration>
    <hbr /> 
    {code`return ${deserializeRef}(${nameKey("result")});`}
  </>
);
```

---

## 10. Serializer Patterns — JSON & XML

### Architecture Overview

Three layers per model type, all rendered into the **same output file** (`src/models/models.ts`):

1. **Type declarations** — `interface Foo { ... }` (Models.tsx)
2. **Serializer functions** — `function fooSerializer(item: Foo): any { ... }` (Serializers.tsx)
3. **Deserializer functions** — `function fooDeserializer(item: any): Foo { ... }` (Serializers.tsx)
4. **XML functions** — 4 per type: serializer, objectSerializer, deserializer, objectDeserializer (XmlSerializers.tsx)

### The ModelFiles Unification (Critical)

Separate `<ts.SourceFile>` elements for types and serializers cause **self-imports**. The fix is `ModelFiles.tsx`:

```tsx
// ❌ BAD — separate SourceFile per component → self-imports
<ts.SourceFile path="models.ts">
  <ModelType type={fooType} />          {/* declares interface Foo */}
</ts.SourceFile>
<ts.SourceFile path="models.ts">
  <TypeSerializers typeOrProp={fooType} />  {/* references Foo → self-import! */}
</ts.SourceFile>

// ✅ GOOD — ModelFiles.tsx unifies into single SourceFile
<ts.SourceFile path="models.ts">
  <ModelType type={fooType} />
  <TypeSerializers typeOrProp={fooType} />
  <XmlModelSerializers type={fooType} />
</ts.SourceFile>
```

Sorting order: `model (0)` → `serializer (1)` → `xml (2)`, so type declarations always precede serializers.

### JSON vs XML Differences

| Aspect | JSON | XML |
|--------|------|-----|
| Functions per type | 2 (serializer, deserializer) | 4 (serializer, objectSerializer, deserializer, objectDeserializer) |
| Return type (serializer) | `any` | `string` or `XmlSerializedObject` |
| Body generation | Inline property mapping via `code` templates | Metadata-driven: `serializeToXml()` / `deserializeFromXml()` static helpers |
| Type coverage | model, union, enum, dict, array, flatten | model only |

### Serializer Migration Order Recommendation

If starting fresh:
1. **Static helper refkeys FIRST** — every serializer depends on these
2. **XML serializers BEFORE JSON** — simpler (model-only, metadata-driven, no unions/arrays/flatten), serves as authoritative pattern
3. **JSON serializers** — follow XML patterns + add dict/array/union/flatten/multipart
4. **ModelFiles unification** — eliminate self-imports
5. **`getRequestModelMapping` / `getResponseMapping` LAST** — most entangled with old binder

### Polymorphic Type Refkey Pattern

```tsx
// Polymorphic serializers use refkey(type, "polymorphicType") for parameter type
<ts.FunctionDeclaration
  refkey={serializerRefkey(type)}
  parameters={[{ name: "item", type: refkey(type, "polymorphicType") }]}  // union type, NOT base
/>

// Deserializer mirrors — returnType is polymorphic too
<ts.FunctionDeclaration
  refkey={deserializerRefkey(type)}
  parameters={[{ name: "item", type: "any" }]}
  returnType={refkey(type, "polymorphicType")}
/>
```

## 11. Gotchas & Hard-Won Lessons

### Gotcha 1: `returnType` Prop Behavior

`<ts.FunctionDeclaration>`'s `returnType` prop accepts `string | Children`.

```tsx
// ❌ WRONG — renders refkey's internal ID
<ts.FunctionDeclaration returnType={modelTypeRefkey(someType)}>

// ✅ CORRECT — use getTypeExpression() for string return types
<ts.FunctionDeclaration returnType={getTypeExpression(context, response.type)}>

// ✅ ALSO CORRECT — code templates with refkeys work in returnType
<ts.FunctionDeclaration
  returnType={code`${staticHelperRefs.PagedAsyncIterableIterator}<${elementType}>`}
>
```

### Gotcha 2: Recursive Type Building with Refkeys

```tsx
// ❌ WRONG — string concatenation loses refkey
return `${getReturnTypeChildren(context, type.valueType)}[]`;
// Calls .toString() → "[object Object][]"

// ✅ CORRECT — code template preserves refkey resolution
return code`${getReturnTypeChildren(context, type.valueType)}[]`;
```

### Gotcha 3: Exception Handling Needs Original Response Objects

```tsx
// ❌ WRONG — can't generate refkey from string
const deserializerName = `${exceptionModelName}Deserializer`;
return code`error.details = ${deserializerName}(result.body);`;

// ✅ CORRECT — find exception type for refkey
const defaultException = operation.operation.exceptions.find(ex => ex.statusCodes === "*");
return code`error.details = ${deserializerRefkey(defaultException.type)}(result.body);`;
```

### Gotcha 4: Static Helpers Need Refkey Declarations

If you add a new static helper that other components reference, you MUST add a refkey declaration in `StaticHelpers.tsx`. Otherwise, consumers fall back to explicit import management.


## 12. Key File Paths

### Production Code

| File | Role |
|------|------|
| `@submodules/autorest.typescript/packages/typespec-ts/src/index.ts` | Production entry point — all pipeline wiring |
| `@submodules/autorest.typescript/packages/typespec-ts/src/alloy-emitter.tsx` | Alloy component tree root |
| `@submodules/autorest.typescript/packages/typespec-ts/src/modular/components/` | 22 Alloy JSX components |
| `@submodules/autorest.typescript/packages/typespec-ts/src/modular/components/StaticHelpers.tsx` | Refkey accessors for static helpers |
| `@submodules/autorest.typescript/packages/typespec-ts/src/modular/components/ExternalPackages.tsx` | npm package definitions |
| `@submodules/autorest.typescript/packages/typespec-ts/src/modular/helpers/operationHelpers.ts` | Shared utilities (~2700 lines) |
| `@submodules/autorest.typescript/packages/typespec-ts/src/modular/model-utils.ts` | Pure utilities extracted from emitModels.ts |
| `@submodules/autorest.typescript/packages/typespec-ts/src/modular/emitModels.ts` | OLD ts-morph generation (being deprecated) |
| `@submodules/autorest.typescript/packages/typespec-ts/src/framework/hooks/binder.ts` | OLD resolveReference system |
| `@submodules/autorest.typescript/packages/typespec-ts/src/framework/load-static-helpers-alloy.ts` | New string-based static helper loader |
| `@submodules/autorest.typescript/packages/typespec-ts/static/static-helpers/` | 21 runtime helper source files |

### Reference Implementation

| File | Role |
|------|------|
| `@submodules/alloy/` | Alloy framework source (submodule) |
| `@submodules/alloy/packages/core` | Alloy framework Core source |
| `@submodules/alloy/packages/typescript` | Alloy framework TypeScript language package |
| `@submodules/flight-instructor/src/typescript/` | Reference Alloy emitter with idiomatic patterns |
| `@submodules/typespec-azure/packages/typespec-client-generator-core` | TCGC source |
