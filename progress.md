# PRD Remaining Tasks Report

> Generated: 2026-02-25 — Phase 12: Scenario Test Parity — Root Cause Fixes

All tasks below are from **Phase 12** of the PRD. Earlier phases (1–11) are complete.
RC23 (Reserved word naming) was resolved in commit `0fe932b`.

---

## Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **P1** | 12 | Functional differences affecting output parity |
| **P2** | 4 | Style/cosmetic differences |
| **Total** | **16** | Remaining tasks (was 17; RC23 now done) |

---

## P1 — Functional Parity Issues

### RC10 — Missing DefaultAzureCredential import in Azure samples
- **File**: `src/components/sample-files.tsx`
- **Scenarios**: `samples/client/multipleClient.md`
- **Root cause**: `hasOAuth2Auth()` fails to detect OAuth2 credentials when the scheme is nested in a union type.

### RC11 — Sample environment variable names don't match legacy convention
- **File**: `src/components/sample-files.tsx`
- **Scenarios**: `samples/parameters/bodyRequiredCheck.md`, `samples/parameters/bodyOptionalCheck.md`, and many more
- **Root cause**: `getClientName()` returns a different base name than legacy. Env var is `UPPER_SNAKE_CASE(clientName + '_ENDPOINT')` → different client name = different env var.

### RC14 — URL template parameter keys not percent-encoded
- **File**: `src/components/send-operation.tsx`
- **Scenarios**: `operations/pathParam/pathParamUrlTemplate.md`, `operations/queryParam/queryParamUrlTemplate.md`, `operations/queryParam/queryParamWithClientInitialization.md`, `apiOperations/azureCoreOperations.md`
- **Root cause**: Parameter keys like `api-version` are passed as plain strings. Legacy uses `api%2Dversion`. RFC 6570 expansion may differ.

### RC21 — Nested enum types flattened to string literal union instead of composed types
- **File**: `src/components/sub-enum-declaration.tsx`, `src/components/union-declaration.tsx`
- **Scenarios**: `models/nestedEnum/notFlatten/experimentalExtensibleEnumsFalse.md`, `models/nestedEnum/notFlatten/experimentalExtensibleEnumsUndefined.md`
- **Root cause**: All enum values are flattened into a single string literal union. Legacy generates separate type aliases composed into unions with `| string` for extensibility, plus dedicated serializers.

### RC22 — Classical client missing constructor overloads for subscription handling
- **File**: `src/components/classical-client.tsx`
- **Scenarios**: `classicClient/clientConstructorOverloads.md`
- **Root cause**: Single constructor generated. Legacy generates overloaded constructors for mixed tenant/subscription-level operations with polymorphic `subscriptionIdOrOptions` parameter.

### RC25 — Multipart file types use File interface hierarchy instead of FileContents union
- **File**: `src/components/serialization/multipart-serializer.tsx`
- **Scenarios**: `multipart/file.md`, `multipart/text.md`, `multipart/renamewithWireNameAndClientName.md`
- **Root cause**: Structured `File` interfaces generated. Legacy uses `FileContents` union types. Also, `contentType` added as explicit parameter in new but not in legacy.

### RC26 — API version passed as explicit function parameter instead of context property
- **File**: `src/components/send-operation.tsx`, `src/components/public-operation.tsx`
- **Scenarios**: `operations/pathParam/pathParamUrlTemplate.md`, `operations/queryParam/explodeTrueWithAnnotation.md`, `samples/parameters/parameterOrdering.md`
- **Root cause**: Some operations pass `apiVersion` as function parameter while legacy always reads from `context.apiVersion` with fallback default.

### RC27 — Client class and context naming ignores service title configuration
- **File**: `src/components/classical-client.tsx`, `src/components/client-context.tsx`, `src/components/sample-files.tsx`
- **Scenarios**: `classicClient/classicClient.md`, `classicClient/reservedWordOperations.md`, `samples/client/renameClientName.md`
- **Root cause**: `client.name` from TCGC used directly. `@clientName` decorators or title-map configuration not reflected in class/context naming.

### RC28 — Azure flavor not applied in scenario test expectations
- **File**: `test/scenarios/emit-for-scenario.tsx`
- **Scenarios**: ALL operations files (~80+)
- **Root cause**: Test harness defaults to `'core'` flavor, emitting `@typespec/ts-http-runtime` imports. Legacy scenarios expect `@azure-rest/core-client` (Azure flavor).

### RC30 — Property flatten uses helper functions instead of inline serialization
- **File**: `src/components/serialization/json-serializer.tsx`, `src/components/model-interface.tsx`
- **Scenarios**: `models/propertyFlatten/*.md`, `models/serialization/readonlyFlattenModel.md`, `samples/propertyFlatten/*.md`
- **Root cause**: Separate helper functions with `areAllPropsUndefined` checks generated. Legacy inlines property serialization directly. Different name collision resolution strategy.

### RC12 — Sample x-ms-original-file paths missing API version prefix
- **File**: `src/components/sample-files.tsx`
- **Scenarios**: Most `samples/parameters/*.md` files
- **Root cause**: Sample JSDoc references `json.json` instead of `2021-10-01-preview/json.json`.

---

## P2 — Style / Cosmetic Issues

### RC31 — Missing ESLint disable directives in model output files
- **File**: `src/components/model-files.tsx`, `src/components/model-interface.tsx`
- **Scenarios**: ALL model files (~40+)
- **Root cause**: No `eslint-disable` comments (`naming-convention`, `explicit-module-boundary-types`) at file top. Legacy includes these for generated code compatibility.

### RC32 — Response types use intersection instead of inline expanded object
- **File**: `src/components/deserialize-headers.tsx`
- **Scenarios**: `models/response/headerAndModelInResponse.md`, `models/response/headerAndModelSpread.md`, `models/response/headerInResponse.md`, `models/response/headerInXmlResponse.md`
- **Root cause**: Response types with headers use `User & { requestId: string }` intersection. Legacy expands all properties into a single inline object. Semantically equivalent.

### RC33 — Constant model properties expanded as function parameters
- **File**: `src/components/send-operation.tsx`
- **Scenarios**: `models/models.md` (constant type model scenario)
- **Root cause**: Constant-only models generate function parameters with literal types. Legacy hardcodes constant values in the request body.

### RC34 — Constructor endpoint parameter named 'endpoint' instead of 'endpointParam'
- **File**: `src/components/client-context.tsx`
- **Scenarios**: `clientContext/clientContext.md`, `classicClient/classicClient.md`
- **Root cause**: TCGC template argument name used directly. Legacy appends `Param` suffix.
- **Note**: This may have been partially addressed by the naming policy change (RC23 fix escapes `endpoint` → `endpointParam` for function parameters). Needs verification for constructor context specifically.
