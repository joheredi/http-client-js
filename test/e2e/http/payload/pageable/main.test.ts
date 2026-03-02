/**
 * E2E tests for Payload.Pageable — validates server-driven pagination.
 *
 * Spector spec: payload/pageable
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Server-driven pagination link returns pet items
 * - Continuation token operations return paginated data
 *
 * Note: The generated client returns Promise<Pet[]> in types but at runtime
 * returns the full response object (e.g., { pets: Pet[], next?: string }).
 * We access the .pets property to get the items array.
 */
import { describe, expect, it } from "vitest";
import {
  PageableClient,
  type Pet,
} from "../../../generated/payload/pageable/src/index.js";

describe("Payload.Pageable", () => {
  const client = new PageableClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should get server-driven pagination link", async () => {
    const result = (await client.serverDrivenPagination.link()) as any;
    // The response contains a pets array (runtime shape differs from type annotation)
    const pets = result.pets ?? result;
    expect(pets.length).toBeGreaterThanOrEqual(2);
    expect(pets[0]).toEqual({ id: "1", name: "dog" });
    expect(pets[1]).toEqual({ id: "2", name: "cat" });
  });

  describe("continuationToken", () => {
    it("should get items with requestQueryResponseBody", async () => {
      const result =
        (await client.serverDrivenPagination.continuationToken.requestQueryResponseBody(
          {
            foo: "foo",
            bar: "bar",
          },
        )) as any;
      const pets = result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(1);
    });

    it("should get items with requestHeaderResponseBody", async () => {
      const result =
        (await client.serverDrivenPagination.continuationToken.requestHeaderResponseBody(
          {
            foo: "foo",
            bar: "bar",
          },
        )) as any;
      const pets = result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(1);
    });

    it("should get items with requestQueryResponseHeader", async () => {
      const result =
        (await client.serverDrivenPagination.continuationToken.requestQueryResponseHeader(
          {
            foo: "foo",
            bar: "bar",
          },
        )) as any;
      const pets = result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(1);
    });

    it("should get items with requestHeaderResponseHeader", async () => {
      const result =
        (await client.serverDrivenPagination.continuationToken.requestHeaderResponseHeader(
          {
            foo: "foo",
            bar: "bar",
          },
        )) as any;
      const pets = result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(1);
    });
  });
});
