import { describe, it } from "vitest";
import { RepeatabilityClient } from "../../../generated/special-headers/repeatability/src/index.js";

/**
 * Tests for SpecialHeaders.Repeatability — validates that the client correctly sends
 * OASIS repeatability headers (Repeatability-Request-ID and Repeatability-First-Sent).
 *
 * The mock API validates:
 * - Repeatability-Request-ID is a valid UUID
 * - Repeatability-First-Sent is a valid RFC7231 datetime
 * And returns Repeatability-Result: accepted header on success.
 */
describe("SpecialHeaders.Repeatability", () => {
  const client = new RepeatabilityClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
    retryOptions: { maxRetries: 0 },
  });

  /**
   * Tests immediateSuccess operation which sends both repeatability headers.
   * The mock validates UUID format for request ID and RFC7231 date format.
   */
  it("should send repeatability headers with immediateSuccess", async () => {
    await client.immediateSuccess(
      "2378d9bc-1726-11ee-be56-0242ac120002",
      new Date("Tue, 15 Nov 2022 12:45:26 GMT"),
    );
  });
});
