/**
 * E2E test: Type — Union — Discriminated
 *
 * Validates that the generated DiscriminatedClient correctly handles discriminated
 * union serialization and deserialization across all 4 patterns:
 *
 * 1. **Envelope (default)**: `{ kind: "cat", value: { name: "Whiskers", meow: true } }`
 * 2. **Envelope (custom property names)**: `{ petType: "cat", petData: { ... } }`
 * 3. **No-envelope (default)**: `{ kind: "cat", name: "Whiskers", meow: true }`
 * 4. **No-envelope (custom discriminator)**: `{ type: "cat", name: "Whiskers", meow: true }`
 *
 * Each scenario tests:
 *   - GET: Server returns envelope/inline wire format → client deserializes to plain model (Cat/Dog)
 *   - PUT: Client receives plain model → serializer adds discriminator and envelope structure
 *
 * Mock server expectations (from @typespec/http-specs type/union/discriminated):
 *   - GET endpoints return cat data by default (or dog data when query param selects "dog")
 *   - PUT endpoints expect the correct wire format and echo it back
 *
 * Why this matters:
 * Discriminated unions are a core TypeSpec pattern for polymorphic data. Without proper
 * serializer/deserializer generation, PUT requests would send raw models without
 * discriminator/envelope wrapping, and GET responses would not be unwrapped correctly.
 */
import { describe, expect, it } from "vitest";
import { DiscriminatedClient } from "../../../../generated/type/union/discriminated/src/index.js";

describe("Type.Union.Discriminated", () => {
  const client = new DiscriminatedClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("Envelope.Object.Default", () => {
    /**
     * Tests GET deserialization: server returns `{ kind: "cat", value: { name, meow } }`
     * and the deserializer unwraps the envelope to return a plain Cat object.
     */
    it("should deserialize envelope with default kind/value properties", async () => {
      const response = await client.envelope.object.default.get();
      expect(response).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });

    /**
     * Tests PUT serialization: client sends a Cat object and the serializer wraps it
     * in `{ kind: "cat", value: catSerializer(cat) }` envelope format.
     * Server echoes back the envelope, which is then deserialized.
     */
    it("should serialize and round-trip envelope with default properties", async () => {
      const result = await client.envelope.object.default.put({
        name: "Whiskers",
        meow: true,
      });
      expect(result).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });
  });

  describe("Envelope.Object.CustomProperties", () => {
    /**
     * Tests GET deserialization: server returns `{ petType: "cat", petData: { name, meow } }`
     * and the deserializer reads the custom property names.
     */
    it("should deserialize envelope with custom petType/petData properties", async () => {
      const response = await client.envelope.object.customProperties.get();
      expect(response).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });

    /**
     * Tests PUT serialization: client sends Cat and serializer wraps with custom names
     * `{ petType: "cat", petData: catSerializer(cat) }`.
     */
    it("should serialize and round-trip envelope with custom properties", async () => {
      const result = await client.envelope.object.customProperties.put({
        name: "Whiskers",
        meow: true,
      });
      expect(result).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });
  });

  describe("NoEnvelope.Default", () => {
    /**
     * Tests GET deserialization: server returns `{ kind: "cat", name: "Whiskers", meow: true }`
     * and the deserializer strips the discriminator property, returning just the Cat model.
     */
    it("should deserialize inline discriminator with default kind property", async () => {
      const response = await client.noEnvelope.default.get();
      expect(response).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });

    /**
     * Tests PUT serialization: client sends a Cat object and the serializer adds the
     * discriminator inline: `{ kind: "cat", ...catSerializer(cat) }`.
     */
    it("should serialize and round-trip inline discriminator with default property", async () => {
      const result = await client.noEnvelope.default.put({
        name: "Whiskers",
        meow: true,
      });
      expect(result).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });
  });

  describe("NoEnvelope.CustomDiscriminator", () => {
    /**
     * Tests GET deserialization: server returns `{ type: "cat", name: "Whiskers", meow: true }`
     * and the deserializer strips the custom "type" discriminator property.
     */
    it("should deserialize inline with custom type discriminator", async () => {
      const response = await client.noEnvelope.customDiscriminator.get();
      expect(response).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });

    /**
     * Tests PUT serialization: client sends Cat and serializer adds custom discriminator
     * inline: `{ type: "cat", ...catSerializer(cat) }`.
     */
    it("should serialize and round-trip inline with custom discriminator", async () => {
      const result = await client.noEnvelope.customDiscriminator.put({
        name: "Whiskers",
        meow: true,
      });
      expect(result).toEqual({
        name: "Whiskers",
        meow: true,
      });
    });
  });
});
