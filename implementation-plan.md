# Implementation Plan: Alloy Framework TypeSpec Emitter Rewrite

## 1. Executive Summary

Rewrite the legacy TypeSpec-to-TypeScript emitter (`autorest.typescript/packages/typespec-ts`) using the **Alloy Framework** (`@alloy-js/core` + `@alloy-js/typescript`). The legacy emitter uses ts-morph with imperative AST manipulation and manual import management. The new emitter will use declarative JSX components with automatic symbol resolution, producing **output-identical** TypeScript client SDKs.

### Current State

- **Skeleton project** at `http-client-js/` with empty `ExampleComponent.tsx`
- Dependencies: `@alloy-js/core@0.22.0`, `@alloy-js/typescript@0.22.0`
- Build: `alloy build`, Test: `vitest run`
- No TCGC or TypeSpec dependencies yet

### Target State

- Full Alloy JSX emitter consuming TCGC `SdkPackage`
- 101 scenario tests ported and passing
- Core emitter extensible for Azure flavor via JSX composition

---

## 2. Architecture Overview

### Data Flow

```
TypeSpec Input → Compiler → TCGC SdkPackage → Alloy JSX Components → Symbol Tree → TypeScript Files
```

### Component Tree (Target)

```
<Output namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib, ...]}>
  <SdkContextProvider sdkPackage={sdkPackage} options={options}>
    <ModelFiles />                    ← types + serializers per namespace
    <For each={clients}>
      {(client) => <>
        <OperationOptions client={client} />
        <Operations client={client} />
        <ClientContext client={client} />
        <ClassicalClient client={client} />
        <ClassicalOperationGroups client={client} />
        <RestorePoller client={client} />
      </>}
    </For>
    <LoggerFile />
    <StaticHelperFiles />
    <Samples />
  </SdkContextProvider>
</Output>
```

### Key Principles

1. **Pure Alloy** — No ts-morph, no string concatenation for imports, no manual path calculation
2. **Refkeys everywhere** — Every declaration gets a refkey, every reference uses refkeys
3. **Component composition** — Top (orchestrators) → Middle (source files) → Leaf (declarations)
4. **Context over props** — Use `createNamedContext()` / `useContext()` for shared state
5. **`code` templates** — All inline code via `` code`...` `` tagged templates with embedded refkeys

---

## 3. Phased Implementation Plan

### Phase 0: Project Foundation & Infrastructure

**Goal:** Set up dependencies, emitter entry point, context system, and test infrastructure.

#### 0.1 — Add Dependencies

- Add `@azure-tools/typespec-client-generator-core` (TCGC)
- Add `@typespec/compiler`, `@typespec/http`, `@typespec/rest`, `@typespec/versioning`
- Add `@typespec/emitter-framework` (for `writeOutput`, `useTsp`)
- Verify `@alloy-js/core/testing` is available for test matchers

**Pass Criteria:**

- [ ] package.json includes all required dependencies
- [ ] `pnpm install` completes without errors
- [ ] TypeScript can resolve all new package imports without type errors

#### 0.2 — Emitter Entry Point

Create `src/emitter.tsx` with `$onEmit()` function:

- Initialize TCGC context via `createSdkContext()`
- Extract `sdkPackage` from context
- Build the Alloy JSX component tree
- Call `writeOutput()` to emit files

Reference: flight-instructor's `typescript-renderer.tsx`, http-client-js emitter's `emitter.tsx`

**Pass Criteria:**

- [ ] src/emitter.tsx exists with exported $onEmit function
- [ ] $onEmit calls createSdkContext() and extracts sdkPackage
- [ ] JSX component tree renders via writeOutput() without runtime errors
- [ ] Emitter can be invoked by TypeSpec compiler on a minimal .tsp file
- [ ] Uses idiomatic Alloy Output component with namePolicy and externals

#### 0.3 — SDK Context Provider

Create `src/context/sdk-context.tsx`:

- `SdkContext` named context via `createNamedContext()`
- `SdkContextProvider` component wrapping children
- `useSdkContext()` hook for consumer access
- Expose: `sdkPackage`, `program`, `emitterOptions`, `clients`, `models`, `enums`

**Pass Criteria:**

- [ ] SdkContext created via createNamedContext() from @alloy-js/core
- [ ] SdkContextProvider component wraps children and provides sdkPackage, program, options
- [ ] useSdkContext() hook returns typed context value
- [ ] Child components can access SDK data without prop drilling
- [ ] TypeScript types are correct (no any casts)

#### 0.4 — Refkey Helpers

Create `src/utils/refkeys.ts`:

```typescript
export const typeRefkey = (type: SdkType) => refkey(type);
export const serializerRefkey = (type: SdkType) => refkey(type, "serializer");
export const deserializerRefkey = (type: SdkType) =>
  refkey(type, "deserializer");
export const polymorphicTypeRefkey = (type: SdkType) =>
  refkey(type, "polymorphicType");
export const knownValuesRefkey = (type: SdkType) => refkey(type, "knownValues");
export const operationOptionsRefkey = (method: SdkServiceMethod) =>
  refkey(method, "operationOptions");
export const clientContextRefkey = (client: SdkClientType) =>
  refkey(client, "context");
export const createClientRefkey = (client: SdkClientType) =>
  refkey(client, "createClient");
export const classicalClientRefkey = (client: SdkClientType) =>
  refkey(client, "classicalClient");
// XML, static helpers, etc.
```

**Pass Criteria:**

