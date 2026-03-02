import { describe, expect, it } from "vitest";
import { AlternateTypeClient } from "../../../../generated/azure/client-generator-core/alternate-type/src/index.js";

describe("Azure.ClientGenerator.Core.AlternateType", () => {
  const client = new AlternateTypeClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  const feature = {
    type: "Feature" as const,
    geometry: {
      type: "Point",
      coordinates: [-122.25, 37.87],
    },
    properties: {
      name: "A single point of interest",
      category: "landmark",
      elevation: 100,
    },
    id: "feature-1",
  };

  describe("externalType", () => {
    it("getModel", async () => {
      const result = await client.externalType.getModel();
      expect(result).toEqual(feature);
    });

    it("putModel", async () => {
      const result = await client.externalType.putModel(feature);
      expect(result).toBeUndefined();
    });

    it("getProperty", async () => {
      const result = await client.externalType.getProperty();
      expect(result).toEqual({
        feature,
        additionalProperty: "extra",
      });
    });

    it("putProperty", async () => {
      const result = await client.externalType.putProperty({
        feature,
        additionalProperty: "extra",
      });
      expect(result).toBeUndefined();
    });
  });
});
