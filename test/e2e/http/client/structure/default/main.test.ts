import { describe, expect, it } from "vitest";
import { ServiceClient } from "../../../../generated/client/structure/default/src/index.js";

describe("Client.Structure.Default", () => {
  const client = new ServiceClient("http://localhost:3002", "default", {
    allowInsecureConnection: true,
  });

  it("should call one()", async () => {
    const result = await client.one();
    expect(result).toBeUndefined();
  });

  it("should call two()", async () => {
    const result = await client.two();
    expect(result).toBeUndefined();
  });

  it("should call foo.three()", async () => {
    const result = await client.foo.three();
    expect(result).toBeUndefined();
  });

  it("should call foo.four()", async () => {
    const result = await client.foo.four();
    expect(result).toBeUndefined();
  });

  it("should call bar.five()", async () => {
    const result = await client.bar.five();
    expect(result).toBeUndefined();
  });

  it("should call bar.six()", async () => {
    const result = await client.bar.six();
    expect(result).toBeUndefined();
  });

  it("should call baz.foo.seven()", async () => {
    const result = await client.baz.foo.seven();
    expect(result).toBeUndefined();
  });

  it("should call qux.eight()", async () => {
    const result = await client.qux.eight();
    expect(result).toBeUndefined();
  });

  it("should call qux.bar.nine()", async () => {
    const result = await client.qux.bar.nine();
    expect(result).toBeUndefined();
  });
});
