/**
 * E2E test: Type — Model — Inheritance — Recursive
 *
 * Validates that the generated RecursiveClient correctly handles recursive
 * model inheritance: Extension extends Element, and Element has an optional
 * array of Extension objects.
 *
 * This test is important because recursive models are a common pattern in
 * REST APIs (e.g., tree structures, nested resources). The emitter must
 * correctly generate serializers/deserializers that handle the circular
 * reference without infinite loops.
 *
 * Mock server expectations (from @typespec/http-specs type/model/inheritance/recursive):
 *   - PUT /type/model/inheritance/recursive — accepts nested body, returns 204
 *   - GET /type/model/inheritance/recursive — returns nested body
 */
import { describe, expect, it } from "vitest";
import { RecursiveClient } from "../../../../../generated/type/model/inheritance/recursive/src/index.js";

describe("Type.Model.Inheritance.Recursive", () => {
  const client = new RecursiveClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  const recursiveBody = {
    level: 0,
    extension: [
      {
        level: 1,
        extension: [
          {
            level: 2,
          },
        ],
      },
      {
        level: 1,
      },
    ],
  };

  it("should put a recursive model", async () => {
    await client.put(recursiveBody);
  });

  it("should get a recursive model", async () => {
    const response = await client.get();
    expect(response).toEqual(recursiveBody);
  });
});