- [ ] All refkey helpers use refkey() from @alloy-js/core (NOT legacy framework refkey)
- [ ] Same entity + discriminator always returns the same refkey (deterministic)
- [ ] Different discriminators return different refkeys for the same entity
- [ ] Covers: typeRefkey, serializerRefkey, deserializerRefkey, polymorphicTypeRefkey, knownValuesRefkey, operationOptionsRefkey, clientContextRefkey, createClientRefkey, classicalClientRefkey, xmlSerializerRefkey, xmlDeserializerRefkey, serializationHelperRefkey, pagingHelperRefkey, pollingHelperRefkey
- [ ] Unit test validates refkey identity and uniqueness

#### 0.5 — External Package Definitions

Create `src/utils/external-packages.ts`:

- `httpRuntimeLib` — `@typespec/ts-http-runtime` exports (Client, getClient, Pipeline, etc.)
- `azureCoreDeps` — Azure-specific packages (for Azure flavor extension)
- `azurePollingDeps` — `@azure/core-lro` exports
- `azureIdentityDeps` — `@azure/identity` exports

Reference: legacy `external-dependencies.ts`

**Pass Criteria:**

- [ ] httpRuntimeLib defined via createPackage() with all @typespec/ts-http-runtime exports
- [ ] Package symbols accessible as typed refkeys (e.g., httpRuntimeLib.Client)
- [ ] Azure package definitions prepared (azureCoreDeps, azurePollingDeps, azureIdentityDeps)
- [ ] Packages can be registered in Output component's externals prop
- [ ] code templates with package symbols resolve correctly in a test render

#### 0.6 — Test Infrastructure

Create test foundation:

- `test/test-host.ts` — Tester instance with TypeSpec library imports
- `test/utils.tsx` — `TestFile`, `DeclarationTestFile` wrappers, `testHelper()`
- `test/vitest.d.ts` — Custom matcher types (`toRenderTo`)
- Port scenario test harness from `modularUnit/scenarios.spec.ts` to vitest format
- Copy all 101 `.md` scenario files

**Pass Criteria:**

- [ ] test/test-host.ts creates Tester instance with @typespec/http and @typespec/versioning
- [ ] test/utils.tsx provides TestFile and DeclarationTestFile wrapper components
- [ ] test/vitest.d.ts declares toRenderTo and toRenderToAsync custom matchers
- [ ] A sample component render test compiles, runs, and passes with vitest
- [ ] toRenderTo matcher correctly compares rendered Alloy output
- [ ] `vitest run` executes without configuration errors

**Dependencies for this phase:**

- None (foundation work)

---

### Phase 1: Models & Type Declarations

**Goal:** Generate TypeScript interfaces, enums, type aliases, and union types from TCGC types.

#### 1.1 — Type Expression Component

Create `src/components/TypeExpression.tsx`:

- Map `SdkType` to TypeScript type strings/refkeys
- Handle: `model` → interface refkey, `enum` → type alias refkey, `array` → `T[]`
- Handle: `dict` → `Record<K, V>`, `nullable` → `T | null`, `union` → pipe-separated
- Handle: built-in scalars (`string`, `number`, `boolean`, `Date`, `Uint8Array`, `bigint`)
- Handle: `utcDateTime` → `Date`, `duration` → `string`, `bytes` → `Uint8Array`

**Pass Criteria:**

- [ ] Handles all SdkType kinds: model, enum, union, array, dict, nullable, built-in scalars, datetime, duration, bytes
- [ ] Model types return typeRefkey(type) for cross-file reference
- [ ] Scalar mappings match legacy: string→string, int32→number, int64→bigint, float→number, boolean→boolean, utcDateTime→Date, bytes→Uint8Array, duration→string
- [ ] Array types produce T[] with recursive element type resolution
- [ ] Dict types produce Record<K, V>
- [ ] Nullable types produce T | null
- [ ] Component render test validates each type kind

#### 1.2 — Model Interface Component

Create `src/components/ModelDeclaration.tsx`:

- Input: `SdkModelType`
- Output: `<ts.InterfaceDeclaration>` with properties
- Handle: base model inheritance via `extends`
- Handle: flattened properties
- Handle: additional properties (open models)
- Handle: discriminator properties
- Handle: readonly properties, optional properties
- Handle: JSDoc documentation from SDK model

**Pass Criteria:**

- [ ] Produces `<ts.InterfaceDeclaration>` with correct name, refkey, and export
- [ ] Properties rendered as `<ts.InterfaceMember>` with correct name, type, optional, readonly
- [ ] Base model inheritance via extends prop
- [ ] Discriminator property rendered with correct literal type
- [ ] Additional properties support (Record types)
- [ ] Flattened properties expanded inline
- [ ] JSDoc documentation from SDK model doc/summary
- [ ] Scenario tests pass: models/models.md model interfaces match legacy output

#### 1.3 — Enum Declaration Component

Create `src/components/EnumDeclaration.tsx`:

- Input: `SdkEnumType`
- Output: `KnownXXX` enum + extensible type alias pattern
- Fixed enums → plain enum
- Extensible enums → `KnownXXX` enum + `type XXX = string` alias

**Pass Criteria:**

- [ ] Fixed enums (isFixed=true) produce standard TypeScript enum
- [ ] Extensible enums produce KnownXXX enum + type XXX = string alias
- [ ] Enum members have correct name and value
- [ ] JSDoc documentation on enum and members
- [ ] Refkey set on both enum and type alias declarations
- [ ] Scenario tests pass: enumUnion/enumUnion.md, models/apiVersion/\*.md

#### 1.4 — Union Type Component

Create `src/components/UnionDeclaration.tsx`:

- Input: `SdkUnionType`
- Output: `type XXX = A | B | C` type alias

**Pass Criteria:**

- [ ] Produces type XXX = A | B | C with correct variant type references
- [ ] Variant types use refkeys for cross-file reference when they are models
- [ ] String/number literal union variants rendered correctly
- [ ] Nullable unions include | null
- [ ] Refkey set on type alias declaration

