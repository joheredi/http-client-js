/**
 * E2E test: Type — Model — Empty
 *
 * Validates that the generated EmptyClient correctly handles empty model types
 * used in operation parameters, return types, and both.
 *
 * This test is important because it verifies that the emitter correctly handles
 * the edge case of models with no properties — a valid scenario in TypeSpec
 * that must produce working serializers/deserializers (pass-through).
 *
 * Mock server expectations (from @typespec/http-specs type/model/empty):
 *   - PUT  /type/model/empty/alone       — accepts {} body, returns 204
 *   - GET  /type/model/empty/alone       — returns {}
 *   - POST /type/model/empty/round-trip  — accepts {} body, returns {}
 */
import { describe, expect, it } from "vitest";
import { EmptyClient } from "../../../../generated/type/model/empty/src/index.js";

describe("Type.Model.Empty", () => {
  const client = new EmptyClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should put an empty input model", async () => {
    await client.putEmpty({});
  });

  it("should get an empty output model", async () => {
    const response = await client.getEmpty();
    expect(response).toEqual({});
  });

  it("should round-trip an empty input/output model", async () => {
    const response = await client.postRoundTripEmpty({});
    expect(response).toEqual({});
  });
});
