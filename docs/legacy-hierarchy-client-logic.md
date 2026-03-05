# Legacy Emitter: Client Hierarchy & Operation Group Logic

This document describes how the legacy autorest.typescript emitter
(`submodules/autorest.typescript/packages/typespec-ts/`) handles the
`hierarchy-client` and `enable-operation-group` options to control the
shape of generated classical clients. Understanding this logic is essential
for the http-client-js rewrite to achieve output parity.

> **Source files referenced** (all paths relative to
> `submodules/autorest.typescript/packages/typespec-ts/src/`):
>
> | File                                           | Role                                                 |
> | ---------------------------------------------- | ---------------------------------------------------- |
> | `transform/transfromRLCOptions.ts`             | Option defaults & conflict detection                 |
> | `utils/namespaceUtils.ts`                      | Namespace path computation per operation             |
> | `utils/operationUtil.ts`                       | `getMethodHierarchiesMap()` — core hierarchy builder |
> | `modular/buildClassicalClient.ts`              | Classical client class generation                    |
> | `modular/buildClassicalOperationGroups.ts`     | Operation group file generation                      |
> | `modular/helpers/classicalOperationHelpers.ts` | Operation group interfaces & factories               |
> | `modular/helpers/clientUtils.ts`               | `getClientHierarchyMap()` — TCGC client extraction   |

---

## 1. The Two Options

The legacy emitter has **two orthogonal options** that together control the
client surface shape:

### 1.1 `hierarchy-client`

```yaml
# tspconfig.yaml
options:
  "@azure-tools/typespec-ts":
    hierarchy-client: true # or false
```

**Controls nesting depth.** When `true`, the full TypeSpec
namespace/interface nesting is preserved in the generated client. When
`false`, nesting is collapsed to at most one level.

**Default: `true`** (when the user does not set the option).

```typescript
// transfromRLCOptions.ts:237-246
function getHierarchyClient(emitterOptions: EmitterOptions) {
  if (
    emitterOptions["hierarchy-client"] === true ||
    emitterOptions["hierarchy-client"] === false
  ) {
    return emitterOptions["hierarchy-client"];
  }
  // enable hierarchy client by default
  return true;
}
```

### 1.2 `enable-operation-group`

```yaml
# tspconfig.yaml
options:
  "@azure-tools/typespec-ts":
    enable-operation-group: true # or false
```

**Controls whether groups exist at all.** When `true`, operations from
TypeSpec interfaces and sub-namespaces are grouped behind an
`XxxOperations` interface on the client. When `false`, all operations are
placed directly on the root client class.

**Default: auto-detect** via `detectIfNameConflicts()`. If any two
operations within the same TCGC client share a name (e.g., two interfaces
both define `get()`), the option is set to `true` to avoid collisions.

```typescript
// transfromRLCOptions.ts:208-221
function getEnableOperationGroup(
  dpgContext: SdkContext,
  emitterOptions: EmitterOptions,
  isModularLibrary: boolean,
) {
  if (
    emitterOptions["enable-operation-group"] === true ||
    emitterOptions["enable-operation-group"] === false
  ) {
    return emitterOptions["enable-operation-group"];
  }
  return detectIfNameConflicts(dpgContext, isModularLibrary);
}
```

```typescript
// transfromRLCOptions.ts:252-273
function detectIfNameConflicts(
  dpgContext: SdkContext,
  isModularLibrary: boolean,
) {
  const clients = getRLCClients(dpgContext, isModularLibrary);
  for (const client of clients) {
    const nameSet = new Set<string>();
    for (const op of listOperationsUnderRLCClient(client)) {
      const route = getHttpOperationWithCache(dpgContext, op);
      const name = getOperationName(dpgContext, route.operation);
      if (nameSet.has(name)) {
        return true; // collision → enable groups
      } else {
        nameSet.add(name);
      }
    }
  }
  return false; // no collisions → groups not needed
}
```

---

## 2. Decision Matrix

