/**
 * E2E test: Type — Model — Inheritance — Enum Discriminator
 *
 * Validates that the generated EnumDiscriminatorClient correctly handles
 * discriminated unions where the discriminator is an enum type. Two flavors
 * are tested: extensible enums (union type, allows unknown values) and fixed
 * enums (closed set).
 *
 * This test is important because enum-based discriminators are a distinct
 * pattern from string-literal discriminators. The emitter must correctly:
 * - Map extensible enums (DogKind union) to the right discriminator values
 * - Map fixed enums (SnakeKind enum) to the right discriminator values
 * - Handle edge cases: missing discriminator, wrong discriminator value
 *
 * Mock server expectations (from @typespec/http-specs type/model/inheritance/enum-discriminator):
 *   - GET/PUT  /type/model/inheritance/enum-discriminator/extensible-enum — Dog {weight:10, kind:"golden"}
 *   - GET/PUT  /type/model/inheritance/enum-discriminator/fixed-enum — Snake {length:10, kind:"cobra"}
 *   - GET      .../extensible-enum/missingdiscriminator — {weight: 10}
 *   - GET      .../extensible-enum/wrongdiscriminator — {weight: 8, kind: "wrongKind"}
 *   - GET      .../fixed-enum/missingdiscriminator — {length: 10}
 *   - GET      .../fixed-enum/wrongdiscriminator — {length: 8, kind: "wrongKind"}
 */
import { describe, expect, it } from "vitest";
import { EnumDiscriminatorClient } from "../../../../../generated/type/model/inheritance/enum-discriminator/src/index.js";

describe("Type.Model.Inheritance.EnumDiscriminator", () => {
  const client = new EnumDiscriminatorClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("extensible enum (Dog)", () => {
    it("should get an extensible enum discriminator model", async () => {
      const response = await client.getExtensibleModel();
      expect(response).toEqual({ weight: 10, kind: "golden" });
    });

    it("should put an extensible enum discriminator model", async () => {
      await client.putExtensibleModel({ weight: 10, kind: "golden" });
    });

    it("should get a model with missing discriminator", async () => {
      const response = await client.getExtensibleModelMissingDiscriminator();
      expect(response).toEqual({ weight: 10 });
    });

    it("should get a model with wrong discriminator", async () => {
      const response = await client.getExtensibleModelWrongDiscriminator();
      expect(response).toEqual({ weight: 8, kind: "wrongKind" });
    });
  });

  describe("fixed enum (Snake)", () => {
    it("should get a fixed enum discriminator model", async () => {
      const response = await client.getFixedModel();
      expect(response).toEqual({ length: 10, kind: "cobra" });
    });

    it("should put a fixed enum discriminator model", async () => {
      await client.putFixedModel({ length: 10, kind: "cobra" });
    });

    it("should get a model with missing discriminator", async () => {
      const response = await client.getFixedModelMissingDiscriminator();
      expect(response).toEqual({ length: 10 });
    });

    it("should get a model with wrong discriminator", async () => {
      const response = await client.getFixedModelWrongDiscriminator();
      expect(response).toEqual({ length: 8, kind: "wrongKind" });
    });
  });
});
