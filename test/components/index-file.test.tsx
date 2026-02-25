/**
 * Test suite for the index file generation components (RootIndexFile,
 * ModelsIndexFile, ApiIndexFile, IndexFiles).
 *
 * These components generate barrel/index files that define the public API
 * surface of the generated SDK. The root index file is particularly critical
 * because it determines what symbols consumers can import from the package.
 *
 * What is tested:
 * - Root index exports model types (interfaces, enums, unions) from models
 * - Root index exports classical client classes from their source files
 * - Root index exports client context, options, and factory from context files
 * - Root index exports operation options interfaces from operation files
 * - Root index does NOT export serializer/deserializer functions
 * - Root index does NOT export _prefixed internal symbols
 * - Models index re-exports types from models.ts, excluding serializers
 * - API index re-exports public operations and context from api/ files
 * - IndexFiles orchestrator produces all index files together
 * - Empty services produce no index files
 * - Polymorphic union type aliases are included in exports
 * - Known-values enum variants (KnownXxx) are included in exports
 *
 * Why this matters:
 * Without proper index files, the generated SDK has no public entry point.
 * Consumers would need to import from internal file paths, and internal
 * implementation details (serializers, send functions) would leak into the
 * public API. Correct index generation is essential for a usable SDK.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { Children, SourceDirectory } from "@alloy-js/core";
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
import {
  RootIndexFile,
  ModelsIndexFile,
  ApiIndexFile,
  IndexFiles,
} from "../../src/components/index-file.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { OperationFiles } from "../../src/components/operation-files.js";
import { ClientContextFile } from "../../src/components/client-context.js";
import { ClassicalClientFile } from "../../src/components/classical-client.js";
import { ClassicalOperationGroupFiles } from "../../src/components/classical-operation-groups.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import {
  TesterWithService,
  createSdkContextForTest,
} from "../test-host.js";

/**
 * Test wrapper that provides the full emitter component tree including
 * the index file components. This mirrors the production $onEmit tree
 * so that index files can discover and reference the actual generated
 * source files from other components.
 */
function IndexTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children?: Children;
}) {
  const { sdkContext } = props;
  return (
    <Output
      program={sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      nameConflictResolver={tsNameConflictResolver}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={sdkContext}>
        <SourceDirectory path="src">
          <ModelFiles />
          <OperationFiles />
          {sdkContext.sdkPackage.clients.map((client) => (
            <>
              <ClientContextFile client={client} />
              <ClassicalClientFile client={client} />
              <ClassicalOperationGroupFiles client={client} />
            </>
          ))}
          {props.children}
        </SourceDirectory>
      </SdkContextProvider>
    </Output>
  );
}

/**
 * Minimal test wrapper for isolated index component testing.
 * Provides only the SdkContextProvider without other emitter components,
 * useful for testing the index component logic in isolation.
 */
function MinimalIndexWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
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
          {props.children}
        </SourceDirectory>
      </SdkContextProvider>
    </Output>
  );
}

