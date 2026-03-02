/**
 * E2E tests for Payload.ContentNegotiation — validates content-type based response handling.
 *
 * Spector spec: payload/content-negotiation
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - SameBody operations return binary data (PNG/JPEG) based on Accept header
 * - DifferentBody operations return either binary or JSON-wrapped binary
 */
import { describe, expect, it } from "vitest";
import { ContentNegotiationClient } from "../../../generated/payload/content-negotiation/src/index.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specsAssetsDir = resolve(
  __dirname,
  "../../../../../submodules/typespec/packages/http-specs/assets",
);
const pngFile = readFileSync(resolve(specsAssetsDir, "image.png"));
const jpegFile = readFileSync(resolve(specsAssetsDir, "image.jpg"));

describe("Payload.ContentNegotiation", () => {
  const client = new ContentNegotiationClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("sameBody", () => {
    it("should get avatar as PNG", async () => {
      const result = await client.sameBody.getAvatarAsPng();
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("should get avatar as JPEG", async () => {
      const result = await client.sameBody.getAvatarAsJpeg();
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe("differentBody", () => {
    it("should get avatar as PNG", async () => {
      const result = await client.differentBody.getAvatarAsPng();
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("should get avatar as JSON", async () => {
      const result = await client.differentBody.getAvatarAsJson();
      expect(result.content).toBeInstanceOf(Uint8Array);
    });
  });
});
