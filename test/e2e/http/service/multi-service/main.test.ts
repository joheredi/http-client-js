import { describe, expect, it } from "vitest";
import { Combined } from "../../../generated/service/multi-service/src/index.js";

describe("Service.MultiService", () => {
  const client = new Combined({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("foo", () => {
    it("should call test()", async () => {
      const result = await client.foo.test();
      expect(result).toBeUndefined();
    });
  });

  describe("bar", () => {
    it("should call test()", async () => {
      const result = await client.bar.test();
      expect(result).toBeUndefined();
    });
  });
});
