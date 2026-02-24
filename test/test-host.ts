import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

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
  libraries: ["@typespec/http", "@typespec/versioning"],
})
  .importLibraries()
  .using("Http")
  .using("Versioning");
