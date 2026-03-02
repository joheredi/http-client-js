import { describe, expect, it } from "vitest";
import { PreviewVersionClient } from "../../../../generated/azure/versioning/previewVersion/src/index.js";

describe("Azure.Versioning.PreviewVersion", () => {
  const client = new PreviewVersionClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  it("should get a widget by id", async () => {
    const result = await client.getWidget("widget-123");
    expect(result.id).toBe("widget-123");
    expect(result.name).toBe("Sample Widget");
    expect(result.color).toBe("blue");
  });

  it("should update widget color", async () => {
    const result = await client.updateWidgetColor("widget-123", {
      color: "red",
    });
    expect(result.id).toBe("widget-123");
    expect(result.name).toBe("Sample Widget");
    expect(result.color).toBe("red");
  });

  describe("with stable version", () => {
    const stableClient = new PreviewVersionClient({
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      apiVersion: "2024-06-01",
    });

    it("should list widgets without color", async () => {
      const result = await stableClient.listWidgets({ name: "test" });
      expect(result.widgets.length).toBe(1);
      expect(result.widgets[0].color).toBeUndefined();
    });
  });
});
