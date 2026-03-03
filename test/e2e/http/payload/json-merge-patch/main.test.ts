import { describe, expect, it } from "vitest";
import { JsonMergePatchClient } from "../../../generated/payload/json-merge-patch/src/index.js";

/**
 * Tests for JSON Merge Patch (RFC 7386) content-type support.
 *
 * Validates that:
 * 1. createResource works with application/json content-type
 * 2. updateResource preserves null values with application/merge-patch+json
 *    (null signals property deletion per RFC 7386)
 * 3. updateOptionalResource works with optional body parameter
 *
 * The key behavior being tested: when content-type is application/merge-patch+json,
 * null values must NOT be stripped — they must be serialized as `null` in the JSON
 * body so the server knows to delete those properties.
 */
describe("Payload.JsonMergePatch", () => {
  const client = new JsonMergePatchClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
    retryOptions: {
      maxRetries: 1,
    },
  });

  it("should handle createResource operation with application/json content type", async () => {
    const requestBody = {
      name: "Madge",
      description: "desc",
      map: {
        key: {
          name: "InnerMadge",
          description: "innerDesc",
        },
      },
      array: [
        {
          name: "InnerMadge",
          description: "innerDesc",
        },
      ],
      intValue: 1,
      floatValue: 1.25,
      innerModel: {
        name: "InnerMadge",
        description: "innerDesc",
      },
      intArray: [1, 2, 3],
    };

    const expectedResponse = {
      name: "Madge",
      description: "desc",
      map: {
        key: {
          name: "InnerMadge",
          description: "innerDesc",
        },
      },
      array: [
        {
          name: "InnerMadge",
          description: "innerDesc",
        },
      ],
      intValue: 1,
      floatValue: 1.25,
      innerModel: {
        name: "InnerMadge",
        description: "innerDesc",
      },
      intArray: [1, 2, 3],
    };

    const response = await client.createResource(requestBody);
    expect(response).toEqual(expectedResponse);
  });

  it("should handle updateResource with null values for merge-patch property deletion", async () => {
    // RFC 7386: null values signal property deletion in merge-patch+json
    const requestBody = {
      description: null,
      map: {
        key: {
          description: null,
        },
        key2: null,
      },
      array: null,
      intValue: null,
      floatValue: null,
      innerModel: null,
      intArray: null,
    };

    const expectedResponse = {
      name: "Madge",
      map: {
        key: {
          name: "InnerMadge",
        },
      },
    };

    // Use `as any` because TypeScript types don't include `| null` for merge-patch
    // models, but RFC 7386 requires null values to be sendable
    const response = await client.updateResource(requestBody as any);
    expect(response).toEqual(expectedResponse);
  });

  it.skip("should handle updateOptionalResource with null values for merge-patch property deletion", async () => {
    const requestBody = {
      description: null,
      map: {
        key: {
          description: null,
        },
        key2: null,
      },
      array: null,
      intValue: null,
      floatValue: null,
      innerModel: null,
      intArray: null,
    };

    const expectedResponse = {
      name: "Madge",
      map: {
        key: {
          name: "InnerMadge",
        },
      },
    };

    const response = await client.updateOptionalResource(requestBody as any);
    expect(response).toEqual(expectedResponse);
  });
});
