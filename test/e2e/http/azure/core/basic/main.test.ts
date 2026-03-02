import { describe, expect, it } from "vitest";
import { BasicClient } from "../../../../generated/azure/core/basic/src/index.js";

describe("Azure.Core.Basic", () => {
  const client = new BasicClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  const expectedUser = {
    id: 1,
    name: "Madge",
    etag: "11bdc430-65e8-45ad-81d9-8ffa60d55b59",
  };

  it("should create or replace a user", async () => {
    const result = await client.createOrReplace(1, {
      name: "Madge",
    } as any);
    expect(result.id).toBe(1);
    expect(result.name).toBe("Madge");
    expect(result.etag).toBeDefined();
  });

  it("should create or update a user", async () => {
    const result = await client.createOrUpdate(1, {
      name: "Madge",
    } as any);
    expect(result.id).toBe(1);
    expect(result.name).toBe("Madge");
    expect(result.etag).toBeDefined();
  });

  it("should get a user", async () => {
    const result = await client.get(1);
    expect(result).toEqual(expectedUser);
  });

  it("should list users with pagination", async () => {
    const items = [];
    const iter = client.list({
      top: 5,
      skip: 10,
      orderby: ["id"],
      filter: "id lt 10",
      select: ["id", "orders", "etag"],
      expand: ["orders"],
    });
    for await (const item of iter) {
      items.push(item);
    }
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].id).toBe(1);
    expect(items[0].name).toBe("Madge");
  });

  it("should delete a user", async () => {
    const result = await client.delete(1);
    expect(result).toBeUndefined();
  });

  it("should export a user", async () => {
    const result = await client.export(1, "json");
    expect(result.id).toBe(1);
    expect(result.name).toBe("Madge");
  });

  it("should export all users", async () => {
    const result = await client.exportAllUsers("json");
    expect(result.users).toBeDefined();
    expect(result.users.length).toBeGreaterThanOrEqual(1);
    expect(result.users[0].id).toBe(1);
    expect(result.users[0].name).toBe("Madge");
  });
});
