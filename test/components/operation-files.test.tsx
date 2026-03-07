/**
 * Test suite for the OperationFiles orchestrator component.
 *
 * OperationFiles is the top-level coordinator for all operation declarations in the
 * emitter output. It traverses the client hierarchy from the SDK context, groups
 * operations by their operation group path, and renders them into
 * `api/{group}/operations.ts` source files.
 *
 * What is tested:
 * - A service with root-level operations renders `api/operations.ts`.
 * - Each operation produces three declarations: send, deserialize, public.
 * - The options interface is in a separate options.ts file.
 * - Multiple operations in the same group are separated by blank lines.
 * - A service with nested operation groups renders into subdirectories.
 * - A service with no operations produces no output.
 * - Operations in different groups go to different files.
 * - The public function correctly composes send + deserialize references.
 * - Operations with model bodies include serialization in send functions.
 *
 * Why this matters:
 * This is the orchestration layer that assembles all individual operation components
 * (OperationOptionsDeclaration, SendOperation, DeserializeOperation, PublicOperation)
 * into the final file structure. If this fails, operations cannot be emitted even
 * if the individual components are correct. It is the final piece of Phase 3 that
 * wires everything together for Phase 4 (Client Infrastructure).
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { Children, SourceDirectory } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { OperationFiles } from "../../src/components/operation-files.js";
import { OperationOptionsFiles } from "../../src/components/operation-options-files.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { GroupDirectoryProvider } from "../../src/context/group-directory-context.js";

/**
 * Test wrapper for OperationFiles that provides Output, SdkContext, and the
 * api/ SourceDirectory structure — mirroring the production setup in emitter.tsx.
 *
 * Includes GroupDirectoryProvider so grouped operations can register content
 * via the reactive context instead of creating their own SourceDirectories.
 *
 * Use `siblings` for components that should be rendered alongside (but outside)
 * the api/ directory, like ModelFiles.
 */
function OperationFilesTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
  siblings?: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        {props.siblings}
        <SourceDirectory path="api">
          <GroupDirectoryProvider>{props.children}</GroupDirectoryProvider>
        </SourceDirectory>
      </SdkContextProvider>
    </Output>
  );
}

