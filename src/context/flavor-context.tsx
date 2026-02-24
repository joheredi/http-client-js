import {
  type ComponentContext,
  type Children,
  type Refkey,
  createNamedContext,
  useContext,
} from "@alloy-js/core";
import {
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
} from "../utils/external-packages.js";

/**
 * Identifies which SDK flavor the emitter is generating.
 *
 * - `"core"` — Vanilla TypeSpec SDK using `@typespec/ts-http-runtime`
 * - `"azure"` — Azure SDK using `@azure-rest/core-client` and related Azure packages
 */
export type FlavorKind = "core" | "azure";

/**
 * Unified interface mapping logical runtime symbols to their concrete
 * Alloy refkeys. Components use `useRuntimeLib()` to access these
 * refkeys instead of importing a specific package directly.
 *
 * This abstraction enables the Azure extension to swap package references
 * (e.g., `Client` from `@typespec/ts-http-runtime` vs `@azure-rest/core-client`)
 * without modifying any core component source files.
 */
export interface RuntimeLib {
  /** Client interface type for the HTTP client context. */
  Client: Refkey;
  /** Client options type extending base configuration. */
  ClientOptions: Refkey;
  /** Factory function to create an HTTP client instance. */
  getClient: Refkey;
  /** HTTP pipeline type for request/response processing. */
  Pipeline: Refkey;
  /** Operation options base type for optional parameters. */
  OperationOptions: Refkey;
  /** Helper to convert operation options to request parameters. */
  operationOptionsToRequestParameters: Refkey;
  /** Return type for streaming HTTP operations. */
  StreamableMethod: Refkey;
  /** Type representing an unchecked HTTP response. */
  PathUncheckedResponse: Refkey;
  /** REST error class for HTTP error responses. */
  RestError: Refkey;
  /** Factory function to create a REST error from a response. */
  createRestError: Refkey;
  /** Abort signal type for request cancellation. */
  AbortSignalLike: Refkey;
  /** Convert a Uint8Array to a string with a given encoding. */
  uint8ArrayToString: Refkey;
  /** Convert a string to a Uint8Array with a given encoding. */
  stringToUint8Array: Refkey;
  /** API key credential type. */
  KeyCredential: Refkey;
  /** Type guard for key credential objects. */
  isKeyCredential: Refkey;
  /** Token-based credential type (e.g., OAuth2 bearer tokens). */
  TokenCredential: Refkey;
  /** URI template expansion utility. */
  expandUrlTemplate: Refkey;
}

/**
 * Value exposed by the FlavorContext to child components.
 *
 * Carries the SDK flavor identifier and the flavor-appropriate
 * runtime library refkeys so components can generate code that
 * uses the correct package imports.
 */
export interface FlavorContextValue {
  /** The SDK flavor being generated. */
  flavor: FlavorKind;
  /** Runtime library refkeys mapped to the flavor's packages. */
  runtimeLib: RuntimeLib;
}

/**
 * Default flavor context value using the core (non-Azure) runtime library.
 *
 * This default allows components to work without an explicit FlavorProvider
 * wrapping them, falling back to the vanilla TypeSpec runtime. This is
 * particularly useful in unit tests that test individual components without
 * needing to set up a full emitter tree.
 */
const defaultFlavorValue: FlavorContextValue = {
  flavor: "core",
  runtimeLib: createCoreRuntimeLib(),
};

/**
 * Alloy named context that carries flavor configuration through
 * the component tree. Created via `createNamedContext` so it
 * appears as "FlavorContext" in debug/error output.
 *
 * Defaults to core flavor when no `FlavorProvider` is present,
 * enabling components to work standalone (e.g., in unit tests).
 */
export const FlavorContext: ComponentContext<FlavorContextValue> =
  createNamedContext<FlavorContextValue>("FlavorContext", defaultFlavorValue);

/**
 * Creates a RuntimeLib that maps all symbols to `@typespec/ts-http-runtime`.
 *
 * Used by the core (non-Azure) flavor where every runtime symbol
 * comes from a single package.
 */
export function createCoreRuntimeLib(): RuntimeLib {
  return {
    Client: httpRuntimeLib.Client,
    ClientOptions: httpRuntimeLib.ClientOptions,
    getClient: httpRuntimeLib.getClient,
    Pipeline: httpRuntimeLib.Pipeline,
    OperationOptions: httpRuntimeLib.OperationOptions,
    operationOptionsToRequestParameters:
      httpRuntimeLib.operationOptionsToRequestParameters,
    StreamableMethod: httpRuntimeLib.StreamableMethod,
    PathUncheckedResponse: httpRuntimeLib.PathUncheckedResponse,
    RestError: httpRuntimeLib.RestError,
    createRestError: httpRuntimeLib.createRestError,
    AbortSignalLike: httpRuntimeLib.AbortSignalLike,
    uint8ArrayToString: httpRuntimeLib.uint8ArrayToString,
    stringToUint8Array: httpRuntimeLib.stringToUint8Array,
    KeyCredential: httpRuntimeLib.KeyCredential,
    isKeyCredential: httpRuntimeLib.isKeyCredential,
    TokenCredential: httpRuntimeLib.TokenCredential,
    expandUrlTemplate: httpRuntimeLib.expandUrlTemplate,
  };
}

