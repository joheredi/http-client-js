import { For, SourceDirectory } from "@alloy-js/core";
import { createEmitterNamePolicy } from "./utils/name-policy.js";
import { nameConflictResolver } from "./utils/name-conflict-resolver.js";
import type { EmitContext } from "@typespec/compiler";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import { Output, writeOutput } from "@typespec/emitter-framework";
import { SdkContextProvider } from "./context/sdk-context.js";
import { FlavorProvider, useFlavorContext } from "./context/flavor-context.js";
import type { FlavorKind } from "./context/flavor-context.js";
import { EmitterOptionsProvider } from "./context/emitter-options-context.js";
import { ModelFiles } from "./components/model-files.js";
import { OperationFiles } from "./components/operation-files.js";
import { OperationOptionsFiles } from "./components/operation-options-files.js";
import { ClientContextFile } from "./components/client-context.js";
import { ClassicalClientFile } from "./components/classical-client.js";
import { ClassicalOperationGroupFiles } from "./components/classical-operation-groups.js";
import {
  httpRuntimeLib,
  azureCoreLroLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureLoggerLib,
} from "./utils/external-packages.js";
import { StaticHelpers } from "./components/static-helpers/index.js";
import { RestorePollerFile } from "./components/restore-poller.js";
import { SampleFiles } from "./components/sample-files.js";
import { LoggerFile } from "./components/logger-file.js";
import { PackageScaffold } from "./components/package-scaffold.js";