#### 1.5 — Polymorphic Type Component

Create `src/components/PolymorphicType.tsx`:

- Input: `SdkModelType` with discriminated subtypes
- Output: Union type alias of all subtypes
- Refkey: `polymorphicTypeRefkey(type)`

**Pass Criteria:**

- [ ] Produces type XXX = SubA | SubB | SubC from discriminatedSubtypes
- [ ] Uses polymorphicTypeRefkey(type) as declaration refkey
- [ ] Each subtype referenced via typeRefkey(subtype)
- [ ] Only generated for models with discriminatedSubtypes

#### 1.6 — ModelFiles Orchestrator

Create `src/components/ModelFiles.tsx`:

- Organize models by namespace into `src/models/{namespace}/models.ts`
- **Unify** type declarations and serializers in the same `<ts.SourceFile>` (prevents self-imports)
- Sort: model declarations (0) → serializers (1) → XML serializers (2)

**Pass Criteria:**

- [ ] Models organized into src/models/{namespace}/models.ts per namespace
- [ ] Type declarations and serializers unified in same `<ts.SourceFile>` (no self-imports)
- [ ] Ordering: model declarations first, then serializers, then XML serializers
- [ ] Empty model files (no declarations) not emitted
- [ ] Cross-namespace references resolved via refkeys (auto-imports between model files)

**Scenario tests to validate:**

- `models/models.md`, `models/deserialization/*.md`, `models/nullable/*.md`
- `models/template/template.md`, `enumUnion/enumUnion.md`
- `models/apiVersion/*.md`, `models/nestedEnum/**/*.md`

---

### Phase 2: Serialization & Deserialization

**Goal:** Generate JSON and XML serializer/deserializer functions for all model types.

#### 2.1 — JSON Serializer Component

Create `src/components/serialization/JsonSerializer.tsx`:

- Input: `SdkModelType` (with `Usage.Input` flag)
- Output: `function xxxSerializer(item: Xxx): any { ... }`
- Property mapping: `item.propName` → `result["wireName"]`
- Nested model → call child serializer refkey
- Array → `.map()` with child serializer
- Dict → `serializeRecord()` helper
- Handle: flatten properties, additional properties, null checks

**Pass Criteria:**

- [ ] Produces function xxxSerializer(item: Xxx): any with correct refkey
- [ ] Property mapping: item.propName → result['wireName'] for each property
- [ ] Nested model properties call child serializerRefkey via code template
- [ ] Array properties use .map() with child serializer
- [ ] Dict properties use serializeRecord() static helper refkey
- [ ] Null/undefined checks for optional properties
- [ ] Additional properties spread into result object
- [ ] Flatten properties correctly navigate nested paths
- [ ] Only generated for types with Usage.Input flag
- [ ] Scenario tests pass: models/serialization/propertyType.md

#### 2.2 — JSON Deserializer Component

Create `src/components/serialization/JsonDeserializer.tsx`:

- Input: `SdkModelType` (with `Usage.Output` or `Usage.Exception` flag)
- Output: `function xxxDeserializer(item: any): Xxx { ... }`
- Property mapping: `item["wireName"]` → `result.propName`
- Mirror serializer structure for nested/array/dict types

**Pass Criteria:**

- [ ] Produces function xxxDeserializer(item: any): Xxx with correct refkey
- [ ] Property mapping: item['wireName'] → result.propName (reverse of serializer)
- [ ] Nested model properties call child deserializerRefkey
- [ ] Array deserialization with .map() and child deserializer
- [ ] Dict deserialization mirroring serializer
- [ ] Only generated for types with Usage.Output or Usage.Exception flag
- [ ] Scenario tests pass: models/deserialization/propertyType.md

#### 2.3 — Polymorphic Serialization

Create `src/components/serialization/PolymorphicSerializer.tsx`:

- Discriminated unions → switch on discriminator property
- Route to appropriate subtype serializer/deserializer
- Parameter type uses `polymorphicTypeRefkey(type)`

**Pass Criteria:**

- [ ] Switch statement on discriminator property value
- [ ] Each case routes to subtype-specific serializer/deserializer refkey
- [ ] Parameter type uses polymorphicTypeRefkey (union type, not base interface)
- [ ] Deserializer return type uses polymorphicTypeRefkey
- [ ] Default case handles unknown discriminator values
- [ ] All subtypes in discriminatedSubtypes have corresponding cases

#### 2.4 — XML Serializer Components

Create `src/components/serialization/XmlSerializer.tsx`:

- 4 functions per type: serializer, objectSerializer, deserializer, objectDeserializer
- Metadata-driven: builds property descriptors, calls `serializeToXml()`/`deserializeFromXml()`

**Pass Criteria:**

- [ ] Generates 4 functions per type: serializer, objectSerializer, deserializer, objectDeserializer
- [ ] Uses metadata arrays with XML property descriptors
- [ ] Calls serializeToXml/deserializeFromXml static helper refkeys
- [ ] Handles XML namespaces, attributes, and element names
- [ ] Correct refkeys: xmlSerializerRefkey, xmlObjectSerializerRefkey, xmlDeserializerRefkey, xmlObjectDeserializerRefkey
- [ ] Scenario tests pass: payload/xml/\*.md

#### 2.5 — Static Serialization Helpers

Create `src/components/StaticHelpers.tsx`:

- Declare refkeys for all static helpers (collection builders, parsers, serializers)
- Load helper source files and emit as `<ts.SourceFile>` with proper refkey declarations
- Categories: serialization, paging, polling, URL template, multipart, cloud settings

**Pass Criteria:**

