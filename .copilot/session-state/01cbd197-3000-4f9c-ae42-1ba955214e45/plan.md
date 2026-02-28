# Smoke Test Error Analysis Report

## Summary

Running `pnpm build && pnpm test:smoke` produces **50+ TypeScript compilation errors** across **7 files** in the generated output at `temp/smoke/http-client-js/`. These errors stem from **7 distinct root causes** in the code generator.

---

## Root Cause 1: `Array.join()` on Alloy `Children` objects → `[object Object]` in output

**Source file**: `src/components/classical-operation-groups.tsx`, function `buildMethodParamList()` (~line 313)

**Bug**: The function builds an array of Alloy `Children` objects (from `code` template literals) and then calls `.join(", ")` on them. JavaScript's `.join()` calls `.toString()` on each element, and Alloy `Children` objects don't have a useful `.toString()` — they render as `[object Object]`.

```typescript
// BROKEN (current):
function buildMethodParamList(method): Children {
  const parts: Children[] = [];
  for (const param of method.parameters) {
    parts.push(code`${param.name}: ${getTypeExpression(param.type)}`);
  }
  parts.push(code`options?: ${operationOptionsRefkey(method)}`);
  return code`${parts.join(", ")}`; // ← .join() on Children[] → [object Object]
}
```

**Generated output** (`src/classic/widgets/index.ts`):

```typescript
export interface WidgetsOperations {
  list: (options?: ,[object Object]) => Promise<(Widget)[]>
  read: (id,: ,string, options?: ,[object Object]) => Promise<Widget>
  // ... etc
}
```

**TS errors produced**: 26 syntax errors (TS1110, TS1005, TS1138) in `src/classic/widgets/index.ts`

---

## Root Cause 2: Barrel files use hardcoded string exports that don't match actual generated output

**Source file**: `src/components/index-file.tsx`

The barrel file generator constructs `export { ... } from "..."` statements as raw strings using `buildExportStatement()`. These strings are **not** connected to Alloy's refkey system, so they can't validate that the referenced symbols or paths actually exist. This causes **5 sub-issues**:

### 2a. Wrong relative path for client context in api/index.ts

**Location**: `ApiIndexFile()`, line 209

```typescript
filePath: `./${camelCase(client.name)}Context.js`,
// Produces: ./demoServiceClientContext.js
// But api/index.ts is at src/api/, so this resolves to src/api/demoServiceClientContext.js
// The actual file is at src/demoServiceClientContext.ts (one level up)
```

Same issue in `RootIndexFile()` line 102: `./api/${camelCase(ce.className)}Context.js` resolves to `src/api/demoServiceClientContext.js` which doesn't exist.

**TS errors produced**: 2 TS2307 errors ("Cannot find module") in `src/api/index.ts` and `src/index.ts`

### 2b. Re-exporting types that aren't exported from the referenced file

**Location**: `collectAllOperationExports()`, lines 410-411

```typescript
names.push(getOptionsInterfaceName(method)); // e.g., "ListOptionalParams"
names.push(method.name); // e.g., "list"
```

This assumes `ListOptionalParams` is exported from `operations.ts`, but it's only **imported** there from `options.ts`. The barrel file should either export from `options.ts` directly or operations.ts should re-export these types.

**TS errors produced**: 12 TS2459 errors ("declares locally but not exported") across `src/api/index.ts` and `src/index.ts`

### 2c. Reserved word `delete` used as bare export name

**Location**: `buildExportStatement()`, line 487

```typescript
export { ..., delete, ... } from "./widgets/operations.js";
// But the actual export is $delete (escaped by name policy)
```

No reserved-word escaping is applied when building export statements.

**TS errors produced**: 2 TS2724 errors ("Did you mean '$delete'?") in `src/api/index.ts` and `src/index.ts`

### 2d. `KnownXxx` enum variants unconditionally included

**Location**: `buildModelExportNames()`, line 369

```typescript
for (const enumType of enums) {
  names.push(enumType.name);
  names.push(`Known${enumType.name}`); // ← Always added, but only generated for extensible enums
}
```

`KnownWidgetColor` and `KnownMergePatchUpdateColor` are added to the export list, but the `EnumDeclaration` component only emits `Known` variants when `!type.isFixed && experimentalExtensibleEnums`. For fixed enums, no `Known` variant exists.

**TS errors produced**: 2 TS2724 errors in `src/models/index.ts`

### 2e. `Error` model name mismatch

**Location**: `buildModelExportNames()`, line 359

```typescript
names.push(model.name); // TCGC name: "Error"
```

But `Error` is detected as an Azure Core error type and excluded from model generation (in `model-files.tsx`). When referenced, it maps to `ErrorModel` from an external package. The barrel file exports the raw TCGC name `Error`, which doesn't exist as a generated symbol.

**TS errors produced**: 1 TS2305 error in `src/models/index.ts`

---

## Root Cause 3: Hardcoded `endpoint` variable name ignoring name policy transformation

**Source files**: `src/components/client-context.tsx` (lines 740, 743) and `src/components/classical-client.tsx` (line 343)

The TCGC parameter name is `"endpoint"`, which the name policy transforms to `"endpointParam"` (because `endpoint` is a reserved parameter name — gets `Param` suffix). However, the code generator hardcodes the raw name:

```typescript
// client-context.tsx line 740/743:
parts.push(code`const endpointUrl = options.endpoint ?? endpoint;`);
// Should reference the name-policy-transformed parameter name

// classical-client.tsx line 343:
args.push(arg.name); // arg.name = "endpoint" (raw TCGC name, not transformed)
```

**Generated output** (`src/demoServiceClient.ts`):