import type {
  SdkClientType,
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { BarrelFile } from "@alloy-js/typescript";

/**
 * All external packages needed for Azure-flavored SDK generation.
 *
 * Azure SDKs split runtime symbols across multiple packages, so all
 * must be registered as externals for Alloy's import resolution to work.
 */
export const azureExternals = [
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureCoreLroLib,
  azureLoggerLib,
];

/**
 * External packages for core (non-Azure) SDK generation.
 *
 * Core flavor uses only the runtime package. Azure-specific packages like
 * `@azure/core-lro` are excluded — LRO/paging support is gated behind Azure flavor.
 */
export const coreExternals = [httpRuntimeLib];

/**
 * Resolves the SDK flavor from emitter configuration options.
 *
 * Reads the `flavor` option from the TypeSpec emitter config (tspconfig.yaml)
 * and returns the corresponding FlavorKind. Only `"azure"` is recognized as
 * a non-default flavor; all other values (including undefined) resolve to `"core"`.
 *
 * This enables a single `$onEmit` entry point to generate either core or
 * Azure-flavored output based on configuration, matching the legacy emitter's
 * `flavor` option in its emitter options schema.
 *
 * @param options - The raw emitter options from `context.options`
 * @returns The resolved flavor kind ("core" or "azure")
 */
export function resolveEmitterFlavor(
  options: Record<string, unknown> | undefined,
): FlavorKind {
  const flavor = options?.["flavor"];
  if (flavor === "azure") {
    return "azure";
  }
  return "core";
}

/**
 * Extracts a short package name from the first client for logger creation.
 *
 * Used in Azure-flavored generation to create a namespaced logger via
 * `createClientLogger("name")` in the generated `src/logger.ts` file.
 *
 * @param sdkContext - Object with sdkPackage.clients array
 * @returns A lowercase package identifier string
 */
function getPackageName(sdkContext: {
  sdkPackage: { clients: Array<{ name?: string }> };
}): string {
  const firstClient = sdkContext.sdkPackage.clients[0];
  return firstClient?.name?.replace(/Client$/, "").toLowerCase() ?? "unknown";
}

/**
 * Applies client name overrides from the `typespec-title-map` configuration.
 *
 * This mutates client objects in-place before the rendering pipeline runs,
 * matching the legacy emitter behavior where `renameClientName()` was called
 * per-client before building operations. All downstream components (classical
 * client, client context, samples) then use the renamed `client.name` value
 * automatically.
 *
 * @param clients - TCGC client objects to potentially rename
 * @param titleMap - Map from original TCGC client names to desired names
 */
export function applyClientRenames(
  clients: SdkClientType<SdkHttpOperation>[],
  titleMap: Record<string, string>,
): void {
  for (const client of clients) {
    if (titleMap[client.name]) {
      client.name = titleMap[client.name];
    }
  }
}

/**
 * Props for the {@link EmitterTree} component.
 */
export interface EmitterTreeProps {
  /** The TCGC SDK context containing compiled service type information. */
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
}

/**
 * Composable component that renders the complete emitter file tree.
 *
 * Encapsulates the full output structure — models, operations, clients,
 * index files, static helpers, and samples — into a single reusable
 * component. Reads the active flavor from `FlavorProvider` context to
 * conditionally include Azure-specific files (logger, restore poller).
 *
 * Callers must provide the following context providers as ancestors:
 * - `FlavorProvider` — determines core vs Azure output
 * - `EmitterOptionsProvider` — emitter configuration flags
 *
 * The component owns the `SdkContextProvider` internally, so callers
 * do NOT need to set up SDK context separately.
 *
 * @param props - Component props with the SDK context.
 * @returns The complete file tree as a JSX subtree.
 */
export function EmitterTree(props: EmitterTreeProps) {
  const { flavor } = useFlavorContext();
  const { sdkContext } = props;

  return (
    <SdkContextProvider sdkContext={sdkContext}>
      <PackageScaffold>
        <SourceDirectory path="src">
          {flavor === "azure" && (
            <LoggerFile packageName={getPackageName(sdkContext)} />
          )}
          <BarrelFile />
          <ModelFiles />
          <OperationFiles />
          <OperationOptionsFiles />
          <For each={sdkContext.sdkPackage.clients}>
            {(client) => (
              <>
                <ClientContextFile client={client} />
                <ClassicalClientFile client={client} />
                <ClassicalOperationGroupFiles client={client} />
                {flavor === "azure" && <RestorePollerFile client={client} />}
              </>
            )}
          </For>
          <StaticHelpers />
        </SourceDirectory>
        <SampleFiles />
      </PackageScaffold>
    </SdkContextProvider>
  );
}

/**
 * TypeSpec emitter entry point for generating TypeScript HTTP client libraries.
 *
 * This is the top-level hook invoked by the TypeSpec compiler during the emit
 * phase. It orchestrates the full code generation pipeline:
 *
 * 1. Initializes the TCGC SDK context from the compiled TypeSpec program
 * 2. Resolves the SDK flavor from the `flavor` emitter option (defaults to "core")
 * 3. Builds a declarative JSX component tree representing the output file structure
 * 4. Renders the tree to an in-memory directory via Alloy's rendering engine
 * 5. Writes the rendered files to disk at the emitter output directory
 *
 * The `flavor` option controls which runtime packages are used in generated imports:
 * - `"core"` (default) — Uses `@typespec/ts-http-runtime` for all runtime symbols
 * - `"azure"` — Uses Azure SDK packages (`@azure-rest/core-client`, `@azure/core-auth`, etc.)
 *   and adds an Azure logger file (`src/logger.ts`)
 *
 * This can be configured in tspconfig.yaml:
 * ```yaml
 * options:
 *   "@microsoft/http-client-js":
 *     flavor: "azure"
 * ```
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
 *   logger.ts                — (Azure flavor only) Namespaced logger via @azure/logger
 * ```
 *
 * @param context - The TypeSpec emit context containing the compiled program,
 *                  emitter options, and output directory path.
 */
export async function $onEmit(context: EmitContext) {
  const sdkContext = await createSdkContext(context);

  // Apply typespec-title-map renames to client names before rendering.
  // This matches the legacy emitter's renameClientName() behavior where
  // client.name is mutated in-place before the rendering pipeline runs.
  const titleMap = context.options?.["typespec-title-map"] as
    | Record<string, string>
    | undefined;
  if (titleMap) {
    applyClientRenames(sdkContext.sdkPackage.clients, titleMap);
  }

  // Resolve flavor from emitter config. This allows a single entry point
  // to generate either core or Azure-flavored output based on tspconfig.yaml.
  const flavor = resolveEmitterFlavor(context.options);
  const externals = flavor === "azure" ? azureExternals : coreExternals;

  const emitterOptions = {
    includeHeadersInResponse:
      context.options?.["include-headers-in-response"] === true,
    experimentalExtensibleEnums:
      context.options?.["experimental-extensible-enums"] === true,
    ignoreNullableOnOptional:
      context.options?.["ignore-nullable-on-optional"] ?? flavor === "azure",
    typespecTitleMap: titleMap,
    generateMetadata: context.options?.["generate-metadata"] === true,
    packageName: context.options?.["package-name"] as string | undefined,
    packageVersion: context.options?.["package-version"] as string | undefined,
  };

  const output = (
    <Output
      program={context.program}
      namePolicy={createEmitterNamePolicy()}
      nameConflictResolver={nameConflictResolver}
      externals={externals}
    >
      <FlavorProvider flavor={flavor}>
        <EmitterOptionsProvider options={emitterOptions}>
          <EmitterTree sdkContext={sdkContext} />
        </EmitterOptionsProvider>
      </FlavorProvider>
    </Output>
  );

  await writeOutput(context.program, output, context.emitterOutputDir);
}
