/**
 * E2E tests for Encode.Array — validates that the generated client correctly
 * serializes arrays with different delimiters (comma, space, pipe, newline)
 * across string, enum, and extensible enum variants.
 *
 * SKIPPED: The generated extensible enum serializers contain unresolved symbol
 * references (`<Unresolved Symbol: refkey[sarraySerializer⁣senum]>`) in
 * models.ts lines 173-197, which cause esbuild parse failures. Since models.ts
 * is imported by all operations, the entire client is unusable until the emitter
 * bug is fixed. See knowledge.md for details.
 */
import { describe, it } from "vitest";

describe.skip("Encode.Array", () => {
  it("should encode string array with comma delimiter", () => {});
  it("should encode string array with space delimiter", () => {});
  it("should encode string array with pipe delimiter", () => {});
  it("should encode string array with newline delimiter", () => {});
  it("should encode enum array with comma delimiter", () => {});
  it("should encode enum array with space delimiter", () => {});
  it("should encode enum array with pipe delimiter", () => {});
  it("should encode enum array with newline delimiter", () => {});
  it("should encode extensible enum array with comma delimiter", () => {});
  it("should encode extensible enum array with space delimiter", () => {});
  it("should encode extensible enum array with pipe delimiter", () => {});
  it("should encode extensible enum array with newline delimiter", () => {});
});
