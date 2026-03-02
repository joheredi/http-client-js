import { describe, expect, it } from "vitest";
import { AzureExampleClient } from "../../../../generated/azure/example/basic/src/index.js";

describe("Azure.Example.Basic", () => {
  const client = new AzureExampleClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should perform basic action", async () => {
    const result = await client.basicAction("query", "header", {
      stringProperty: "text",
      modelProperty: {
        int32Property: 1,
        float32Property: 1.5,
        enumProperty: "EnumValue1",
      },
      arrayProperty: ["item"],
      recordProperty: { record: "value" },
    });
    expect(result.stringProperty).toBe("text");
  });
});
