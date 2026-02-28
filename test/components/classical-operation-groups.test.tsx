/**
 * Test suite for the Classical Operation Groups components.
 *
 * Classical operation groups provide an object-oriented API surface for
 * services with grouped (namespaced) operations. They generate:
 * - `XxxOperations` interfaces defining method signatures and nested group refs
 * - `_getXxxOperations` factory functions that bind methods to the client context
 * - Classical client properties and constructor initialization for each group
 *
 * What is tested:
 * - Operation group interface with method signatures for leaf operations.
 * - Factory function creating an object that delegates to public API functions.
 * - Nested operation groups: parent interface referencing child interface.
 * - Nested factory composing child factory calls.
 * - Classical client class with readonly group properties initialized in constructor.
 * - File orchestrator producing correct `classic/{group}/index.ts` paths.
 * - Operations with required parameters included in interface method signatures.
 * - Multiple operation groups at the same level rendered correctly.
 *
 * Why this matters:
 * Many real-world services organize operations into groups (e.g., Widgets,
 * Users, Profiles). Without operation group support, the classical client
 * only exposes root-level operations, making the generated SDK incomplete
 * for any service with namespaced operations.
 */
import "@alloy-js/core/testing";
import { Children, code } from "@alloy-js/core";
import { renderToString } from "@alloy-js/core/testing";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import type {
  SdkClientType,
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ClassicalOperationGroupFiles,
  OperationGroupInterface,
  OperationGroupFactory,
} from "../../src/components/classical-operation-groups.js";
import { ClassicalClientDeclaration } from "../../src/components/classical-client.js";
import {
  ClientContextDeclaration,
  ClientContextFactory,
  ClientContextOptionsDeclaration,
} from "../../src/components/client-context.js";
import { OperationOptionsDeclaration } from "../../src/components/operation-options.js";
import { PublicOperation } from "../../src/components/public-operation.js";
import { SendOperation } from "../../src/components/send-operation.js";
import { DeserializeOperation } from "../../src/components/deserialize-operation.js";
import {
  operationGroupInterfaceRefkey,
  operationGroupFactoryRefkey,
} from "../../src/utils/refkeys.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkContextProvider } from "../../src/context/sdk-context.js";

/**
 * Helper to extract the first client from an SDK context.
 */
function getFirstClient(sdkContext: { sdkPackage: { clients: Array<any> } }) {
  return sdkContext.sdkPackage.clients[0];
}

/**
 * Helper to get the first child client (operation group) of the root client.
 */
function getFirstChildClient(sdkContext: {
  sdkPackage: { clients: Array<any> };
}): SdkClientType<SdkHttpOperation> {
  const root = getFirstClient(sdkContext);
  return root.children![0];
}

/**
 * Builds an OperationGroupInfo for testing individual components.
 */
function buildGroupInfo(
  client: SdkClientType<SdkHttpOperation>,
  rootClient: SdkClientType<SdkHttpOperation>,
  prefixes?: string[],
) {
  return {
    client,
    prefixes: prefixes ?? [
      client.name.charAt(0).toLowerCase() + client.name.slice(1),
    ],
    rootClient,
  };
}

/**
 * Test wrapper that provides Output + SdkContext + required declarations
 * so that refkeys resolve correctly in tests. Renders context components,
 * operations for ALL clients in the hierarchy, and allows children to
 * render freely.
 */
function OperationGroupTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  const root = props.sdkContext.sdkPackage.clients[0];
  const allMethods = collectAllMethods(root);

  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        {/* Render context file so refkeys resolve */}
        <SourceFile path="api/testingContext.ts">
          <ClientContextDeclaration client={root} />
          <ClientContextOptionsDeclaration client={root} />
          <ClientContextFactory client={root} />
        </SourceFile>
        {/* Render operations so public function + options refkeys resolve */}
        {allMethods.length > 0 && (
          <SourceFile path="api/operations.ts">
            {allMethods.map((method: any, i: number) => (
              <>
                {i > 0 && "\n\n"}
                <OperationOptionsDeclaration method={method} />
                {"\n\n"}
                <SendOperation method={method} />
                {"\n\n"}
                <DeserializeOperation method={method} />
                {"\n\n"}
                <PublicOperation method={method} />
              </>
            ))}
          </SourceFile>
        )}
        {props.children}
      </SdkContextProvider>
    </Output>
  );
}