```typescript
constructor(endpointParam: string, ...) {
  this._client = createDemoService(endpoint, { ... });  // ← endpoint is undefined
```

**Generated output** (`src/demoServiceClientContext.ts`):

```typescript
function createDemoService(endpointParam: string, ...) {
  const endpointUrl = options.endpoint ?? endpoint;  // ← endpoint is undefined
```

**TS errors produced**: 2 TS2304 errors ("Cannot find name 'endpoint'") in `src/demoServiceClient.ts` and `src/demoServiceClientContext.ts`

---

## Root Cause 4: `expandUrlTemplate` declared but not available in runtime package

**Source file**: `src/utils/external-packages.ts`, line 56

```typescript
export const httpRuntimeLib = createPackage({
  name: "@typespec/ts-http-runtime",
  version: "0.2.1",
  descriptor: {
    ".": {
      named: [
        "expandUrlTemplate", // ← Not actually exported by @typespec/ts-http-runtime@0.2.1
      ],
    },
  },
});
```

The function `expandUrlTemplate` is listed in the external package descriptor but does not exist in `@typespec/ts-http-runtime@0.2.1`. The generated import compiles structurally but the symbol is not found at build time.

**TS errors produced**: 1 TS2305 error ("has no exported member 'expandUrlTemplate'") in `src/api/widgets/operations.ts`

---

## Root Cause 5: Generic type parameter `T` lowercased to `t` by name policy in XML helpers

**Source file**: `src/components/static-helpers/xml-helpers.tsx`

The component declares `typeParameters={["T"]}` (uppercase) and uses `<T>` and `as T` in the code body. However, the generated output has lowercase `t` in the function signature (`deserializeFromXml<t>`) while the body still uses uppercase `T`. This is likely caused by the name policy applying lowercase transformation to type parameters.

**Generated output** (`src/static-helpers/xmlHelpers.ts`):

```typescript
export function deserializeFromXml<t>(xmlString: string, ...): any {
  return deserializeXmlObject<T>(xmlElementToObject(root), properties);  // T ≠ t
  // ...
  return result as T;  // T ≠ t
}
```

**TS errors produced**: 2 TS2552 errors ("Cannot find name 'T'. Did you mean 't'?") in `src/static-helpers/xmlHelpers.ts`

---

## Root Cause 6: Classic operation group file import paths are one level too shallow

**Observed in**: `src/classic/widgets/index.ts` (auto-generated by Alloy's refkey resolution)

The file at `src/classic/widgets/index.ts` has imports using `../` (resolves to `src/classic/`) instead of `../../` (resolves to `src/`):

```typescript
import { $delete, ... } from "../api/widgets/operations.js";        // → src/classic/api/... (WRONG)
import type { DemoServiceContext } from "../demoServiceClientContext.js"; // → src/classic/demoService... (WRONG)
import type { Widget } from "../models/models.js";                   // → src/classic/models/... (WRONG)
```

These are Alloy-resolved imports (via refkeys, not manually constructed), meaning Alloy's relative path computation is off by one directory level. This is likely caused by how `<SourceDirectory path="classic">` and `<SourceFile path="widgets/index.ts">` interact in the component tree.

Note: Two separate `<SourceDirectory path="classic">` nodes exist in the output tree — one wrapping `ClassicalOperationGroupFiles` (in `classical-operation-groups.tsx` line 89) and one wrapping `ClassicIndexFile` (in `index-file.tsx` line 302). This split may confuse Alloy's path resolution.

**TS errors produced**: Currently **masked** by Root Cause 1's syntax errors. If Root Cause 1 is fixed, these would surface as TS2307 errors.

---

## Root Cause 7: Empty `classic/index.ts` barrel file

**Source file**: `src/components/index-file.tsx`, `ClassicIndexFile()` (lines 237-239)

```typescript
export function ClassicIndexFile() {
  return <BarrelFile />;
}
```

The `<BarrelFile />` component is rendered without any configuration. Since it's in a separate `<SourceDirectory path="classic">` from the actual operation group files (which are in their own `<SourceDirectory path="classic">`), the BarrelFile cannot auto-discover any symbols to re-export.

**Generated output** (`src/classic/index.ts`): Empty file.

**TS errors produced**: None directly (empty file is valid TypeScript), but the classic barrel is non-functional.

---

## Error Count Summary

| Root Cause                                      | TS Errors      | Files Affected                                    |
| ----------------------------------------------- | -------------- | ------------------------------------------------- |
| 1. `[object Object]` from `.join()` on Children | 26             | classic/widgets/index.ts                          |
| 2a. Wrong context path in barrel                | 2              | api/index.ts, index.ts                            |
| 2b. Non-exported types re-exported              | 12             | api/index.ts, index.ts                            |
| 2c. Reserved word `delete` unescaped            | 2              | api/index.ts, index.ts                            |
| 2d. `KnownXxx` unconditionally added            | 2              | models/index.ts                                   |
| 2e. `Error` → `ErrorModel` mismatch             | 1              | models/index.ts                                   |
| 3. Hardcoded `endpoint` name                    | 2              | demoServiceClient.ts, demoServiceClientContext.ts |
| 4. Missing `expandUrlTemplate`                  | 1              | api/widgets/operations.ts                         |
| 5. Type param `T` vs `t` casing                 | 2              | static-helpers/xmlHelpers.ts                      |
| 6. Import paths one level shallow               | (masked)       | classic/widgets/index.ts                          |
| 7. Empty classic barrel                         | 0 (functional) | classic/index.ts                                  |
| **Total**                                       | **50+**        | **7 files**                                       |