describe("RootIndexFile", () => {
  /**
   * Tests that the root index file exports model interface names from
   * the models index path. This is the most fundamental requirement —
   * consumers need to import model types from the package root.
   */
  it("should export model types from models/index.js", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          name: string;
        }

        @get op getWidget(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain('export { Widget } from "./models/index.js"');
  });

  /**
   * Tests that enum types produce both the type alias name and the
   * KnownXxx enum name in the root index exports. Both are needed
   * by consumers — the type alias for type annotations and the
   * KnownXxx enum for accessing specific values.
   */
  it("should export enum type alias and KnownXxx enum", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum Color { Red, Green, Blue }

        @get op getColor(): Color;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain("Color");
    expect(result).toContain("KnownColor");
    expect(result).toContain('./models/index.js"');
  });

  /**
   * Tests that the root index exports the classical client class from
   * its individual source file. The client class is the main entry
   * point for OOP-style SDK consumers.
   */
  it("should export classical client class", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ping(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain(
      'export { TestServiceClient } from "./testServiceClient.js"',
    );
  });

  /**
   * Tests that the root index exports client context symbols (interface,
   * options, factory) from the context file. These are needed by consumers
   * who use the modular (function-based) API style.
   */
  it("should export client context, options, and factory", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ping(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain("TestServiceContext");
    expect(result).toContain("TestServiceClientOptionalParams");
    expect(result).toContain("createTestService");
    expect(result).toContain("testServiceClientContext.js");
  });

  /**
   * Tests that operation options interfaces are exported from the root index.
   * Each operation has an OptionalParams interface that consumers need
   * to pass options when calling operations.
   */
  it("should export operation options interfaces", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget { name: string; }

        @get op getWidget(): Widget;
        @post op createWidget(@body body: Widget): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain("GetWidgetOptionalParams");
    expect(result).toContain("CreateWidgetOptionalParams");
    expect(result).toContain("getWidget");
    expect(result).toContain("createWidget");
  });

  /**
   * Tests that serializer and deserializer functions are NOT exported
   * from the root index. These are internal implementation details
   * that consumers should never use directly.
   */
  it("should not export serializer or deserializer functions", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          name: string;
        }

        @get op getWidget(): Widget;
        @post op createWidget(@body body: Widget): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <MinimalIndexWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    // Root index should not contain serializer/deserializer names
    expect(result).not.toContain("widgetSerializer");
    expect(result).not.toContain("widgetDeserializer");
  });

  /**
   * Tests that _prefixed internal symbols (send, deserialize functions)
   * are NOT exported from the root index. These private functions are
   * implementation details of the operation layer.
   */
  it("should not export _prefixed internal symbols", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ping(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <MinimalIndexWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    expect(result).not.toContain("_pingSend");
    expect(result).not.toContain("_pingDeserialize");
  });

  /**
   * Tests that the root index returns undefined for empty SDK packages
   * (no clients AND no models). This prevents generating a useless empty
   * index file when there's truly nothing to export.
   */
  it("should return undefined when no clients and no models exist", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code``);

    const sdkContext = await createSdkContextForTest(program);

    // Override to have no clients and no models
    const mockContext = {
      ...sdkContext,
      sdkPackage: {
        ...sdkContext.sdkPackage,
        clients: [],
        models: [],
        enums: [],
        unions: [],
      },
    } as typeof sdkContext;

    const template = (
      <MinimalIndexWrapper sdkContext={mockContext}>
        <RootIndexFile />
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    // Should not contain any export statements
    expect(result).not.toContain("export");
  });

  /**
   * Tests that the root index generates model exports even when there
   * are no clients (model-only package). The legacy emitter supports
   * model-only packages where models with @usage annotations are exported
   * through the root index.ts without any client or operation layer.
   *
   * This is important because some TypeSpec packages define only models
   * (shared types) that other packages depend on. These still need a
   * proper root index.ts to be importable.
   */
  it("should export models in root index for model-only packages (no clients)", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          name: string;
        }

        @get op getWidget(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    // Simulate model-only: keep models but remove clients
    const mockContext = {
      ...sdkContext,
      sdkPackage: {
        ...sdkContext.sdkPackage,
        clients: [],
      },
    } as typeof sdkContext;

    const template = (
      <MinimalIndexWrapper sdkContext={mockContext}>
        <RootIndexFile />
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain('export { Widget } from "./models/index.js"');
    // Should not contain any client-related exports
    expect(result).not.toContain("Context");
    expect(result).not.toContain("OptionalParams");
    expect(result).not.toContain("create");
  });

  /**
   * Tests that operation group interfaces are exported from the root
   * index when the client has child clients (operation groups). These
   * interfaces are needed for typing operation group accessor properties.
   */
  it("should export operation group interfaces for clients with children", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @route("/widgets")
        namespace Widgets {
          @get op getWidget(@path id: string): string;
        }
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <RootIndexFile />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain("WidgetsOperations");
    expect(result).toContain("classic/widgets/index.js");
  });
});

describe("ModelsIndexFile", () => {
  /**
   * Tests that the models index file re-exports type names from models.ts
   * but does not include serializer or deserializer function names.
   * This is the filter boundary between the public models API and the
   * internal serialization layer.
   */
  it("should export model types but not serializers from models.ts", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          name: string;
        }

        @get op getWidget(): Widget;
        @post op createWidget(@body body: Widget): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <MinimalIndexWrapper sdkContext={sdkContext}>
        <SourceDirectory path="models">
          <ModelsIndexFile />
        </SourceDirectory>
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain('export { Widget } from "./models.js"');
    expect(result).not.toContain("Serializer");
    expect(result).not.toContain("Deserializer");
  });

  /**
   * Tests that the models index returns undefined when there are no
   * model types to export. This prevents generating an empty models/index.ts.
   */
  it("should return undefined when no models exist", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ping(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <MinimalIndexWrapper sdkContext={sdkContext}>
        <SourceDirectory path="models">
          <ModelsIndexFile />
        </SourceDirectory>
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    // Should not have any export statements for models
    expect(result).not.toContain("./models.js");
  });
});