/**
 * Collects all methods from a client and all its children recursively.
 */
function collectAllMethods(client: SdkClientType<SdkHttpOperation>): any[] {
  const methods: any[] = [...client.methods];
  if (client.children) {
    for (const child of client.children) {
      methods.push(...collectAllMethods(child));
    }
  }
  return methods;
}

/**
 * TypeSpec definition for a service with one operation group (Widgets).
 * The root has no operations, Widgets has getWidget and listWidgets.
 */
const singleGroupSpec = t.code`
  @route("/widgets")
  namespace Widgets {
    @get op getWidget(@path id: string): string;
    @get @route("/list") op listWidgets(): string;
  }
`;

/**
 * TypeSpec definition for a service with nested operation groups.
 * Root → Widgets → Parts (nested).
 */
const nestedGroupSpec = t.code`
  @route("/widgets")
  namespace Widgets {
    @get op getWidget(@path id: string): string;
    
    @route("/{widgetId}/parts")
    namespace Parts {
      @get op getPart(@path widgetId: string, @path partId: string): string;
    }
  }
`;

/**
 * TypeSpec definition with multiple operation groups at the same level.
 */
const multiGroupSpec = t.code`
  @route("/widgets")
  namespace Widgets {
    @get op getWidget(): string;
  }
  @route("/gadgets")
  namespace Gadgets {
    @get op getGadget(): string;
  }
`;

