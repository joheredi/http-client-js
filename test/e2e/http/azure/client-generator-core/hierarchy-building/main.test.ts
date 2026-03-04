import { describe, expect, it } from "vitest";
import { HierarchyBuildingClient } from "../../../../generated/azure/client-generator-core/hierarchy-building/src/index.js";

describe("Azure.ClientGenerator.Core.HierarchyBuilding", () => {
  const client = new HierarchyBuildingClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  const samplePet = { kind: "pet" as const, name: "Buddy", trained: true };
  const sampleDog = {
    kind: "dog" as const,
    name: "Rex",
    trained: true,
    breed: "German Shepherd",
  };

  describe("animalOperations", () => {
    it("updatePetAsAnimal", async () => {
      const result = await client.animalOperations.updatePetAsAnimal(samplePet);
      expect(result.kind).toBe("pet");
      expect(result.name).toBe("Buddy");
    });

    it("updateDogAsAnimal", async () => {
      const result = await client.animalOperations.updateDogAsAnimal(sampleDog);
      expect(result.kind).toBe("dog");
      expect(result.name).toBe("Rex");
    });
  });

  describe("petOperations", () => {
    it("updatePetAsPet", async () => {
      const result = await client.petOperations.updatePetAsPet(samplePet);
      expect(result.kind).toBe("pet");
      expect(result.name).toBe("Buddy");
      expect(result.trained).toBe(true);
    });

    it("updateDogAsPet", async () => {
      const result = await client.petOperations.updateDogAsPet(sampleDog);
      expect(result.kind).toBe("dog");
      expect(result.name).toBe("Rex");
      expect(result.trained).toBe(true);
    });
  });

  describe("dogOperations", () => {
    it("updateDogAsDog", async () => {
      const result = await client.dogOperations.updateDogAsDog(sampleDog);
      expect(result.kind).toBe("dog");
      expect(result.name).toBe("Rex");
      expect(result.trained).toBe(true);
      expect(result.breed).toBe("German Shepherd");
    });
  });
});
