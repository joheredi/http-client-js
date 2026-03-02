import { describe, expect, it } from "vitest";
import { RenamedOperationClient } from "../../../../generated/client/structure/renamed-operation/src/index.js";

describe("Client.Structure.RenamedOperation", () => {
  const client = new RenamedOperationClient(
    "http://localhost:3002",
    "renamed-operation",
    { allowInsecureConnection: true },
  );

  it("should call renamedOne()", async () => {
    const result = await client.renamedOne();
    expect(result).toBeUndefined();
  });

  it("should call renamedThree()", async () => {
    const result = await client.renamedThree();
    expect(result).toBeUndefined();
  });

  it("should call renamedFive()", async () => {
    const result = await client.renamedFive();
    expect(result).toBeUndefined();
  });

  describe("group", () => {
    it("should call renamedTwo()", async () => {
      const result = await client.group.renamedTwo();
      expect(result).toBeUndefined();
    });

    it("should call renamedFour()", async () => {
      const result = await client.group.renamedFour();
      expect(result).toBeUndefined();
    });

    it("should call renamedSix()", async () => {
      const result = await client.group.renamedSix();
      expect(result).toBeUndefined();
    });
  });
});
