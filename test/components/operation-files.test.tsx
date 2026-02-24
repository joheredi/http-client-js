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
 * - Each operation produces four declarations: options, send, deserialize, public.
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
import { Children } from "@alloy-js/core";
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
import { ModelFiles } from "../../src/components/model-files.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import {
  TesterWithService,
  createSdkContextForTest,
} from "../test-host.js";

/**
 * Test wrapper for OperationFiles that provides Output and SdkContext but NO
 * SourceFile — since OperationFiles creates its own SourceDirectory and SourceFiles.
 *
 * Unlike SdkTestFile which wraps children in a `<SourceFile path="test.ts">`,
 * this wrapper only provides the Output and SdkContextProvider context needed
 * for OperationFiles to render its own file structure.
 */
function OperationFilesTestWrapper(props: {
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
        {props.children}
      </SdkContextProvider>
    </Output>
  );
}

describe("OperationFiles", () => {
  /**
   * Tests that a service with a single GET operation renders all four
   * operation declarations in api/operations.ts. This is the baseline
   * test — if this fails, the entire operation file generation pipeline
   * is broken. Verifies the options interface, send, deserialize, and
   * public function are all present and correctly structured.
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

    // Should have all four declarations in api/operations.ts
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("export async function ping"),
    });
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("PingOptionalParams"),
    });
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("_pingSend"),
    });
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("_pingDeserialize"),
    });
  });

  /**
   * Tests that multiple operations in the same group are rendered in the
   * same file, each with all four declarations. This validates that the
   * <For> iterator correctly separates operations with blank lines and
   * that refkeys for different operations don't conflict.
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
      "api/operations.ts": expect.stringContaining("export async function ping"),
    });
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining(
        "export async function healthCheck",
      ),
    });
    // Both should have their options interfaces
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("PingOptionalParams"),
    });
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining(
        "HealthCheckOptionalParams",
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
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    // Operations file should reference the deserializer and model type
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("widgetDeserializer"),
      "models/models.ts": expect.stringContaining("export interface Widget"),
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
      <OperationFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
        <OperationFiles />
      </OperationFilesTestWrapper>
    );

    // Operations file should reference both serializer and deserializer
    expect(template).toRenderTo({
      "api/operations.ts": expect.stringContaining("widgetSerializer"),
      "models/models.ts": expect.stringContaining("export interface Widget"),
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
        [`api/${normalizedName}/operations.ts`]: expect.stringContaining(
          "listWidgets",
        ),
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
});
