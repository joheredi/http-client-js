/**
 * E2E test: Type — Array
 *
 * Validates that the generated ArrayClient correctly handles arrays of various
 * element types (int32, int64, boolean, string, float32, datetime, duration,
 * unknown, model) and their nullable variants through get/put operations
 * against the Spector mock server.
 *
 * Uses a single ArrayClient with operation groups matching the legacy emitter
 * pattern (e.g., client.int32Value.get() rather than individual per-type clients).
 *
 * Mock server expectations (from @typespec/http-specs type/array):
 *   - GET  /type/array/{type} — returns an array of the specified type
 *   - PUT  /type/array/{type} — accepts an array body and returns 204
 */
import { describe, expect, it } from "vitest";
import { ArrayClient } from "../../../generated/type/array/src/index.js";

describe("Type.Array", () => {
  const client = new ArrayClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("int32Value", () => {
    it("should get an array of int32 values", async () => {
      const response = await client.int32Value.get();
      expect(response).toEqual([1, 2]);
    });

    it("should put an array of int32 values", async () => {
      await client.int32Value.put([1, 2]);
    });
  });

  describe("int64Value", () => {
    it("should get an array of int64 values", async () => {
      // JSON does not support BigInt, so precision is capped at Number.MAX_SAFE_INTEGER.
      const response = await client.int64Value.get();
      expect(response).toEqual([Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
    });

    it("should put an array of int64 values", async () => {
      // int64 maps to number in JS; mock server expects MAX/MIN_SAFE_INTEGER.
      await client.int64Value.put([Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
    });
  });

  describe("booleanValue", () => {
    it("should get an array of boolean values", async () => {
      const response = await client.booleanValue.get();
      expect(response).toEqual([true, false]);
    });

    it("should put an array of boolean values", async () => {
      await client.booleanValue.put([true, false]);
    });
  });

  describe("stringValue", () => {
    it("should get an array of string values", async () => {
      const response = await client.stringValue.get();
      expect(response).toEqual(["hello", ""]);
    });

    it("should put an array of string values", async () => {
      await client.stringValue.put(["hello", ""]);
    });
  });

  describe("float32Value", () => {
    it("should get an array of float32 values", async () => {
      const response = await client.float32Value.get();
      expect(response).toEqual([43.125]);
    });

    it("should put an array of float32 values", async () => {
      await client.float32Value.put([43.125]);
    });
  });

  describe("datetimeValue", () => {
    it("should get an array of datetime values", async () => {
      const response = await client.datetimeValue.get();
      expect(response).toEqual([new Date("2022-08-26T18:38:00Z")]);
    });

    it("should put an array of datetime values", async () => {
      await client.datetimeValue.put([new Date("2022-08-26T18:38:00Z")]);
    });
  });

  describe("durationValue", () => {
    it("should get an array of duration values", async () => {
      const response = await client.durationValue.get();
      expect(response).toEqual(["P123DT22H14M12.011S"]);
    });

    it("should put an array of duration values", async () => {
      await client.durationValue.put(["P123DT22H14M12.011S"]);
    });
  });

  describe("unknownValue", () => {
    it("should get an array of unknown values", async () => {
      const response = await client.unknownValue.get();
      expect(response).toEqual([1, "hello", null]);
    });

    it("should put an array of unknown values", async () => {
      await client.unknownValue.put([1, "hello", null]);
    });
  });

  describe("modelValue", () => {
    it("should get an array of model values", async () => {
      const response = await client.modelValue.get();
      expect(response).toEqual([{ property: "hello" }, { property: "world" }]);
    });

    it("should put an array of model values", async () => {
      await client.modelValue.put([{ property: "hello" }, { property: "world" }]);
    });
  });

  describe("nullableFloatValue", () => {
    it("should get an array of nullable float values", async () => {
      const response = await client.nullableFloatValue.get();
      expect(response).toEqual([1.25, null, 3.0]);
    });

    it("should put an array of nullable float values", async () => {
      await client.nullableFloatValue.put([1.25, null, 3.0]);
    });
  });

  describe("nullableInt32Value", () => {
    it("should get an array of nullable int32 values", async () => {
      const response = await client.nullableInt32Value.get();
      expect(response).toEqual([1, null, 3]);
    });

    it("should put an array of nullable int32 values", async () => {
      await client.nullableInt32Value.put([1, null, 3]);
    });
  });

  describe("nullableBooleanValue", () => {
    it("should get an array of nullable boolean values", async () => {
      const response = await client.nullableBooleanValue.get();
      expect(response).toEqual([true, null, false]);
    });

    it("should put an array of nullable boolean values", async () => {
      await client.nullableBooleanValue.put([true, null, false]);
    });
  });

  describe("nullableStringValue", () => {
    it("should get an array of nullable string values", async () => {
      const response = await client.nullableStringValue.get();
      expect(response).toEqual(["hello", null, "world"]);
    });

    it("should put an array of nullable string values", async () => {
      await client.nullableStringValue.put(["hello", null, "world"]);
    });
  });

  describe("nullableModelValue", () => {
    it("should get an array of nullable model values", async () => {
      const response = await client.nullableModelValue.get();
      expect(response).toEqual([{ property: "hello" }, null, { property: "world" }]);
    });

    it("should put an array of nullable model values", async () => {
      await client.nullableModelValue.put([{ property: "hello" }, null, { property: "world" }]);
    });
  });
});
