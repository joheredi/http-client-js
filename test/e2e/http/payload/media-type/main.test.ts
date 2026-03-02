/**
 * E2E tests for Payload.MediaType — validates string body with different media types.
 *
 * Spector spec: payload/media-type
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - sendAsText sends a string with text/plain content type
 * - getAsText retrieves a string with text/plain content type
 * - sendAsJson sends a string with application/json content type
 * - getAsJson retrieves a string with application/json content type
 */
import { describe, expect, it } from "vitest";
import { MediaTypeClient } from "../../../generated/payload/media-type/src/index.js";

describe("Payload.MediaType", () => {
  const client = new MediaTypeClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("stringBody", () => {
    it("should send as text", async () => {
      await client.stringBody.sendAsText("{cat}");
    });

    it("should get as text", async () => {
      const result = await client.stringBody.getAsText();
      expect(result).toBe("{cat}");
    });

    it("should send as JSON", async () => {
      await client.stringBody.sendAsJson("foo");
    });

    it("should get as JSON", async () => {
      const result = await client.stringBody.getAsJson();
      expect(result).toBe("foo");
    });
  });
});
