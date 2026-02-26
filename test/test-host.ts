import { resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import type { Program } from "@typespec/compiler";

/**
 * Shared Tester instance for all unit tests in the http-client-js emitter.
 *
 * Uses `createTester` from `@typespec/compiler/testing` to provide a pre-configured
 * TypeSpec compilation environment. All commonly used libraries are pre-loaded and
 * auto-imported so individual tests don't need to set them up.
 *
 * The `using` declarations match the legacy emitter's test infrastructure to ensure
 * maximum compatibility with ported scenario files.
 *
 * Usage:
 * ```ts
 * const runner = await Tester.createInstance();
 * const { program } = await runner.compile(t.code`model Foo { bar: string; }`);
 * ```
 */
export const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@typespec/xml",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .importLibraries()
  .using("Http")
  .using("Rest")
  .using("Versioning");

/**
 * Raw Tester that only loads libraries but does NOT auto-import or add `using`
 * statements. Used for legacy scenarios that have their own `import` and `using`
 * declarations to avoid "imports must come before declarations" errors.
 */
export const RawTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/openapi",
    "@typespec/xml",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  ],
});

/**
 * Tester pre-wrapped with a `@service` namespace so individual tests only need
 * to define models, operations, etc. without boilerplate. Uses TCGC's
 * `@azure-tools/typespec-client-generator-core` for SDK context creation.
 *
 * Includes ALL common `using` statements matching the legacy emitter's test
 * infrastructure for maximum compatibility with ported scenarios.
 *
 * Usage:
 * ```ts
 * const runner = await TesterWithService.createInstance();
 * const { program } = await runner.compile(t.code`model Foo { bar: string; }`);
 * const sdkContext = await createSdkContextForTest(program);
 * ```
 */
export const TesterWithService = Tester.wrap(
  (x) => `
#suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
@service(#{title: "Azure TypeScript Testing"})
namespace Azure.TypeScript.Testing;

${x}
`,
);

/**
 * Creates a TCGC SdkContext from a compiled TypeSpec program for use in tests.
 *
 * This mirrors the emitter's runtime behavior where `createSdkContext()` is
 * called during `$onEmit`. The returned context contains the `sdkPackage`
 * with all clients, models, enums, and unions extracted by TCGC.
 *
 * @param program - The compiled TypeSpec program from a Tester instance.
 * @returns A Promise resolving to the SdkContext.
 */
export function createSdkContextForTest(program: Program) {
  // A no-op perf reporter for testing — EmitContext requires this property
  const perf = {
    startTimer: (label: string) => ({ end: () => 0 }),
    time: <T,>(label: string, cb: () => T) => cb(),
    timeAsync: <T,>(label: string, cb: () => Promise<T>) => cb(),
    report: () => {},
  };

  return createSdkContext({
    program,
    emitterOutputDir: resolveVirtualPath("tsp-output"),
    options: {},
    perf,
  });
}