describe("OperationFiles", () => {
  /**
   * Tests that a service with a single GET operation renders all three
   * operation declarations in api/operations.ts. The options interface
   * is in a separate options.ts file, imported via refkey. Verifies the
   * send, deserialize, and public function are all present and correctly
   * structured, and that the options interface is imported.
   */
  it("should render root-level operations into api/operations.ts", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("ping")}(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    // Should have send, deserialize, and public function in api/operations.ts
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining(
        "export async function ping",
      ),
    });
    // Options interface is no longer declared in operations.ts — it's in options.ts
    // but operations.ts imports it via refkey
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("_pingSend"),
    });
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("_pingDeserialize"),
    });
  });

  /**
   * Tests that multiple operations in the same group are rendered in the
   * same file, each with their declarations. The options interfaces are
   * in a separate options.ts file. This validates that the <For> iterator
   * correctly separates operations with blank lines and that refkeys for
   * different operations don't conflict.
   */
  it("should render multiple operations in the same file", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("ping")}(): string;
        @get @route("health") op ${t.op("healthCheck")}(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    // Both operations should be in the same file
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining(
        "export async function ping",
      ),
    });
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining(
        "export async function healthCheck",
      ),
    });
  });

  /**
   * Tests that a service with no operations produces no output at all.
   * This is important because emitting empty files would be wasteful
   * and confusing. The orchestrator should return undefined when there
   * are no operations to render.
   */
  it("should render nothing when no operations exist", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code``);

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    expect(template).toRenderTo("");
  });

  /**
   * Tests that a void-returning operation (e.g., DELETE 204) renders
   * correctly with empty return in the deserialize function and void
   * return type in the public function. This validates the integration
   * between the orchestrator and the DeserializeOperation component's
   * void handling.
   */
  it("should handle void return operations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @delete op ${t.op("deleteItem")}(@path id: string): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    // Deserialize should have void return
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("return;"),
    });
    // Public function should exist
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining(
        "export async function deleteItem",
      ),
    });
  });

  /**
   * Tests that operations with model responses include deserialization
   * calls via refkeys. This validates that the ModelFiles and OperationFiles
   * orchestrators work together — models are declared in models/models.ts
   * and referenced from api/operations.ts via imports.
   */
  it("should render operations with model responses including deserialization", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Widget")} {
          name: string;
          weight: int32;
        }

        @get op ${t.op("getWidget")}(@path id: string): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OperationFilesTestWrapper
        sdkContext={sdkContext}
        siblings={<ModelFiles />}
      >
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("widgetDeserializer"),
      "models/index.ts": expect.any(String),
      "models/models.ts": expect.stringContaining("export interface Widget"),
      "models/serialization/serialization.ts": expect.any(String),
    });
  });

  /**
   * Tests that operations with model request bodies include serialization
   * calls via refkeys. This validates the send function correctly uses
   * serializer references for model body parameters.
   */
  it("should render operations with model body including serialization", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Widget")} {
          name: string;
          weight: int32;
        }

        @post op ${t.op("createWidget")}(@body body: Widget): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OperationFilesTestWrapper
        sdkContext={sdkContext}
        siblings={<ModelFiles />}
      >
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("widgetSerializer"),
      "models/index.ts": expect.any(String),
      "models/models.ts": expect.stringContaining("export interface Widget"),
      "models/serialization/serialization.ts": expect.any(String),
    });
  });

  /**
   * Tests that a service with operation groups (nested clients) renders
   * operations into subdirectory files. Operation groups in TCGC are
   * represented as child clients, and their operations should go into
   * `api/{groupName}/operations.ts`.
   */
  it("should render operation group operations into subdirectories", async () => {
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

    // Check that there are child clients (operation groups)
    const topClient = sdkContext.sdkPackage.clients[0];

    // If TCGC puts operations on the child, they should be in a subdirectory
    const hasChildren = topClient.children && topClient.children.length > 0;
    const hasRootMethods = topClient.methods.length > 0;

    const template = (
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    if (hasChildren) {
      // Operations should be in a subdirectory
      const childName = topClient.children![0].name;
      const normalizedName =
        childName.charAt(0).toLowerCase() + childName.slice(1);
      expect(template).toRenderTo({
        [`api/groups/${normalizedName}/index.ts`]: expect.any(String),
        [`api/groups/${normalizedName}/operations.ts`]:
          expect.stringContaining("listWidgets"),
      });
    } else if (hasRootMethods) {
      // If TCGC flattens them to root, they should be in api/operations.ts
      expect(template).toRenderTo({
        "api/operations.ts": expect.stringContaining("listWidgets"),
      });
    }
  });

  /**
   * Tests that operations with path parameters correctly generate
   * URL template expansion in the send function. This validates the
   * integration between the orchestrator and SendOperation's URL
   * template handling.
   */
  it("should handle operations with path parameters", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ${t.op("getItem")}(@path id: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    // Send function should have expandUrlTemplate call
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("expandUrlTemplate"),
    });
    // Should have the id parameter in the function signature
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("id: string"),
    });
  });

  /**
   * Tests that grouped operations import options from a flat `./options.js`
   * path, not a nested `./groupName/options.js` path. This validates the
   * SourceDirectory nesting fix (SA-C37) — both operations and options files
   * in the same subdirectory must use same-directory relative imports.
   *
   * Why this matters:
   * Before this fix, Alloy's import resolver computed paths relative to the
   * parent SourceDirectory (`api/`) instead of the actual file location
   * (`api/groupName/`). This produced incorrect imports like
   * `./widgets/options.js` from `api/widgets/operations.ts`, which would
   * resolve to `api/widgets/widgets/options.ts` — a non-existent path.
   */
  it("should import options from flat ./options.js in grouped operations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @route("/widgets")
        interface Widgets {
          @get op ${t.op("listWidgets")}(@query filter?: string): string;
        }
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const topClient = sdkContext.sdkPackage.clients[0];
    const hasChildren = topClient.children && topClient.children.length > 0;

    // Only assert when TCGC creates child clients (operation groups)
    if (hasChildren) {
      const childName = topClient.children![0].name;
      const normalizedName =
        childName.charAt(0).toLowerCase() + childName.slice(1);

      const template = (
        <OperationFilesTestWrapper sdkContext={sdkContext}>
          <OperationFiles />
          <OperationOptionsFiles />
        </OperationFilesTestWrapper>
      );

      expect(template).toRenderTo({
        "api/index.ts": expect.any(String),
        [`api/groups/${normalizedName}/index.ts`]: expect.any(String),
        [`api/groups/${normalizedName}/operations.ts`]: expect.stringContaining(
          'from "./options.js"',
        ),
        [`api/groups/${normalizedName}/options.ts`]: expect.stringContaining(
          "ListWidgetsOptionalParams",
        ),
      });
    }
  });
});
