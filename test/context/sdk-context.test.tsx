/**
 * Test suite for the SDK Context Provider component and useSdkContext hook.
 *
 * These tests validate the TCGC data context system that feeds type information
 * to all downstream components. The SdkContextProvider is a foundational piece —
 * if it fails, every component that renders models, operations, or clients
 * will also fail.
 *
 * What is tested:
 * - Provider correctly exposes SdkPackage data to child components
 * - useSdkContext() returns typed access to clients, models, enums, unions
 * - useSdkContext() throws a clear error when used without a provider
 * - Context data matches what TCGC extracts from compiled TypeSpec
 * - SdkTestFile wrapper integrates correctly with the test infrastructure
 */
import "@alloy-js/core/testing";
import { code, useContext } from "@alloy-js/core";
import { renderToString } from "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { SdkContext, SdkContextProvider, useSdkContext } from "../../src/context/sdk-context.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile, TestFile } from "../utils.jsx";

describe("SDK Context Provider", () => {
  describe("with a model and operation", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("Foo")} {
            name: string;
          }

          op ${t.op("getFoo")}(): Foo;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
    });

    /**
     * Validates that a child component can access the SDK package data
     * through useSdkContext(). This is the most fundamental test — every
     * downstream component depends on this mechanism.
     *
     * The model must be referenced by an operation for TCGC to include it
     * in sdkPackage.models (unreferenced models are pruned).
     */
    it("should provide sdkPackage to child components", async () => {
      /**
       * Test component that reads the context and renders a summary.
       * If the context is missing or malformed, this will throw or
       * render incorrect output.
       */
      function ContextConsumer() {
        const ctx = useSdkContext();
        return code`models: ${String(ctx.models.length)}`;
      }

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ContextConsumer />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        models: 1
      `);
    });

    /**
     * Validates that the SdkContext named context can also be consumed
     * directly via useContext() from @alloy-js/core, in addition to
     * the convenience useSdkContext() hook. This ensures the context
     * is correctly wired as a standard Alloy ComponentContext.
     */
    it("should be consumable via raw useContext", async () => {
      function RawContextConsumer() {
        const ctx = useContext(SdkContext);
        if (!ctx) return "no context";
        return code`raw: ${String(ctx.models.length)}`;
      }

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <RawContextConsumer />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        raw: 1
      `);
    });

    /**
     * Validates that the sdkPackage property on the context value matches
     * the full TCGC SdkPackage object, not just the convenience accessors.
     * Components may need to access additional package metadata (e.g.,
     * crossLanguagePackageId, namespaces) beyond the common collections.
     */
    it("should expose the full sdkPackage object", async () => {
      function PackageConsumer() {
        const ctx = useSdkContext();
        const hasClients = ctx.sdkPackage.clients.length > 0;
        const hasModels = ctx.sdkPackage.models.length > 0;
        return code`hasClients: ${String(hasClients)}, hasModels: ${String(hasModels)}`;
      }

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <PackageConsumer />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        hasClients: true, hasModels: true
      `);
    });
  });

  describe("with a void operation", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;
    let program: Awaited<ReturnType<Awaited<ReturnType<typeof TesterWithService.createInstance>>["compile"]>>["program"];

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const result = await runner.compile(
        t.code`
          op ${t.op("getStatus")}(): void;
        `,
      );

      program = result.program;
      sdkContext = await createSdkContextForTest(program);
    });

    /**
     * Validates that the convenience accessor `clients` correctly
     * exposes the top-level clients extracted by TCGC. Services always
     * produce at least one client.
     */
    it("should expose clients from the SDK package", async () => {
      function ClientConsumer() {
        const ctx = useSdkContext();
        const clientNames = ctx.clients.map((c) => c.name).join(", ");
        return code`clients: ${clientNames}`;
      }

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ClientConsumer />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        clients: TestServiceClient
      `);
    });

    /**
     * Validates that useSdkContext() throws a descriptive error when
     * called outside of a SdkContextProvider. This is critical for
     * developer experience — catching wiring bugs early with a clear
     * message rather than cryptic "cannot read property of undefined" errors.
     *
     * JSX in Alloy is lazy — components are not evaluated during JSX
     * construction. The throw occurs during rendering, so we must call
     * renderToString() to trigger it.
     */
    it("should throw when useSdkContext is called without a provider", async () => {
      function OrphanConsumer() {
        const ctx = useSdkContext();
        return code`${String(ctx.models.length)}`;
      }

      // renderToString triggers the lazy evaluation where the throw happens
      expect(() =>
        renderToString(
          <TestFile program={program}>
            <OrphanConsumer />
          </TestFile>,
        ),
      ).toThrow("SdkContext is not set");
    });
  });

  /**
   * Validates that the context exposes enum types extracted from
   * the TypeSpec definition. Enums are a core type kind that the
   * emitter must handle. The enum must be referenced by an operation
   * for TCGC to include it.
   */
  it("should expose enums from the SDK package", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum ${t.enum("Color")} {
          Red,
          Green,
          Blue,
        }

        op ${t.op("getColor")}(): Color;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    function EnumConsumer() {
      const ctx = useSdkContext();
      return code`enums: ${String(ctx.enums.length)}`;
    }

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <EnumConsumer />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      enums: 1
    `);
  });
});
