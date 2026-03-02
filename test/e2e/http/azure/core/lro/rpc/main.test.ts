import { describe, expect, it } from "vitest";
import { RpcClient } from "../../../../../generated/azure/core/lro/rpc/src/index.js";

describe("Azure.Core.Lro.Rpc", () => {
  const client = new RpcClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  // TODO(e2e): Fix - LRO pollUntilDone() result properties are undefined
  it.skip("should perform long running RPC", async () => {
    const poller = await client.longRunningRpc({ prompt: "text" });
    const result = await poller.pollUntilDone();
    expect(result.data).toBe("text");
  });
});
