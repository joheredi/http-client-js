# Testing Strategy & Infrastructure Setup Plan for http-client-js

## Problem Statement

The `http-client-js` repository currently has **zero tests** and no test infrastructure beyond a basic vitest config. By studying the test patterns in the `flight-instructor` submodule (23 test files), we can establish a testing strategy that follows the same conventions and patterns for consistency across the project.

## Key Findings from flight-instructor Tests

### Test Categories Identified

The flight-instructor tests fall into **3 distinct categories**:

1. **Component Render Tests** (JSX/TSX) — The majority of tests
   - Compile TypeSpec code via `Tester.createInstance()` + `runner.compile(t.code\`...\`)`
   - Render Alloy JSX components (e.g., `<IfElseChain>`, `<ModelDeclaration>`, `<ModelSerializationExpression>`)
   - Assert output using the custom `toRenderTo()` matcher which compares rendered text output
   - Examples: `if-else-chain.test.tsx`, `model-declaration.test.tsx`, `model-serialization-expression.test.tsx`

2. **Context/Integration Tests** (TSX) — Mid-level tests
   - Use `testHelper()` to set up full context chains (HttpRequestContext, DeclarationProviderContext, HttpCanonicalizationContext)
   - Verify context values (parameters, auth schemes, types) rather than rendered output
   - Use `helper.render()` to convert type references to strings for assertion
   - Examples: `http-request.test.tsx`, `request-headers.test.tsx`, `request-path.test.tsx`

3. **Pure Unit Tests** (TS) — Runtime helper logic
   - Standard vitest patterns: `vi.fn()`, `vi.useFakeTimers()`, `beforeEach`/`afterEach`
   - No TypeSpec compilation or JSX rendering
   - Test pure functions in isolation
   - Examples: `withRetries.test.ts`, `get-service-info.test.ts`

### Test Infrastructure Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `test-host.ts` | Creates TypeSpec compiler `Tester` instance with library imports | `test/test-host.ts` |
| `utils.tsx` | Test wrappers: `TestFile`, `DeclarationTestFile`, `ReferenceTestFile`, `testHelper()` | `test/utils.tsx` |
| `vitest.d.ts` | Custom matcher types (`toRenderTo`, `toRenderToAsync`) | `test/vitest.d.ts` |
| `vitest.config.ts` | Vitest config with `alloyPlugin()` and JSX preserve | Root |

### Key Patterns

- **Test co-location**: Tests live next to their source files (`component.tsx` → `component.test.tsx`)
- **TypeSpec compilation in tests**: Tests compile inline TypeSpec snippets using `t.code` tagged template literals
- **Custom assertion**: `toRenderTo()` compares rendered Alloy output (auto-trims whitespace)
- **Context providers**: Tests wrap components in provider hierarchies matching production usage
- **No snapshot files**: All expected output is inline in the test

## Proposed Testing Strategy for http-client-js

### Phase 1: Test Infrastructure Setup

#### 1.1 Create Test Host (`test/test-host.ts`)
- Mirror flight-instructor's pattern
- Create a `Tester` instance configured with the TypeSpec libraries this repo uses (`@typespec/http`, `@typespec/versioning`)
- This is the foundation for all component tests

#### 1.2 Create Test Utilities (`test/utils.tsx`)
- **`TestFile`** wrapper — renders Alloy output with `createTSNamePolicy()` and a single `SourceFile`
- **`DeclarationTestFile`** wrapper — adds `DeclarationProviderContext`
- **`testHelper()`** function — compiles TypeSpec code, sets up context chains, returns context + render helper
- Keep it lean initially; add utilities as needed

#### 1.3 Add Custom Matcher Types (`test/vitest.d.ts`)
- Declare `toRenderTo` and `toRenderToAsync` matchers (provided by `@alloy-js/core/testing`)
- Ensures TypeScript knows about these custom matchers

#### 1.4 Verify vitest.config.ts
- Already configured with `alloyPlugin()` and JSX preserve ✅
- Verify it picks up `.test.tsx` files correctly

### Phase 2: Test Pattern Templates

Create one example test for each category to serve as templates:

#### 2.1 Component Render Test Template
```tsx
// src/components/ExampleComponent.test.tsx
import "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { Tester } from "../../test/test-host.js";
import { TestFile } from "../../test/utils.jsx";
import { ExampleComponent } from "./ExampleComponent.jsx";

it("renders expected output", async () => {
  const runner = await Tester.createInstance();
  const { program } = await runner.compile(t.code`
    op ${t.op("test")}(): void;
  `);

  const template = (
    <TestFile program={program}>
      <ExampleComponent />
    </TestFile>
  );

  expect(template).toRenderTo(`expected output`);
});
```

#### 2.2 Pure Unit Test Template
```ts
// src/helpers/someHelper.test.ts
import { describe, expect, it, vi } from "vitest";
import { someHelper } from "./someHelper.js";

describe("someHelper", () => {
  it("should do the expected thing", () => {
    expect(someHelper("input")).toBe("output");
  });
});
```

### Phase 3: Dependency Verification

Ensure these test dependencies are available in `package.json`:
- `vitest` ✅ (already present)
- `@alloy-js/core/testing` — custom matchers (check if available via `@alloy-js/core`)
- `@typespec/compiler/testing` — `createTester`, `t.code` template tags
- `@typespec/http` ✅ (needed for Tester libraries)
- `@typespec/versioning` (if needed)

### Phase 4: CI Integration

- `npm test` / `pnpm test` → `vitest run` ✅ (already configured)
- `npm run test:watch` → `vitest -w` ✅ (already configured)

## Implementation Todos

1. **test-host** — Create `test/test-host.ts` with Tester instance
2. **test-utils** — Create `test/utils.tsx` with TestFile, DeclarationTestFile, testHelper
3. **vitest-types** — Create `test/vitest.d.ts` with custom matcher declarations
4. **verify-deps** — Verify/add test dependencies (`@typespec/compiler`, `@alloy-js/core/testing`)
5. **example-test** — Create a sample component render test as a template
6. **validate** — Run `vitest run` to verify infrastructure works end-to-end

## Notes

- The http-client-js repo shares the same Alloy/TypeSpec stack as flight-instructor, so the same test patterns apply directly
- Tests should be co-located with source files (not in a separate `test/` tree), consistent with flight-instructor
- Only the shared test infrastructure (`test-host.ts`, `utils.tsx`, `vitest.d.ts`) goes in the top-level `test/` directory
- The `@typespec/compiler/testing` and `@alloy-js/core/testing` imports provide the core testing primitives
