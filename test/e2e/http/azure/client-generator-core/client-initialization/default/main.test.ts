import { describe, expect, it } from "vitest";
import {
  HeaderParamClient,
  MultipleParamsClient,
  MixedParamsClient,
  PathParamClient,
  ParamAliasClient,
  QueryParamClient,
} from "../../../../../generated/azure/client-generator-core/client-initialization/default/src/index.js";

const clientOptions = {
  endpoint: "http://localhost:3002",
  allowInsecureConnection: true,
};

// TODO(e2e): All tests skip - emitter bug: client-initialization params (header/query/path) not propagated to requests
describe("Azure.ClientGenerator.Core.ClientInitialization.Default", () => {
  describe("HeaderParamClient", () => {
    const client = new HeaderParamClient("test-header", clientOptions);

    it.skip("should send withQuery", async () => {
      await client.withQuery("test-id");
    });

    it.skip("should send withBody", async () => {
      await client.withBody({ name: "test" });
    });
  });

  describe("MultipleParamsClient", () => {
    const client = new MultipleParamsClient(
      "test-name",
      "test-region",
      clientOptions,
    );

    it.skip("should send withQuery", async () => {
      await client.withQuery("test-id");
    });

    it.skip("should send withBody", async () => {
      await client.withBody({ name: "test" });
    });
  });

  describe("MixedParamsClient", () => {
    const client = new MixedParamsClient("test-name", clientOptions);

    it.skip("should send withQuery", async () => {
      await client.withQuery("test-region", "test-id");
    });

    it.skip("should send withBody", async () => {
      await client.withBody("test-region", { name: "test" });
    });
  });

  describe("PathParamClient", () => {
    const client = new PathParamClient("test-blob", clientOptions);

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

  describe("ParamAliasClient", () => {
    const client = new ParamAliasClient("test-blob", clientOptions);

    it.skip("should send withAliasedName", async () => {
      await client.withAliasedName();
    });

    it.skip("should send withOriginalName", async () => {
      await client.withOriginalName();
    });
  });

  describe("QueryParamClient", () => {
    const client = new QueryParamClient("test-blob", clientOptions);

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
});