- [ ] Refkey declarations for all static helpers: collection builders (csv, multi, newline, pipe, ssv, tsv), collection parsers, serializers, serialize-record, check-prop-undefined, xml-helpers, get-binary-response
- [ ] Helper source files loaded and emitted as `<ts.SourceFile>` with proper declarations
- [ ] Each helper function has a refkey that can be referenced from other components
- [ ] Helpers only included in output when referenced (demand-driven)
- [ ] Import remapping works for Azure vs non-Azure package references
- [ ] Also covers: pagingHelpers, pollingHelpers, simplePollerHelpers, urlTemplate, multipartHelpers, cloudSettingHelpers

**Scenario tests to validate:**

- `models/serialization/*.md`, `models/deserialization/*.md`
- `models/propertyFlatten/*.md`, `payload/xml/*.md`

---

### Phase 3: Operations

**Goal:** Generate operation functions with send/deserialize pattern for each API operation.

#### 3.1 — Operation Options Component

Create `src/components/OperationOptions.tsx`:

- Input: `SdkServiceMethod`
- Output: `interface XxxOptions extends OperationOptions { ... }`
- Include optional method parameters
- Add `updateIntervalInMs` for LRO operations
- Add `contentType` for dual-format (JSON/XML) operations

**Pass Criteria:**

- [ ] Interface extends OperationOptions from runtime package (via refkey)
- [ ] Optional method parameters included with correct types
- [ ] LRO operations include updateIntervalInMs?: number
- [ ] Dual-format (JSON/XML) operations include contentType?: string
- [ ] JSDoc documentation from parameter descriptions
- [ ] Refkey set via operationOptionsRefkey(method)
- [ ] Auto-generated contentType/accept headers excluded from options

#### 3.2 — Send Function Component

Create `src/components/operations/SendFunction.tsx`:

- Input: `SdkServiceMethod` with `SdkHttpOperation`
- Output: `async function _xxxSend(context, ...params): StreamableMethod { ... }`
- Build: URL path with parameter substitution
- Build: request headers (Content-Type, custom headers)
- Build: query parameters
- Build: request body serialization
- Return: `context.path(...).method(options)`

**Pass Criteria:**

- [ ] Async function \_xxxSend(context: XxxContext, ...params): StreamableMethod
- [ ] URL path built with parameter substitution (using urlTemplate helper or template literals)
- [ ] Request headers constructed (Content-Type, Accept, custom headers)
- [ ] Query parameters assembled correctly (collection formats, explode)
- [ ] Request body serialized using serializer refkeys
- [ ] context.path(...).method(options) call pattern
- [ ] Path parameters with allowReserved handled correctly
- [ ] Scenario tests pass: operations/operations.md send functions match

#### 3.3 — Deserialize Function Component

Create `src/components/operations/DeserializeFunction.tsx`:

- Input: `SdkServiceMethod` with response types
- Output: `async function _xxxDeserialize(result): Promise<T> { ... }`
- Handle: status code checking and error throwing
- Handle: response body deserialization (JSON/XML)
- Handle: response header extraction
- Handle: binary/stream responses

**Pass Criteria:**

- [ ] Async function \_xxxDeserialize(result: PathUncheckedResponse): Promise<T>
- [ ] Expected status codes checked; unexpected throws createRestError
- [ ] Response body deserialized using deserializer refkeys
- [ ] Response headers extracted when needed
- [ ] Binary/stream responses handled (Uint8Array return)
- [ ] Exception body deserialized for error responses
- [ ] XML response deserialization supported
- [ ] Scenario tests pass: operations/operations.md deserialize functions match

#### 3.4 — Public Operation Function Component

Create `src/components/operations/OperationFunction.tsx`:

- Input: `SdkServiceMethod`
- Output: `async function xxx(context, ...params): Promise<T> { ... }`
- Standard: call `_send()` → `_deserialize()`
- LRO: wrap with `getLongRunningPoller()`
- Paging: wrap with `buildPagedAsyncIterator()`
- LRO+Paging: combined handling

**Pass Criteria:**

- [ ] Standard: async function xxx(context, ...params) calls \_send() then \_deserialize()
- [ ] LRO: wraps with getLongRunningPoller() from polling helpers
- [ ] Paging: wraps with buildPagedAsyncIterator() from paging helpers
- [ ] LRO+Paging: combined handling
- [ ] Correct return types for each pattern
- [ ] JSDoc documentation from operation metadata
- [ ] Scenario tests pass: operations/lroPaging.md

#### 3.5 — Operations Orchestrator

Create `src/components/Operations.tsx`:

- Group operations by operation group path
- Create `src/api/{group}/operations.ts` per group
- Render send + deserialize + public function per operation

**Pass Criteria:**

- [ ] Operations grouped by operation group hierarchy
- [ ] Each group emits src/api/{group}/operations.ts
- [ ] Each file contains: send + deserialize + public function per operation
- [ ] All functions exported with correct names
- [ ] Operation group path correctly computed from client hierarchy
- [ ] Scenario tests pass: apiOperations/apiOperations.md

**Scenario tests to validate:**

- `operations/operations.md`, `apiOperations/apiOperations.md`
- `operations/pathParam/*.md`, `operations/queryParam/*.md`
- `operations/headerParam/*.md`, `operations/cookieParam/*.md`
- `operations/errorDeserialization/*.md`, `operations/override.md`
- `operations/lroPaging.md`, `operations/pagination/*.md`
- `multipart/*.md`

---

### Phase 4: Client Infrastructure

**Goal:** Generate client context interface, factory function, and supporting infrastructure.

#### 4.1 — Client Context Component

Create `src/components/ClientContext.tsx`:

- Output file: `src/api/{clientName}Context.ts`
- Generate interface: `interface XxxContext extends Client { ... }`
  - Required properties from `clientInitialization`
  - API version property (if versioned)
