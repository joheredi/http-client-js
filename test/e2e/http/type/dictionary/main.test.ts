/**
 * E2E test: Type — Dictionary
 *
 * Validates that the generated DictionaryClient correctly handles dictionaries
 * (Record<string, T>) of various value types through get/put operations against
 * the Spector mock server.
 *
 * Covers: int32, int64, boolean, string, float32, datetime, duration, unknown,
 * model, recursive model, and nullable float value types.
 *
 * Mock server expectations (from @typespec/http-specs type/dictionary):
 *   - GET  /type/dictionary/{type} — returns a dictionary of the specified type
 *   - PUT  /type/dictionary/{type} — accepts a dictionary body and returns 204
 */
import { describe, expect, it } from "vitest";
import { DictionaryClient } from "../../../generated/type/dictionary/src/index.js";

describe("Type.Dictionary", () => {
  const client = new DictionaryClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("int32Value", () => {
    it("should get a dictionary of int32 values", async () => {
      const response = await client.int32Value.get();
      expect(response).toEqual({ k1: 1, k2: 2 });
    });

    it("should put a dictionary of int32 values", async () => {
      await client.int32Value.put({ k1: 1, k2: 2 });
    });
  });

  describe("int64Value", () => {
    it("should get a dictionary of int64 values", async () => {
      // JSON does not support BigInt, leading to precision loss.
      // Values are capped at Number.MAX_SAFE_INTEGER / MIN_SAFE_INTEGER.
      const response = await client.int64Value.get();
      expect(response).toEqual({
        k1: Number.MAX_SAFE_INTEGER,
        k2: Number.MIN_SAFE_INTEGER,
      });
    });

    // BigInt serialization is not yet supported in JSON payloads.
    it.skip("should put a dictionary of int64 values", async () => {
      await client.int64Value.put({
        k1: 0x7fffffffffffffffn as any,
        k2: -0x7fffffffffffffffn as any,
      });
    });
  });

  describe("booleanValue", () => {
    it("should get a dictionary of boolean values", async () => {
      const response = await client.booleanValue.get();
      expect(response).toEqual({ k1: true, k2: false });
    });

    it("should put a dictionary of boolean values", async () => {
      await client.booleanValue.put({ k1: true, k2: false });
    });
  });

  describe("stringValue", () => {
    it("should get a dictionary of string values", async () => {
      const response = await client.stringValue.get();
      expect(response).toEqual({ k1: "hello", k2: "" });
    });

    it("should put a dictionary of string values", async () => {
      await client.stringValue.put({ k1: "hello", k2: "" });
    });
  });

  describe("float32Value", () => {
    it("should get a dictionary of float32 values", async () => {
      const response = await client.float32Value.get();
      expect(response).toEqual({ k1: 43.125 });
    });

    it("should put a dictionary of float32 values", async () => {
      await client.float32Value.put({ k1: 43.125 });
    });
  });

  describe("datetimeValue", () => {
    it("should get a dictionary of datetime values", async () => {
      const response = await client.datetimeValue.get();
      expect(response).toEqual({ k1: new Date("2022-08-26T18:38:00Z") });
    });

    it("should put a dictionary of datetime values", async () => {
      await client.datetimeValue.put({ k1: new Date("2022-08-26T18:38:00Z") });
    });
  });

  describe("durationValue", () => {
    it("should get a dictionary of duration values", async () => {
      const response = await client.durationValue.get();
      expect(response).toEqual({ k1: "P123DT22H14M12.011S" });
    });

    it("should put a dictionary of duration values", async () => {
      await client.durationValue.put({ k1: "P123DT22H14M12.011S" });
    });
  });

  describe("unknownValue", () => {
    it("should get a dictionary of unknown values", async () => {
      const response = await client.unknownValue.get();
      expect(response).toEqual({ k1: 1, k2: "hello", k3: null });
    });

    it("should put a dictionary of unknown values", async () => {
      await client.unknownValue.put({ k1: 1, k2: "hello", k3: null });
    });
  });

  describe("modelValue", () => {
    it("should get a dictionary of model values", async () => {
      const response = await client.modelValue.get();
      expect(response).toEqual({
        k1: { property: "hello" },
        k2: { property: "world" },
      });
    });

    it("should put a dictionary of model values", async () => {
      await client.modelValue.put({
        k1: { property: "hello" },
        k2: { property: "world" },
      });
    });
  });

  describe("recursiveModelValue", () => {
    it("should get a dictionary of recursive model values", async () => {
      const response = await client.recursiveModelValue.get();
      expect(response).toEqual({
        k1: { property: "hello", children: {} },
        k2: {
          property: "world",
          children: { "k2.1": { property: "inner world" } },
        },
      });
    });

    it("should put a dictionary of recursive model values", async () => {
      await client.recursiveModelValue.put({
        k1: { property: "hello", children: {} },
        k2: {
          property: "world",
          children: { "k2.1": { property: "inner world" } },
        },
      });
    });
  });

  describe("nullableFloatValue", () => {
    it("should get a dictionary of nullable float values", async () => {
      const response = await client.nullableFloatValue.get();
      expect(response).toEqual({ k1: 1.25, k2: 0.5, k3: null });
    });

    it("should put a dictionary of nullable float values", async () => {
      await client.nullableFloatValue.put({ k1: 1.25, k2: 0.5, k3: null });
    });
  });
});
