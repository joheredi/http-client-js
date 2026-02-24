/**
 * Test suite for the TestFile wrapper and custom Vitest matchers.
 *
 * These tests validate that the test infrastructure itself works correctly:
 * - The Tester can compile TypeSpec code
 * - The TestFile wrapper renders Alloy components inside Output/SourceFile
 * - The toRenderTo matcher correctly compares rendered output
 * - Basic Alloy features (code templates, JSX children) work in the test env
 *
 * This is a foundational test — if these tests fail, no other component tests
 * can be trusted.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { Tester } from "../test-host.js";
import { TestFile } from "../utils.jsx";

describe("Test Infrastructure", () => {
  /**
   * Validates that the TypeSpec Tester can compile a minimal TypeSpec program.
   * This is the most basic prerequisite — if compilation fails, nothing else works.
   */
  it("should compile a minimal TypeSpec program", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(t.code`
      model ${t.model("Foo")} {
        name: string;
      }
    `);

    expect(program).toBeDefined();
    expect(program.diagnostics).toHaveLength(0);
  });

  /**
   * Validates that the TestFile wrapper renders plain text children correctly.
   * This tests the simplest rendering path: string content inside the wrapper.
   */
  it("should render plain text via TestFile", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(t.code`
      op ${t.op("test")}(): void;
    `);

    const template = (
      <TestFile program={program}>
        hello world
      </TestFile>
    );

    expect(template).toRenderTo(`
      hello world
    `);
  });

  /**
   * Validates that Alloy code templates with interpolation render correctly
   * inside the TestFile wrapper. This tests that the `code` tagged template
   * works in the test environment.
   */
  it("should render code templates inside TestFile", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(t.code`
      op ${t.op("test")}(): void;
    `);

    const name = "MyClient";
    const template = (
      <TestFile program={program}>
        {code`const client = new ${name}();`}
      </TestFile>
    );

    expect(template).toRenderTo(`
      const client = new MyClient();
    `);
  });

  /**
   * Validates that TypeScript declaration components render correctly inside
   * the TestFile wrapper. This tests the full rendering pipeline: Alloy
   * TypeScript components → rendered TypeScript code.
   */
  it("should render TypeScript declarations", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(t.code`
      op ${t.op("test")}(): void;
    `);

    const template = (
      <TestFile program={program}>
        <ts.InterfaceDeclaration name="Foo" export>
          name: string;
        </ts.InterfaceDeclaration>
      </TestFile>
    );

    expect(template).toRenderTo(`
      export interface Foo {
        name: string;
      }
    `);
  });

  /**
   * Validates that the toRenderTo matcher correctly rejects mismatched output.
   * This ensures the matcher isn't just always passing — it must actually
   * compare content.
   */
  it("should fail when output does not match", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(t.code`
      op ${t.op("test")}(): void;
    `);

    const template = (
      <TestFile program={program}>
        hello world
      </TestFile>
    );

    expect(template).not.toRenderTo(`
      goodbye world
    `);
  });
});
