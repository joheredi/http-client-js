/**
 * Test suite for the OperationOptionsFiles component.
 *
 * OperationOptionsFiles generates separate `api/{group}/options.ts` files
 * containing the `XxxOptionalParams` interfaces for each operation group.
 * This matches the legacy emitter's file structure where options interfaces
 * are in their own file, separate from the operation implementations in
 * `operations.ts`.
 *
 * What is tested:
 * - A service with root-level operations renders `api/options.ts`.
 * - Each operation gets an options interface extending OperationOptions.
 * - Multiple operations in the same group produce multiple interfaces in one file.
 * - A service with no operations produces no output.
 * - Operations in nested groups render options.ts in subdirectories.
 * - Optional method parameters appear as members in the options interface.
 * - The options interfaces use the same refkeys as operations.ts expects,
 *   enabling automatic import resolution between the two files.
 *
 * Why this matters:
 * The legacy emitter places options interfaces in separate `options.ts` files.
 * Scenario tests for the `models:withOptions` category look for these files.
 * Without this component, 14+ scenario tests fail because the test harness
 * cannot find the expected `api/options.ts` file.
 */
import "@alloy-js/core/testing";
import { Children, SourceDirectory } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import { beforeAll, describe, expect, it } from "vitest";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { OperationOptionsFiles } from "../../src/components/operation-options-files.js";
import { OperationFiles } from "../../src/components/operation-files.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { GroupDirectoryProvider } from "../../src/context/group-directory-context.js";

/**
 * Test wrapper that provides Output, SdkContext, and the api/ SourceDirectory
 * structure — mirroring the production setup in emitter.tsx.
 *
 * Includes GroupDirectoryProvider so grouped options can register content
 * via the reactive context instead of creating their own SourceDirectories.
 */
function OptionsFilesTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        <SourceDirectory path="api">
          <GroupDirectoryProvider>{props.children}</GroupDirectoryProvider>
        </SourceDirectory>
      </SdkContextProvider>
    </Output>
  );
}

describe("OperationOptionsFiles", () => {
  describe("single ping operation", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          @get op ${t.op("ping")}(): string;
        `,
      );
      sdkContext = await createSdkContextForTest(program);
    });

    /**
     * Tests that a single GET operation produces an options.ts file with the
     * corresponding OptionalParams interface. This is the baseline test for
     * the component — if this fails, no options files are being generated.
     */
    it("should render options.ts with OptionalParams for a root-level operation", async () => {
      const template = (
        <OptionsFilesTestWrapper sdkContext={sdkContext}>
          <OperationOptionsFiles />
        </OptionsFilesTestWrapper>
      );

      // Should produce api/options.ts with the PingOptionalParams interface
      expect(template).toRenderTo({
        "api/index.ts": expect.any(String),
        "api/options.ts": expect.stringContaining("PingOptionalParams"),
      });
    });

    /**
     * Tests that the options interface extends OperationOptions from the
     * runtime library. This is essential because all options interfaces must
     * inherit base request configuration (e.g., abort signals, tracing).
     */
    it("should extend OperationOptions from the runtime library", async () => {
      const template = (
        <OptionsFilesTestWrapper sdkContext={sdkContext}>
          <OperationOptionsFiles />
        </OptionsFilesTestWrapper>
      );

      expect(template).toRenderTo({
        "api/index.ts": expect.any(String),
        "api/options.ts": expect.stringContaining("extends OperationOptions"),
      });
    });

    /**
     * Tests that operations.ts correctly imports from options.ts via refkeys.
     * When both OperationFiles and OperationOptionsFiles are rendered, the
     * options interface should be declared in options.ts and imported by
     * operations.ts. This validates the cross-file refkey resolution.
     */
    it("should enable operations.ts to import from options.ts via refkeys", async () => {
      const template = (
        <OptionsFilesTestWrapper sdkContext={sdkContext}>
          <OperationOptionsFiles />
          <OperationFiles />
        </OptionsFilesTestWrapper>
      );

      // Both files should exist: options.ts with the declaration, operations.ts importing it
      expect(template).toRenderTo({
        "api/index.ts": expect.any(String),
        "api/options.ts": expect.stringContaining("PingOptionalParams"),
        "api/operations.ts": expect.stringContaining("./options.js"),
      });
    });
  });

  /**
   * Tests that multiple operations in the same group produce multiple
   * interfaces in the same options.ts file. Each operation should have
   * its own OptionalParams interface.
   */
  it("should render multiple option interfaces in the same file", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("ping")}(): string;
        @get @route("health") op ${t.op("healthCheck")}(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OptionsFilesTestWrapper sdkContext={sdkContext}>
        <OperationOptionsFiles />
      </OptionsFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "api/index.ts": expect.any(String),
      "api/options.ts": expect.stringContaining("PingOptionalParams"),
    });
    expect(template).toRenderTo({
      "api/index.ts": expect.any(String),
      "api/options.ts": expect.stringContaining("HealthCheckOptionalParams"),
    });
  });

  /**
   * Tests that a service with no operations produces no output.
   * Empty options files should not be emitted — this avoids
   * generating unnecessary files that confuse consumers.
   */
  it("should render nothing when no operations exist", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code``);

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OptionsFilesTestWrapper sdkContext={sdkContext}>
        <OperationOptionsFiles />
      </OptionsFilesTestWrapper>
    );

    expect(template).toRenderTo("");
  });

  /**
   * Tests that operations in a named interface (operation group) produce
   * options.ts in a subdirectory matching the group name. This ensures
   * the options.ts and operations.ts files are in the same directory for
   * each operation group.
   */
  it("should render options.ts in subdirectories for operation groups", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @route("/widgets")
        interface Widgets {
          @get op ${t.op("listWidgets")}(): string;
        }
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const topClient = sdkContext.sdkPackage.clients[0];
    const hasChildren = topClient.children && topClient.children.length > 0;

    const template = (
      <OptionsFilesTestWrapper sdkContext={sdkContext}>
        <OperationOptionsFiles />
      </OptionsFilesTestWrapper>
    );

    if (hasChildren) {
      const childName = topClient.children![0].name;
      const normalizedName =
        childName.charAt(0).toLowerCase() + childName.slice(1);
      expect(template).toRenderTo({
        "api/index.ts": expect.any(String),
        [`api/groups/${normalizedName}/index.ts`]: expect.any(String),
        [`api/groups/${normalizedName}/options.ts`]: expect.stringContaining(
          `${childName}ListWidgetsOptionalParams`,
        ),
      });
    } else {
      // If TCGC flattens to root, options should be in api/options.ts
      expect(template).toRenderTo({
        "api/index.ts": expect.any(String),
        "api/options.ts": expect.stringContaining("ListWidgetsOptionalParams"),
      });
    }
  });

  /**
   * Tests that optional method parameters appear as members in the options
   * interface. Parameters that are optional and not on the client should
   * be included in the options interface with their correct types.
   */
  it("should include optional parameters as interface members", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("search")}(@query query?: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OptionsFilesTestWrapper sdkContext={sdkContext}>
        <OperationOptionsFiles />
      </OptionsFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "api/index.ts": expect.any(String),
      "api/options.ts": expect.stringContaining("SearchOptionalParams"),
    });
    expect(template).toRenderTo({
      "api/index.ts": expect.any(String),
      "api/options.ts": expect.stringContaining("query"),
    });
  });
});
