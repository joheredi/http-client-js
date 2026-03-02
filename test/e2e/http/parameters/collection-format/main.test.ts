/**
 * E2E tests for Parameters.CollectionFormat — validates array parameter serialization formats.
 *
 * Spector spec: parameters/collection-format
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - CSV format serializes arrays as comma-separated values in query/header
 * - Multi format sends separate query parameters for each value
 * - Pipes format serializes arrays with pipe separators
 * - SSV format serializes arrays with space separators
 */
import { describe, it } from "vitest";
import { CollectionFormatClient } from "../../../generated/parameters/collection-format/src/index.js";

describe("Parameters.CollectionFormat", () => {
  const client = new CollectionFormatClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("query", () => {
    it("should send csv format in query", async () => {
      await client.query.csv(["blue", "red", "green"]);
    });

    it("should send multi format in query", async () => {
      await client.query.multi(["blue", "red", "green"]);
    });

    it("should send pipes format in query", async () => {
      await client.query.pipes(["blue", "red", "green"]);
    });

    it("should send ssv format in query", async () => {
      await client.query.ssv(["blue", "red", "green"]);
    });
  });

  describe("header", () => {
    it("should send csv format in header", async () => {
      await client.header.csv(["blue", "red", "green"]);
    });
  });
});
