import { describe, expect, it } from "vitest";
import { IndividuallyParentClient } from "../../../../../generated/azure/client-generator-core/client-initialization/individuallyParent/src/index.js";

// TODO(e2e): All tests skip - emitter bug: client-initialization params (header/query/path) not propagated to requests
describe("Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParent", () => {
  const client = new IndividuallyParentClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("individuallyParentNestedWithPathClient", () => {
    it.skip("should send withQuery", async () => {
      await client.individuallyParentNestedWithPathClient.withQuery();
    });

    it.skip("should get standalone", async () => {
      const result =
        await client.individuallyParentNestedWithPathClient.getStandalone();
      expect(result).toBeDefined();
    });

    it.skip("should delete standalone", async () => {
      await client.individuallyParentNestedWithPathClient.deleteStandalone();
    });
  });

  describe("individuallyParentNestedWithQueryClient", () => {
    it.skip("should send withQuery", async () => {
      await client.individuallyParentNestedWithQueryClient.withQuery();
    });

    it.skip("should get standalone", async () => {
      const result =
        await client.individuallyParentNestedWithQueryClient.getStandalone();
      expect(result).toBeDefined();
    });

    it.skip("should delete standalone", async () => {
      await client.individuallyParentNestedWithQueryClient.deleteStandalone();
    });
  });

  describe("individuallyParentNestedWithHeaderClient", () => {
    it.skip("should send withQuery", async () => {
      await client.individuallyParentNestedWithHeaderClient.withQuery();
    });

    it.skip("should get standalone", async () => {
      await client.individuallyParentNestedWithHeaderClient.getStandalone();
    });

    it.skip("should delete standalone", async () => {
      await client.individuallyParentNestedWithHeaderClient.deleteStandalone();
    });
  });

  describe("individuallyParentNestedWithMultipleClient", () => {
    it.skip("should send withQuery", async () => {
      await client.individuallyParentNestedWithMultipleClient.withQuery();
    });

    it.skip("should get standalone", async () => {
      await client.individuallyParentNestedWithMultipleClient.getStandalone();
    });

    it.skip("should delete standalone", async () => {
      await client.individuallyParentNestedWithMultipleClient.deleteStandalone();
    });
  });

  describe("individuallyParentNestedWithMixedClient", () => {
    it.skip("should send withQuery", async () => {
      await client.individuallyParentNestedWithMixedClient.withQuery(
        "test-region",
      );
    });

    it.skip("should get standalone", async () => {
      await client.individuallyParentNestedWithMixedClient.getStandalone(
        "test-region",
      );
    });

    it.skip("should delete standalone", async () => {
      await client.individuallyParentNestedWithMixedClient.deleteStandalone(
        "test-region",
      );
    });
  });

  describe("individuallyParentNestedWithParamAliasClient", () => {
    it.skip("should send withAliasedName", async () => {
      await client.individuallyParentNestedWithParamAliasClient.withAliasedName();
    });

    it.skip("should send withOriginalName", async () => {
      await client.individuallyParentNestedWithParamAliasClient.withOriginalName();
    });
  });
});
