import { resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import type { Program } from "@typespec/compiler";

/**
 * Shared Tester instance for all unit tests in the http-client-js emitter.
 *
 * Uses `createTester` from `@typespec/compiler/testing` to provide a pre-configured
 * TypeSpec compilation environment. Libraries `@typespec/http` and `@typespec/versioning`
 * are pre-loaded and auto-imported so individual tests don't need to set them up.
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
    "@typespec/versioning",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .importLibraries()
  .using("Http")
  .using("Versioning");

/**
 * Tester pre-wrapped with a `@service` namespace so individual tests only need
 * to define models, operations, etc. without boilerplate. Uses TCGC's
 * `@azure-tools/typespec-client-generator-core` for SDK context creation.
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
@service(#{title: "Test Service"})
namespace TestService;

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
