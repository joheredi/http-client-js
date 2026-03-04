import { describe, expect, it } from "vitest";
import { EnumConflictClient } from "../../../../generated/client/naming/enum-conflict/src/index.js";
import type {
  FirstModel,
  SecondModel,
} from "../../../../generated/client/naming/enum-conflict/src/index.js";

describe("Client.Naming.EnumConflict", () => {
  const client = new EnumConflictClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("firstOperations", () => {
    it("should call first()", async () => {
      const body: FirstModel = { status: "active", name: "test" };
      const result = await client.firstOperations.first(body);
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });

  describe("secondOperations", () => {
    it("should call second()", async () => {
      const body: SecondModel = {
        status: "running",
        description: "test description",
      };
      const result = await client.secondOperations.second(body);
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.description).toBeDefined();
    });
  });
});
