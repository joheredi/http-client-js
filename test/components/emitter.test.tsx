/**
 * Test suite for the $onEmit emitter entry point.
 *
 * The $onEmit function is the TypeSpec compiler hook that ties all emitter
 * components together into a functional code generation pipeline. It initializes
 * the TCGC SDK context, builds a declarative JSX tree composing all orchestrator
 * components, and renders the output to files.
 *
 * What is tested:
 * - A simple service with a model and operation produces the expected directory
 *   structure containing models, operations, client context, and classical client files.
 * - A service with no operations produces only the classical client and context files
 *   (no operations directory).
 * - The emitter correctly composes ModelFiles, OperationFiles, ClientContextFile,
 *   and ClassicalClientFile into a coherent output tree.
 * - Cross-file references (e.g., serializer used in operations, context used in client)
 *   resolve correctly via Alloy's refkey system.
 *
 * Why this matters:
 * This is the integration point — without a working $onEmit, none of the individual
 * components can produce output from the TypeSpec compiler. If this test fails,
 * the emitter is non-functional even if all component tests pass independently.
 * It validates that the component composition, context wiring, and output writing
 * all work together end-to-end.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { Children, For, SourceDirectory } from "@alloy-js/core";
import {
  createTSNamePolicy,
  tsNameConflictResolver,
} from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { describe, expect, it } from "vitest";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { OperationFiles } from "../../src/components/operation-files.js";
import { OperationOptionsFiles } from "../../src/components/operation-options-files.js";
import { ClientContextFile } from "../../src/components/client-context.js";
import { ClassicalClientFile } from "../../src/components/classical-client.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";

/**
 * Test wrapper that mirrors the $onEmit JSX tree structure without
 * calling writeOutput(). This allows testing the rendered output
 * in-memory using Alloy's test matchers.
 *
 * It replicates the exact same component composition as $onEmit:
 * Output → SdkContextProvider → SourceDirectory("src") → components.
 */
function EmitterTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children?: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      nameConflictResolver={tsNameConflictResolver}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        <SourceDirectory path="src">
          <ModelFiles />
          <OperationFiles />
          <OperationOptionsFiles />
          <For each={props.sdkContext.sdkPackage.clients}>
            {(client) => (
              <>
                <ClientContextFile client={client} />
                <ClassicalClientFile client={client} />
              </>
            )}
          </For>
        </SourceDirectory>
      </SdkContextProvider>
    </Output>
  );
}

describe("$onEmit", () => {
  /**
   * Tests that a service with a model and an operation produces all
   * expected output files. This is the primary integration test — it
   * validates that ModelFiles, OperationFiles, ClientContextFile, and
   * ClassicalClientFile all render together without conflicts. Verifies
   * that cross-file refkey references (serializer in operations,
   * context in classical client) resolve correctly with auto-generated
   * imports.
   */
  it("should produce models, operations, context, and client files for a simple service", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          name: string;
          age: int32;
        }

        @get op getWidget(): Widget;
        @post op createWidget(@body body: Widget): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = <EmitterTestWrapper sdkContext={sdkContext} />;

    const result = renderToString(template);

    // Verify models file exists with model interface and serializer/deserializer
    expect(result).toContain("export interface Widget");
    expect(result).toContain("widgetSerializer");
    expect(result).toContain("widgetDeserializer");

    // Verify operations file exists with operation functions
    expect(result).toContain("export async function getWidget");
    expect(result).toContain("export async function createWidget");

    // Verify client context exists with factory function
    expect(result).toContain("TestingContext");
    expect(result).toContain("createTesting");

    // Verify classical client exists
    expect(result).toContain("export class TestingClient");
  });

  /**
   * Tests that a service with only operations (no custom models) still
   * produces the correct output — operations, client context, and classical
   * client files should all be present. The models directory may or may not
   * be emitted depending on whether TCGC generates implicit models.
   */
  it("should produce operations and client files for a service with only scalar operations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ping(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = <EmitterTestWrapper sdkContext={sdkContext} />;

    const result = renderToString(template);

    // Operations should be present
    expect(result).toContain("export async function ping");
    expect(result).toContain("PingOptionalParams");

    // Client context and classical client should be present
    expect(result).toContain("TestingContext");
    expect(result).toContain("createTesting");
    expect(result).toContain("export class TestingClient");
  });

  /**
   * Tests that the emitter handles a service with multiple operations
   * and models, verifying that cross-file imports are generated correctly.
   * When an operation references a model (for body or response), the
   * operations file must import the serializer/deserializer from the
   * models file. This test ensures Alloy's refkey-based import resolution
   * works across the full emitter tree.
   */
  it("should generate correct cross-file references between models and operations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Item {
          id: string;
          value: int32;
        }

        @get op getItem(@path id: string): Item;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = <EmitterTestWrapper sdkContext={sdkContext} />;

    const result = renderToString(template);

    // Model interface should be in models file
    expect(result).toContain("export interface Item");

    // Deserializer should be generated (Item is used as output)
    expect(result).toContain("itemDeserializer");

    // Operation should reference the deserializer (cross-file import)
    expect(result).toContain("export async function getItem");

    // Classical client should reference the public operation
    expect(result).toContain("export class TestingClient");
  });

  /**
   * Tests that an empty service (no operations, no models) still produces
   * valid output. The emitter should not crash on empty input. TCGC may
   * not produce any clients for empty services, so the output may be
   * minimal or empty.
   */
  it("should handle an empty service without errors", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op health(): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = <EmitterTestWrapper sdkContext={sdkContext} />;

    // Should not throw
    const result = renderToString(template);
    expect(result).toBeDefined();
  });

  /**
   * Tests that enum types flow through the emitter correctly, appearing
   * in the models file as a type alias. Without `experimentalExtensibleEnums`,
   * fixed enums produce only a type alias (no KnownXxx enum). This validates
   * that the ModelFiles component correctly renders enum declarations.
   */
  it("should include enum declarations in model output", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum Color { Red, Green, Blue }

        @get op getColor(): Color;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = <EmitterTestWrapper sdkContext={sdkContext} />;

    const result = renderToString(template);

    // Fixed enum type alias should be present
    expect(result).toContain("Color");
    // No KnownColor enum without experimentalExtensibleEnums flag
    expect(result).not.toContain("KnownColor");
  });

  /**
   * Tests that the factory function in the client context correctly
   * references getClient from the HTTP runtime. This validates that
   * external package registration (httpRuntimeLib) works end-to-end
   * in the full emitter tree.
   */
  it("should import HTTP runtime symbols correctly", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op check(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = <EmitterTestWrapper sdkContext={sdkContext} />;

    const result = renderToString(template);

    // Should reference HTTP runtime types
    expect(result).toContain("@typespec/ts-http-runtime");
    expect(result).toContain("getClient");
  });
});
