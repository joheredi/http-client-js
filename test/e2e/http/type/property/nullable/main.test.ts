/**
 * E2E test: Type — Property — Nullable
 *
 * Validates that the generated NullableClient correctly handles models with
 * nullable properties across different types: string, bytes, datetime, duration,
 * and collections (byte, model, string).
 *
 * Each operation group exposes `getNonNull()`, `getNull()`, `patchNonNull()`,
 * and `patchNull()` methods. GET returns a model; PATCH sends a model (as
 * merge-patch+json) and expects 204.
 *
 * All models have a `requiredProperty: "foo"` and a `nullableProperty` that is
 * either the typed value or `null`.
 *
 * Mock server expectations (from @typespec/http-specs type/property/nullable):
 *   - GET  /type/property/nullable/{type}/non-null — returns model with value
 *   - GET  /type/property/nullable/{type}/null     — returns model with null
 *   - PATCH /type/property/nullable/{type}/non-null — accepts model with value, returns 204
 *   - PATCH /type/property/nullable/{type}/null     — accepts model with null, returns 204
 */
import { describe, expect, it } from "vitest";
import { NullableClient } from "../../../../generated/type/property/nullable/src/index.js";

describe("Type.Property.Nullable", () => {
  const client = new NullableClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("string", () => {
    const nonNullValue = { requiredProperty: "foo", nullableProperty: "hello" };
    const nullValue = { requiredProperty: "foo", nullableProperty: null };

    it("should get a non-null string property", async () => {
      const response = await client.string.getNonNull();
      expect(response).toEqual(nonNullValue);
    });

    it("should get a null string property", async () => {
      const response = await client.string.getNull();
      expect(response).toEqual(nullValue);
    });

    it("should patch a non-null string property", async () => {
      await client.string.patchNonNull(nonNullValue);
    });

    it("should patch a null string property", async () => {
      await client.string.patchNull(nullValue);
    });
  });

  describe("bytes", () => {
    // base64 "aGVsbG8sIHdvcmxkIQ==" decodes to "hello, world!"
    const expectedBytes = new TextEncoder().encode("hello, world!");

    it("should get a non-null bytes property", async () => {
      const response = await client.bytes.getNonNull();
      expect(response.requiredProperty).toBe("foo");
      // Normalize to Uint8Array — Node runtime may return Buffer instead
      expect(new Uint8Array(response.nullableProperty!)).toEqual(new Uint8Array(expectedBytes));
    });

    it("should get a null bytes property", async () => {
      const response = await client.bytes.getNull();
      expect(response).toEqual({ requiredProperty: "foo", nullableProperty: null });
    });

    it("should patch a non-null bytes property", async () => {
      await client.bytes.patchNonNull({ requiredProperty: "foo", nullableProperty: expectedBytes });
    });

    it("should patch a null bytes property", async () => {
      await client.bytes.patchNull({ requiredProperty: "foo", nullableProperty: null });
    });
  });

  describe("datetime", () => {
    const nonNullValue = {
      requiredProperty: "foo",
      nullableProperty: new Date("2022-08-26T18:38:00Z"),
    };
    const nullValue = { requiredProperty: "foo", nullableProperty: null };

    it("should get a non-null datetime property", async () => {
      const response = await client.datetime.getNonNull();
      expect(response).toEqual(nonNullValue);
    });

    it("should get a null datetime property", async () => {
      const response = await client.datetime.getNull();
      expect(response).toEqual(nullValue);
    });

    it("should patch a non-null datetime property", async () => {
      await client.datetime.patchNonNull(nonNullValue);
    });

    it("should patch a null datetime property", async () => {
      await client.datetime.patchNull(nullValue);
    });
  });

  describe("duration", () => {
    const nonNullValue = {
      requiredProperty: "foo",
      nullableProperty: "P123DT22H14M12.011S",
    };
    const nullValue = { requiredProperty: "foo", nullableProperty: null };

    it("should get a non-null duration property", async () => {
      const response = await client.duration.getNonNull();
      expect(response).toEqual(nonNullValue);
    });

    it("should get a null duration property", async () => {
      const response = await client.duration.getNull();
      expect(response).toEqual(nullValue);
    });

    it("should patch a non-null duration property", async () => {
      await client.duration.patchNonNull(nonNullValue);
    });

    it("should patch a null duration property", async () => {
      await client.duration.patchNull(nullValue);
    });
  });

  describe("collectionsByte", () => {
    const expectedBytes = new TextEncoder().encode("hello, world!");

    it("should get a non-null collectionsByte property", async () => {
      const response = await client.collectionsByte.getNonNull();
      expect(response.requiredProperty).toBe("foo");
      // Normalize to Uint8Array — Node runtime may return Buffer instead
      const normalized = response.nullableProperty!.map((b: any) => new Uint8Array(b));
      expect(normalized).toEqual([new Uint8Array(expectedBytes), new Uint8Array(expectedBytes)]);
    });

    it("should get a null collectionsByte property", async () => {
      const response = await client.collectionsByte.getNull();
      expect(response).toEqual({ requiredProperty: "foo", nullableProperty: null });
    });

    it("should patch a non-null collectionsByte property", async () => {
      await client.collectionsByte.patchNonNull({
        requiredProperty: "foo",
        nullableProperty: [expectedBytes, expectedBytes],
      });
    });

    it("should patch a null collectionsByte property", async () => {
      await client.collectionsByte.patchNull({ requiredProperty: "foo", nullableProperty: null });
    });
  });

  describe("collectionsModel", () => {
    const nonNullValue = {
      requiredProperty: "foo",
      nullableProperty: [{ property: "hello" }, { property: "world" }],
    };
    const nullValue = { requiredProperty: "foo", nullableProperty: null };

    it("should get a non-null collectionsModel property", async () => {
      const response = await client.collectionsModel.getNonNull();
      expect(response).toEqual(nonNullValue);
    });

    it("should get a null collectionsModel property", async () => {
      const response = await client.collectionsModel.getNull();
      expect(response).toEqual(nullValue);
    });

    it("should patch a non-null collectionsModel property", async () => {
      await client.collectionsModel.patchNonNull(nonNullValue);
    });

    it("should patch a null collectionsModel property", async () => {
      await client.collectionsModel.patchNull(nullValue);
    });
  });

  describe("collectionsString", () => {
    const nonNullValue = {
      requiredProperty: "foo",
      nullableProperty: ["hello", "world"],
    };
    const nullValue = { requiredProperty: "foo", nullableProperty: null };

    it("should get a non-null collectionsString property", async () => {
      const response = await client.collectionsString.getNonNull();
      expect(response).toEqual(nonNullValue);
    });

    it("should get a null collectionsString property", async () => {
      const response = await client.collectionsString.getNull();
      expect(response).toEqual(nullValue);
    });

    it("should patch a non-null collectionsString property", async () => {
      await client.collectionsString.patchNonNull(nonNullValue);
    });

    it("should patch a null collectionsString property", async () => {
      await client.collectionsString.patchNull(nullValue);
    });
  });
});
