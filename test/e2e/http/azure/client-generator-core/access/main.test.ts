import { describe, expect, it } from "vitest";
import { AccessClient } from "../../../../generated/azure/client-generator-core/access/src/index.js";

describe("Azure.ClientGenerator.Core.Access", () => {
  const client = new AccessClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("publicOperation", () => {
    it("noDecoratorInPublic", async () => {
      const result = await client.publicOperation.noDecoratorInPublic("sample");
      expect(result.name).toBe("sample");
    });

    it("publicDecoratorInPublic", async () => {
      const result =
        await client.publicOperation.publicDecoratorInPublic("sample");
      expect(result.name).toBe("sample");
    });
  });

  describe("internalOperation", () => {
    it("noDecoratorInInternal", async () => {
      const result =
        await client.internalOperation.noDecoratorInInternal("sample");
      expect(result.name).toBe("sample");
    });

    it("internalDecoratorInInternal", async () => {
      const result =
        await client.internalOperation.internalDecoratorInInternal("sample");
      expect(result.name).toBe("sample");
    });

    it("publicDecoratorInInternal", async () => {
      const result =
        await client.internalOperation.publicDecoratorInInternal("sample");
      expect(result.name).toBe("sample");
    });
  });

  describe("sharedModelInOperation", () => {
    it("public", async () => {
      const result = await client.sharedModelInOperation.public("sample");
      expect(result.name).toBe("sample");
    });

    it("internal", async () => {
      const result = await client.sharedModelInOperation.internal("sample");
      expect(result.name).toBe("sample");
    });
  });

  describe("relativeModelInOperation", () => {
    it("operation", async () => {
      const result =
        await client.relativeModelInOperation.operation("Madge");
      expect(result.name).toBe("Madge");
      expect(result.inner.name).toBe("Madge");
    });

    it("discriminator", async () => {
      const result =
        await client.relativeModelInOperation.discriminator("real");
      expect(result.name).toBe("Madge");
      expect(result.kind).toBe("real");
    });
  });
});
