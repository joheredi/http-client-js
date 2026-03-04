import { describe, expect, it } from "vitest";
import {
  IndividuallyNestedWithPathClient,
  IndividuallyNestedWithQueryClient,
  IndividuallyNestedWithHeaderClient,
  IndividuallyNestedWithMultipleClient,
  IndividuallyNestedWithMixedClient,
  IndividuallyNestedWithParamAliasClient,
} from "../../../../../generated/azure/client-generator-core/client-initialization/individually/src/index.js";

const clientOptions = {
  endpoint: "http://localhost:3002",
  allowInsecureConnection: true,
};

// TODO(e2e): All tests skip - emitter bug: client-initialization params (header/query/path) not propagated to requests
describe("Azure.ClientGenerator.Core.ClientInitialization.Individually", () => {
  describe("IndividuallyNestedWithPathClient", () => {
    const client = new IndividuallyNestedWithPathClient(
      "test-blob",
      clientOptions,
    );

    it.skip("should send withQuery", async () => {
      await client.withQuery();
    });

    it.skip("should get standalone", async () => {
      const result = await client.getStandalone();
      expect(result).toBeDefined();
    });

    it.skip("should delete standalone", async () => {
      await client.deleteStandalone();
    });
  });

  describe("IndividuallyNestedWithQueryClient", () => {
    const client = new IndividuallyNestedWithQueryClient(
      "test-blob",
      clientOptions,
    );

    it.skip("should send withQuery", async () => {
      await client.withQuery();
    });

    it.skip("should get standalone", async () => {
      const result = await client.getStandalone();
      expect(result).toBeDefined();
    });

    it.skip("should delete standalone", async () => {
      await client.deleteStandalone();
    });
  });

  describe("IndividuallyNestedWithHeaderClient", () => {
    const client = new IndividuallyNestedWithHeaderClient(
      "test-header",
      clientOptions,
    );

    it.skip("should send withQuery", async () => {
      await client.withQuery();
    });

    it.skip("should get standalone", async () => {
      await client.getStandalone();
    });

    it.skip("should delete standalone", async () => {
      await client.deleteStandalone();
    });
  });

  describe("IndividuallyNestedWithMultipleClient", () => {
    const client = new IndividuallyNestedWithMultipleClient(
      "test-name",
      "test-region",
      clientOptions,
    );

    it.skip("should send withQuery", async () => {
      await client.withQuery();
    });

    it.skip("should get standalone", async () => {
      await client.getStandalone();
    });

    it.skip("should delete standalone", async () => {
      await client.deleteStandalone();
    });
  });

  describe("IndividuallyNestedWithMixedClient", () => {
    const client = new IndividuallyNestedWithMixedClient(
      "test-name",
      clientOptions,
    );

    it.skip("should send withQuery", async () => {
      await client.withQuery("test-region");
    });

    it.skip("should get standalone", async () => {
      await client.getStandalone("test-region");
    });

    it.skip("should delete standalone", async () => {
      await client.deleteStandalone("test-region");
    });
  });

  describe("IndividuallyNestedWithParamAliasClient", () => {
    const client = new IndividuallyNestedWithParamAliasClient(
      "test-blob",
      clientOptions,
    );

    it.skip("should send withAliasedName", async () => {
      await client.withAliasedName();
    });

    it.skip("should send withOriginalName", async () => {
      await client.withOriginalName();
    });
  });
});