| `hierarchy-client` | `enable-operation-group` | Generated Client Shape                                                                    |
| :----------------: | :----------------------: | ----------------------------------------------------------------------------------------- |
| `true` _(default)_ |           any            | **Full nested hierarchy** — namespace path preserved as nested operation group properties |
|      `false`       |          `true`          | **Single-level groups** — only the innermost interface/namespace name becomes a group     |
|      `false`       |         `false`          | **Completely flat** — all operations as direct methods on the root client                 |
|      `false`       |      unset _(auto)_      | Auto-detects collisions → `true` or `false` per above                                     |

### What Each Mode Produces

Given this TypeSpec:

```tsp
namespace MyService;

op rootOp(): void;

namespace Sub {
  interface Nested {
    op nestedOp(): void;
  }
}
```

| Mode                            | Generated Surface                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `hierarchy=true`                | `client.rootOp()`, `client.sub.nested.nestedOp()`                                    |
| `hierarchy=false, groups=true`  | `client.rootOp()`, `client.nested.nested_nestedOp()` _(single-level, prefixed name)_ |
| `hierarchy=false, groups=false` | `client.rootOp()`, `client.nestedOp()`                                               |

---

## 3. Namespace Path Computation

The function `getOperationNamespaceInterfaceName()` in `namespaceUtils.ts`
computes the grouping path for each operation:

```typescript
// namespaceUtils.ts:28-68
export function getOperationNamespaceInterfaceName(
  dpgContext: SdkContext,
  operation: Operation,
): string[] {
  const result: string[] = [];

  // Case 1: Both disabled → no grouping at all
  if (
    dpgContext.rlcOptions?.hierarchyClient === false &&
    dpgContext.rlcOptions?.enableOperationGroup !== true
  ) {
    return result; // empty → operation goes on root client
  }

  if (operation.interface) {
    // Case 2: Groups enabled but hierarchy disabled → single-level
    if (
      dpgContext.rlcOptions?.enableOperationGroup === true &&
      dpgContext.rlcOptions?.hierarchyClient === false
    ) {
      result.push(operation.interface.name);
      return result; // only the interface name, no parent namespaces
    }

    // Case 3: Hierarchy enabled → full path including parent namespaces
    if (
      operation.interface.namespace &&
      !isGlobalNamespace(dpgContext.program, operation.interface.namespace) &&
      !isService(dpgContext.program, operation.interface.namespace)
    ) {
      result.push(
        ...getModelNamespaceName(dpgContext, operation.interface.namespace),
      );
    }
    result.push(operation.interface.name);
  } else if (
    operation.namespace &&
    !isGlobalNamespace(dpgContext.program, operation.namespace) &&
    !isService(dpgContext.program, operation.namespace)
  ) {
    // Operations directly in a namespace (not in an interface)
    result.push(
      ...getModelNamespaceName(dpgContext, operation.namespace.namespace!),
    );
    result.push(operation.namespace.name);
  }

  return result;
}
```

### Path Examples

Given `Encode.Array.Property.commaDelimited`:

| Mode                            | Returned Path                                 |
| ------------------------------- | --------------------------------------------- |
| `hierarchy=true`                | `["Property"]` (namespace under service root) |
| `hierarchy=false, groups=true`  | `["Property"]` (only innermost name)          |
| `hierarchy=false, groups=false` | `[]` (empty → flat)                           |

Given `Client.Structure.Service.Baz.Foo.seven` (deeply nested):

| Mode                            | Returned Path                   |
| ------------------------------- | ------------------------------- |
| `hierarchy=true`                | `["Baz", "Foo"]`                |
| `hierarchy=false, groups=true`  | `["Foo"]` (only interface name) |
| `hierarchy=false, groups=false` | `[]`                            |

---

## 4. The Method Hierarchies Map

The `getMethodHierarchiesMap()` function (in `operationUtil.ts`) is the
core engine that translates the TCGC client tree into a flat map suitable
for code generation.

