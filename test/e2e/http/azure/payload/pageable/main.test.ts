import { describe, expect, it } from "vitest";
import { PageableClient } from "../../../../generated/azure/payload/pageable/src/index.js";

describe("Azure.Payload.Pageable", () => {
  const client = new PageableClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should list items with maxpagesize", async () => {
    const items = [];
    for await (const item of client.list({ maxpagesize: 3 })) {
      items.push(item);
    }
    expect(items.length).toBe(4);
  });

  it("should list items by page", async () => {
    const pages = [];
    for await (const page of client.list({ maxpagesize: 3 }).byPage()) {
      pages.push(page);
    }
    // First page should have 3 items, second page should have 1
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(3);
    expect(pages[1].length).toBe(1);
  });

  it("should support continuation token across pages", async () => {
    const firstPageItems = [];
    const pager = client.list({ maxpagesize: 3 }).byPage();
    const firstPage = await pager.next();
    expect(firstPage.done).toBeFalsy();
    expect(firstPage.value.length).toBe(3);

    const secondPage = await pager.next();
    expect(secondPage.value.length).toBe(1);
  });
});
