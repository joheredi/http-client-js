import { describe, it } from "vitest";
import { ConditionalRequestClient } from "../../../generated/special-headers/conditional-request/src/index.js";

/**
 * Tests for SpecialHeaders.ConditionalRequest — validates that the client correctly sends
 * HTTP conditional request headers (If-Match, If-None-Match, If-Modified-Since, If-Unmodified-Since).
 *
 * The mock API validates:
 * - If-Match header contains the expected ETag value
 * - If-None-Match header contains the expected ETag value
 * - If-Modified-Since header is a valid RFC7231 datetime
 * - If-Unmodified-Since header is a valid RFC7231 datetime
 * All operations return 204 NoContent on success.
 */
describe("SpecialHeaders.ConditionalRequest", () => {
  const client = new ConditionalRequestClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
    retryOptions: { maxRetries: 0 },
  });

  /**
   * Tests postIfMatch — sends a POST with If-Match header set to a quoted ETag value.
   * The mock validates the header value matches '"valid"'.
   */
  it("should send If-Match header with postIfMatch", async () => {
    await client.postIfMatch({ ifMatch: '"valid"' });
  });

  /**
   * Tests postIfNoneMatch — sends a POST with If-None-Match header set to a quoted ETag value.
   * The mock validates the header value matches '"invalid"'.
   */
  it("should send If-None-Match header with postIfNoneMatch", async () => {
    await client.postIfNoneMatch({ ifNoneMatch: '"invalid"' });
  });

  /**
   * Tests headIfModifiedSince — sends a HEAD with If-Modified-Since header as an RFC7231 date.
   * The mock validates the header is "Fri, 26 Aug 2022 14:38:00 GMT".
   */
  it("should send If-Modified-Since header with headIfModifiedSince", async () => {
    await client.headIfModifiedSince({
      ifModifiedSince: new Date("Fri, 26 Aug 2022 14:38:00 GMT"),
    });
  });

  /**
   * Tests postIfUnmodifiedSince — sends a POST with If-Unmodified-Since header as an RFC7231 date.
   * The mock validates the header is "Fri, 26 Aug 2022 14:38:00 GMT".
   */
  it("should send If-Unmodified-Since header with postIfUnmodifiedSince", async () => {
    await client.postIfUnmodifiedSince({
      ifUnmodifiedSince: new Date("Fri, 26 Aug 2022 14:38:00 GMT"),
    });
  });
});