### 4.1 Input

A single TCGC `SdkClientType` with:

- `.methods` — operations directly on this client
- `.children` — child `SdkClientType` entries (operation groups or
  sub-clients)

### 4.2 Output

```typescript
Map<string, ServiceOperation[]>;
```

Where the key is the **group path** (e.g., `""` for root, `"Foo"` for a
single group, `"Baz/Foo"` for nested groups) and the value is the list of
operations in that group.

### 4.3 Algorithm

```typescript
// operationUtil.ts:673-768  (simplified)
export function getMethodHierarchiesMap(
  context: SdkContext,
  client: SdkClientType<SdkServiceOperation>,
): Map<string, ServiceOperation[]> {
  // 1. Initialize queue with non-independent children and root methods
  const methodQueue = [];
  client.children
    ?.filter(notIndependentlyInitialized)
    .forEach((child) => methodQueue.push([[], child]));
  client.methods.forEach((m) => methodQueue.push([[], m]));

  const result = new Map<string, ServiceOperation[]>();

  // 2. Process queue (BFS/DFS hybrid)
  while (methodQueue.length > 0) {
    const [rawPrefixes, item] = methodQueue.pop();

    // Prefix flattening: when hierarchy=false + groups=true,
    // keep only the last prefix segment
    const prefixes =
      context.rlcOptions?.hierarchyClient === false &&
      context.rlcOptions?.enableOperationGroup &&
      rawPrefixes.length > 0
        ? [rawPrefixes[rawPrefixes.length - 1]]
        : rawPrefixes;

    if (item.kind === "client") {
      // It's a child client → push its methods and children
      // with the client's name appended to the prefix path
      item.methods.forEach((m) =>
        methodQueue.push([[...prefixes, item.name], m]),
      );
      item.children
        ?.filter(notIndependentlyInitialized)
        .forEach((child) =>
          methodQueue.push([[...prefixes, item.name], child]),
        );
    } else {
      // It's an operation → place it in the map

      // Compute the group key
      const prefixKey =
        context.rlcOptions?.hierarchyClient ||
        context.rlcOptions?.enableOperationGroup
          ? prefixes.join("/") // e.g., "Foo" or "Baz/Foo"
          : ""; // flat → everything at root

      // When hierarchy=false + groups=true, prefix operation names
      // with the group name to avoid collisions
      const groupName = prefixes
        .map((p) => normalizeName(p, NameType.OperationGroup))
        .join("");
      if (
        context.rlcOptions?.hierarchyClient === false &&
        context.rlcOptions?.enableOperationGroup &&
        groupName !== "" &&
        !item.name.startsWith(groupName + "_")
      ) {
        item.oriName = item.name;
        item.name = `${groupName}_${item.name}`;
      }

      // Add to the map
      const existing = result.get(prefixKey) ?? [];
      result.set(prefixKey, [...existing, item]);
    }
  }

  return result;
}
```

### 4.4 Key Behaviors

1. **Prefix accumulation**: As the algorithm descends into children, each
   child's name is appended to the prefix array.

2. **Prefix flattening** (lines 702-707): When `hierarchyClient === false`
   AND `enableOperationGroup === true`, only the **last** prefix segment is
   kept. This collapses `["Baz", "Foo"]` → `["Foo"]`, producing
   single-level groups.

3. **Group key** (lines 728-732): If either `hierarchyClient` or
   `enableOperationGroup` is truthy, prefixes are joined with `/` as the
   map key. Otherwise, all operations go to `""` (root).

4. **Name prefixing** (lines 736-744): When `hierarchyClient === false` +
   `enableOperationGroup === true`, operation names are prefixed with the
   group name (e.g., `Foo_bar`) to avoid collisions after flattening.

5. **Independent client filtering** (lines 682-686): Children with
   `InitializedByFlags.Individually` are excluded — they become separate
   top-level clients, not operation groups.

---

## 5. Classical Client Generation

### 5.1 Client Extraction