describe("ApiIndexFile", () => {
  /**
   * Tests that the API index file re-exports public operation names and
   * options interfaces. This ensures consumers can import all API-layer
   * symbols from a single `./api/index.js` path.
   */
  it("should export public operations and options from api files", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ping(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <MinimalIndexWrapper sdkContext={sdkContext}>
        <SourceDirectory path="api">
          <ApiIndexFile />
        </SourceDirectory>
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    // Should export public operation and its options
    expect(result).toContain("PingOptionalParams");
    expect(result).toContain("ping");
    expect(result).toContain("operations.js");

    // Should export context symbols
    expect(result).toContain("TestServiceContext");
    expect(result).toContain("createTestService");
  });

  /**
   * Tests that _prefixed internal symbols are NOT exported from the
   * API index. The send and deserialize functions are private helpers.
   */
  it("should not export _prefixed internal functions", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op ping(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <MinimalIndexWrapper sdkContext={sdkContext}>
        <SourceDirectory path="api">
          <ApiIndexFile />
        </SourceDirectory>
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    expect(result).not.toContain("_pingSend");
    expect(result).not.toContain("_pingDeserialize");
  });
});

describe("IndexFiles", () => {
  /**
   * Tests that the IndexFiles orchestrator produces all expected index
   * files when given a service with models and operations. This is the
   * primary integration test — it validates that root, models, and api
   * index files are all generated together.
   */
  it("should produce root, models, and api index files", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          name: string;
        }

        @get op getWidget(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <IndexFiles />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    // Root index should contain exports
    expect(result).toContain("Widget");
    expect(result).toContain("TestServiceClient");

    // Models index should contain model exports
    expect(result).toContain("./models.js");

    // API index should contain operation exports
    expect(result).toContain("operations.js");
    expect(result).toContain("TestServiceContext");
  });

  /**
   * Tests that the IndexFiles orchestrator returns undefined when
   * there are no clients and no models in the SDK package.
   */
  it("should return undefined when no clients and no models exist", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code``);

    const sdkContext = await createSdkContextForTest(program);

    const mockContext = {
      ...sdkContext,
      sdkPackage: {
        ...sdkContext.sdkPackage,
        clients: [],
        models: [],
        enums: [],
        unions: [],
      },
    } as typeof sdkContext;

    const template = (
      <MinimalIndexWrapper sdkContext={mockContext}>
        <IndexFiles />
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    expect(result).not.toContain("export");
  });

  /**
   * Tests that the IndexFiles orchestrator generates root index and
   * models index for model-only packages (no clients but has models).
   * Model-only packages still need a proper public API entry point.
   *
   * This validates the fix for model-only package support where the
   * legacy emitter generates root index.ts even without clients, as
   * long as there are models with @usage annotations.
   */
  it("should produce root and models index files for model-only packages", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model Widget {
          name: string;
        }

        @get op getWidget(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    // Simulate model-only: keep models but remove clients
    const mockContext = {
      ...sdkContext,
      sdkPackage: {
        ...sdkContext.sdkPackage,
        clients: [],
      },
    } as typeof sdkContext;

    const template = (
      <MinimalIndexWrapper sdkContext={mockContext}>
        <IndexFiles />
      </MinimalIndexWrapper>
    );

    const result = renderToString(template);

    // Root index should export models
    expect(result).toContain('export { Widget } from "./models/index.js"');
    // Models index should exist
    expect(result).toContain('./models.js"');
    // No API or classic index files should be generated
    expect(result).not.toContain("Context");
    expect(result).not.toContain("operations.js");
  });

  /**
   * Tests that polymorphic union type aliases are included in the
   * exports. When a model has discriminated subtypes, a union alias
   * (e.g., PetUnion) is generated and should be publicly accessible.
   */
  it("should export polymorphic union type aliases", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model Pet {
          kind: string;
          name: string;
        }

        model Cat extends Pet {
          kind: "cat";
          purrs: boolean;
        }

        model Dog extends Pet {
          kind: "dog";
          barks: boolean;
        }

        @get op getPet(): Pet;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const template = (
      <IndexTestWrapper sdkContext={sdkContext}>
        <IndexFiles />
      </IndexTestWrapper>
    );

    const result = renderToString(template);

    expect(result).toContain("Pet");
    expect(result).toContain("PetUnion");
    expect(result).toContain("Cat");
    expect(result).toContain("Dog");
  });
});
