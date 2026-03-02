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

  it("should call fromNone()", async () => {
    const result = await client.fromNone({ newParameter: "new" });
    expect(result).toBeUndefined();
  });

  it("should call fromOneRequired(parameter)", async () => {
    const result = await client.fromOneRequired("required", {
      newParameter: "new",
    });
    expect(result).toBeUndefined();
  });

  it("should call fromOneOptional()", async () => {
    const result = await client.fromOneOptional({
      parameter: "optional",
      newParameter: "new",
    });
    expect(result).toBeUndefined();
  });
});
