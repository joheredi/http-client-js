/**
 * E2E test: Type — Model — Inheritance — Single Discriminator
 *
 * Validates that the generated SingleDiscriminatorClient correctly handles
 * single-level discriminated unions (Bird with "kind" discriminator) and
 * legacy-style discriminated models (Dinosaur).
 *
 * This test is important because single discriminators are the most common
 * polymorphic pattern in REST APIs. The emitter must correctly:
 * - Serialize/deserialize discriminated types (Sparrow, SeaGull, Goose, Eagle)
 * - Handle recursive polymorphic references in Eagle (partner, friends, hate)
 * - Handle edge cases: missing discriminator, wrong discriminator value
 * - Handle legacy models where discriminator is not explicitly declared
 *
 * Mock server expectations (from @typespec/http-specs type/model/inheritance/single-discriminator):
 *   - GET/PUT  .../model — {wingspan:1, kind:"sparrow"}
 *   - GET/PUT  .../recursivemodel — complex Eagle with Bird references
 *   - GET      .../missingdiscriminator — {wingspan: 1}
 *   - GET      .../wrongdiscriminator — {wingspan: 1, kind: "wrongKind"}
 *   - GET      .../legacy-model — {size: 20, kind: "t-rex"}
 */
import { describe, expect, it } from "vitest";
import { SingleDiscriminatorClient } from "../../../../../generated/type/model/inheritance/single-discriminator/src/index.js";

describe("Type.Model.Inheritance.SingleDiscriminator", () => {
  const client = new SingleDiscriminatorClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  const validPolymorphicBody = {
    wingspan: 1,
    kind: "sparrow",
  };

  const validRecursiveBody = {
    wingspan: 5,
    kind: "eagle",
    partner: {
      wingspan: 2,
      kind: "goose",
    },
    friends: [
      {
        wingspan: 2,
        kind: "seagull",
      },
    ],
    hate: {
      key3: {
        wingspan: 1,
        kind: "sparrow",
      },
    },
  };

  describe("simple model", () => {
    it("should get a single discriminator model", async () => {
      const response = await client.getModel();
      expect(response).toEqual(validPolymorphicBody);
    });

    it("should put a single discriminator model", async () => {
      await client.putModel(validPolymorphicBody);
    });
  });

  describe("recursive model", () => {
    it("should get a recursive single discriminator model", async () => {
      const response = await client.getRecursiveModel();
      expect(response).toEqual(validRecursiveBody);
    });

    it("should put a recursive single discriminator model", async () => {
      await client.putRecursiveModel(validRecursiveBody);
    });
  });

  describe("edge cases", () => {
    it("should get a model with missing discriminator", async () => {
      const response = await client.getMissingDiscriminator();
      expect(response).toEqual({ wingspan: 1 });
    });

    it("should get a model with wrong discriminator", async () => {
      const response = await client.getWrongDiscriminator();
      expect(response).toEqual({ wingspan: 1, kind: "wrongKind" });
    });
  });

  describe("legacy model", () => {
    it("should get a legacy discriminator model", async () => {
      const response = await client.getLegacyModel();
      expect(response).toEqual({ size: 20, kind: "t-rex" });
    });
  });
});