- Generate factory: `function createXxx(endpoint, credentials?, options?): XxxContext`
  - Endpoint parameter construction
  - Credential handling (API key, bearer token, OAuth2)
  - Pipeline configuration
  - API version defaults

**Pass Criteria:**

- [ ] Interface XxxContext extends Client with required properties from clientInitialization
- [ ] API version property included for versioned services
- [ ] Factory function createXxx(endpoint, credentials?, options?) exported
- [ ] Endpoint parameter with correct default or template
- [ ] Credential handling: API key → KeyCredential, Bearer → TokenCredential, OAuth2 → TokenCredential
- [ ] Pipeline configured via getClient() from runtime package
- [ ] API version defaults set from TCGC metadata
- [ ] Scenario tests pass: clientContext/clientContext.md, clientContext/optionalApiVersion.md

#### 4.2 — Logger Component

Create `src/components/LoggerFile.tsx`:

- Only for Azure flavor
- Output: `src/logger.ts` with `createClientLogger(packageName)`

**Pass Criteria:**

- [ ] Only emitted when Azure flavor is active
- [ ] Produces src/logger.ts with createClientLogger(packageName)
- [ ] Import from @azure/logger via external package refkey
- [ ] Logger name derived from package details
- [ ] Not emitted for non-Azure (core) flavor

**Scenario tests to validate:**

- `clientContext/clientContext.md`, `clientContext/optionalApiVersion.md`

---

### Phase 5: Classical Client

**Goal:** Generate the user-facing client class that wraps the operation-level API.

#### 5.1 — Classical Client Component

Create `src/components/ClassicalClient.tsx`:

- Output: `src/{clientName}.ts`
- Generate class with:
  - Private `_client` field (context type)
  - `pipeline` readonly property
  - Constructor: calls `createXxx()` factory
  - Constructor overloads for subscriptionId (ARM)
  - Operation methods delegating to API functions
  - Operation group getters for nested groups
  - Child client getters

**Pass Criteria:**

- [ ] Class with private \_client: XxxContext field
- [ ] Public pipeline: Pipeline readonly property
- [ ] Constructor calls createXxx() factory via refkey
- [ ] Constructor overloads for subscriptionId (ARM scenarios)
- [ ] Operation methods delegate to API functions via refkeys
- [ ] Operation group getters return typed operation group objects
- [ ] Child client getters for multi-client scenarios
- [ ] Scenario tests pass: classicClient/classicClient.md, classicClient/clientConstructorOverloads.md

#### 5.2 — Classical Operation Groups

Create `src/components/ClassicalOperationGroups.tsx`:

- Output: `src/classic/{group}/index.ts` per group
- Generate: `interface XxxOperations { ... }` per group level
- Generate: `function _getXxxOperations(context): XxxOperations`
- Handle: nested hierarchical groups
- Handle: LRO wrapper methods (`begin_*`, `begin_*_andWait`)

**Pass Criteria:**

- [ ] Interface XxxOperations per operation group level
- [ ] Factory function \_getXxxOperations(context) returning operation methods
- [ ] Nested group properties for hierarchical operation groups
- [ ] LRO helper methods: begin*\*(params) and begin*\*\_andWait(params)
- [ ] Operation method signatures match legacy output exactly
- [ ] Classic files emitted under src/classic/{group}/index.ts
- [ ] Scenario tests pass: classicClient/reservedWordOperations.md

**Scenario tests to validate:**

- `classicClient/classicClient.md`, `classicClient/clientConstructorOverloads.md`
- `classicClient/reservedWordOperations.md`

---

### Phase 6: Advanced Features

**Goal:** Implement LRO, paging, multipart, and sample generation.

#### 6.1 — RestorePoller Component

Create `src/components/RestorePoller.tsx`:

- Output: `src/api/restorePollerHelpers.ts`
- Generate `restorePoller()` function
- Build operation-to-deserializer mapping
- URL template matching for operation routing

**Pass Criteria:**

- [ ] Produces src/api/restorePollerHelpers.ts
- [ ] RestorePollerOptions<TResult> interface exported
- [ ] restorePoller() function exported with correct signature
- [ ] Operation-to-deserializer map covers all LRO operations
- [ ] URL template matching routes to correct deserializer
- [ ] Parameterized paths (e.g., {guid}) handled with regex matching
- [ ] Only generated when client has LRO operations

#### 6.2 — Multipart Support

Integrate into operation send functions:

- Detect multipart body parameters
- Generate file part descriptors
- Build multipart form data

**Pass Criteria:**

- [ ] Multipart body parameters detected from SdkHttpOperation
- [ ] File part descriptors generated using createFilePartDescriptor helper refkey
- [ ] Multipart form data assembled correctly
- [ ] Content-Type set to multipart/form-data
- [ ] Scenario tests pass: multipart/file.md, multipart/json.md, multipart/text.md, multipart/renamewithWireNameAndClientName.md

#### 6.3 — Sample Generation

Create `src/components/Samples.tsx`:

- Generate per-operation sample files
- Extract example data from TCGC examples
- Build client construction, parameter setup, and API calls

**Pass Criteria:**

- [ ] Sample file per operation with executable TypeScript code
- [ ] Client construction with correct parameters
- [ ] Parameter setup from TCGC examples (when available)
- [ ] Credential setup (Azure credentials, API keys)
- [ ] API call invocation with correct arguments
- [ ] Scenario tests pass: samples/client/_.md, samples/operations/_.md, samples/parameters/\*.md

**Scenario tests to validate:**

- `samples/client/*.md`, `samples/operations/*.md`
- `samples/parameters/*.md`, `samples/propertyFlatten/*.md`

---

