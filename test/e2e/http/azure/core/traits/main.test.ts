import { describe, expect, it } from "vitest";
import { TraitsClient } from "../../../../generated/azure/core/traits/src/index.js";

describe("Azure.Core.Traits", () => {
  const client = new TraitsClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should smoke test with conditional request headers", async () => {
    const result = await client.smokeTest(1, "123", {
      ifNoneMatch: '"invalid"',
      ifMatch: '"valid"',
      ifUnmodifiedSince: new Date("Fri, 26 Aug 2022 14:38:00 GMT"),
      ifModifiedSince: new Date("Thu, 26 Aug 2021 14:38:00 GMT"),
    });
    expect(result.id).toBe(1);
    expect(result.name).toBe("Madge");
  });

  it("should perform repeatable action", async () => {
    const result = await client.repeatableAction(
      1,
      { userActionValue: "test" },
      {
        repeatabilityRequestId: "86aede1f-96fa-4e7f-b1e1-bf8a947cb804",
        repeatabilityFirstSent: new Date("Mon, 27 Nov 2023 11:58:00 GMT"),
      },
    );
    expect(result.userActionResult).toBe("test");
  });
});
