import { describe, expect, it } from "vitest";
import { OverrideClient } from "../../../../generated/azure/client-generator-core/override/src/index.js";

describe("Azure.ClientGenerator.Core.Override", () => {
  const client = new OverrideClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("reorderParameters", () => {
    it("reorder", async () => {
      const result = await client.reorderParameters.reorder("param1", "param2");
      expect(result).toBeUndefined();
    });
  });

  describe("requireOptionalParameter", () => {
    it("requireOptional", async () => {
      const result = await client.requireOptionalParameter.requireOptional(
        "param1",
        "param2",
      );
      expect(result).toBeUndefined();
    });
  });

  describe("removeOptionalParameter", () => {
    it("removeOptional", async () => {
      const result = await client.removeOptionalParameter.removeOptional(
        "param1",
        { param2: "param2" },
      );
      expect(result).toBeUndefined();
    });
  });
});
