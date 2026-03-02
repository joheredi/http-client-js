import { describe, expect, it } from "vitest";
import {
  ClientNamespaceFirstClient,
  ClientNamespaceSecondClient,
} from "../../../generated/client/namespace/src/index.js";

describe("Client.Namespace", () => {
  describe("FirstClient", () => {
    const client = new ClientNamespaceFirstClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should call getFirst()", async () => {
      const result = await client.getFirst();
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });

  describe("SecondClient", () => {
    const client = new ClientNamespaceSecondClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
    });

    it("should call getSecond()", async () => {
      const result = await client.getSecond();
      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
    });
  });
});
