import { For, SourceDirectory } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { nameConflictResolver } from "./utils/name-conflict-resolver.js";
import type { EmitContext } from "@typespec/compiler";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import { Output, writeOutput } from "@typespec/emitter-framework";
import { SdkContextProvider } from "./context/sdk-context.js";
import { FlavorProvider } from "./context/flavor-context.js";
import { EmitterOptionsProvider } from "./context/emitter-options-context.js";
import { ModelFiles } from "./components/model-files.js";
import { OperationFiles } from "./components/operation-files.js";
import { OperationOptionsFiles } from "./components/operation-options-files.js";
import { ClientContextFile } from "./components/client-context.js";
import { ClassicalClientFile } from "./components/classical-client.js";
import { ClassicalOperationGroupFiles } from "./components/classical-operation-groups.js";
import { httpRuntimeLib, azureCoreLroLib } from "./utils/external-packages.js";
import { IndexFiles } from "./components/index-file.js";
import { StaticHelpers } from "./components/static-helpers/index.js";
import { RestorePollerFile } from "./components/restore-poller.js";
import { SampleFiles } from "./components/sample-files.js";

/**
 * TypeSpec emitter entry point for generating TypeScript HTTP client libraries.
 *
 * This is the top-level hook invoked by the TypeSpec compiler during the emit
 * phase. It orchestrates the full code generation pipeline:
 *
 * 1. Initializes the TCGC SDK context from the compiled TypeSpec program
 * 2. Builds a declarative JSX component tree representing the output file structure
 * 3. Renders the tree to an in-memory directory via Alloy's rendering engine
 * 4. Writes the rendered files to disk at the emitter output directory
 *
 * The generated output follows this directory structure:
 * ```
 * src/
 *   models/
 *     models.ts              — Type interfaces, enums, unions, serializers
 *   api/
 *     {client}Context.ts     — Client context interface + factory function
 *     operations.ts          — Operation functions (send, deserialize, public)
 *     {group}/operations.ts  — Grouped operation functions
 *   {client}Client.ts        — Classical class-based client wrapper
 * ```
 *
 * @param context - The TypeSpec emit context containing the compiled program,
 *                  emitter options, and output directory path.
 */
export async function $onEmit(context: EmitContext) {
  const sdkContext = await createSdkContext(context);

  const emitterOptions = {
    includeHeadersInResponse: context.options?.["include-headers-in-response"] === true,
    experimentalExtensibleEnums: context.options?.["experimental-extensible-enums"] === true,
    ignoreNullableOnOptional: context.options?.["ignore-nullable-on-optional"] !== false,
  };

  const output = (
    <Output
      program={context.program}
      namePolicy={createTSNamePolicy()}
      nameConflictResolver={nameConflictResolver}
      externals={[httpRuntimeLib, azureCoreLroLib]}
    >
      <FlavorProvider flavor="core">
        <EmitterOptionsProvider options={emitterOptions}>
          <SdkContextProvider sdkContext={sdkContext}>
            <SourceDirectory path="src">
              <ModelFiles />
              <OperationFiles />
              <OperationOptionsFiles />
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
            <SampleFiles />
          </SdkContextProvider>
        </EmitterOptionsProvider>
      </FlavorProvider>
    </Output>
  );

  await writeOutput(context.program, output, context.emitterOutputDir);
}
