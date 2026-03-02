import { describe, expect, it } from "vitest";
import { TwoOperationGroupClient } from "../../../../generated/client/structure/two-operation-group/src/index.js";

describe("Client.Structure.TwoOperationGroup", () => {
  const client = new TwoOperationGroupClient(
    "http://localhost:3002",
    "two-operation-group",
    { allowInsecureConnection: true },
  );

  describe("group1", () => {
    it("should call one()", async () => {
      const result = await client.group1.one();
      expect(result).toBeUndefined();
    });

    it("should call three()", async () => {
      const result = await client.group1.three();
      expect(result).toBeUndefined();
    });

    it("should call four()", async () => {
      const result = await client.group1.four();
      expect(result).toBeUndefined();
    });
  });

  describe("group2", () => {
    it("should call two()", async () => {
      const result = await client.group2.two();
      expect(result).toBeUndefined();
    });

    it("should call five()", async () => {
      const result = await client.group2.five();
      expect(result).toBeUndefined();
    });

    it("should call six()", async () => {
      const result = await client.group2.six();
      expect(result).toBeUndefined();
    });
  });
});
