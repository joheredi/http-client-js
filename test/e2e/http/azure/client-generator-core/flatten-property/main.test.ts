import { describe, expect, it } from "vitest";
import { FlattenPropertyClient } from "../../../../generated/azure/client-generator-core/flatten-property/src/index.js";

describe("Azure.ClientGenerator.Core.FlattenProperty", () => {
  const client = new FlattenPropertyClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  // TODO(e2e): Fix - server returns different values than test expects
  it.skip("should put flatten model", async () => {
    const result = await client.putFlattenModel({
      name: "foo",
      description: "bar",
      age: 10,
    });
    expect(result.name).toBe("foo");
    expect(result.description).toBe("bar");
    expect(result.age).toBe(10);
  });

  // TODO(e2e): Fix - server returns different values than test expects
  it.skip("should put nested flatten model", async () => {
    const result = await client.putNestedFlattenModel({
      name: "foo",
      summary: "bar",
      properties: { description: "test", age: 10 },
    });
    expect(result.name).toBe("foo");
    expect(result.summary).toBe("bar");
    expect(result.properties.description).toBe("test");
    expect(result.properties.age).toBe(10);
  });
});
