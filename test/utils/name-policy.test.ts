/**
 * Test suite for the name policy's PascalCase normalization of type names.
 *
 * Verifies that `normalizePascalCaseName` (used as pre-normalization before
 * Alloy's name policy) correctly handles:
 * - Digit-word boundaries (Base64url → Base64Url)
 * - ALL-CAPS segment preservation (NFV, IP, SAS ≤3 chars)
 * - Simple PascalCase pass-through (MyModel → MyModel)
 * - Leading digit prefixing (_123Foo)
 */
import { describe, expect, it } from "vitest";
import { normalizePascalCaseName } from "../../src/utils/name-policy.js";

describe("normalizePascalCaseName", () => {
  it("should capitalize word boundaries after digits (Base64url → Base64Url)", () => {
    expect(normalizePascalCaseName("Base64urlBytesProperty")).toBe(
      "Base64UrlBytesProperty",
    );
  });

  it("should capitalize word boundaries after digits in array variant", () => {
    expect(normalizePascalCaseName("Base64urlArrayBytesProperty")).toBe(
      "Base64UrlArrayBytesProperty",
    );
  });

  it("should normalize composed option param names", () => {
    expect(normalizePascalCaseName("Base64urlOptionalParams")).toBe(
      "Base64UrlOptionalParams",
    );
    expect(normalizePascalCaseName("Base64urlArrayOptionalParams")).toBe(
      "Base64UrlArrayOptionalParams",
    );
  });

  it("should preserve ≤3-char ALL-CAPS segments", () => {
    expect(normalizePascalCaseName("NFVCluster")).toBe("NFVCluster");
    expect(normalizePascalCaseName("IPAddress")).toBe("IPAddress");
    expect(normalizePascalCaseName("SASToken")).toBe("SASToken");
  });

  it("should pass through simple PascalCase names unchanged", () => {
    expect(normalizePascalCaseName("MyModel")).toBe("MyModel");
    expect(normalizePascalCaseName("Widget")).toBe("Widget");
    expect(normalizePascalCaseName("FooBarBaz")).toBe("FooBarBaz");
  });

  it("should prefix _ for leading digits", () => {
    expect(normalizePascalCaseName("123Foo")).toBe("_123Foo");
  });

  it("should handle underscore-separated names", () => {
    expect(normalizePascalCaseName("pascal_case_5")).toBe("PascalCase5");
    expect(normalizePascalCaseName("MAX_of_MLD")).toBe("MAXOfMLD");
  });
});
