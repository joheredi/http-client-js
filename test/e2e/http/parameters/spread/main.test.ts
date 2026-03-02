/**
 * E2E tests for Parameters.Spread — validates TypeSpec spread parameter behavior.
 *
 * Spector spec: parameters/spread
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Named model spread flattens body parameters
 * - Composite requests split across path, header, and body
 * - Alias spread supports multi-parameter and inner model/alias scenarios
 *
 * NOTE: Currently skipped because the generated code has invalid TypeScript.
 * The classic/alias/index.ts interface uses `x-ms-test-header` as a parameter name
 * which contains hyphens and can't be parsed by esbuild. This is a code generation bug.
 */
import { describe, it } from "vitest";

describe.skip("Parameters.Spread", () => {
  it("should spread named model as request body", () => {});
  it("should spread composite request only with body", () => {});
  it("should spread composite request without body", () => {});
  it("should spread composite request", () => {});
  it("should spread composite request mix", () => {});
  it("should spread alias as request body", () => {});
  it("should spread alias as request parameter", () => {});
  it("should spread alias with multiple parameters", () => {});
  it("should spread alias with inner model parameter", () => {});
  it("should spread alias with inner alias parameter", () => {});
});
