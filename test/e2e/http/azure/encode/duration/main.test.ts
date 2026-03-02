import { describe, expect, it } from "vitest";
import { DurationClient } from "../../../../generated/azure/encode/duration/src/index.js";

describe("Azure.Encode.Duration", () => {
  const client = new DurationClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should send duration constant", async () => {
    const result = await client.durationConstant({
      input: "1.02:59:59.5000000",
    });
    expect(result).toBeUndefined();
  });
});
