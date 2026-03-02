import { describe, expect, it } from "vitest";
import { AddedClient } from "../../../generated/versioning/added/src/index.js";

/**
 * Tests for Versioning.Added — validates that the @added decorator correctly
 * adds new models, enums, unions, operations, and operation groups in later API versions.
 *
 * Mock API at /versioning/added/api-version:v2/* echoes request bodies back as responses.
 */
describe("Versioning.Added", () => {
  const client = new AddedClient("http://localhost:3002", {
    allowInsecureConnection: true,
  });

  /**
   * Tests v1 operation which sends a ModelV1 with v2-specific enum/union props
   * and a header-v2 header. Validates that v1 operations still work at v2 API version.
   */
  it("should call v1 operation", async () => {
    const body = {
      prop: "foo",
      enumProp: "enumMemberV2" as const,
      unionProp: 10,
    };
    const result = await client.v1(body, "bar");
    expect(result.prop).toBe("foo");
    expect(result.enumProp).toBe("enumMemberV2");
    expect(result.unionProp).toBe(10);
  });

  /**
   * Tests v2 operation added in API version v2 with ModelV2 (different enum/union variants).
   */
  it("should call v2 operation", async () => {
    const body = {
      prop: "foo",
      enumProp: "enumMember" as const,
      unionProp: "bar" as string | number,
    };
    const result = await client.v2(body);
    expect(result.prop).toBe("foo");
    expect(result.enumProp).toBe("enumMember");
    expect(result.unionProp).toBe("bar");
  });

  /**
   * Tests v2InInterface operation added in API version v2 via a new operation group (InterfaceV2).
   * Validates that new interfaces added in later versions work correctly.
   */
  it("should call v2InInterface operation", async () => {
    const body = {
      prop: "foo",
      enumProp: "enumMember" as const,
      unionProp: "bar" as string | number,
    };
    const result = await client.interfaceV2.v2InInterface(body);
    expect(result.prop).toBe("foo");
    expect(result.enumProp).toBe("enumMember");
    expect(result.unionProp).toBe("bar");
  });
});
