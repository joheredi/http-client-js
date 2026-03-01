/**
 * E2E test: Type — Model — Inheritance — Nested Discriminator
 *
 * Validates that the generated NestedDiscriminatorClient correctly handles
 * multi-level discriminated inheritance: Fish (discriminator: "kind") →
 * Shark (adds discriminator: "sharktype") → SawShark/GoblinShark, and
 * Fish → Salmon (with references to other Fish via partner/friends/hate).
 *
 * This test is important because nested discriminators are among the most
 * complex polymorphic patterns. The emitter must correctly:
 * - Dispatch on the first-level discriminator ("kind")
 * - Then dispatch on the second-level discriminator ("sharktype") for Shark subtypes
 * - Handle recursive polymorphic references in collections and dictionaries
 * - Handle edge cases: missing discriminator, wrong discriminator value
 *
 * Mock server expectations (from @typespec/http-specs type/model/inheritance/nested-discriminator):
 *   - GET/PUT  .../model — simple polymorphic body {age:1, kind:"shark", sharktype:"goblin"}
 *   - GET/PUT  .../recursivemodel — complex nested body with collections and dictionaries
 *   - GET      .../missingdiscriminator — {age: 1}
 *   - GET      .../wrongdiscriminator — {age: 1, kind: "wrongKind"}
 */
import { describe, expect, it } from "vitest";
import { NestedDiscriminatorClient } from "../../../../../generated/type/model/inheritance/nested-discriminator/src/index.js";

describe("Type.Model.Inheritance.NestedDiscriminator", () => {
  const client = new NestedDiscriminatorClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  const validPolymorphicBody = {
    age: 1,
    kind: "shark",
    sharktype: "goblin",
  };

  const validRecursiveBody = {
    age: 1,
    kind: "salmon",
    partner: {
      age: 2,
      kind: "shark",
      sharktype: "saw",
    },
    friends: [
      {
        age: 2,
        kind: "salmon",
        partner: {
          age: 3,
          kind: "salmon",
        },
        hate: {
          key1: {
            age: 4,
            kind: "salmon",
          },
          key2: {
            age: 2,
            kind: "shark",
            sharktype: "goblin",
          },
        },
      },
      {
        age: 3,
        kind: "shark",
        sharktype: "goblin",
      },
    ],
    hate: {
      key3: {
        age: 3,
        kind: "shark",
        sharktype: "saw",
      },
      key4: {
        age: 2,
        kind: "salmon",
        friends: [
          {
            age: 1,
            kind: "salmon",
          },
          {
            age: 4,
            kind: "shark",
            sharktype: "goblin",
          },
        ],
      },
    },
  };

  describe("simple model", () => {
    it("should get a nested discriminator model", async () => {
      const response = await client.getModel();
      expect(response).toEqual(validPolymorphicBody);
    });

    it("should put a nested discriminator model", async () => {
      await client.putModel(validPolymorphicBody);
    });
  });

  describe("recursive model", () => {
    it("should get a recursive nested discriminator model", async () => {
      const response = await client.getRecursiveModel();
      expect(response).toEqual(validRecursiveBody);
    });

    it("should put a recursive nested discriminator model", async () => {
      await client.putRecursiveModel(validRecursiveBody);
    });
  });

  describe("edge cases", () => {
    it("should get a model with missing discriminator", async () => {
      const response = await client.getMissingDiscriminator();
      expect(response).toEqual({ age: 1 });
    });

    it("should get a model with wrong discriminator", async () => {
      const response = await client.getWrongDiscriminator();
      expect(response).toEqual({ age: 1, kind: "wrongKind" });
    });
  });
});
