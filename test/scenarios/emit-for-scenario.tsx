/**
 * Emitter output collection utility for scenario testing.
 *
 * Compiles TypeSpec input, runs the emitter pipeline (TCGC → Alloy JSX → render),
 * and collects the generated TypeScript files as a flat record. This bypasses
 * the TypeSpec compiler's module resolution (which requires the emitter to be
 * installed as a package) by calling the emitter components directly.
 *
 * @module
 */
import { For, SourceDirectory, renderAsync, type OutputDirectory } from "@alloy-js/core";
import { createTSNamePolicy, tsNameConflictResolver } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { OperationFiles } from "../../src/components/operation-files.js";
import { ClientContextFile } from "../../src/components/client-context.js";
import { ClassicalClientFile } from "../../src/components/classical-client.js";
import { ClassicalOperationGroupFiles } from "../../src/components/classical-operation-groups.js";
import { httpRuntimeLib, azureCoreLroLib } from "../../src/utils/external-packages.js";
import { IndexFiles } from "../../src/components/index-file.js";
import { StaticHelpers } from "../../src/components/static-helpers/index.js";
import { RestorePollerFile } from "../../src/components/restore-poller.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";

/**
 * Compiles TypeSpec code and runs the http-client-js emitter, returning generated files.
 *
 * This function mirrors the `$onEmit` entry point but collects output in memory
 * instead of writing to disk. It:
 * 1. Wraps the TypeSpec code in a `@service` namespace (via TesterWithService)
 * 2. Creates a TCGC SDK context for the compiled program
 * 3. Builds the same JSX component tree as the real emitter
 * 4. Renders via Alloy's `renderAsync()` to produce an output directory tree
 * 5. Flattens the tree into a `Record<string, string>` of file paths to contents
 *
 * @param code - Raw TypeSpec code (without `@service` wrapper — it's added automatically)
 * @returns A record mapping relative file paths (e.g. "src/models/models.ts") to file contents
 */
export async function emitForScenario(code: string): Promise<Record<string, string>> {
  const runner = await TesterWithService.createInstance();
  const { program } = await runner.compile(code);
  const sdkContext = await createSdkContextForTest(program);

  const output = (
    <Output
      program={program}
      namePolicy={createTSNamePolicy()}
      nameConflictResolver={tsNameConflictResolver}
      externals={[httpRuntimeLib, azureCoreLroLib]}
    >
      <SdkContextProvider sdkContext={sdkContext}>
        <SourceDirectory path="src">
          <ModelFiles />
          <OperationFiles />
          <For each={sdkContext.sdkPackage.clients}>
            {(client) => (
              <>
                <ClientContextFile client={client} />
                <ClassicalClientFile client={client} />
                <ClassicalOperationGroupFiles client={client} />
                <RestorePollerFile client={client} />
              </>
            )}
          </For>
          <IndexFiles />
          <StaticHelpers />
        </SourceDirectory>
      </SdkContextProvider>
    </Output>
  );

  const tree = await renderAsync(output);
  return collectFiles(tree);
}

/**
 * Flattens an Alloy OutputDirectory tree into a flat record of file paths to contents.
 *
 * Recursively walks the directory tree produced by `renderAsync()`. In Alloy's output
 * tree, each entry has a `path` property containing the FULL relative path from the
 * root — not a path relative to its parent directory. So we use each entry's `path`
 * directly without concatenating parent paths.
 *
 * @param dir - The root OutputDirectory from Alloy's render pipeline
 * @returns A record mapping relative file paths to their string contents
 */
function collectFiles(dir: OutputDirectory): Record<string, string> {
  const files: Record<string, string> = {};

  for (const entry of dir.contents) {
    if ("contents" in entry) {
      if (Array.isArray(entry.contents)) {
        // It's a directory — recurse (paths are already absolute from root)
        Object.assign(files, collectFiles(entry as OutputDirectory));
      } else {
        // It's a file — use its path directly
        files[entry.path] = entry.contents as string;
      }
    }
  }

  return files;
}
