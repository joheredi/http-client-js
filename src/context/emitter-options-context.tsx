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

  /**
   * When true, extensible enums (isFixed=false) are rendered with the
   * KnownXxx enum pattern: `type Name = string; enum KnownName { ... }`.
   * When false or undefined, extensible enums are rendered as literal
   * union type aliases only, matching the default legacy emitter behavior.
   *
   * Corresponds to the `experimental-extensible-enums` YAML config option.
   * In the legacy emitter, this also controls TCGC's `flattenUnionAsEnum`.
   */
  experimentalExtensibleEnums: boolean;

  /**
   * When true, models with `additionalProperties` extend `Record<string, T>`
   * directly and serializers spread the entire input object. When false
   * (default), an explicit `additionalProperties` bag property is generated
   * on the model interface, and serializers/deserializers use structured
   * `serializeRecord`/`deserializeRecord` helpers to handle the bag.
   *
   * Corresponds to the `compatibility-mode` YAML config option.
   */
  compatibilityMode: boolean;

  /**
   * When true, optional properties/parameters that are also nullable have
   * their `| null` union stripped, producing `prop?: T` instead of
   * `prop?: T | null`. This follows the Azure SDK convention where optional
   * implicitly means nullable, making the explicit `| null` redundant.
   *
   * The emitter defaults this to `true` for Azure flavor and `false` for
   * core flavor, matching the legacy emitter behavior. Users can override
   * via the `ignore-nullable-on-optional` YAML config option.
   *
   * The context default below (`true`) is used as a fallback for unit tests
   * that don't go through the emitter's flavor-aware defaulting.
   *
   * Corresponds to the `ignore-nullable-on-optional` YAML config option.
   */
  ignoreNullableOnOptional: boolean;

  /**
   * Maps original TCGC client names to desired renamed client names.
   *
   * By default, code generation uses client names derived from the `@client`
   * and `@service` decorators in TypeSpec. This option overrides those names
   * post-TCGC processing, allowing SDK authors to rename clients without
   * modifying TypeSpec source files.
   *
   * The map keys are the original client names (as TCGC derives them),
   * and the values are the desired client names. Supports renaming multiple
   * clients.
   *
   * @example
   * ```yaml
   * typespec-title-map:
   *   AnomalyDetectorClient: AnomalyDetectorRest
   *   AnomalyDetectorClient2: AnomalyDetectorRest2
   * ```
   *
   * Corresponds to the `typespec-title-map` YAML config option from the
   * legacy emitter.
   */
  typespecTitleMap?: Record<string, string>;

  /**
   * When true, the emitter generates metadata/scaffolding files alongside
   * source code: package.json, tsconfig.json, README.md, LICENSE, and
   * flavor-specific config files (api-extractor.json, eslint, vitest).
   *
   * Defaults to false. When false, only source files under src/ are emitted.
   */
  generateMetadata: boolean;

  /**
   * The npm package name for the generated package.json.
   * When not provided, derived from the first client name.
   */
  packageName?: string;

  /**
   * The package version for the generated package.json.
   * Defaults to "1.0.0-beta.1".
   */
  packageVersion?: string;
}

/**
 * Default emitter options used when no EmitterOptionsProvider is present.
 *
 * Headers are excluded by default, matching the legacy emitter's behavior
 * where `include-headers-in-response` defaults to false.
 */
const defaultOptions: EmitterOptionsValue = {
  includeHeadersInResponse: false,
  experimentalExtensibleEnums: false,
  compatibilityMode: false,
  ignoreNullableOnOptional: true,
  generateMetadata: false,
};

/**
 * Alloy named context that carries emitter configuration through the
 * component tree. Defaults to conservative options (headers excluded)
 * when no provider is present.
 */
export const EmitterOptionsContext: ComponentContext<EmitterOptionsValue> =
  createNamedContext<EmitterOptionsValue>(
    "EmitterOptionsContext",
    defaultOptions,
  );

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
