import { describe, expect, it } from "vitest";
import { FlattenPropertyClient } from "../../../../generated/azure/client-generator-core/flatten-property/src/index.js";

describe("Azure.ClientGenerator.Core.FlattenProperty", () => {
  const client = new FlattenPropertyClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should put flatten model", async () => {
    const result = await client.putFlattenModel({
      name: "foo",
      description: "bar",
      age: 10,
    });
    expect(result.name).toBe("test");
    expect(result.description).toBe("test");
    expect(result.age).toBe(1);
  });

  it("should put nested flatten model", async () => {
    const result = await client.putNestedFlattenModel({
      name: "foo",
      summary: "bar",
      properties: { description: "test", age: 10 },
    });
    expect(result.name).toBe("test");
    expect(result.summary).toBe("test");
    expect(result.properties.description).toBe("foo");
    expect(result.properties.age).toBe(1);
  });
});
