/**
 * E2E test: Type — Property — Optionality
 *
 * Validates that the generated OptionalClient correctly handles models with
 * optional properties across various types: string, bytes, datetime, duration,
 * plainDate, plainTime, collections (byte, model), literals (string, int, float,
 * boolean), union literals, and a mixed required-and-optional model.
 *
 * Most operation groups expose `getAll()`, `getDefault()`, `putAll()`, and
 * `putDefault()`. The "all" variant includes the optional property; the "default"
 * variant omits it. RequiredAndOptional additionally has `getRequiredOnly()` and
 * `putRequiredOnly()`.
 *
 * Mock server expectations (from @typespec/http-specs type/property/optionality):
 *   - GET  /type/property/optional/{type}/all     — returns { property: <value> }
 *   - GET  /type/property/optional/{type}/default — returns {}
 *   - PUT  /type/property/optional/{type}/all     — accepts { property: <value> }, returns 204
 *   - PUT  /type/property/optional/{type}/default — accepts {}, returns 204
 */
import { describe, expect, it } from "vitest";
import { OptionalClient } from "../../../../generated/type/property/optionality/src/index.js";

describe("Type.Property.Optionality", () => {
  const client = new OptionalClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("string", () => {
    it("should get all properties", async () => {
      const response = await client.string.getAll();
      expect(response.property).toBe("hello");
    });

    it("should get default (no optional property)", async () => {
      const response = await client.string.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.string.putAll({ property: "hello" });
    });

    it("should put default (no optional property)", async () => {
      await client.string.putDefault({});
    });
  });

  describe("bytes", () => {
    const expectedBytes = new TextEncoder().encode("hello, world!");

    it("should get all properties", async () => {
      const response = await client.bytes.getAll();
      // Normalize to Uint8Array — Node runtime may return Buffer instead
      expect(new Uint8Array(response.property!)).toEqual(
        new Uint8Array(expectedBytes),
      );
    });

    it("should get default (no optional property)", async () => {
      const response = await client.bytes.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.bytes.putAll({ property: expectedBytes });
    });

    it("should put default (no optional property)", async () => {
      await client.bytes.putDefault({});
    });
  });

  describe("datetime", () => {
    const testValue = new Date("2022-08-26T18:38:00Z");

    it("should get all properties", async () => {
      const response = await client.datetime.getAll();
      expect(response.property).toEqual(testValue);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.datetime.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.datetime.putAll({ property: testValue });
    });

    it("should put default (no optional property)", async () => {
      await client.datetime.putDefault({});
    });
  });

  describe("duration", () => {
    const testValue = "P123DT22H14M12.011S";

    it("should get all properties", async () => {
      const response = await client.duration.getAll();
      expect(response.property).toBe(testValue);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.duration.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.duration.putAll({ property: testValue });
    });

    it("should put default (no optional property)", async () => {
      await client.duration.putDefault({});
    });
  });

  describe("plainDate", () => {
    // Mock server returns "2022-12-12" which is parsed as a Date
    const testValue = new Date("2022-12-12");

    it("should get all properties", async () => {
      const response = await client.plainDate.getAll();
      expect(response.property).toEqual(testValue);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.plainDate.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.plainDate.putAll({ property: testValue });
    });

    it("should put default (no optional property)", async () => {
      await client.plainDate.putDefault({});
    });
  });

  describe("plainTime", () => {
    const testValue = "13:06:12";

    it("should get all properties", async () => {
      const response = await client.plainTime.getAll();
      expect(response.property).toBe(testValue);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.plainTime.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.plainTime.putAll({ property: testValue });
    });

    it("should put default (no optional property)", async () => {
      await client.plainTime.putDefault({});
    });
  });

  describe("collectionsByte", () => {
    const expectedBytes = new TextEncoder().encode("hello, world!");

    it("should get all properties", async () => {
      const response = await client.collectionsByte.getAll();
      // Normalize to Uint8Array — Node runtime may return Buffer instead
      const normalized = response.property!.map((b: any) => new Uint8Array(b));
      expect(normalized).toEqual([
        new Uint8Array(expectedBytes),
        new Uint8Array(expectedBytes),
      ]);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.collectionsByte.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.collectionsByte.putAll({
        property: [expectedBytes, expectedBytes],
      });
    });

    it("should put default (no optional property)", async () => {
      await client.collectionsByte.putDefault({});
    });
  });

  describe("collectionsModel", () => {
    const testValue = [{ property: "hello" }, { property: "world" }];

    it("should get all properties", async () => {
      const response = await client.collectionsModel.getAll();
      expect(response.property).toEqual(testValue);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.collectionsModel.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.collectionsModel.putAll({ property: testValue });
    });

    it("should put default (no optional property)", async () => {
      await client.collectionsModel.putDefault({});
    });
  });

  describe("stringLiteral", () => {
    it("should get all properties", async () => {
      const response = await client.stringLiteral.getAll();
      expect(response.property).toBe("hello");
    });

    it("should get default (no optional property)", async () => {
      const response = await client.stringLiteral.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.stringLiteral.putAll({ property: "hello" });
    });

    it("should put default (no optional property)", async () => {
      await client.stringLiteral.putDefault({});
    });
  });

  describe("intLiteral", () => {
    it("should get all properties", async () => {
      const response = await client.intLiteral.getAll();
      expect(response.property).toBe(1);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.intLiteral.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.intLiteral.putAll({ property: 1 });
    });

    it("should put default (no optional property)", async () => {
      await client.intLiteral.putDefault({});
    });
  });

  describe("floatLiteral", () => {
    it("should get all properties", async () => {
      const response = await client.floatLiteral.getAll();
      expect(response.property).toBe(1.25);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.floatLiteral.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.floatLiteral.putAll({ property: 1.25 });
    });

    it("should put default (no optional property)", async () => {
      await client.floatLiteral.putDefault({});
    });
  });

  describe("booleanLiteral", () => {
    it("should get all properties", async () => {
      const response = await client.booleanLiteral.getAll();
      expect(response.property).toBe(true);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.booleanLiteral.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.booleanLiteral.putAll({ property: true });
    });

    it("should put default (no optional property)", async () => {
      await client.booleanLiteral.putDefault({});
    });
  });

  describe("unionStringLiteral", () => {
    it("should get all properties", async () => {
      const response = await client.unionStringLiteral.getAll();
      expect(response.property).toBe("world");
    });

    it("should get default (no optional property)", async () => {
      const response = await client.unionStringLiteral.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.unionStringLiteral.putAll({ property: "world" });
    });

    it("should put default (no optional property)", async () => {
      await client.unionStringLiteral.putDefault({});
    });
  });

  describe("unionIntLiteral", () => {
    it("should get all properties", async () => {
      const response = await client.unionIntLiteral.getAll();
      expect(response.property).toBe(2);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.unionIntLiteral.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.unionIntLiteral.putAll({ property: 2 });
    });

    it("should put default (no optional property)", async () => {
      await client.unionIntLiteral.putDefault({});
    });
  });

  describe("unionFloatLiteral", () => {
    it("should get all properties", async () => {
      const response = await client.unionFloatLiteral.getAll();
      expect(response.property).toBe(2.375);
    });

    it("should get default (no optional property)", async () => {
      const response = await client.unionFloatLiteral.getDefault();
      expect(response.property).toBeUndefined();
    });

    it("should put all properties", async () => {
      await client.unionFloatLiteral.putAll({ property: 2.375 });
    });

    it("should put default (no optional property)", async () => {
      await client.unionFloatLiteral.putDefault({});
    });
  });

  describe("requiredAndOptional", () => {
    it("should get all properties", async () => {
      const response = await client.requiredAndOptional.getAll();
      expect(response).toEqual({
        optionalProperty: "hello",
        requiredProperty: 42,
      });
    });

    it("should get required only", async () => {
      const response = await client.requiredAndOptional.getRequiredOnly();
      expect(response).toEqual({
        requiredProperty: 42,
        optionalProperty: undefined,
      });
    });

    it("should put all properties", async () => {
      await client.requiredAndOptional.putAll({
        optionalProperty: "hello",
        requiredProperty: 42,
      });
    });

    it("should put required only", async () => {
      await client.requiredAndOptional.putRequiredOnly({
        requiredProperty: 42,
      });
    });
  });
});