```typescript
// clientUtils.ts:138-176
export function getClientHierarchyMap(context: SdkContext) {
  // Filters to individually-initializable clients
  const clients = context.sdkPackage.clients.filter(
    (c) =>
      c.clientInitialization.initializedBy & InitializedByFlags.Individually,
  );

  // Maps each to [hierarchyPath, client] tuples
  // Recursively adds child clients that are also individually-initializable
  // ...
}
```

The legacy emitter does **NOT** flatten the TCGC hierarchy at the data
level. It preserves `client.children` as-is. The flattening decisions
happen at code-generation time via `getMethodHierarchiesMap()`.

### 5.2 Operation Group Properties on the Client Class

```typescript
// buildClassicalClient.ts:298-352 (simplified)
function buildClientOperationGroups(clientMap, dpgContext, clientClass) {
  const methodMap = getMethodHierarchiesMap(dpgContext, client);

  for (const [prefixKey, operations] of methodMap) {
    if (prefixKey === "") {
      // Root-level operations → add as direct methods
      operations.forEach((op) => {
        clientClass.addMethods(generateMethod(dpgContext, clientType, op));
      });
    } else {
      // Operation group → add readonly property + constructor init
      const groupName = normalizeName(prefixes[0], NameType.Property);
      const typeName = `${normalizeName(prefixes[0], NameType.OperationGroup)}Operations`;

      clientClass.addProperty({
        name: groupName,
        type: typeName,
        scope: Scope.Public,
        isReadonly: true,
      });

      // Constructor: this.groupName = _getGroupNameOperations(this._client)
      constructor.addStatements(
        `this.${groupName} = _get${rawGroupName}Operations(this._client)`,
      );
    }
  }
}
```

### 5.3 Operation Group Files

For each non-root key in the method hierarchy map, the emitter creates
files under `classic/{group}/index.ts` containing:

1. An **interface** (`XxxOperations`) with method signatures
2. A **factory function** (`_getXxxOperations(context)`) that returns an
   object implementing the interface

For nested groups (when `hierarchy-client: true`), intermediate factory
functions compose inner factories:

```typescript
// Generated code structure:
interface SubOperations {
  nested: NestedOperations;
}

function _getSubOperations(context) {
  return {
    nested: _getNestedOperations(context),
  };
}

interface NestedOperations {
  myOp: (options?) => Promise<void>;
}

function _getNestedOperations(context) {
  return {
    myOp: (options?) => myOp(context, options),
  };
}
```

---

## 6. End-to-End Example

### TypeSpec Input

```tsp
@service namespace Encode.Array;

@route("/property")
namespace Property {
  @post op commaDelimited(@body body: Foo): Foo;
  @post op spaceDelimited(@body body: Foo): Foo;
}
```

### Legacy tspconfig

```yaml
hierarchy-client: false
enable-operation-group: true
```

### Processing Steps

1. **TCGC** creates:
   - Root client: `ArrayClient` (no direct methods)
   - Child: `Property` (kind=`SdkOperationGroup`, methods: `commaDelimited`, `spaceDelimited`)

2. **`getMethodHierarchiesMap()`** processes with `hierarchy=false`, `groups=true`:
   - Child `Property` added to queue with prefix `[]`
   - Operations extracted with prefix `["Property"]`
   - Prefix flattening: `["Property"]` → `["Property"]` (already single-level)
   - Map result: `{ "Property" → [commaDelimited, spaceDelimited] }`
   - Operation names prefixed: `property_commaDelimited`, `property_spaceDelimited`

3. **`buildClientOperationGroups()`** generates:

   ```typescript
   class ArrayClient {
     readonly property: PropertyOperations;
     constructor() {
       this.property = _getPropertyOperations(this._client);
     }
   }
   ```