### Phase 7: Index & Barrel Files

**Goal:** Generate proper export structure for the SDK package.

#### 7.1 — Root Index Component

Create `src/components/RootIndex.tsx`:

- Output: `src/index.ts`
- Export: client classes, models, operation options, helper types
- Filter: exclude internal symbols (prefixed with `_`)
- Filter: exclude serializer/deserializer functions

**Pass Criteria:**

- [ ] Root src/index.ts exports client classes, models, operation options, helper types
- [ ] Internal symbols (\_prefixed) excluded from exports
- [ ] Serializer/deserializer functions excluded from public exports
- [ ] PagedAsyncIterableIterator, PageSettings, ContinuablePage exported for paging
- [ ] SimplePollerLike exported for LRO
- [ ] Azure cloud types exported for ARM scenarios
- [ ] No duplicate exports

#### 7.2 — Subpath Index Component

Create `src/components/SubpathIndex.tsx`:

- Generate `index.ts` in: `api/`, `models/`, `classic/`
- Re-export from child modules
- Support: recursive index generation for nested groups
- Support: interface-only exports for classic layer

Note: Alloy's `<ts.BarrelFile>` may handle some of this automatically.

**Pass Criteria:**

- [ ] api/index.ts re-exports from operation group files
- [ ] models/index.ts re-exports from model namespace files
- [ ] classic/index.ts re-exports from operation group interfaces (interfaces only)
- [ ] Recursive index generation for nested directories
- [ ] No internal helpers (pagingHelpers, pollingHelpers) in public indexes
- [ ] Correct relative paths in export declarations

**Scenario tests to validate:**

- `emptyProject/emptyProject.md`, root index assertions in various tests

---

### Phase 8: Azure Flavor Extension

**Goal:** Design and implement Azure-specific extensions via composition.

#### 8.1 — Azure Extension Points

- Swap `httpRuntimeLib` → Azure package references
- Add Azure auth policies (Bearer challenge, custom headers)
- Add Azure polling dependencies
- Add Azure identity integration
- Add ARM-specific features (subscription ID, cloud settings)
- Add Logger with `@azure/logger`

**Pass Criteria:**

- [ ] httpRuntimeLib swappable to Azure package references (@azure-rest/core-client, etc.)
- [ ] Azure auth policies (Bearer challenge, custom headers) injectable
- [ ] Azure polling dependencies (@azure/core-lro) usable via refkeys
- [ ] Azure identity (DefaultAzureCredential) referenced in samples
- [ ] ARM features: subscriptionId handling, cloud settings helpers
- [ ] Logger uses @azure/logger instead of console
- [ ] All Azure-specific scenario tests pass

#### 8.2 — Composition Pattern

```tsx
// Core emitter output
<CoreOutput sdkPackage={sdkPackage}>
  {/* core components */}
</CoreOutput>

// Azure extension wraps or augments
<AzureOutput sdkPackage={sdkPackage}>
  <CoreOutput />
  <AzureLogger />
  <AzureCloudSettings />
</AzureOutput>
```

**Pass Criteria:**

- [ ] Core emitter generates valid non-Azure SDK with @typespec/ts-http-runtime
- [ ] Azure wrapper composes core components with Azure-specific additions
- [ ] No if-else Azure checks inside core components
- [ ] Azure extension does not modify core component source files
- [ ] Both flavors produce correct output for their respective scenarios

---

### Phase 9: Test Porting & Validation

**Goal:** Port all 101 scenario tests and validate output parity.

#### 9.1 — Test Harness

- Adapt `scenarios.spec.ts` for vitest
- Implement MD file parser for scenario format
- Support all 14 output block types (models, operations, clientContext, etc.)
- Use `assertEqualContent()` with formatting normalization
- Support `SCENARIOS_UPDATE` for snapshot regeneration

**Pass Criteria:**

- [ ] Scenario harness reads .md files recursively from test/scenarios/
- [ ] MD parser extracts TypeSpec input (`tsp) and expected output (`typescript <type>) blocks
- [ ] All 14 output block types supported
- [ ] assertEqualContent normalizes formatting before comparison
- [ ] SCENARIOS_UPDATE=true regenerates snapshots
- [ ] vitest run shows individual scenario results
- [ ] Harness integrates with vitest describe/it/expect API

#### 9.2 — Scenario Categories (101 tests)

| Category                 | Count | Tests                                                                                                                                             |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Models (core)            | 3     | models, azureCoreErrorModels, missingErrorResponseModel                                                                                           |
| Models (serialization)   | 8     | propertyType, additionalProperties, anonymousModel, encodeIntAsString, enumKeyNorm, errorModels, modelPropertyArrayEncoding, readonlyFlattenModel |
| Models (deserialization) | 4     | additionalProperties, anonymousModel, extends, propertyType                                                                                       |
| Models (other)           | 12    | nullable (2), propertyFlatten (3), apiVersion (2), nestedEnum (3), template, response (4)                                                         |
| Operations               | 6+    | operations, override, overrideReservedkeywords, clientDefaultValue, armPatchWithUnionResponse, lroPaging                                          |
| Operations (params)      | 14    | pathParam (8), queryParam (5), headerParam (1), cookieParam (1)                                                                                   |
| Operations (error)       | 2     | errorHeaderDeserialization, xmlErrorDeserialization                                                                                               |
| Operations (pagination)  | 1     | disablePagination                                                                                                                                 |
| API Operations           | 3     | apiOperations, azureCoreOperations, reservedWordOperations                                                                                        |
| Client Context           | 2     | clientContext, optionalApiVersion                                                                                                                 |
| Classical Client         | 3     | classicClient, clientConstructorOverloads, reservedWordOperations                                                                                 |
| Enum/Union               | 1     | enumUnion                                                                                                                                         |
| Multipart                | 4     | file, json, text, renamewithWireNameAndClientName                                                                                                 |
| Payload/XML              | 3     | xmlArrayItemTypes, xmlArrayItemsNameWrapping, xmlName                                                                                             |
| Samples                  | 24    | client (8), operations (4), parameters (12), propertyFlatten (3)                                                                                  |
| Other                    | 3     | anonymous, emptyProject, example                                                                                                                  |

