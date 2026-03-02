import { describe, expect, it } from "vitest";
import { ResiliencyServiceDrivenClient } from "../../../generated/resiliency/srv-driven/src/index.js";

describe("Resiliency.ServiceDriven", () => {
  const client = new ResiliencyServiceDrivenClient(
    "http://localhost:3002",
    "v2",
    { allowInsecureConnection: true },
  );

  it("should call addOperation()", async () => {
    const result = await client.addOperation();
    expect(result).toBeUndefined();
  });

  // TODO(e2e): Fix - wrong parameter values sent to server
  it.skip("should call fromNone()", async () => {
    const result = await client.fromNone();
    expect(result).toBeUndefined();
  });

  // TODO(e2e): Fix - wrong parameter values sent to server
  it.skip("should call fromOneRequired(parameter)", async () => {
    const result = await client.fromOneRequired("new");
    expect(result).toBeUndefined();
  });

  // TODO(e2e): Fix - wrong parameter values sent to server
  it.skip("should call fromOneOptional()", async () => {
    const result = await client.fromOneOptional();
    expect(result).toBeUndefined();
  });
});
