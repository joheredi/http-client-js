/**
 * Tests for the normalizeImports function in the scenario test harness.
 *
 * The normalizeImports function normalizes TypeScript import statement
 * ordering to make output comparisons deterministic, regardless of
 * Alloy's non-deterministic import generation order.
 *
 * What is tested:
 * - Single-file import normalization (specifier sorting, module sorting)
 * - Multi-file concatenated output preserves per-file structure
 * - Empty input and no-import input pass through unchanged
 *
 * Why this matters:
 * The previous implementation of normalizeImports collapsed all imports
 * across multiple concatenated files into one block, destroying the
 * multi-file structure. This caused sample scenario tests to pass with
 * incorrect expectations (all files appeared as one file with duplicate
 * imports). The per-section split ensures each file's imports are
 * normalized independently, preserving correct multi-file output.
 */
import { describe, expect, it } from "vitest";
import { _normalizeImports as normalizeImports } from "./scenario-harness.js";

describe("normalizeImports", () => {
  /**
   * Tests that import specifiers are sorted alphabetically within each
   * import statement, and import statements are sorted by module path.
   * This is the core normalization that makes Alloy's non-deterministic
   * import order irrelevant for test comparisons.
   */
  it("should sort imports by module path and specifiers alphabetically", () => {
    const input = `import { B, A } from "z-module";\nimport { D, C } from "a-module";\n\nconst x = 1;`;
    const result = normalizeImports(input);

    expect(result).toContain('import { C, D } from "a-module";');
    expect(result).toContain('import { A, B } from "z-module";');
    // a-module should come before z-module
    expect(result.indexOf("a-module")).toBeLessThan(result.indexOf("z-module"));
    // Non-import content preserved
    expect(result).toContain("const x = 1;");
  });

  /**
   * Tests that input without imports is returned unchanged.
   * Many code blocks (type definitions, function bodies) have no imports.
   */
  it("should return code unchanged when no imports exist", () => {
    const input = "const x = 1;\nconst y = 2;";
    expect(normalizeImports(input)).toBe(input);
  });

  /**
   * Tests that multi-file concatenated output (used by sample scenario
   * tests) normalizes imports per-file rather than collapsing all imports
   * into one block. This is the critical fix — without per-section handling,
   * the function would destroy content between files, causing stale test
   * expectations to match incorrectly.
   */
  it("should preserve multi-file structure in concatenated sample output", () => {
    const input = [
      '/** This file path is /samples-dev/file1.ts */',
      'import { B } from "pkg";',
      'import { A } from "@azure/identity";',
      "",
      "async function file1Func() {}",
      "",
      '/** This file path is /samples-dev/file2.ts */',
      'import { D } from "pkg";',
      'import { C } from "@azure/identity";',
      "",
      "async function file2Func() {}",
    ].join("\n");

    const result = normalizeImports(input);

    // Both files should be present
    expect(result).toContain("file1.ts");
    expect(result).toContain("file2.ts");

    // Both function bodies should be present (not destroyed)
    expect(result).toContain("file1Func");
    expect(result).toContain("file2Func");

    // Imports should be sorted within each file section
    const file1Section = result.split("/** This file path is /samples-dev/file2.ts */")[0];
    expect(file1Section).toContain('import { A } from "@azure/identity";');
    expect(file1Section).toContain('import { B } from "pkg";');

    const file2Section = result.split("/** This file path is /samples-dev/file2.ts */")[1];
    expect(file2Section).toContain('import { C } from "@azure/identity";');
    expect(file2Section).toContain('import { D } from "pkg";');
  });

  /**
   * Tests that single-file content (without file path comments) still
   * works correctly. Most scenario tests use single-file output for
   * models, operations, etc.
   */
  it("should handle single-file content without file path comments", () => {
    const input = [
      'import { C } from "b-module";',
      'import { A } from "a-module";',
      "",
      "export interface Foo { bar: string; }",
    ].join("\n");

    const result = normalizeImports(input);
    expect(result).toContain('import { A } from "a-module";');
    expect(result).toContain("export interface Foo { bar: string; }");
    expect(result.indexOf("a-module")).toBeLessThan(result.indexOf("b-module"));
  });
});
