import {
  type ComponentContext,
  type Children,
  createNamedContext,
  useContext,
} from "@alloy-js/core";

/**
 * Emitter-level configuration options that control code generation behavior.
 *
 * These options are distinct from the SDK type model (SdkContext) — they
 * control *how* the emitter generates code rather than *what* types exist.
 * They originate from the emitter's YAML config or TypeSpec emitter options.
 */
export interface EmitterOptionsValue {
  /**
   * When true, the emitter generates `_xxxDeserializeHeaders` and
   * `_xxxDeserializeExceptionHeaders` functions that extract typed
   * header values from HTTP responses.
   *
   * Corresponds to the `include-headers-in-response` YAML config option
   * from the legacy emitter.
   */
  includeHeadersInResponse: boolean;
}

/**
 * Default emitter options used when no EmitterOptionsProvider is present.
 *
 * Headers are excluded by default, matching the legacy emitter's behavior
 * where `include-headers-in-response` defaults to false.
 */
const defaultOptions: EmitterOptionsValue = {
  includeHeadersInResponse: false,
};

/**
 * Alloy named context that carries emitter configuration through the
 * component tree. Defaults to conservative options (headers excluded)
 * when no provider is present.
 */
export const EmitterOptionsContext: ComponentContext<EmitterOptionsValue> =
  createNamedContext<EmitterOptionsValue>("EmitterOptionsContext", defaultOptions);

/**
 * Props accepted by the EmitterOptionsProvider component.
 */
export interface EmitterOptionsProviderProps {
  /** Emitter option overrides. Missing keys fall back to defaults. */
  options: Partial<EmitterOptionsValue>;
  /** Child components that will have access to the emitter options. */
  children?: Children;
}

/**
 * Provider component that makes emitter configuration available to all
 * descendant components via Alloy's context system.
 *
 * Place this inside the Output component, alongside FlavorProvider and
 * SdkContextProvider. Components use `useEmitterOptions()` to read config.
 *
 * @example
 * ```tsx
 * <EmitterOptionsProvider options={{ includeHeadersInResponse: true }}>
 *   <OperationFiles />
 * </EmitterOptionsProvider>
 * ```
 */
export function EmitterOptionsProvider(props: EmitterOptionsProviderProps) {
  const value: EmitterOptionsValue = {
    ...defaultOptions,
    ...props.options,
  };

  return (
    <EmitterOptionsContext.Provider value={value}>
      {props.children}
    </EmitterOptionsContext.Provider>
  );
}

/**
 * Hook that retrieves emitter configuration from the nearest
 * EmitterOptionsProvider ancestor, or returns defaults if no provider exists.
 *
 * @returns The EmitterOptionsValue with all configuration options resolved.
 */
export function useEmitterOptions(): EmitterOptionsValue {
  const context = useContext(EmitterOptionsContext);
  return context ?? defaultOptions;
}
