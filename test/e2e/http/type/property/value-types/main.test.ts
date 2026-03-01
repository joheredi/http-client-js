/**
 * E2E test: Type — Property — Value Types
 *
 * Validates that the generated ValueTypesClient correctly handles models whose
 * properties are of various value types: primitives (boolean, string, int, float),
 * special types (bytes, decimal, datetime, duration), enums (fixed and extensible),
 * nested models, collections (string[], int[], model[]), dictionaries, unknown types,
 * literal types, and union types.
 *
 * Each operation group exposes `get()` and `put()` methods. GET returns a model with
 * the typed property; PUT sends the same model and expects 204.
 *
 * Mock server expectations (from @typespec/http-specs type/property/value-types):
 *   - GET  /type/property/value-types/{type} — returns { property: <value> }
 *   - PUT  /type/property/value-types/{type} — accepts { property: <value> }, returns 204
 */
import { describe, expect, it } from "vitest";
import { ValueTypesClient } from "../../../../generated/type/property/value-types/src/index.js";

describe("Type.Property.ValueTypes", () => {
  const client = new ValueTypesClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("boolean", () => {
    it("should get a boolean property", async () => {
      const response = await client.boolean.get();
      expect(response.property).toBe(true);
    });

    it("should put a boolean property", async () => {
      await client.boolean.put({ property: true });
    });
  });

  describe("string", () => {
    it("should get a string property", async () => {
      const response = await client.string.get();
      expect(response.property).toBe("hello");
    });

    it("should put a string property", async () => {
      await client.string.put({ property: "hello" });
    });
  });

  describe("bytes", () => {
    // The mock server uses base64 "aGVsbG8sIHdvcmxkIQ==" which decodes to "hello, world!"
    const expectedBytes = new TextEncoder().encode("hello, world!");

    it("should get a bytes property", async () => {
      const response = await client.bytes.get();
      // Normalize to Uint8Array — Node runtime may return Buffer instead
      expect(new Uint8Array(response.property)).toEqual(new Uint8Array(expectedBytes));
    });

    it("should put a bytes property", async () => {
      await client.bytes.put({ property: expectedBytes });
    });
  });

  describe("int", () => {
    it("should get an int property", async () => {
      const response = await client.int.get();
      expect(response.property).toBe(42);
    });

    it("should put an int property", async () => {
      await client.int.put({ property: 42 });
    });
  });

  describe("float", () => {
    it("should get a float property", async () => {
      const response = await client.float.get();
      expect(response.property).toBe(43.125);
    });

    it("should put a float property", async () => {
      await client.float.put({ property: 43.125 });
    });
  });

  describe("decimal", () => {
    it("should get a decimal property", async () => {
      const response = await client.decimal.get();
      expect(response.property).toBe(0.33333);
    });

    it("should put a decimal property", async () => {
      await client.decimal.put({ property: 0.33333 });
    });
  });

  describe("decimal128", () => {
    it("should get a decimal128 property", async () => {
      const response = await client.decimal128.get();
      expect(response.property).toBe(0.33333);
    });

    it("should put a decimal128 property", async () => {
      await client.decimal128.put({ property: 0.33333 });
    });
  });

  describe("datetime", () => {
    it("should get a datetime property", async () => {
      const response = await client.datetime.get();
      expect(response.property).toEqual(new Date("2022-08-26T18:38:00Z"));
    });

    it("should put a datetime property", async () => {
      await client.datetime.put({ property: new Date("2022-08-26T18:38:00Z") });
    });
  });

  describe("duration", () => {
    it("should get a duration property", async () => {
      const response = await client.duration.get();
      expect(response.property).toBe("P123DT22H14M12.011S");
    });

    it("should put a duration property", async () => {
      await client.duration.put({ property: "P123DT22H14M12.011S" });
    });
  });

  describe("enum", () => {
    it("should get an enum property", async () => {
      const response = await client.enum.get();
      expect(response.property).toBe("ValueOne");
    });

    it("should put an enum property", async () => {
      await client.enum.put({ property: "ValueOne" });
    });
  });

  describe("extensibleEnum", () => {
    it("should get an extensible enum property", async () => {
      const response = await client.extensibleEnum.get();
      expect(response.property).toBe("UnknownValue");
    });

    it("should put an extensible enum property", async () => {
      await client.extensibleEnum.put({ property: "UnknownValue" });
    });
  });

  describe("model", () => {
    it("should get a model property", async () => {
      const response = await client.model.get();
      expect(response.property).toEqual({ property: "hello" });
    });

    it("should put a model property", async () => {
      await client.model.put({ property: { property: "hello" } });
    });
  });

  describe("collectionsString", () => {
    it("should get a string collection property", async () => {
      const response = await client.collectionsString.get();
      expect(response.property).toEqual(["hello", "world"]);
    });

    it("should put a string collection property", async () => {
      await client.collectionsString.put({ property: ["hello", "world"] });
    });
  });

  describe("collectionsInt", () => {
    it("should get an int collection property", async () => {
      const response = await client.collectionsInt.get();
      expect(response.property).toEqual([1, 2]);
    });

    it("should put an int collection property", async () => {
      await client.collectionsInt.put({ property: [1, 2] });
    });
  });

  describe("collectionsModel", () => {
    it("should get a model collection property", async () => {
      const response = await client.collectionsModel.get();
      expect(response.property).toEqual([
        { property: "hello" },
        { property: "world" },
      ]);
    });

    it("should put a model collection property", async () => {
      await client.collectionsModel.put({
        property: [{ property: "hello" }, { property: "world" }],
      });
    });
  });

  describe("dictionaryString", () => {
    it("should get a dictionary string property", async () => {
      const response = await client.dictionaryString.get();
      expect(response.property).toEqual({ k1: "hello", k2: "world" });
    });

    it("should put a dictionary string property", async () => {
      await client.dictionaryString.put({
        property: { k1: "hello", k2: "world" },
      });
    });
  });

  describe("never", () => {
    it("should get a model with a never property", async () => {
      const response = await client.never.get();
      expect(response).toEqual({});
    });

    it("should put a model with a never property", async () => {
      await client.never.put({});
    });
  });

  describe("unknownString", () => {
    it("should get an unknown string property", async () => {
      const response = await client.unknownString.get();
      expect(response.property).toBe("hello");
    });

    it("should put an unknown string property", async () => {
      await client.unknownString.put({ property: "hello" });
    });
  });

  describe("unknownInt", () => {
    it("should get an unknown int property", async () => {
      const response = await client.unknownInt.get();
      expect(response.property).toBe(42);
    });

    it("should put an unknown int property", async () => {
      await client.unknownInt.put({ property: 42 });
    });
  });

  describe("unknownDict", () => {
    it("should get an unknown dict property", async () => {
      const response = await client.unknownDict.get();
      expect(response.property).toEqual({ k1: "hello", k2: 42 });
    });

    it("should put an unknown dict property", async () => {
      await client.unknownDict.put({ property: { k1: "hello", k2: 42 } });
    });
  });

  describe("unknownArray", () => {
    it("should get an unknown array property", async () => {
      const response = await client.unknownArray.get();
      expect(response.property).toEqual(["hello", "world"]);
    });

    it("should put an unknown array property", async () => {
      await client.unknownArray.put({ property: ["hello", "world"] });
    });
  });

  describe("stringLiteral", () => {
    it("should get a string literal property", async () => {
      const response = await client.stringLiteral.get();
      expect(response.property).toBe("hello");
    });

    it("should put a string literal property", async () => {
      await client.stringLiteral.put({ property: "hello" });
    });
  });

  describe("intLiteral", () => {
    it("should get an int literal property", async () => {
      const response = await client.intLiteral.get();
      expect(response.property).toBe(42);
    });

    it("should put an int literal property", async () => {
      await client.intLiteral.put({ property: 42 });
    });
  });

  describe("floatLiteral", () => {
    it("should get a float literal property", async () => {
      const response = await client.floatLiteral.get();
      expect(response.property).toBe(43.125);
    });

    it("should put a float literal property", async () => {
      await client.floatLiteral.put({ property: 43.125 });
    });
  });

  describe("booleanLiteral", () => {
    it("should get a boolean literal property", async () => {
      const response = await client.booleanLiteral.get();
      expect(response.property).toBe(true);
    });

    it("should put a boolean literal property", async () => {
      await client.booleanLiteral.put({ property: true });
    });
  });

  describe("unionStringLiteral", () => {
    it("should get a union string literal property", async () => {
      const response = await client.unionStringLiteral.get();
      expect(response.property).toBe("world");
    });

    it("should put a union string literal property", async () => {
      await client.unionStringLiteral.put({ property: "world" });
    });
  });

  describe("unionIntLiteral", () => {
    it("should get a union int literal property", async () => {
      const response = await client.unionIntLiteral.get();
      expect(response.property).toBe(42);
    });

    it("should put a union int literal property", async () => {
      await client.unionIntLiteral.put({ property: 42 });
    });
  });

  describe("unionFloatLiteral", () => {
    it("should get a union float literal property", async () => {
      const response = await client.unionFloatLiteral.get();
      expect(response.property).toBe(46.875);
    });

    it("should put a union float literal property", async () => {
      await client.unionFloatLiteral.put({ property: 46.875 });
    });
  });

  describe("unionEnumValue", () => {
    it("should get a union enum value property", async () => {
      const response = await client.unionEnumValue.get();
      expect(response.property).toBe("value2");
    });

    it("should put a union enum value property", async () => {
      await client.unionEnumValue.put({ property: "value2" });
    });
  });
});