**Pass Criteria for Scenario Porting:**

- [ ] All 101 .md scenario files copied to test/scenarios/
- [ ] Directory structure preserved
- [ ] Each .md file parseable by the test harness without errors
- [ ] TypeSpec input blocks compile without errors
- [ ] No modifications to expected output blocks

#### 9.3 — Validation Strategy

1. Run each scenario through legacy emitter → capture baseline output
2. Run each scenario through new Alloy emitter → compare
3. Acceptable differences: import ordering, whitespace, trailing commas
4. Unacceptable differences: public API surface changes, type changes, missing exports

**Pass Criteria:**

- [ ] All 101 scenario tests pass (vitest run reports 0 failures)
- [ ] Public API surface identical to legacy emitter output
- [ ] Only acceptable differences present
- [ ] No self-import bugs in any generated output
- [ ] No missing or extra exports compared to legacy
- [ ] Documented list of any intentional differences with justification

---

## 4. Component Inventory

### Source Files to Create

```
src/
├── emitter.tsx                          ← $onEmit entry point
├── index.ts                             ← package exports
├── context/
│   └── sdk-context.tsx                  ← SdkContext provider + hook
├── utils/
│   ├── refkeys.ts                       ← All refkey helper functions
│   ├── external-packages.ts             ← createPackage() definitions
│   └── type-utils.ts                    ← Type mapping utilities
├── components/
│   ├── TypeExpression.tsx               ← SdkType → TS type rendering
│   ├── ModelFiles.tsx                   ← Model file orchestrator
│   ├── ModelDeclaration.tsx             ← Interface generation
│   ├── EnumDeclaration.tsx              ← Enum + extensible alias
│   ├── UnionDeclaration.tsx             ← Union type alias
│   ├── PolymorphicType.tsx              ← Discriminated union alias
│   ├── Operations.tsx                   ← Operations orchestrator
│   ├── OperationOptions.tsx             ← Options interfaces
│   ├── ClientContext.tsx                ← Context interface + factory
│   ├── ClassicalClient.tsx             ← Client class generation
│   ├── ClassicalOperationGroups.tsx    ← Operation group interfaces
│   ├── LoggerFile.tsx                   ← Azure logger module
│   ├── RestorePoller.tsx               ← LRO restore poller
│   ├── StaticHelpers.tsx               ← Static helper file emissions
│   ├── Samples.tsx                     ← Sample file generation
│   ├── RootIndex.tsx                   ← Root barrel file
│   ├── SubpathIndex.tsx                ← Subpath barrel files
│   ├── operations/
│   │   ├── SendFunction.tsx            ← HTTP request sending
│   │   ├── DeserializeFunction.tsx     ← Response deserialization
│   │   └── OperationFunction.tsx       ← Public operation wrapper
│   └── serialization/
│       ├── JsonSerializer.tsx          ← JSON serializer functions
│       ├── JsonDeserializer.tsx        ← JSON deserializer functions
│       ├── PolymorphicSerializer.tsx   ← Discriminated union ser/deser
│       └── XmlSerializer.tsx           ← XML serializer functions
└── stc.ts                              ← Static type constructors (if needed)
```

### Test Files to Create

```
test/
├── test-host.ts                        ← Tester instance
├── utils.tsx                           ← Test wrappers
├── vitest.d.ts                         ← Custom matcher types
└── scenarios/
    ├── scenarios.spec.ts               ← Test harness (ported)
    └── (101 .md scenario files)        ← Ported from legacy
```

---

## 5. Dependency Graph

```
Phase 0 (Foundation)
  ├── 0.1 Dependencies
  ├── 0.2 Emitter Entry Point ← 0.1
  ├── 0.3 SDK Context ← 0.1
  ├── 0.4 Refkey Helpers ← 0.1
  ├── 0.5 External Packages ← 0.1
  └── 0.6 Test Infrastructure ← 0.1

Phase 1 (Models) ← Phase 0
  ├── 1.1 Type Expressions ← 0.4
  ├── 1.2 Model Declarations ← 1.1, 0.4
  ├── 1.3 Enum Declarations ← 1.1, 0.4
  ├── 1.4 Union Declarations ← 1.1, 0.4
  ├── 1.5 Polymorphic Types ← 1.2, 0.4
  └── 1.6 ModelFiles Orchestrator ← 1.2, 1.3, 1.4, 1.5

Phase 2 (Serialization) ← Phase 1
  ├── 2.1 JSON Serializer ← 1.1, 1.6, 0.4
  ├── 2.2 JSON Deserializer ← 1.1, 1.6, 0.4
  ├── 2.3 Polymorphic Serialization ← 2.1, 2.2, 1.5
  ├── 2.4 XML Serializers ← 1.1, 1.6, 0.4
  └── 2.5 Static Helpers ← 0.4, 0.5

Phase 3 (Operations) ← Phase 2
  ├── 3.1 Operation Options ← 1.1, 0.4, 0.5
  ├── 3.2 Send Function ← 2.1, 0.5, 2.5
  ├── 3.3 Deserialize Function ← 2.2, 2.5
  ├── 3.4 Public Operation ← 3.2, 3.3, 2.5
  └── 3.5 Operations Orchestrator ← 3.1, 3.4

Phase 4 (Client) ← Phase 3
  ├── 4.1 Client Context ← 0.3, 0.5, 0.4
  └── 4.2 Logger ← 0.5

Phase 5 (Classical Client) ← Phase 4
  ├── 5.1 Classical Client ← 4.1, 3.5
  └── 5.2 Classical Operation Groups ← 3.5, 5.1

Phase 6 (Advanced) ← Phase 5
  ├── 6.1 RestorePoller ← 3.3, 0.5
  ├── 6.2 Multipart ← 3.2, 2.5
  └── 6.3 Samples ← 5.1, 3.5

Phase 7 (Index Files) ← Phase 6
  ├── 7.1 Root Index ← all components
  └── 7.2 Subpath Index ← all components

Phase 8 (Azure) ← Phase 7
  ├── 8.1 Azure Extensions ← 0.5
  └── 8.2 Composition Pattern ← all phases

Phase 9 (Testing) ← runs alongside all phases
  ├── 9.1 Test Harness ← 0.6
  ├── 9.2 Scenario Porting ← 0.6
  └── 9.3 Validation ← all phases
```

