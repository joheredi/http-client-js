/**
 * Test suite for the PackageScaffold component and metadata file generation.
 *
 * Validates that:
 * - When generateMetadata is false (default), no metadata files are emitted
 * - When generateMetadata is true, package.json, tsconfig.json, README.md,
 *   LICENSE, and vitest configs are emitted alongside source files
 * - Azure flavor adds api-extractor.json and eslint.config.mjs
 * - Source file paths remain unchanged when wrapped in PackageDirectory
 * - Auto-detected dependencies appear in package.json
 */
import "@alloy-js/core/testing";
import { renderAsync, type OutputDirectory } from "@alloy-js/core";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { EmitterOptionsProvider } from "../../src/context/emitter-options-context.js";
import {
  EmitterTree,
  azureExternals,
  coreExternals,
} from "../../src/emitter.js";
import { createEmitterNamePolicy } from "../../src/utils/name-policy.js";
import { nameConflictResolver } from "../../src/utils/name-conflict-resolver.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";

/**
 * Flattens an Alloy OutputDirectory tree into a flat record of file paths to contents.
 */
function collectFiles(dir: OutputDirectory): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of dir.contents) {
    if ("contents" in entry) {
      if (Array.isArray(entry.contents)) {
        Object.assign(files, collectFiles(entry as OutputDirectory));
      } else {
        files[entry.path] = entry.contents as string;
      }
    }
  }
  return files;
}

/**
 * Helper to compile a simple service and render the emitter tree with options.
 */
async function emitWithOptions(options: {
  generateMetadata?: boolean;
  flavor?: "core" | "azure";
  packageName?: string;
  packageVersion?: string;
}): Promise<Record<string, string>> {
  const runner = await TesterWithService.createInstance();
  const { program } = await runner.compile(
    t.code`
      model Widget {
        name: string;
        age: int32;
      }

      @get op getWidget(): Widget;
    `,
  );

  const sdkContext = await createSdkContextForTest(program);
  const flavor = options.flavor ?? "core";
  const externals = flavor === "azure" ? azureExternals : coreExternals;

  const output = (
    <Output
      program={program}
      namePolicy={createEmitterNamePolicy()}
      nameConflictResolver={nameConflictResolver}
      externals={externals}
    >
      <FlavorProvider flavor={flavor}>
        <EmitterOptionsProvider
          options={{
            generateMetadata: options.generateMetadata ?? false,
            packageName: options.packageName,
            packageVersion: options.packageVersion,
          }}
        >
          <EmitterTree sdkContext={sdkContext} />
        </EmitterOptionsProvider>
      </FlavorProvider>
    </Output>
  );

  const tree = await renderAsync(output);
  return collectFiles(tree);
}

describe("PackageScaffold", () => {
  it("should not emit metadata files when generateMetadata is false", async () => {
    const files = await emitWithOptions({ generateMetadata: false });

    expect(files["package.json"]).toBeUndefined();
    expect(files["tsconfig.json"]).toBeUndefined();
    expect(files["README.md"]).toBeUndefined();
    expect(files["LICENSE"]).toBeUndefined();

    // Source files should still exist
    expect(files["src/models/models.ts"]).toBeDefined();
  });

  it("should emit metadata files when generateMetadata is true", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      packageName: "test-sdk",
      packageVersion: "2.0.0",
    });

    // Metadata files should exist
    expect(files["package.json"]).toBeDefined();
    expect(files["tsconfig.json"]).toBeDefined();
    expect(files["README.md"]).toBeDefined();
    expect(files["LICENSE"]).toBeDefined();
    expect(files["vitest.config.ts"]).toBeDefined();
    expect(files["vitest.browser.config.ts"]).toBeDefined();
    expect(files["vitest.esm.config.ts"]).toBeDefined();

    // Source files should still exist at the same paths
    expect(files["src/models/models.ts"]).toBeDefined();
  });

  it("should include correct package name and version in package.json", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      packageName: "@my-scope/test-sdk",
      packageVersion: "3.0.0-beta.1",
    });

    const pkgJson = JSON.parse(files["package.json"]);
    expect(pkgJson.name).toBe("@my-scope/test-sdk");
    expect(pkgJson.version).toBe("3.0.0-beta.1");
    expect(pkgJson.type).toBe("module");
  });

  it("should auto-detect runtime dependencies in package.json", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      packageName: "test-sdk",
    });

    const pkgJson = JSON.parse(files["package.json"]);
    // Core flavor should detect @typespec/ts-http-runtime as a dependency
    expect(pkgJson.dependencies).toBeDefined();
    expect(pkgJson.dependencies["@typespec/ts-http-runtime"]).toBeDefined();
  });

  it("should include MIT license in LICENSE file", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      packageName: "test-sdk",
    });

    expect(files["LICENSE"]).toContain("MIT License");
    expect(files["LICENSE"]).toContain("Microsoft Corporation");
  });

  it("should include package name in README", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      packageName: "test-sdk",
    });

    expect(files["README.md"]).toContain("# test-sdk");
    expect(files["README.md"]).toContain("npm install test-sdk");
  });

  it("should not emit Azure-specific files for core flavor", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      flavor: "core",
      packageName: "test-sdk",
    });

    expect(files["api-extractor.json"]).toBeUndefined();
    expect(files["eslint.config.mjs"]).toBeUndefined();
  });

  it("should emit Azure-specific files for azure flavor", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      flavor: "azure",
      packageName: "@azure/test-sdk",
    });

    expect(files["api-extractor.json"]).toBeDefined();
    expect(files["eslint.config.mjs"]).toBeDefined();

    const apiExtractor = JSON.parse(files["api-extractor.json"]);
    expect(apiExtractor.mainEntryPointFilePath).toBe("./dist/src/index.d.ts");
  });

  it("should preserve source file paths when metadata is enabled", async () => {
    const withMeta = await emitWithOptions({
      generateMetadata: true,
      packageName: "test-sdk",
    });
    const withoutMeta = await emitWithOptions({
      generateMetadata: false,
    });

    // All source files from the no-metadata run should exist at the same paths
    for (const path of Object.keys(withoutMeta)) {
      expect(withMeta[path]).toBeDefined();
    }
  });

  it("should not contain unresolved symbols in any output file", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      packageName: "test-sdk",
    });

    for (const [path, content] of Object.entries(files)) {
      expect(content).not.toContain("Unresolved Symbol");
    }
  });

  it("should use default version when packageVersion is not provided", async () => {
    const files = await emitWithOptions({
      generateMetadata: true,
      packageName: "test-sdk",
    });

    const pkgJson = JSON.parse(files["package.json"]);
    expect(pkgJson.version).toBe("1.0.0-beta.1");
  });
});
