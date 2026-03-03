/**
 * E2E tests for Encode.Array — validates that the generated client correctly
 * serializes arrays with different delimiters (comma, space, pipe, newline)
 * across string, enum, and extensible enum variants.
 *
 * Previously skipped due to unresolved symbol references in extensible enum
 * serializers. Fixed by the JsonEnumSerializer component which now generates
 * proper pass-through serializer functions for union-as-enum types.
 */
import { describe, expect, it } from "vitest";
import { ArrayClient } from "../../../generated/encode/array/src/index.js";

describe("Encode.Array", () => {
  const client = new ArrayClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("string arrays", () => {
    it("should encode string array with comma delimiter", async () => {
      const result = await client.property.commaDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode string array with space delimiter", async () => {
      const result = await client.property.spaceDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode string array with pipe delimiter", async () => {
      const result = await client.property.pipeDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode string array with newline delimiter", async () => {
      const result = await client.property.newlineDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });
  });

  describe("enum arrays", () => {
    it("should encode enum array with comma delimiter", async () => {
      const result = await client.property.enumCommaDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode enum array with space delimiter", async () => {
      const result = await client.property.enumSpaceDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode enum array with pipe delimiter", async () => {
      const result = await client.property.enumPipeDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode enum array with newline delimiter", async () => {
      const result = await client.property.enumNewlineDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });
  });

  describe("extensible enum arrays", () => {
    it("should encode extensible enum array with comma delimiter", async () => {
      const result = await client.property.extensibleEnumCommaDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode extensible enum array with space delimiter", async () => {
      const result = await client.property.extensibleEnumSpaceDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode extensible enum array with pipe delimiter", async () => {
      const result = await client.property.extensibleEnumPipeDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });

    it("should encode extensible enum array with newline delimiter", async () => {
      const result = await client.property.extensibleEnumNewlineDelimited({
        value: ["blue", "red", "green"],
      });
      expect(result.value).toEqual(["blue", "red", "green"]);
    });
  });
});