describe("ClassicalOperationGroups", () => {
  describe("single group (Widgets)", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let root: SdkClientType<SdkHttpOperation>;
    let child: SdkClientType<SdkHttpOperation>;
    let group: ReturnType<typeof buildGroupInfo>;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(singleGroupSpec);
      sdkContext = await createSdkContextForTest(program);
      root = getFirstClient(sdkContext);
      child = getFirstChildClient(sdkContext);
      group = buildGroupInfo(child, root);
    });

    /**
     * Tests that the OperationGroupInterface renders method signatures
     * for all operations in a child client. Each method should have the
     * form: `name: (params..., options?) => Promise<ReturnType>`.
     *
     * This is critical because the interface defines the contract for
     * operation group objects returned by the factory function.
     */
    it("should render interface with method signatures", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupInterface group={group} />
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // Interface should be named WidgetsOperations and exported
      expect(result).toContain("export interface WidgetsOperations");
      // Should have method signatures
      expect(result).toContain("getWidget:");
      expect(result).toContain("listWidgets:");
      // Method params should include required params
      expect(result).toContain("id: string");
      // Should have Promise return type
      expect(result).toContain("Promise<string>");
    });

    /**
     * Tests that interface method signatures do not contain [object Object].
     *
     * This regression test catches the bug where buildMethodParamList() used
     * .join(", ") on Alloy Children objects, which calls .toString() and
     * produces [object Object] instead of rendered parameter text.
     *
     * The test specifically validates the interface file output to ensure
     * parameter lists render correctly (e.g., `(id: string, options?: ...)`)
     * rather than `([object Object], [object Object])`.
     */
    it("should not contain [object Object] in interface method signatures", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupInterface group={group} />
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // Must never contain [object Object] — indicates broken Children composition
      expect(result).not.toContain("[object Object]");
      // getWidget has a required `id` param — verify it appears in the method signature
      // by checking the full pattern: `id: string, options?`
      expect(result).toMatch(/getWidget:.*id: string.*options\?/);
    });

    /**
     * Tests that the OperationGroupFactory renders a function that returns
     * an object with method delegates. Each method should delegate to the
     * corresponding public API function with `context` bound.
     *
     * This is critical because the factory creates the operation group
     * object that users interact with via the classical client.
     */
    it("should render factory function with method delegates", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupFactory group={group} />
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // Factory function should be named _getWidgetsOperations
      expect(result).toContain("_getWidgetsOperations");
      // Should take context as parameter
      expect(result).toContain("context:");
      // Should return the interface type
      expect(result).toContain("WidgetsOperations");
      // Should delegate to public API functions
      expect(result).toContain("getWidget:");
      expect(result).toContain("listWidgets:");
      // Should pass context to delegates
      expect(result).toContain("context,");
    });

    /**
     * Tests that the classical client class includes readonly properties
     * for each operation group, initialized in the constructor via factory
     * function calls.
     *
     * This is the primary user-facing integration: `client.widgets.getWidget()`.
     */
    it("should add operation group properties to classical client", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          {/* Render operation group declarations so refkeys resolve */}
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupInterface group={buildGroupInfo(child, root)} />
            <OperationGroupFactory group={buildGroupInfo(child, root)} />
          </SourceFile>
          <SourceFile path="testingClient.ts">
            <ClassicalClientDeclaration client={root} />
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // Client class should have readonly widgets property
      expect(result).toContain("public readonly widgets");
      expect(result).toContain("WidgetsOperations");
      // Constructor should initialize via factory
      expect(result).toContain(
        "this.widgets = _getWidgetsOperations(this._client)",
      );
    });

    /**
     * Tests the ClassicalOperationGroupFiles orchestrator generates correct
     * file paths for each operation group. A single group `Widgets` should
     * produce `classic/widgets/index.ts`.
     *
     * This verifies the file structure matches the legacy emitter convention.
     */
    it("should generate files under classic/ directory", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          <ClassicalOperationGroupFiles client={root} />
        </OperationGroupTestWrapper>
      );

      // The output should contain a file at classic/widgets/index.ts
      expect(template).toRenderTo({
        "classic/widgets/index.ts":
          expect.stringContaining("WidgetsOperations"),
        "api/testingContext.ts": expect.stringContaining("Testing"),
        "api/operations.ts": expect.stringContaining("getWidget"),
      });
    });

    /**
     * Tests that operations with required parameters (e.g., path params)
     * include those parameters in the interface method signatures.
     *
     * This ensures users can call grouped operations with the correct
     * argument signatures.
     */
    it("should include required parameters in method signatures", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupInterface group={group} />
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // getWidget should have id parameter
      expect(result).toContain("id: string");
      // listWidgets should only have options (no required params)
      expect(result).toContain("listWidgets:");
    });

    /**
     * Tests that the operation group interface is referenceable via
     * operationGroupInterfaceRefkey. This enables the classical client
     * and other components to reference the interface across files.
     */
    it("should be referenceable via operationGroupInterfaceRefkey", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupInterface group={group} />
          </SourceFile>
          <SourceFile path="ref.ts">
            {code`const ref: ${operationGroupInterfaceRefkey(child)} = {} as any;`}
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // The refkey reference should resolve to the interface name
      expect(result).toContain("WidgetsOperations");
    });

    /**
     * Tests that the factory function is referenceable via
     * operationGroupFactoryRefkey. This enables the classical client
     * constructor to call the factory function across files.
     */
    it("should be referenceable via operationGroupFactoryRefkey", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupFactory group={group} />
            <OperationGroupInterface group={group} />
          </SourceFile>
          <SourceFile path="ref.ts">
            {code`const ref = ${operationGroupFactoryRefkey(child)}({} as any);`}
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // The refkey reference should resolve to the factory function name
      expect(result).toContain("_getWidgetsOperations");
    });
  });

  describe("nested groups (Widgets → Parts)", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let root: SdkClientType<SdkHttpOperation>;
    let widgetsChild: SdkClientType<SdkHttpOperation>;
    let group: ReturnType<typeof buildGroupInfo>;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(nestedGroupSpec);
      sdkContext = await createSdkContextForTest(program);
      root = getFirstClient(sdkContext);
      widgetsChild = getFirstChildClient(sdkContext);
      group = buildGroupInfo(widgetsChild, root);
    });

    /**
     * Tests that nested operation groups produce interface members referencing
     * child interfaces. For example, WidgetsOperations should have a `parts`
     * property of type PartsOperations.
     *
     * This is critical for hierarchical services where users access nested
     * groups via `client.widgets.parts.getPart(...)`.
     */
    it("should render nested group reference in interface", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          {/* Render child group declarations so refkeys resolve */}
          {widgetsChild.children?.map((grandchild) => {
            const childGroup = buildGroupInfo(grandchild, root, [
              "widgets",
              "parts",
            ]);
            return (
              <SourceFile path="classic/widgets/parts/index.ts">
                <OperationGroupInterface group={childGroup} />
                <OperationGroupFactory group={childGroup} />
              </SourceFile>
            );
          })}
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupInterface group={group} />
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // WidgetsOperations should reference PartsOperations
      expect(result).toContain("WidgetsOperations");
      expect(result).toContain("parts:");
      expect(result).toContain("PartsOperations");
    });

    /**
     * Tests that nested factories compose child factory calls. The parent
     * factory should call `_getPartsOperations(context)` for nested groups.
     *
     * This ensures the factory function correctly wires nested groups
     * when constructing the operation group object.
     */
    it("should compose child factory in nested factory", async () => {
      const template = (
        <OperationGroupTestWrapper sdkContext={sdkContext}>
          {/* Render child group declarations so refkeys resolve */}
          {widgetsChild.children?.map((grandchild) => {
            const childGroup = buildGroupInfo(grandchild, root, [
              "widgets",
              "parts",
            ]);
            return (
              <SourceFile path="classic/widgets/parts/index.ts">
                <OperationGroupInterface group={childGroup} />
                <OperationGroupFactory group={childGroup} />
              </SourceFile>
            );
          })}
          <SourceFile path="classic/widgets/index.ts">
            <OperationGroupFactory group={group} />
          </SourceFile>
        </OperationGroupTestWrapper>
      );

      const result = renderToString(template);

      // Should compose child factory
      expect(result).toContain("_getPartsOperations(context)");
    });
  });

  /**
   * Tests that multiple operation groups at the same level each get their
   * own file and declarations. Services with parallel groups (e.g.,
   * Widgets and Gadgets) should produce separate files.
   *
   * This is important for services with multiple top-level namespaces.
   */
  it("should render multiple operation groups at same level", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(multiGroupSpec);

    const sdkContext = await createSdkContextForTest(program);
    const root = getFirstClient(sdkContext);

    const template = (
      <OperationGroupTestWrapper sdkContext={sdkContext}>
        <ClassicalOperationGroupFiles client={root} />
      </OperationGroupTestWrapper>
    );

    // Both groups should get their own files
    expect(template).toRenderTo({
      "classic/widgets/index.ts": expect.stringContaining("WidgetsOperations"),
      "classic/gadgets/index.ts": expect.stringContaining("GadgetsOperations"),
      "api/testingContext.ts": expect.stringContaining("Testing"),
      "api/operations.ts": expect.stringContaining("getWidget"),
    });
  });

  /**
   * Tests that the orchestrator returns undefined when the client has
   * no child clients (operation groups). This prevents rendering an
   * empty classic/ directory.
   */
  it("should return undefined when client has no operation groups", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      @get op getItem(): string;
    `);

    const sdkContext = await createSdkContextForTest(program);
    const root = getFirstClient(sdkContext);

    const template = (
      <OperationGroupTestWrapper sdkContext={sdkContext}>
        <ClassicalOperationGroupFiles client={root} />
      </OperationGroupTestWrapper>
    );

    // Should not produce classic/ files
    const result = renderToString(template);
    expect(result).not.toContain("classic/");
  });
});
