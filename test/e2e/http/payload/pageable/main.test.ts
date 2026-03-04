/**
 * E2E tests for Payload.Pageable — validates server-driven pagination.
 *
 * Spector spec: payload/pageable
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Server-driven pagination link returns pet items (link, linkString, nestedLink)
 * - Continuation token operations return paginated data (flat and nested response bodies)
 * - Page size parameter is correctly sent as a query parameter
 * - XML pagination returns correctly deserialized pet items
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

  /**
   * Validates pagination with string nextLink (not URL type).
   * Mock returns { pets: [{id:"1",name:"dog"},{id:"2",name:"cat"}], next: "<url>" }
   */
  it("should get server-driven pagination linkString", async () => {
    const result = (await client.serverDrivenPagination.linkString()) as any;
    const pets = result.pets ?? result;
    expect(pets.length).toBeGreaterThanOrEqual(2);
    expect(pets[0]).toEqual({ id: "1", name: "dog" });
    expect(pets[1]).toEqual({ id: "2", name: "cat" });
  });

  /**
   * Validates pagination with nested link in response.
   * Mock returns { nestedItems: { pets: [...] }, nestedNext: { next: "<url>" } }
   * The deserializer preserves the nested structure.
   */
  it("should get server-driven pagination nestedLink", async () => {
    const result = (await client.serverDrivenPagination.nestedLink()) as any;
    // Nested response: items are under nestedItems.pets
    const pets = result.nestedItems?.pets ?? result.pets ?? result;
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

    /**
     * Validates continuation token sent as query param with nested response body.
     * Mock expects: headers { foo: "foo" }, query { bar: "bar" }
     * Returns: { nestedItems: { pets: [...] }, nestedNext: { nextToken: "page2" } }
     */
    it("should get items with requestQueryNestedResponseBody", async () => {
      const result =
        (await client.serverDrivenPagination.continuationToken.requestQueryNestedResponseBody(
          {
            foo: "foo",
            bar: "bar",
          },
        )) as any;
      const pets = result.nestedItems?.pets ?? result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(1);
      expect(pets[0]).toEqual({ id: "1", name: "dog" });
    });

    /**
     * Validates continuation token sent as header with nested response body.
     * Mock expects: headers { foo: "foo" }, query { bar: "bar" }
     * Returns: { nestedItems: { pets: [...] }, nestedNext: { nextToken: "page2" } }
     */
    it("should get items with requestHeaderNestedResponseBody", async () => {
      const result =
        (await client.serverDrivenPagination.continuationToken.requestHeaderNestedResponseBody(
          {
            foo: "foo",
            bar: "bar",
          },
        )) as any;
      const pets = result.nestedItems?.pets ?? result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(1);
      expect(pets[0]).toEqual({ id: "1", name: "dog" });
    });
  });

  describe("pageSize", () => {
    /**
     * Validates pagination with explicit page size parameter.
     * Mock expects pageSize=2 query param and returns 2 pets.
     */
    it("should list with page size", async () => {
      const result = (await client.pageSize.listWithPageSize({
        pageSize: 2,
      })) as any;
      const pets = result.pets ?? result;
      expect(pets).toHaveLength(2);
      expect(pets[0]).toEqual({ id: "1", name: "dog" });
      expect(pets[1]).toEqual({ id: "2", name: "cat" });
    });

    /**
     * Validates single-page response with no continuation token.
     * Mock returns all 4 pets in a single response with no next token.
     */
    it("should list without continuation", async () => {
      const result = (await client.pageSize.listWithoutContinuation()) as any;
      const pets = result.pets ?? result;
      expect(pets).toHaveLength(4);
      expect(pets[0]).toEqual({ id: "1", name: "dog" });
      expect(pets[1]).toEqual({ id: "2", name: "cat" });
      expect(pets[2]).toEqual({ id: "3", name: "bird" });
      expect(pets[3]).toEqual({ id: "4", name: "fish" });
    });
  });

  describe("xmlPagination", () => {
    /**
     * Validates XML response with nextLink pagination.
     * Mock returns XML with <Pets><Pet>... and <NextLink> element.
     * Verifies XML deserialization produces correct pet objects.
     */
    it("should list with next link", async () => {
      const result = (await client.xmlPagination.listWithNextLink()) as any;
      const pets = result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(2);
      expect(pets[0]).toEqual({ id: "1", name: "dog" });
      expect(pets[1]).toEqual({ id: "2", name: "cat" });
    });

    /**
     * Validates XML response with continuation token (NextMarker) pagination.
     * Mock returns XML with <Pets><Pet>... and <NextMarker> element.
     * Verifies XML deserialization produces correct pet objects.
     */
    it("should list with continuation", async () => {
      const result = (await client.xmlPagination.listWithContinuation()) as any;
      const pets = result.pets ?? result;
      expect(pets.length).toBeGreaterThanOrEqual(2);
      expect(pets[0]).toEqual({ id: "1", name: "dog" });
      expect(pets[1]).toEqual({ id: "2", name: "cat" });
    });
  });
});
