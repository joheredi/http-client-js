/**
 * Unit tests for the resolveEmitterFlavor function.
 *
 * These tests validate that the emitter correctly reads the `flavor` option
 * from the TypeSpec emitter configuration (context.options). This is the
 * mechanism that allows users to configure Azure vs core flavor via
 * tspconfig.yaml instead of requiring a separate entry point.
 *
 * Why this matters:
 * Without configurable flavor, users must use `$onEmitAzure` for Azure output
 * and `$onEmit` for core output. With the `flavor` option, a single `$onEmit`
 * entry point can generate either flavor based on the tspconfig.yaml setting.
 * This matches the legacy emitter's `flavor` option behavior.
 *
 * @module
 */
import { describe, expect, it } from "vitest";
import { resolveEmitterFlavor } from "../../src/emitter.js";

describe("resolveEmitterFlavor", () => {
  /**
   * Tests that the function defaults to "core" when no options are provided.
   * This ensures backward compatibility — existing users of `$onEmit` without
   * any flavor config continue to get core (non-Azure) output.
   */
  it("should default to 'core' when options are undefined", () => {
    expect(resolveEmitterFlavor(undefined)).toBe("core");
  });

  /**
   * Tests that an empty options object defaults to "core".
   * This covers the case where tspconfig.yaml has no flavor setting.
   */
  it("should default to 'core' when options are empty", () => {
    expect(resolveEmitterFlavor({})).toBe("core");
  });

  /**
   * Tests that setting `flavor: "azure"` in options returns "azure".
   * This is the primary use case — enabling Azure-flavored output via config.
   */
  it("should return 'azure' when flavor option is 'azure'", () => {
    expect(resolveEmitterFlavor({ flavor: "azure" })).toBe("azure");
  });

  /**
   * Tests that setting `flavor: "core"` explicitly returns "core".
   * This allows users to explicitly opt into core flavor.
   */
  it("should return 'core' when flavor option is 'core'", () => {
    expect(resolveEmitterFlavor({ flavor: "core" })).toBe("core");
  });

  /**
   * Tests that unrecognized flavor values default to "core".
   * Only "azure" is a valid non-default flavor; anything else is treated
   * as core to maintain safe defaults.
   */
  it("should return 'core' for unrecognized flavor values", () => {
    expect(resolveEmitterFlavor({ flavor: "invalid" })).toBe("core");
    expect(resolveEmitterFlavor({ flavor: "" })).toBe("core");
    expect(resolveEmitterFlavor({ flavor: 123 })).toBe("core");
  });

  /**
   * Tests that other options don't interfere with flavor resolution.
   * The flavor option should work alongside other emitter options.
   */
  it("should handle flavor alongside other options", () => {
    expect(
      resolveEmitterFlavor({
        flavor: "azure",
        "include-headers-in-response": true,
        "experimental-extensible-enums": false,
      }),
    ).toBe("azure");
  });
});
