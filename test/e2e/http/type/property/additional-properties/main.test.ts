/**
 * E2E test: Type — Property — Additional Properties
 *
 * Validates that the generated AdditionalPropertiesClient correctly handles models
 * with additional properties (open models). Tests cover extends, is, and spread
 * patterns with various value types (unknown, string, float, model, model array),
 * as well as derived types and discriminated unions.
 *
 * Additional properties on the wire (flat JSON) are deserialized into a nested
 * `additionalProperties` record on the model, matching the legacy emitter pattern.
 *
 * Mock server expectations (from @typespec/http-specs type/property/additional-properties):
 *   - GET  /type/property/additionalProperties/{group} — returns model with extra props
 *   - PUT  /type/property/additionalProperties/{group} — accepts model, returns 204
 */
import { describe, expect, it } from "vitest";
import { AdditionalPropertiesClient } from "../../../../generated/type/property/additional-properties/src/index.js";

describe("Type.Property.AdditionalProperties", () => {
  const client = new AdditionalPropertiesClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  // --- Extends Unknown ---

  describe("extendsUnknown", () => {
    const expected = {
      name: "ExtendsUnknownAdditionalProperties",
      additionalProperties: { prop1: 32, prop2: true, prop3: "abc" },
    };

    it("should get model with unknown additional properties", async () => {
      const response = await client.extendsUnknown.get();
      expect(response).toEqual(expected);
    });

    it("should put model with unknown additional properties", async () => {
      await client.extendsUnknown.put(expected);
    });
  });

  describe("extendsUnknownDerived", () => {
    const expected = {
      name: "ExtendsUnknownAdditionalProperties",
      index: 314,
      age: 2.71875,
      additionalProperties: { prop1: 32, prop2: true, prop3: "abc" },
    };

    it("should get derived model with unknown additional properties", async () => {
      const response = await client.extendsUnknownDerived.get();
      expect(response).toEqual(expected);
    });

    it("should put derived model with unknown additional properties", async () => {
      await client.extendsUnknownDerived.put(expected);
    });
  });

  describe("extendsUnknownDiscriminated", () => {
    const expected = {
      kind: "derived",
      name: "Derived",
      index: 314,
      age: 2.71875,
      additionalProperties: { prop1: 32, prop2: true, prop3: "abc" },
    };

    it("should get discriminated model with unknown additional properties", async () => {
      const response = await client.extendsUnknownDiscriminated.get();
      expect(response).toEqual(expected);
    });

    it("should put discriminated model with unknown additional properties", async () => {
      await client.extendsUnknownDiscriminated.put(expected);
    });
  });

  // --- Is Unknown ---

  describe("isUnknown", () => {
    const expected = {
      name: "IsUnknownAdditionalProperties",
      additionalProperties: { prop1: 32, prop2: true, prop3: "abc" },
    };

    it("should get model with unknown additional properties (is)", async () => {
      const response = await client.isUnknown.get();
      expect(response).toEqual(expected);
    });

    it("should put model with unknown additional properties (is)", async () => {
      await client.isUnknown.put(expected);
    });
  });

  describe("isUnknownDerived", () => {
    const expected = {
      name: "IsUnknownAdditionalProperties",
      index: 314,
      age: 2.71875,
      additionalProperties: { prop1: 32, prop2: true, prop3: "abc" },
    };

    it("should get derived model with unknown additional properties (is)", async () => {
      const response = await client.isUnknownDerived.get();
      expect(response).toEqual(expected);
    });

    it("should put derived model with unknown additional properties (is)", async () => {
      await client.isUnknownDerived.put(expected);
    });
  });

  describe("isUnknownDiscriminated", () => {
    const expected = {
      kind: "derived",
      name: "Derived",
      index: 314,
      age: 2.71875,
      additionalProperties: { prop1: 32, prop2: true, prop3: "abc" },
    };

    it("should get discriminated model with unknown additional properties (is)", async () => {
      const response = await client.isUnknownDiscriminated.get();
      expect(response).toEqual(expected);
    });

    it("should put discriminated model with unknown additional properties (is)", async () => {
      await client.isUnknownDiscriminated.put(expected);
    });
  });

  // --- Extends / Is / Spread String ---

  describe("extendsString", () => {
    const expected = {
      name: "ExtendsStringAdditionalProperties",
      additionalProperties: { prop: "abc" },
    };

    it("should get model with string additional properties", async () => {
      const response = await client.extendsString.get();
      expect(response).toEqual(expected);
    });

    it("should put model with string additional properties", async () => {
      await client.extendsString.put(expected);
    });
  });

  describe("isString", () => {
    const expected = {
      name: "IsStringAdditionalProperties",
      additionalProperties: { prop: "abc" },
    };

    it("should get model with string additional properties (is)", async () => {
      const response = await client.isString.get();
      expect(response).toEqual(expected);
    });

    it("should put model with string additional properties (is)", async () => {
      await client.isString.put(expected);
    });
  });

  describe("spreadString", () => {
    const expected = {
      name: "SpreadSpringRecord",
      additionalProperties: { prop: "abc" },
    };

    it("should get model with string spread record", async () => {
      const response = await client.spreadString.get();
      expect(response).toEqual(expected);
    });

    it("should put model with string spread record", async () => {
      await client.spreadString.put(expected);
    });
  });

  // --- Extends / Is / Spread Float ---

  describe("extendsFloat", () => {
    const expected = {
      id: 43.125,
      additionalProperties: { prop: 43.125 },
    };

    it("should get model with float additional properties", async () => {
      const response = await client.extendsFloat.get();
      expect(response).toEqual(expected);
    });

    it("should put model with float additional properties", async () => {
      await client.extendsFloat.put(expected);
    });
  });

  describe("isFloat", () => {
    const expected = {
      id: 43.125,
      additionalProperties: { prop: 43.125 },
    };

    it("should get model with float additional properties (is)", async () => {
      const response = await client.isFloat.get();
      expect(response).toEqual(expected);
    });

    it("should put model with float additional properties (is)", async () => {
      await client.isFloat.put(expected);
    });
  });

  describe("spreadFloat", () => {
    const expected = {
      id: 43.125,
      additionalProperties: { prop: 43.125 },
    };

    it("should get model with float spread record", async () => {
      const response = await client.spreadFloat.get();
      expect(response).toEqual(expected);
    });

    it("should put model with float spread record", async () => {
      await client.spreadFloat.put(expected);
    });
  });

  // --- Extends / Is / Spread Model ---

  describe("extendsModel", () => {
    const expected = {
      knownProp: { state: "ok" },
      additionalProperties: { prop: { state: "ok" } },
    };

    it("should get model with model additional properties", async () => {
      const response = await client.extendsModel.get();
      expect(response).toEqual(expected);
    });

    it("should put model with model additional properties", async () => {
      await client.extendsModel.put(expected);
    });
  });

  describe("isModel", () => {
    const expected = {
      knownProp: { state: "ok" },
      additionalProperties: { prop: { state: "ok" } },
    };

    it("should get model with model additional properties (is)", async () => {
      const response = await client.isModel.get();
      expect(response).toEqual(expected);
    });

    it("should put model with model additional properties (is)", async () => {
      await client.isModel.put(expected);
    });
  });

  describe("spreadModel", () => {
    const expected = {
      knownProp: { state: "ok" },
      additionalProperties: { prop: { state: "ok" } },
    };

    it("should get model with model spread record", async () => {
      const response = await client.spreadModel.get();
      expect(response).toEqual(expected);
    });

    it("should put model with model spread record", async () => {
      await client.spreadModel.put(expected);
    });
  });

  // --- Extends / Is / Spread Model Array ---

  describe("extendsModelArray", () => {
    const expected = {
      knownProp: [{ state: "ok" }, { state: "ok" }],
      additionalProperties: { prop: [{ state: "ok" }, { state: "ok" }] },
    };

    it("should get model with model array additional properties", async () => {
      const response = await client.extendsModelArray.get();
      expect(response).toEqual(expected);
    });

    it("should put model with model array additional properties", async () => {
      await client.extendsModelArray.put(expected);
    });
  });

  describe("isModelArray", () => {
    const expected = {
      knownProp: [{ state: "ok" }, { state: "ok" }],
      additionalProperties: { prop: [{ state: "ok" }, { state: "ok" }] },
    };

    it("should get model with model array additional properties (is)", async () => {
      const response = await client.isModelArray.get();
      expect(response).toEqual(expected);
    });

    it("should put model with model array additional properties (is)", async () => {
      await client.isModelArray.put(expected);
    });
  });

  describe("spreadModelArray", () => {
    const expected = {
      knownProp: [{ state: "ok" }, { state: "ok" }],
      additionalProperties: { prop: [{ state: "ok" }, { state: "ok" }] },
    };

    it("should get model with model array spread record", async () => {
      const response = await client.spreadModelArray.get();
      expect(response).toEqual(expected);
    });

    it("should put model with model array spread record", async () => {
      await client.spreadModelArray.put(expected);
    });
  });

  // --- Spread Different String ---

  describe("spreadDifferentString", () => {
    const expected = {
      id: 43.125,
      additionalProperties: { prop: "abc" },
    };

    it("should get model with different spread string", async () => {
      const response = await client.spreadDifferentString.get();
      expect(response).toEqual(expected);
    });

    it("should put model with different spread string", async () => {
      await client.spreadDifferentString.put(expected);
    });
  });

  describe("spreadDifferentFloat", () => {
    const expected = {
      name: "abc",
      additionalProperties: { prop: 43.125 },
    };

    it("should get model with different spread float", async () => {
      const response = await client.spreadDifferentFloat.get();
      expect(response).toEqual(expected);
    });

    it("should put model with different spread float", async () => {
      await client.spreadDifferentFloat.put(expected);
    });
  });

  describe("spreadDifferentModel", () => {
    const expected = {
      knownProp: "abc",
      additionalProperties: { prop: { state: "ok" } },
    };

    it("should get model with different spread model", async () => {
      const response = await client.spreadDifferentModel.get();
      expect(response).toEqual(expected);
    });

    it("should put model with different spread model", async () => {
      await client.spreadDifferentModel.put(expected);
    });
  });

  describe("spreadDifferentModelArray", () => {
    const expected = {
      knownProp: "abc",
      additionalProperties: { prop: [{ state: "ok" }, { state: "ok" }] },
    };

    it("should get model with different spread model array", async () => {
      const response = await client.spreadDifferentModelArray.get();
      expect(response).toEqual(expected);
    });

    it("should put model with different spread model array", async () => {
      await client.spreadDifferentModelArray.put(expected);
    });
  });

  // --- Extends Different Spread (Derived) ---

  describe("extendsDifferentSpreadString", () => {
    const expected = {
      id: 43.125,
      derivedProp: "abc",
      additionalProperties: { prop: "abc" },
    };

    it("should get derived model with different spread string", async () => {
      const response = await client.extendsDifferentSpreadString.get();
      expect(response).toEqual(expected);
    });

    it("should put derived model with different spread string", async () => {
      await client.extendsDifferentSpreadString.put(expected);
    });
  });

  describe("extendsDifferentSpreadFloat", () => {
    const expected = {
      name: "abc",
      derivedProp: 43.125,
      additionalProperties: { prop: 43.125 },
    };

    it("should get derived model with different spread float", async () => {
      const response = await client.extendsDifferentSpreadFloat.get();
      expect(response).toEqual(expected);
    });

    it("should put derived model with different spread float", async () => {
      await client.extendsDifferentSpreadFloat.put(expected);
    });
  });

  describe("extendsDifferentSpreadModel", () => {
    const expected = {
      knownProp: "abc",
      derivedProp: { state: "ok" },
      additionalProperties: { prop: { state: "ok" } },
    };

    it("should get derived model with different spread model", async () => {
      const response = await client.extendsDifferentSpreadModel.get();
      expect(response).toEqual(expected);
    });

    it("should put derived model with different spread model", async () => {
      await client.extendsDifferentSpreadModel.put(expected);
    });
  });

  describe("extendsDifferentSpreadModelArray", () => {
    const expected = {
      knownProp: "abc",
      derivedProp: [{ state: "ok" }, { state: "ok" }],
      additionalProperties: { prop: [{ state: "ok" }, { state: "ok" }] },
    };

    it("should get derived model with different spread model array", async () => {
      const response = await client.extendsDifferentSpreadModelArray.get();
      expect(response).toEqual(expected);
    });

    it("should put derived model with different spread model array", async () => {
      await client.extendsDifferentSpreadModelArray.put(expected);
    });
  });

  // --- Multiple Spread ---

  describe("multipleSpread", () => {
    const expected = {
      flag: true,
      additionalProperties: { prop1: "abc", prop2: 43.125 },
    };

    it("should get model with multiple spread record", async () => {
      const response = await client.multipleSpread.get();
      expect(response).toEqual(expected);
    });

    it("should put model with multiple spread record", async () => {
      await client.multipleSpread.put(expected);
    });
  });

  // --- Spread Record Union ---

  describe("spreadRecordUnion", () => {
    const expected = {
      flag: true,
      additionalProperties: { prop1: "abc", prop2: 43.125 },
    };

    it("should get model with spread record union", async () => {
      const response = await client.spreadRecordUnion.get();
      expect(response).toEqual(expected);
    });

    it("should put model with spread record union", async () => {
      await client.spreadRecordUnion.put(expected);
    });
  });

  // --- Spread Record Non-Discriminated Union ---
  // Skipped: Non-discriminated union deserialization for spread records is a known
  // issue in both the legacy emitter (autorest.typescript#3122) and our emitter.
  // The union types (WidgetData0 | WidgetData1, WidgetData2 | WidgetData1) cannot
  // be reliably discriminated during deserialization.

  describe("spreadRecordNonDiscriminatedUnion", () => {
    it.skip("should get model with non-discriminated union spread", async () => {
      const response = await client.spreadRecordNonDiscriminatedUnion.get();
      expect(response).toEqual({
        name: "abc",
        additionalProperties: {
          prop1: { kind: "kind0", fooProp: "abc" },
          prop2: { kind: "kind1", start: new Date("2021-01-01T00:00:00Z") },
        },
      });
    });

    it.skip("should put model with non-discriminated union spread", async () => {
      await client.spreadRecordNonDiscriminatedUnion.put({
        name: "abc",
        additionalProperties: {
          prop1: { kind: "kind0", fooProp: "abc" },
          prop2: { kind: "kind1", start: new Date("2021-01-01T00:00:00Z") },
        },
      });
    });
  });

  describe("spreadRecordNonDiscriminatedUnion2", () => {
    it.skip("should get model with non-discriminated union2 spread", async () => {
      const response = await client.spreadRecordNonDiscriminatedUnion2.get();
      expect(response).toEqual({
        name: "abc",
        additionalProperties: {
          prop1: { kind: "kind1", start: "2021-01-01T00:00:00Z" },
          prop2: {
            kind: "kind1",
            start: new Date("2021-01-01T00:00:00Z"),
            end: new Date("2021-01-02T00:00:00Z"),
          },
        },
      });
    });

    it.skip("should put model with non-discriminated union2 spread", async () => {
      await client.spreadRecordNonDiscriminatedUnion2.put({
        name: "abc",
        additionalProperties: {
          prop1: { kind: "kind1", start: "2021-01-01T00:00:00Z" },
          prop2: {
            kind: "kind1",
            start: new Date("2021-01-01T00:00:00Z"),
            end: new Date("2021-01-02T00:00:00Z"),
          },
        },
      });
    });
  });

  describe("spreadRecordNonDiscriminatedUnion3", () => {
    it.skip("should get model with non-discriminated union3 spread", async () => {
      const response = await client.spreadRecordNonDiscriminatedUnion3.get();
      expect(response).toEqual({
        name: "abc",
        additionalProperties: {
          prop1: [
            { kind: "kind1", start: "2021-01-01T00:00:00Z" },
            { kind: "kind1", start: "2021-01-01T00:00:00Z" },
          ],
          prop2: {
            kind: "kind1",
            start: new Date("2021-01-01T00:00:00Z"),
            end: new Date("2021-01-02T00:00:00Z"),
          },
        },
      });
    });

    it.skip("should put model with non-discriminated union3 spread", async () => {
      await client.spreadRecordNonDiscriminatedUnion3.put({
        name: "abc",
        additionalProperties: {
          prop1: [
            { kind: "kind1", start: "2021-01-01T00:00:00Z" },
            { kind: "kind1", start: "2021-01-01T00:00:00Z" },
          ],
          prop2: {
            kind: "kind1",
            start: new Date("2021-01-01T00:00:00Z"),
            end: new Date("2021-01-02T00:00:00Z"),
          },
        },
      });
    });
  });
});