/**
 * Creates a RuntimeLib that maps symbols to their Azure SDK packages.
 *
 * In Azure flavor, runtime symbols are split across multiple packages:
 * - Core client types → `@azure-rest/core-client`
 * - Pipeline → `@azure/core-rest-pipeline`
 * - Auth types → `@azure/core-auth`
 * - Utility functions → `@azure/core-util`
 * - Abort controller → `@azure/abort-controller`
 * - URI template expansion → `@typespec/ts-http-runtime` (no Azure equivalent)
 */
export function createAzureRuntimeLib(): RuntimeLib {
  return {
    Client: azureCoreClientLib.Client,
    ClientOptions: azureCoreClientLib.ClientOptions,
    getClient: azureCoreClientLib.getClient,
    Pipeline: azureCorePipelineLib.Pipeline,
    OperationOptions: azureCoreClientLib.OperationOptions,
    operationOptionsToRequestParameters:
      azureCoreClientLib.operationOptionsToRequestParameters,
    StreamableMethod: azureCoreClientLib.StreamableMethod,
    PathUncheckedResponse: azureCoreClientLib.PathUncheckedResponse,
    RestError: azureCoreClientLib.RestError,
    createRestError: azureCoreClientLib.createRestError,
    AbortSignalLike: azureAbortControllerLib.AbortSignalLike,
    uint8ArrayToString: azureCoreUtilLib.uint8ArrayToString,
    stringToUint8Array: azureCoreUtilLib.stringToUint8Array,
    KeyCredential: azureCoreAuthLib.KeyCredential,
    isKeyCredential: azureCoreClientLib.isKeyCredential,
    TokenCredential: azureCoreAuthLib.TokenCredential,
    expandUrlTemplate: httpRuntimeLib.expandUrlTemplate,
  };
}

/**
 * Props accepted by the `FlavorProvider` component.
 */
export interface FlavorProviderProps {
  /** The SDK flavor to use for code generation. */
  flavor: FlavorKind;
  /** Child components that will have access to the flavor context. */
  children?: Children;
}

/**
 * Provider component that makes flavor configuration and runtime library
 * refkeys available to all descendant components via Alloy's context system.
 *
 * Place this component inside the `<Output>` component, wrapping the
 * SdkContextProvider and all content components. The appropriate RuntimeLib
 * is created automatically based on the `flavor` prop.
 *
 * @example
 * ```tsx
 * <Output externals={externals}>
 *   <FlavorProvider flavor="core">
 *     <SdkContextProvider sdkContext={sdkContext}>
 *       <ModelFiles />
 *     </SdkContextProvider>
 *   </FlavorProvider>
 * </Output>
 * ```
 */
export function FlavorProvider(props: FlavorProviderProps) {
  const runtimeLib =
    props.flavor === "azure" ? createAzureRuntimeLib() : createCoreRuntimeLib();

  const value: FlavorContextValue = {
    flavor: props.flavor,
    runtimeLib,
  };

  return (
    <FlavorContext.Provider value={value}>
      {props.children}
    </FlavorContext.Provider>
  );
}

/**
 * Hook that retrieves the flavor configuration from the nearest
 * `FlavorProvider` ancestor, or returns the default core flavor.
 *
 * When no `FlavorProvider` is in the component tree, the context
 * falls back to the default core runtime library. This makes
 * components work in both the full emitter tree and in isolated
 * unit tests without requiring explicit provider setup.
 *
 * @returns The `FlavorContextValue` with flavor identifier and runtime lib.
 */
export function useFlavorContext(): FlavorContextValue {
  const context = useContext(FlavorContext);

  if (!context) {
    return defaultFlavorValue;
  }

  return context;
}

/**
 * Convenience hook that returns the runtime library refkeys from the
 * current flavor context.
 *
 * Components call this instead of directly importing `httpRuntimeLib`
 * or any Azure-specific package. The returned object has the same
 * property names regardless of flavor, so components are flavor-agnostic.
 *
 * @returns The `RuntimeLib` object for the active flavor.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const runtimeLib = useRuntimeLib();
 *   return code`const client: ${runtimeLib.Client} = ${runtimeLib.getClient}(endpoint);`;
 * }
 * ```
 */
export function useRuntimeLib(): RuntimeLib {
  return useFlavorContext().runtimeLib;
}
