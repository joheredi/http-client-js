/**
 * Test suite for the namespace-qualifier utility functions.
 *
 * Covers:
 * - `computeNamespacePrefixes` — shortest unique suffix segments
 * - `applyNamespacePrefix` — prepend prefix respecting casing
 * - `createNamespaceMetadata` — metadata record creation from TCGC types
 */
import { describe, expect, it } from "vitest";
import {
  computeNamespacePrefixes,
  applyNamespacePrefix,
  createNamespaceMetadata,
  NAMESPACE_METADATA_KEY,
} from "../../src/utils/namespace-qualifier.js";

describe("computeNamespacePrefixes", () => {
  it("should return shortest unique suffixes for sibling namespaces", () => {
    const result = computeNamespacePrefixes([
      "MyService.NamespaceA",
      "MyService.NamespaceB",
    ]);
    expect(result).toEqual(["NamespaceA", "NamespaceB"]);
  });

  it("should handle deeper nesting with unique leaf segments", () => {
    const result = computeNamespacePrefixes([
      "MyService.Group1.Sub1",
      "MyService.Group1.Sub2",
    ]);
    expect(result).toEqual(["Sub1", "Sub2"]);
  });

  it("should use 2 levels when leaf segments collide", () => {
    const result = computeNamespacePrefixes([
      "MyService.Group1.Sub",
      "MyService.Group2.Sub",
    ]);
    expect(result).toEqual(["Group1Sub", "Group2Sub"]);
  });

  it("should return empty prefix for a single namespace", () => {
    const result = computeNamespacePrefixes(["MyService.A"]);
    expect(result).toEqual([""]);
  });

  it("should fall through to full join for identical namespaces", () => {
    const result = computeNamespacePrefixes(["A.B", "A.B"]);
    // Full join produces the same string for both, which is the fallback
    expect(result).toEqual(["AB", "AB"]);
  });

  it("should return empty array for empty input", () => {
    const result = computeNamespacePrefixes([]);
    expect(result).toEqual([]);
  });

  it("should handle three-way disambiguation", () => {
    const result = computeNamespacePrefixes([
      "Root.A.X",
      "Root.B.X",
      "Root.C.X",
    ]);
    expect(result).toEqual(["AX", "BX", "CX"]);
  });
});

describe("applyNamespacePrefix", () => {
  it("should prepend prefix to PascalCase name", () => {
    expect(applyNamespacePrefix("Foo", "NamespaceA")).toBe("NamespaceAFoo");
  });

  it("should lowercase prefix and capitalize name for camelCase", () => {
    expect(applyNamespacePrefix("fooSerializer", "NamespaceA")).toBe(
      "namespaceAFooSerializer",
    );
  });

  it("should return name unchanged when prefix is empty", () => {
    expect(applyNamespacePrefix("Foo", "")).toBe("Foo");
  });

  it("should return empty string when name is empty", () => {
    expect(applyNamespacePrefix("", "Prefix")).toBe("");
  });

  it("should handle single-char PascalCase name", () => {
    expect(applyNamespacePrefix("X", "Ns")).toBe("NsX");
  });

  it("should handle single-char camelCase name", () => {
    expect(applyNamespacePrefix("x", "Ns")).toBe("nsX");
  });
});

describe("createNamespaceMetadata", () => {
  it("should create metadata record with namespace string", () => {
    const fakeType = { namespace: "MyService.Models" } as any;
    const result = createNamespaceMetadata(fakeType);
    expect(result).toEqual({ [NAMESPACE_METADATA_KEY]: "MyService.Models" });
  });

  it("should return undefined when namespace is empty string", () => {
    const fakeType = { namespace: "" } as any;
    const result = createNamespaceMetadata(fakeType);
    expect(result).toBeUndefined();
  });

  it("should return undefined when namespace is undefined", () => {
    const fakeType = { namespace: undefined } as any;
    const result = createNamespaceMetadata(fakeType);
    expect(result).toBeUndefined();
  });
});
