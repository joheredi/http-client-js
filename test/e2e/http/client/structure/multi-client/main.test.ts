import { describe, expect, it } from "vitest";
import {
  ClientAClient,
  ClientBClient,
} from "../../../../generated/client/structure/multi-client/src/index.js";

describe("Client.Structure.MultiClient", () => {
  const clientA = new ClientAClient(
    "http://localhost:3002",
    "multi-client",
    { allowInsecureConnection: true },
  );

  const clientB = new ClientBClient(
    "http://localhost:3002",
    "multi-client",
    { allowInsecureConnection: true },
  );

  describe("ClientA", () => {
    it("should call renamedOne()", async () => {
      const result = await clientA.renamedOne();
      expect(result).toBeUndefined();
    });

    it("should call renamedThree()", async () => {
      const result = await clientA.renamedThree();
      expect(result).toBeUndefined();
    });

    it("should call renamedFive()", async () => {
      const result = await clientA.renamedFive();
      expect(result).toBeUndefined();
    });
  });

  describe("ClientB", () => {
    it("should call renamedTwo()", async () => {
      const result = await clientB.renamedTwo();
      expect(result).toBeUndefined();
    });

    it("should call renamedFour()", async () => {
      const result = await clientB.renamedFour();
      expect(result).toBeUndefined();
    });

    it("should call renamedSix()", async () => {
      const result = await clientB.renamedSix();
      expect(result).toBeUndefined();
    });
  });
});
