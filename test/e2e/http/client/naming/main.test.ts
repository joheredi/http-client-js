import { describe, it } from "vitest";
import { NamingClient } from "../../../generated/client/naming/src/index.js";
import type {
  ClientNameModel,
  LanguageClientNameModel,
  ClientNameAndJsonEncodedNameModel,
  ClientModel,
  ModelWithLanguageClientName,
} from "../../../generated/client/naming/src/index.js";

describe("Client.Naming", () => {
  const client = new NamingClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  describe("property", () => {
    it("client: should send property with client name", async () => {
      const body: ClientNameModel = { clientName: true };
      await client.client(body);
    });

    it("language: should send property with language-specific client name", async () => {
      const body: LanguageClientNameModel = { defaultName: true };
      await client.language(body);
    });

    it("compatibleWithEncodedName: should send property with encoded wire name", async () => {
      const body: ClientNameAndJsonEncodedNameModel = { clientName: true };
      await client.compatibleWithEncodedName(body);
    });
  });

  describe("operation", () => {
    it("clientName: should call operation with client name", async () => {
      await client.clientName();
    });
  });

  describe("parameter", () => {
    it("parameter: should send parameter with client name", async () => {
      await client.parameter("true");
    });
  });

  describe("header", () => {
    it("request: should send header with client name", async () => {
      await client.request("true");
    });

    it("response: should receive header with client name", async () => {
      await client.response();
    });
  });

  describe("modelClient", () => {
    it("client: should send model with client name", async () => {
      const body: ClientModel = { defaultName: true };
      await client.modelClient.client(body);
    });

    it("language: should send model with language-specific client name", async () => {
      const body: ModelWithLanguageClientName = { defaultName: true };
      await client.modelClient.language(body);
    });
  });

  describe("unionEnum", () => {
    it("unionEnumName: should send union enum with client name", async () => {
      await client.unionEnum.unionEnumName("value1");
    });

    it("unionEnumMemberName: should send union enum member with client name", async () => {
      await client.unionEnum.unionEnumMemberName("value1");
    });
  });
});
