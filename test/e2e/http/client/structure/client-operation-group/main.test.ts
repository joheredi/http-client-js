import { describe, expect, it } from "vitest";
import { FirstClient } from "../../../../generated/client/structure/client-operation-group/src/index.js";

describe("Client.Structure.ClientOperationGroup", () => {
  const client = new FirstClient(
    "http://localhost:3002",
    "client-operation-group",
    { allowInsecureConnection: true },
  );

  it("should call one()", async () => {
    const result = await client.one();
    expect(result).toBeUndefined();
  });

  describe("group3", () => {
    it("should call two()", async () => {
      const result = await client.group3.two();
      expect(result).toBeUndefined();
    });

    it("should call three()", async () => {
      const result = await client.group3.three();
      expect(result).toBeUndefined();
    });
  });

  describe("group4", () => {
    it("should call four()", async () => {
      const result = await client.group4.four();
      expect(result).toBeUndefined();
    });
  });
});