---

## 6. Risk Analysis

| Risk                             | Impact                                       | Mitigation                                                               |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| Output parity failures           | High — breaking changes to Azure SDK users   | Run scenario tests incrementally; accept only cosmetic differences       |
| Alloy version incompatibilities  | Medium — API changes between versions        | Pin to @alloy-js/\*@0.22.0; update deliberately                          |
| TCGC API surface changes         | Medium — model structure changes             | Pin TCGC version; adapt incrementally                                    |
| Performance regression           | Low — Alloy is optimized for codegen         | Benchmark against legacy emitter on large specs                          |
| Static helper loading complexity | Medium — 21 helper files with varied formats | Start with refkey declarations; load sources as-is                       |
| Self-import bugs                 | High — well-known Alloy pitfall              | Unify declarations + serializers in same SourceFile (ModelFiles pattern) |

---

## 7. Success Criteria

1. **All 101 scenario tests pass** with output matching legacy emitter (modulo acceptable cosmetic differences)
2. **Zero public API surface changes** in generated SDKs
3. **Pure Alloy** — no legacy bridges, no manual import strings, no string-based reference resolution
4. **Azure flavor composable** — core emitter works standalone; Azure adds via JSX composition
5. **Clean architecture** — components ≤300 lines each, clear single responsibility
6. **Test coverage** — every component has at least one dedicated test

---

## 8. Reference Mapping

### Legacy → New Component Mapping

| Legacy File                                   | New Component                                                                            | Notes                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| `emitModels.ts`                               | `ModelFiles.tsx`, `ModelDeclaration.tsx`, `EnumDeclaration.tsx`                          | Split by responsibility                 |
| `buildOperations.ts`                          | `Operations.tsx`, `SendFunction.tsx`, `DeserializeFunction.tsx`, `OperationFunction.tsx` | Decomposed into operation lifecycle     |
| `buildClientContext.ts`                       | `ClientContext.tsx`                                                                      | Interface + factory in one component    |
| `buildClassicalClient.ts`                     | `ClassicalClient.tsx`                                                                    | Class generation                        |
| `buildClassicalOperationGroups.ts`            | `ClassicalOperationGroups.tsx`                                                           | Group interfaces                        |
| `buildRestorePoller.ts`                       | `RestorePoller.tsx`                                                                      | LRO restore helper                      |
| `buildRootIndex.ts`                           | `RootIndex.tsx`                                                                          | Barrel file                             |
| `buildSubpathIndex.ts`                        | `SubpathIndex.tsx`                                                                       | Subpath barrel files                    |
| `emitLoggerFile.ts`                           | `LoggerFile.tsx`                                                                         | Logger module                           |
| `emitSamples.ts`                              | `Samples.tsx`                                                                            | Sample generation                       |
| `external-dependencies.ts`                    | `external-packages.ts`                                                                   | `createPackage()` pattern               |
| `serialization/buildSerializerFunction.ts`    | `JsonSerializer.tsx`                                                                     | JSX serializer component                |
| `serialization/buildDeserializerFunction.ts`  | `JsonDeserializer.tsx`                                                                   | JSX deserializer component              |
| `serialization/buildXmlSerializerFunction.ts` | `XmlSerializer.tsx`                                                                      | XML serializer component                |
| `operationHelpers.ts`                         | Distributed across operation components                                                  | Break up 2700-line file                 |
| `contextManager.ts`                           | `sdk-context.tsx`                                                                        | Alloy named contexts replace singleton  |
| `framework/refkey.ts`                         | `utils/refkeys.ts`                                                                       | Alloy refkeys replace string-based keys |

---

## 9. Glossary

| Term                  | Definition                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| **Alloy**             | JSX-based code generation framework (`@alloy-js/core` + language packages) |
| **TCGC**              | TypeSpec Client Generator Core — provides `SdkPackage` object model        |
| **Refkey**            | Symbolic reference key that Alloy resolves to declarations + auto-imports  |
| **SdkPackage**        | Root TCGC type containing clients, models, enums, unions                   |
| **SdkClientType**     | TCGC client with methods, initialization, API versions                     |
| **SdkServiceMethod**  | TCGC operation method (basic, paging, LRO, LRO+paging)                     |
| **SdkModelType**      | TCGC model with properties, inheritance, discriminators                    |
| **Classical Client**  | User-facing class wrapping operation-level API                             |
| **Client Context**    | Internal client interface + factory function                               |
| **Modular**           | The SDK architecture pattern being generated (vs. RLC)                     |
| **RLC**               | Rest Level Client — NOT being rewritten                                    |
| **flight-instructor** | Priority-1 reference emitter for Alloy patterns                            |
