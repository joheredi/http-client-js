import { Children, For, SourceDirectory } from "@alloy-js/core";
import type { EmitContext } from "@typespec/compiler";
import type { SdkContext, SdkHttpOperation } from "@azure-tools/typespec-client-generator-core";
import { SdkContextProvider } from "./context/sdk-context.js";
import { FlavorProvider } from "./context/flavor-context.js";
import { ModelFiles } from "./components/model-files.js";
import { OperationFiles } from "./components/operation-files.js";
import { OperationOptionsFiles } from "./components/operation-options-files.js";
import { ClientContextFile } from "./components/client-context.js";
import { ClassicalClientFile } from "./components/classical-client.js";
import { ClassicalOperationGroupFiles } from "./components/classical-operation-groups.js";
import { IndexFiles } from "./components/index-file.js";
import { StaticHelpers } from "./components/static-helpers/index.js";
import { RestorePollerFile } from "./components/restore-poller.js";
import { SampleFiles } from "./components/sample-files.js";
import { LoggerFile } from "./components/logger-file.js";
import { $onEmit } from "./emitter.js";

/**
 * Props for the {@link AzureCoreEmitter} component.
 */
export interface AzureCoreEmitterProps {
  /** The TCGC SDK context containing compiled service type information. */
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  /** Child components to render (for extensibility). */
  children?: Children;
}

/**
 * Azure-flavored emitter component that composes the core emitter
 * tree with Azure-specific additions.
 *
 * This component demonstrates the composition pattern: rather than
 * modifying core components with if/else Azure checks, the Azure
 * emitter wraps the same component tree with:
 *
 * 1. **`FlavorProvider flavor="azure"`** — Makes all core components
 *    use Azure package references (e.g., `@azure-rest/core-client`
 *    instead of `@typespec/ts-http-runtime`) via the `useRuntimeLib()` hook.
 *
 * 2. **`<LoggerFile />`** — Adds the `src/logger.ts` file that creates
 *    a namespaced logger via `@azure/logger`.
 *
 * The core components (`ModelFiles`, `OperationFiles`, `ClientContextFile`,
 * etc.) are reused unchanged — they're flavor-agnostic because they
 * use `useRuntimeLib()` to resolve package references.
 *
 * @param props - Component props with the SDK context.
 * @returns The complete Azure-flavored output component tree.
 */
export function AzureCoreEmitter(props: AzureCoreEmitterProps) {
  const { sdkContext } = props;
  const packageName = getPackageName(sdkContext);

  return (
    <FlavorProvider flavor="azure">
      <SdkContextProvider sdkContext={sdkContext}>
        <SourceDirectory path="src">
          <LoggerFile packageName={packageName} />
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
    </FlavorProvider>
  );
}

/**
 * TypeSpec emitter entry point for generating Azure-flavored TypeScript
 * HTTP client libraries.
 *
 * This is a convenience entry point that delegates to `$onEmit` with the
 * `flavor` option forced to `"azure"`. It provides backward compatibility
 * for consumers that reference the Azure entry point directly.
 *
 * Equivalent to configuring the core emitter with `flavor: "azure"` in
 * tspconfig.yaml. The composition pattern ensures that no core component
 * is modified — all Azure behavior comes from the `FlavorProvider` context
 * and the additional `<LoggerFile />` component.
 *
 * @param context - The TypeSpec emit context containing the compiled program,
 *                  emitter options, and output directory path.
 */
export async function $onEmitAzure(context: EmitContext) {
  // Force flavor to "azure" in options, preserving any other options.
  // This ensures $onEmit uses Azure externals, FlavorProvider="azure",
  // and includes the LoggerFile component.
  const azureOptions = { ...(context.options as Record<string, unknown>), flavor: "azure" };
  const azureContext = {
    ...context,
    options: azureOptions as unknown as EmitContext["options"],
  };
  return $onEmit(azureContext);
}

/**
 * Extracts a short package name from the SDK context for logger creation.
 *
 * Uses the first client's name as a fallback when package metadata
 * is not available. The name is used in `createClientLogger("name")`
 * to scope log output to this package.
 *
 * @param sdkContext - The TCGC SDK context.
 * @returns A human-readable package identifier string.
 */
function getPackageName(
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>,
): string {
  const firstClient = sdkContext.sdkPackage.clients[0];
  return firstClient?.name?.replace(/Client$/, "").toLowerCase() ?? "unknown";
}
