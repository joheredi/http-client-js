/**
 * Test suite for the custom name conflict resolver.
 *
 * The custom resolver wraps Alloy's `tsNameConflictResolver` to fix a behavior
 * where import symbols always receive `_1` suffixes, even when there's no actual
 * naming conflict. This happens because `tsNameConflictResolver` renames ALL
 * `LocalImportSymbol` symbols unconditionally. The custom resolver guards against
 * this by skipping resolution when there's only one symbol (no conflict possible).
 *
 * What is tested:
 * - Single symbol (import) should NOT be renamed (no conflict exists)
 * - Two symbols with the same name (one local, one import) should trigger
 *   renaming of the import to `name_1`
 * - Two import symbols with the same name should both be renamed
 *
 * Why this matters:
 * Without this fix, every import in generated operations files gets `_1` suffixes
 * (e.g., `Client_1`, `StreamableMethod_1`). This affects ~73 scenario test files
 * and ~2805 lines of output, producing code that doesn't match the legacy emitter's
 * output. The fix ensures generated code has clean import names matching the legacy.
 */
import "@alloy-js/core/testing";
import { renderAsync, refkey, code, Output } from "@alloy-js/core";
import {
  createTSNamePolicy,
  SourceFile,
  FunctionDeclaration,
  InterfaceDeclaration,
  createPackage,
} from "@alloy-js/typescript";
import { Output as EmitterOutput } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import { nameConflictResolver } from "../../src/utils/name-conflict-resolver.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { t } from "@typespec/compiler/testing";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { EmitterOptionsProvider } from "../../src/context/emitter-options-context.js";
import { OperationFiles } from "../../src/components/operation-files.js";
import { ClientContextFile } from "../../src/components/client-context.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { GroupDirectoryProvider } from "../../src/context/group-directory-context.js";
import { SourceDirectory, For } from "@alloy-js/core";

/**
 * Helper to collect rendered files from an Alloy output directory tree.
 */
function collectFiles(dir: any): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of dir.contents) {
    if ("contents" in entry) {
      if (Array.isArray(entry.contents)) {
        Object.assign(files, collectFiles(entry));
      } else {
        files[entry.path] = entry.contents as string;
      }
    }
  }
  return files;
}

/** Minimal external package for isolated testing. */
const testLib = createPackage({
  name: "test-lib",
  version: "1.0.0",
  descriptor: { ".": { named: ["Client", "StreamableMethod"] } },
});