4. **`buildClassicOperationFiles()`** generates `classic/property/index.ts`:
   ```typescript
   interface PropertyOperations {
     commaDelimited: (body: Foo) => Promise<Foo>;
     spaceDelimited: (body: Foo) => Promise<Foo>;
   }
   function _getPropertyOperations(context) {
     return {
       commaDelimited: (body, options) =>
         commaDelimited(context, body, options),
       spaceDelimited: (body, options) =>
         spaceDelimited(context, body, options),
     };
   }
   ```

---

## 7. Comparison with the New Emitter (http-client-js)

### Current New Emitter Behavior

The new emitter has **only `hierarchy-client`** (defaults to `false`) and
no `enable-operation-group`. When `hierarchy-client` is `false`, it calls
`flattenClientHierarchy()` which:

1. Collects ALL methods from ALL descendants (BFS)
2. Merges them onto the root client's `methods` array
3. Sets `children = undefined`
4. Only safety check: refuses if method name collisions exist

This maps to the legacy's most aggressive mode:
**`hierarchy-client: false` + `enable-operation-group: false`** — which the
legacy emitter almost never uses in practice.

### Why This Causes Failures

The legacy e2e specs use three configurations:

| Legacy Config                      | Specs                                               | Legacy Output       | New Emitter Output                                      |
| ---------------------------------- | --------------------------------------------------- | ------------------- | ------------------------------------------------------- |
| `hierarchy-client` unset (=`true`) | `payload/*`, `type/enum/*`, `body-optionality`      | Operation groups ✅ | **FLAT** ❌                                             |
| `hc=false` + `eog=true`            | `encode/*`, `parameters/basic`, `parameters/spread` | Operation groups ✅ | **FLAT** ❌                                             |
| `hc=false` + `eog` auto=`true`     | `type/array`, `type/scalar`, `special-words`        | Operation groups ✅ | Operation groups ✅ _(accidental — collision detected)_ |
| `hc=false` + `eog` auto=`false`    | `versioning/*`, `auth/*`, `server/*`                | Flat ✅             | Flat ✅                                                 |

### The Accidental Safety Net

The new emitter's `canFlattenSafely()` check accidentally preserves
operation groups for specs where method names collide (e.g., `type/array`
has `get`/`put` in 14 interfaces). But it fails to protect specs with
unique method names across groups (e.g., `encode/array` has 12 unique
names in one namespace).

---

## 8. Implications for the Rewrite

### What the New Emitter Must Do

To match the legacy emitter's output, the new emitter needs to decide for
each TCGC child client whether it becomes:

1. **An operation group property** (`readonly foo: FooOperations`) — the
   operation's methods are accessed via `client.foo.method()`
2. **Flattened onto the root** — the operation's methods are direct methods
   on the client: `client.method()`

### Option Approaches

**Approach A — Always preserve operation groups (simplest)**

Remove `flattenClientHierarchy()` entirely. TCGC creates children from
TypeSpec interfaces and `@operationGroup` decorators — trust it. This
matches the legacy default (`hierarchy-client: true`).

_Risk_: Specs like `versioning/added` have an `InterfaceV2` that TCGC
models as a child. The legacy emitter with `hierarchy-client: false`
flattens it. Removing flatten would create an unwanted
`client.interfaceV2.v2InInterface()` instead of `client.v2InInterface()`.

**Approach B — Replicate the dual-option logic**

Add `enable-operation-group` support with auto-detection (same
`detectIfNameConflicts` algorithm). When `hierarchy-client: false`:

- If `enable-operation-group` is `true` (or auto-detected as `true`),
  preserve children but collapse to single-level groups.
- If `enable-operation-group` is `false`, flatten everything.

_Benefit_: Exact legacy parity.
_Cost_: More complex implementation.

**Approach C — Heuristic based on TCGC metadata**

Check `child.__raw.kind`:

- `"SdkOperationGroup"` → always preserve as operation group
- `"SdkClient"` → flatten when `hierarchy-client: false`

This uses TCGC's own classification rather than reimplementing
auto-detection.

_Benefit_: Cleaner than collision detection.
_Risk_: Depends on TCGC correctly classifying every child.
