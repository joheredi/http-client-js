/**
 * Integration tests for emitter flavor configuration via YAML code fences.
 *
 * These tests verify that when `flavor: "azure"` is set in the scenario YAML
 * config, the emitter produces Azure-flavored output with the correct import
 * sources (@azure-rest/core-client, @azure/core-auth, etc.) instead of
 * @typespec/ts-http-runtime.
 *
 * Why this matters:
 * The flavor configuration mechanism (SA29) allows users to control whether
 * Azure or core imports are used via tspconfig.yaml or test YAML code fences.
 * This test ensures the full pipeline respects the flavor option, from config
 * reading through FlavorProvider to final import resolution.
 *
 * @module
 */
import { describe, expect, it } from "vitest";
import { emitForScenario } from "../scenarios/emit-for-scenario.js";

describe("Flavor config integration", () => {
  /**
   * Tests that `flavor: "azure"` in YAML config produces Azure imports
   * in the generated client context file.
   *
   * When azure flavor is active, `getClient` should be imported from
   * `@azure-rest/core-client` instead of `@typespec/ts-http-runtime`.
   * This is the most visible effect of flavor configuration.
   */
  it("should use Azure imports when flavor is set to 'azure'", async () => {
    const code = `
      model Widget {
        id: string;
        name: string;
      }

      op getWidget(@path id: string): Widget;
    `;

    const files = await emitForScenario(code, [], { flavor: "azure" });

    // Find a client context file — it should import from Azure packages
    const contextFile = Object.entries(files).find(([path]) =>
      path.includes("Context.ts"),
    );
    expect(contextFile).toBeDefined();
    const [, contextContent] = contextFile!;
    expect(contextContent).toContain("@azure-rest/core-client");
    expect(contextContent).not.toContain("@typespec/ts-http-runtime");
  });

  /**
   * Tests that `flavor: "core"` (or no flavor) produces core imports.
   *
   * When core flavor is active, imports should come from
   * `@typespec/ts-http-runtime`, not any Azure packages.
   */
  it("should use core imports when flavor is 'core'", async () => {
    const code = `
      model Widget {
        id: string;
        name: string;
      }

      op getWidget(@path id: string): Widget;
    `;

    const files = await emitForScenario(code, [], { flavor: "core" });

    const contextFile = Object.entries(files).find(([path]) =>
      path.includes("Context.ts"),
    );
    expect(contextFile).toBeDefined();
    const [, contextContent] = contextFile!;
    expect(contextContent).toContain("@typespec/ts-http-runtime");
    expect(contextContent).not.toContain("@azure-rest/core-client");
  });

  /**
   * Tests that Azure flavor includes a logger.ts file.
   *
   * Azure-flavored SDKs include a `src/logger.ts` file that creates
   * a namespaced logger via `@azure/logger`. Core flavor should not
   * include this file.
   */
  it("should include logger.ts when flavor is 'azure'", async () => {
    const code = `
      model Widget {
        id: string;
      }

      op getWidget(@path id: string): Widget;
    `;

    const azureFiles = await emitForScenario(code, [], { flavor: "azure" });
    const coreFiles = await emitForScenario(code, [], { flavor: "core" });

    const azureLoggerFile = Object.keys(azureFiles).find((path) =>
      path.includes("logger.ts"),
    );
    const coreLoggerFile = Object.keys(coreFiles).find((path) =>
      path.includes("logger.ts"),
    );

    expect(azureLoggerFile).toBeDefined();
    expect(coreLoggerFile).toBeUndefined();
  });

  /**
   * Tests that default flavor (no explicit setting) produces core output.
   *
   * When no flavor option is specified and the TypeSpec code doesn't contain
   * Azure-specific patterns, the output should default to core flavor.
   */
  it("should default to core flavor when no flavor specified", async () => {
    const code = `
      model Widget {
        id: string;
      }

      op getWidget(@path id: string): Widget;
    `;

    const files = await emitForScenario(code, [], {});

    const contextFile = Object.entries(files).find(([path]) =>
      path.includes("Context.ts"),
    );
    expect(contextFile).toBeDefined();
    const [, contextContent] = contextFile!;
    expect(contextContent).toContain("@typespec/ts-http-runtime");
  });
});
