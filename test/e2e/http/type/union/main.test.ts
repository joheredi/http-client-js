/**
 * E2E test: Type — Union
 *
 * Validates that the generated UnionClient correctly handles various union types
 * (strings-only, extensible strings, named strings, ints, floats, models, enums,
 * string-and-array, mixed-literals, mixed-types) through get/send operations
 * against the Spector mock server.
 *
 * Each union operation group has:
 *   - get() returning an object with a `prop` field containing the union value
 *   - send(prop) taking the union value directly
 *
 * Mock server expectations (from @typespec/http-specs type/union):
 *   - GET  /type/union/{variant} — returns { prop: <value> }
 *   - POST /type/union/{variant} — expects { prop: <value> }, returns 204
 */
import { describe, expect, it } from "vitest";
import { UnionClient } from "../../../generated/type/union/src/index.js";

describe("Type.Union", () => {
  const client = new UnionClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("stringsOnly", () => {
    it("should get a union of strings", async () => {
      const response = await client.stringsOnly.get();
      expect(response.prop).toBe("b");
    });

    it("should send a union of strings", async () => {
      await client.stringsOnly.send("b");
    });
  });

  describe("stringExtensible", () => {
    it("should get an extensible string union", async () => {
      const response = await client.stringExtensible.get();
      expect(response.prop).toBe("custom");
    });

    it("should send an extensible string union", async () => {
      await client.stringExtensible.send("custom");
    });
  });

  describe("stringExtensibleNamed", () => {
    it("should get a named extensible string union", async () => {
      const response = await client.stringExtensibleNamed.get();
      expect(response.prop).toBe("custom");
    });

    it("should send a named extensible string union", async () => {
      await client.stringExtensibleNamed.send("custom");
    });
  });

  describe("intsOnly", () => {
    it("should get a union of integers", async () => {
      const response = await client.intsOnly.get();
      expect(response.prop).toBe(2);
    });

    it("should send a union of integers", async () => {
      await client.intsOnly.send(2);
    });
  });

  describe("floatsOnly", () => {
    it("should get a union of floats", async () => {
      const response = await client.floatsOnly.get();
      expect(response.prop).toBe(2.2);
    });

    it("should send a union of floats", async () => {
      await client.floatsOnly.send(2.2);
    });
  });

  describe("modelsOnly", () => {
    it("should get a union of models", async () => {
      const response = await client.modelsOnly.get();
      expect(response.prop).toEqual({ name: "test" });
    });

    it("should send a union of models", async () => {
      await client.modelsOnly.send({ name: "test" });
    });
  });

  describe("enumsOnly", () => {
    it("should get a union of enums", async () => {
      const response = await client.enumsOnly.get();
      expect(response.prop).toEqual({ lr: "right", ud: "up" });
    });

    it("should send a union of enums", async () => {
      await client.enumsOnly.send({ lr: "right", ud: "up" });
    });
  });

  describe("stringAndArray", () => {
    it("should get a union of string and array", async () => {
      const response = await client.stringAndArray.get();
      expect(response.prop).toEqual({
        string: "test",
        array: ["test1", "test2"],
      });
    });

    it("should send a union of string and array", async () => {
      await client.stringAndArray.send({
        string: "test",
        array: ["test1", "test2"],
      });
    });
  });

  describe("mixedLiterals", () => {
    it("should get a union of mixed literals", async () => {
      const response = await client.mixedLiterals.get();
      expect(response.prop).toEqual({
        stringLiteral: "a",
        intLiteral: 2,
        floatLiteral: 3.3,
        booleanLiteral: true,
      });
    });

    it("should send a union of mixed literals", async () => {
      await client.mixedLiterals.send({
        stringLiteral: "a",
        intLiteral: 2,
        floatLiteral: 3.3,
        booleanLiteral: true,
      });
    });
  });

  describe("mixedTypes", () => {
    it("should get a union of mixed types", async () => {
      const response = await client.mixedTypes.get();
      expect(response.prop).toEqual({
        model: { name: "test" },
        literal: "a",
        int: 2,
        boolean: true,
        array: [{ name: "test" }, "a", 2, true],
      });
    });

    it("should send a union of mixed types", async () => {
      await client.mixedTypes.send({
        model: { name: "test" },
        literal: "a",
        int: 2,
        boolean: true,
        array: [{ name: "test" }, "a", 2, true],
      });
    });
  });
});
