import {
  type ComponentContext,
  type Children,
  createNamedContext,
  useContext,
} from "@alloy-js/core";
import type {
  SdkClientType,
  SdkContext as TcgcSdkContext,
  SdkEnumType,
  SdkHttpOperation,
  SdkModelType,
  SdkNullableType,
  SdkPackage,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Value exposed by the SdkContext to child components.
 *
 * Provides typed access to the TCGC SdkPackage and its commonly-used
 * collections (clients, models, enums, unions). Components use the
 * `useSdkContext()` hook to consume this context instead of receiving
 * the data through prop drilling.
 */
export interface SdkContextValue {
  /** The full TCGC SDK package containing all type and client information. */
  sdkPackage: SdkPackage<SdkHttpOperation>;

  /** The raw TCGC SDK context, needed for decorator inspection (e.g., @clientName). */
  tcgcContext: TcgcSdkContext;

  /** Top-level clients defined in the service. */
  clients: SdkClientType<SdkHttpOperation>[];

  /** All model types used across the service. */
  models: SdkModelType[];

  /** All enum types used across the service. */
  enums: SdkEnumType[];

  /** All union and nullable types used across the service. */
  unions: (SdkUnionType | SdkNullableType)[];
}

/**
 * Alloy named context that carries TCGC SDK package data through the
 * component tree. Created via `createNamedContext` so it appears as
 * "SdkContext" in debug/error output.
 */
export const SdkContext: ComponentContext<SdkContextValue> =
  createNamedContext<SdkContextValue>("SdkContext");

/**
 * Props accepted by the `SdkContextProvider` component.
 */
export interface SdkContextProviderProps {
  /** The TCGC SdkContext obtained from `createSdkContext()`. */
  sdkContext: TcgcSdkContext;

  /** Child components that will have access to the SDK context. */
  children?: Children;
}

/**
 * Provider component that makes TCGC SDK data available to all descendant
 * components via Alloy's context system.
 *
 * Place this component near the root of the emitter's JSX tree (inside
 * the `<Output>` component). Any descendant can then call `useSdkContext()`
 * to access the SDK package data without prop drilling.
 *
 * @example
 * ```tsx
 * <Output program={program} namePolicy={createTSNamePolicy()}>
 *   <SdkContextProvider sdkContext={tcgcContext}>
 *     <ModelFiles />
 *     <OperationsFiles />
 *   </SdkContextProvider>
 * </Output>
 * ```
 */
export function SdkContextProvider(props: SdkContextProviderProps) {
  const { sdkPackage } = props.sdkContext;

  const value: SdkContextValue = {
    sdkPackage,
    tcgcContext: props.sdkContext,
    clients: sdkPackage.clients,
    models: sdkPackage.models,
    enums: sdkPackage.enums,
    unions: sdkPackage.unions,
  };

  return <SdkContext.Provider value={value}>{props.children}</SdkContext.Provider>;
}

/**
 * Hook that retrieves the TCGC SDK context from the nearest
 * `SdkContextProvider` ancestor.
 *
 * Throws if called outside of a `SdkContextProvider` — this is
 * intentional to catch wiring errors early rather than producing
 * cryptic undefined-access errors downstream.
 *
 * @returns The `SdkContextValue` with typed access to the SDK package,
 *          clients, models, enums, and unions.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { models, clients } = useSdkContext();
 *   // ... render based on SDK data
 * }
 * ```
 */
export function useSdkContext(): SdkContextValue {
  const context = useContext(SdkContext);

  if (!context) {
    throw new Error(
      "SdkContext is not set. Make sure the component is wrapped in a " +
        "<SdkContextProvider> inside the emitter's component tree.",
    );
  }

  return context;
}
