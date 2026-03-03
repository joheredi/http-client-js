import { describe, expect, it } from "vitest";
import { ResiliencyServiceDrivenClient } from "../../../generated/resiliency/srv-driven-old/src/index.js";

/**
 * Tests the "old" (v1) service-driven resiliency spec.
 *
 * The old spec generates a client for client spec version v1. Each operation is
 * tested against two service deployment versions:
 * - v1: the initial service deployment with only api-version v1
 * - v2: a newer service deployment (still using api-version v1 from the client's perspective)
 *
 * This validates that a client generated from the original spec can still communicate
 * with both old and new service deployments — the core resiliency guarantee.
 */
describe("Resiliency.ServiceDriven (old/v1 client)", () => {
  const v1Client = new ResiliencyServiceDrivenClient(
    "http://localhost:3002",
    "v1",
    { allowInsecureConnection: true },
  );

  const v2Client = new ResiliencyServiceDrivenClient(
    "http://localhost:3002",
    "v2",
    { allowInsecureConnection: true },
  );

  describe("fromNone", () => {
    it("should succeed against service deployment v1", async () => {
      const result = await v1Client.fromNone();
      expect(result).toBeUndefined();
    });

    it("should succeed against service deployment v2", async () => {
      const result = await v2Client.fromNone();
      expect(result).toBeUndefined();
    });
  });

  describe("fromOneRequired", () => {
    it("should succeed against service deployment v1", async () => {
      const result = await v1Client.fromOneRequired("required");
      expect(result).toBeUndefined();
    });

    it("should succeed against service deployment v2", async () => {
      const result = await v2Client.fromOneRequired("required");
      expect(result).toBeUndefined();
    });
  });

  describe("fromOneOptional", () => {
    it("should succeed against service deployment v1", async () => {
      const result = await v1Client.fromOneOptional({ parameter: "optional" });
      expect(result).toBeUndefined();
    });

    it("should succeed against service deployment v2", async () => {
      const result = await v2Client.fromOneOptional({ parameter: "optional" });
      expect(result).toBeUndefined();
    });
  });
});
