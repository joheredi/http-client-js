/**
 * E2E test: Type — Model — Inheritance — Not Discriminated
 *
 * Validates that the generated NotDiscriminatedClient correctly handles
 * non-discriminated inheritance: Pet → Cat → Siamese (three levels).
 *
 * This test is important because it verifies that the emitter correctly
 * flattens inherited properties into a single model. The Siamese model
 * inherits `name` from Pet and `age` from Cat, plus its own `smart` field.
 * The wire format is a flat JSON object with all properties.
 *
 * Mock server expectations (from @typespec/http-specs type/model/inheritance/not-discriminated):
 *   - POST /type/model/inheritance/not-discriminated/valid — accepts body, returns 204
 *   - GET  /type/model/inheritance/not-discriminated/valid — returns {name: "abc", age: 32, smart: true}
 *   - PUT  /type/model/inheritance/not-discriminated/valid — accepts and returns body
 */
import { describe, expect, it } from "vitest";
import { NotDiscriminatedClient } from "../../../../../generated/type/model/inheritance/not-discriminated/src/index.js";

describe("Type.Model.Inheritance.NotDiscriminated", () => {
  const client = new NotDiscriminatedClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  const validBody = { name: "abc", age: 32, smart: true };

  it("should post a valid non-discriminated model", async () => {
    await client.postValid(validBody);
  });

  it("should get a valid non-discriminated model", async () => {
    const response = await client.getValid();
    expect(response).toEqual(validBody);
  });

  it("should round-trip a valid non-discriminated model", async () => {
    const response = await client.putValid(validBody);
    expect(response).toEqual(validBody);
  });
});
