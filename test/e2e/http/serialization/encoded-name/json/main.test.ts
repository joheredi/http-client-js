/**
 * E2E tests for Serialization.EncodedName.Json — validates that the generated
 * client correctly maps property names between client-side names and wire names
 * using the @encodedName decorator.
 *
 * The spec defines a model where `defaultName` on the client maps to `wireName`
 * on the wire. The serializer must transform names in both directions.
 */
import { describe, expect, it } from "vitest";
import { JsonClient } from "../../../../generated/serialization/encoded-name/json/src/index.js";

describe("Serialization.EncodedName.Json", () => {
  describe("PropertyOperations", () => {
    const client = new JsonClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should send a JsonEncodedNameModel with 'defaultName' mapped to 'wireName'", async () => {
      await client.send({ defaultName: true });
    });

    it("should deserialize a JsonEncodedNameModel with 'wireName' mapped to 'defaultName'", async () => {
      const response = await client.get();
      expect(response).toEqual({ defaultName: true });
    });
  });
});
