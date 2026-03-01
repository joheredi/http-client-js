/**
 * E2E test: Type — Model — Usage
 *
 * Validates that the generated UsageClient correctly handles models used in
 * different positions: input-only, output-only, and bidirectional (input+output).
 *
 * This test is important because it verifies that the emitter generates
 * appropriate serializers for input models, deserializers for output models,
 * and both for bidirectional models. This is a fundamental contract — a model
 * used only for output should not require a serializer, and vice versa.
 *
 * Mock server expectations (from @typespec/http-specs type/model/usage):
 *   - POST /type/model/usage/input         — accepts {requiredProp: "example-value"}, returns 204
 *   - GET  /type/model/usage/output        — returns {requiredProp: "example-value"}
 *   - POST /type/model/usage/input-output  — accepts and returns {requiredProp: "example-value"}
 */
import { describe, expect, it } from "vitest";
import { UsageClient } from "../../../../generated/type/model/usage/src/index.js";

describe("Type.Model.Usage", () => {
  const client = new UsageClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should send an input-only model", async () => {
    await client.input({ requiredProp: "example-value" });
  });

  it("should receive an output-only model", async () => {
    const response = await client.output();
    expect(response).toEqual({ requiredProp: "example-value" });
  });

  it("should round-trip an input/output model", async () => {
    const response = await client.inputAndOutput({
      requiredProp: "example-value",
    });
    expect(response).toEqual({ requiredProp: "example-value" });
  });
});
