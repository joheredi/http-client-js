/**
 * Test suite for the applyClientRenames function.
 *
 * Tests the typespec-title-map configuration feature that allows SDK authors
 * to rename client classes after TCGC derives names from TypeSpec decorators.
 * This is critical for Azure SDK teams who need to override auto-generated
 * client names without modifying TypeSpec source files.
 *
 * What is tested:
 * - Renaming a single client via the title map
 * - Renaming multiple clients in a single pass
 * - Clients not in the title map remain unchanged
 * - Empty title map leaves all clients unchanged
 * - Only exact name matches trigger renaming (no partial matches)
 *
 * Why this matters:
 * The typespec-title-map is a production configuration used by Azure SDK teams.
 * If client renaming doesn't work correctly, the generated SDK has wrong class
 * names, wrong factory function names, wrong context interface names, and wrong
 * environment variable names in samples. This breaks the public API surface.
 */
import { describe, expect, it } from "vitest";
import { applyClientRenames } from "../../src/emitter.js";
import type { SdkClientType, SdkHttpOperation } from "@azure-tools/typespec-client-generator-core";

/**
 * Creates a minimal mock SdkClientType with the given name.
 * Only the `name` property is needed for renaming tests.
 */
function mockClient(name: string): SdkClientType<SdkHttpOperation> {
  return { name } as SdkClientType<SdkHttpOperation>;
}

describe("applyClientRenames", () => {
  /**
   * Tests that a single client is renamed when its name matches a key in the
   * title map. This is the most common use case: one service with one client
   * that needs a different name.
   */
  it("should rename a client when its name matches the title map", () => {
    const clients = [mockClient("ServiceClient")];
    applyClientRenames(clients, { ServiceClient: "TestingClient" });
    expect(clients[0].name).toBe("TestingClient");
  });

  /**
   * Tests that multiple clients can be renamed simultaneously. Azure services
   * with multi-client setups (e.g., AnomalyDetector) may need to rename
   * several clients at once.
   */
  it("should rename multiple clients from the title map", () => {
    const clients = [
      mockClient("ClientA"),
      mockClient("ClientB"),
    ];
    applyClientRenames(clients, {
      ClientA: "RenamedA",
      ClientB: "RenamedB",
    });
    expect(clients[0].name).toBe("RenamedA");
    expect(clients[1].name).toBe("RenamedB");
  });

  /**
   * Tests that clients whose names are NOT in the title map are left
   * untouched. Only explicitly mapped names should be renamed.
   */
  it("should not rename clients not in the title map", () => {
    const clients = [mockClient("KeepThisClient")];
    applyClientRenames(clients, { OtherClient: "Renamed" });
    expect(clients[0].name).toBe("KeepThisClient");
  });

  /**
   * Tests that an empty title map is a no-op. This ensures the function
   * handles the edge case gracefully without errors.
   */
  it("should leave clients unchanged when title map is empty", () => {
    const clients = [mockClient("ServiceClient")];
    applyClientRenames(clients, {});
    expect(clients[0].name).toBe("ServiceClient");
  });

  /**
   * Tests that partial name matches do NOT trigger renaming.
   * Only exact key matches in the title map should apply.
   */
  it("should only match exact client names, not partial matches", () => {
    const clients = [mockClient("ServiceClient")];
    applyClientRenames(clients, { Service: "Renamed" });
    expect(clients[0].name).toBe("ServiceClient");
  });

  /**
   * Tests mixed scenario: some clients match the title map and others don't.
   * Only matching clients should be renamed.
   */
  it("should rename only matching clients in a mixed set", () => {
    const clients = [
      mockClient("RenameMe"),
      mockClient("LeaveMe"),
      mockClient("AlsoRename"),
    ];
    applyClientRenames(clients, {
      RenameMe: "Renamed1",
      AlsoRename: "Renamed2",
    });
    expect(clients[0].name).toBe("Renamed1");
    expect(clients[1].name).toBe("LeaveMe");
    expect(clients[2].name).toBe("Renamed2");
  });
});