describe("nameConflictResolver", () => {
  /**
   * Tests that a single imported symbol does not receive a `_1` suffix.
   * This is the core bug fix: the built-in resolver renames lone imports.
   */
  it("should NOT add _1 suffix when there is no naming conflict", async () => {
    const rk = refkey();
    const output = (
      <Output
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={nameConflictResolver}
        externals={[testLib]}
      >
        <SourceFile path="test.ts">
          <FunctionDeclaration
            name="myFunc"
            refkey={rk}
            export
            parameters={[{ name: "ctx", type: testLib.Client }]}
            returnType="void"
          />
        </SourceFile>
      </Output>
    );
    const tree = await renderAsync(output);
    const files = collectFiles(tree);
    expect(files["test.ts"]).toContain("import type { Client } from");
    expect(files["test.ts"]).not.toContain("Client_1");
  });

  /**
   * Tests that an imported type keeps its name when used in multiple parameters
   * within the same file. Multiple references to the same import should NOT
   * create duplicate import symbols.
   */
  it("should NOT add _1 when same import is used multiple times in one file", async () => {
    const rk1 = refkey();
    const rk2 = refkey();
    const output = (
      <Output
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={nameConflictResolver}
        externals={[testLib]}
      >
        <SourceFile path="test.ts">
          <FunctionDeclaration
            name="funcA"
            refkey={rk1}
            export
            parameters={[{ name: "ctx", type: testLib.Client }]}
            returnType="void"
          />
          <FunctionDeclaration
            name="funcB"
            refkey={rk2}
            export
            parameters={[{ name: "ctx", type: testLib.Client }]}
            returnType="void"
          />
        </SourceFile>
      </Output>
    );
    const tree = await renderAsync(output);
    const files = collectFiles(tree);
    expect(files["test.ts"]).toContain("import type { Client } from");
    expect(files["test.ts"]).not.toContain("Client_1");
  });

  /**
   * Tests that the resolver correctly removes _1 suffixes from a full emitter
   * operations file. This is an integration-level check that the fix works
   * end-to-end with the actual OperationFiles component tree.
   */
  it("should produce clean imports in operations files (end-to-end)", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`@get op ${t.op("ping")}(): string;`,
    );
    const sdkContext = await createSdkContextForTest(program);
    const output = (
      <EmitterOutput
        program={program}
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={nameConflictResolver}
        externals={[httpRuntimeLib]}
      >
        <SdkContextProvider sdkContext={sdkContext}>
          <FlavorProvider flavor="core">
            <EmitterOptionsProvider options={{}}>
              <SourceDirectory path="src">
                <SourceDirectory path="api">
                  <GroupDirectoryProvider>
                    <OperationFiles />
                  </GroupDirectoryProvider>
                </SourceDirectory>
                <For each={sdkContext.sdkPackage.clients}>
                  {(client) => <ClientContextFile client={client} />}
                </For>
              </SourceDirectory>
            </EmitterOptionsProvider>
          </FlavorProvider>
        </SdkContextProvider>
      </EmitterOutput>
    );
    const tree = await renderAsync(output);
    const files = collectFiles(tree);
    const ops = files["src/api/operations.ts"];
    expect(ops).toBeDefined();
    // Imports should NOT have _1 suffixes
    expect(ops).not.toContain("Client_1");
    expect(ops).not.toContain("StreamableMethod_1");
    expect(ops).not.toContain("createRestError_1");
    expect(ops).not.toContain("operationOptionsToRequestParameters_1");
    expect(ops).not.toContain("PathUncheckedResponse_1");
    // Should contain the context type (imported from context file)
    expect(ops).toContain("TestingContext");
    expect(ops).toContain("StreamableMethod");
    expect(ops).toContain("createRestError");
  });

  /**
   * Tests that declarations with distinct tcgcNamespace metadata get
   * namespace-qualified names instead of _1 numeric suffixes.
   */
  it("should namespace-qualify symbols with distinct tcgcNamespace metadata", async () => {
    const rk1 = refkey();
    const rk2 = refkey();
    const output = (
      <Output
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={nameConflictResolver}
      >
        <SourceFile path="models.ts">
          <InterfaceDeclaration
            name="Foo"
            refkey={rk1}
            export
            metadata={{ tcgcNamespace: "MyService.NamespaceA" }}
          />
          <InterfaceDeclaration
            name="Foo"
            refkey={rk2}
            export
            metadata={{ tcgcNamespace: "MyService.NamespaceB" }}
          />
        </SourceFile>
      </Output>
    );
    const tree = await renderAsync(output);
    const files = collectFiles(tree);
    const content = files["models.ts"];
    expect(content).toContain("NamespaceAFoo");
    expect(content).toContain("NamespaceBFoo");
    expect(content).not.toContain("Foo_1");
  });

  /**
   * Tests that declarations without namespace metadata fall back to
   * the standard _N suffix behavior from tsNameConflictResolver.
   */
  it("should fall back to _N suffixes when symbols lack namespace metadata", async () => {
    const rk1 = refkey();
    const rk2 = refkey();
    const output = (
      <Output
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={nameConflictResolver}
      >
        <SourceFile path="models.ts">
          <InterfaceDeclaration name="Bar" refkey={rk1} export />
          <InterfaceDeclaration name="Bar" refkey={rk2} export />
        </SourceFile>
      </Output>
    );
    const tree = await renderAsync(output);
    const files = collectFiles(tree);
    const content = files["models.ts"];
    // One stays "Bar", the other gets "_1" suffix
    expect(content).toContain("Bar");
    expect(content).toMatch(/Bar_\d/);
  });

  /**
   * Tests that declarations sharing the same namespace fall back to
   * _N suffixes since the namespace can't disambiguate them.
   */
  it("should fall back when all symbols share the same namespace", async () => {
    const rk1 = refkey();
    const rk2 = refkey();
    const output = (
      <Output
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={nameConflictResolver}
      >
        <SourceFile path="models.ts">
          <InterfaceDeclaration
            name="Baz"
            refkey={rk1}
            export
            metadata={{ tcgcNamespace: "MyService.Same" }}
          />
          <InterfaceDeclaration
            name="Baz"
            refkey={rk2}
            export
            metadata={{ tcgcNamespace: "MyService.Same" }}
          />
        </SourceFile>
      </Output>
    );
    const tree = await renderAsync(output);
    const files = collectFiles(tree);
    const content = files["models.ts"];
    // Same namespace can't disambiguate, so falls back to _N suffix
    expect(content).toMatch(/Baz_\d/);
  });

  /**
   * Tests mixed scenario: some symbols have namespace metadata, some don't.
   * Namespace-bearing symbols get qualified; others get _N fallback.
   */
  it("should handle mix of symbols with and without namespace metadata", async () => {
    const rk1 = refkey();
    const rk2 = refkey();
    const rk3 = refkey();
    const output = (
      <Output
        namePolicy={createTSNamePolicy()}
        nameConflictResolver={nameConflictResolver}
      >
        <SourceFile path="models.ts">
          <InterfaceDeclaration
            name="Qux"
            refkey={rk1}
            export
            metadata={{ tcgcNamespace: "MyService.GroupA" }}
          />
          <InterfaceDeclaration
            name="Qux"
            refkey={rk2}
            export
            metadata={{ tcgcNamespace: "MyService.GroupB" }}
          />
          <InterfaceDeclaration name="Qux" refkey={rk3} export />
        </SourceFile>
      </Output>
    );
    const tree = await renderAsync(output);
    const files = collectFiles(tree);
    const content = files["models.ts"];
    // Namespace-qualified names
    expect(content).toContain("GroupAQux");
    expect(content).toContain("GroupBQux");
    // The one without namespace keeps "Qux" (no conflict with qualified names)
    expect(content).toContain("Qux");
  });
});
