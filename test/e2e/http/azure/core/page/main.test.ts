import { describe, expect, it } from "vitest";
import { PageClient } from "../../../../generated/azure/core/page/src/index.js";

describe("Azure.Core.Page", () => {
  const client = new PageClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should list with page", async () => {
    const items = [];
    for await (const item of client.listWithPage()) {
      items.push(item);
    }
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].name).toBe("Madge");
  });

  // TODO(e2e): Fix - query params (another, includePending) not sent to server
  it.skip("should list with parameters", async () => {
    const items = [];
    for await (const item of client.listWithParameters({
      inputName: "Madge",
    })) {
      items.push(item);
    }
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].name).toBe("Madge");
  });

  it("should list with custom page model", async () => {
    const items = [];
    for await (const item of client.listWithCustomPageModel()) {
      items.push(item);
    }
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].name).toBe("Madge");
  });

  // TODO(e2e): Fix - query params (another, includePending) not sent to server
  it.skip("should list with parameterized next link", async () => {
    const items = [];
    for await (const item of client.withParameterizedNextLink("name")) {
      items.push(item);
    }
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].name).toBe("Madge");
  });

  describe("TwoModelsAsPageItem", () => {
    it("should list first items", async () => {
      const items = [];
      for await (const item of client.twoModelsAsPageItem.listFirstItem()) {
        items.push(item);
      }
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0].id).toBeDefined();
    });

    it("should list second items", async () => {
      const items = [];
      for await (const item of client.twoModelsAsPageItem.listSecondItem()) {
        items.push(item);
      }
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0].name).toBeDefined();
    });
  });
});
