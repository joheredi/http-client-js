/**
 * Custom Vitest matcher type declarations for Alloy component testing.
 *
 * These matchers are provided by `@alloy-js/core/testing` and allow asserting
 * that JSX component trees render to expected string output. The matchers handle
 * rendering, dedenting, and comparison automatically.
 *
 * - `toRenderTo` — Synchronous render + compare
 * - `toRenderToAsync` — Async render + compare (flushes async jobs)
 *
 * Both accept either a plain string (for single-file output) or a
 * `Record<string, string>` (for multi-file output keyed by file path).
 */
import "vitest";

interface ToRenderToRenderOptions {
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
}

interface CustomMatchers<R = unknown> {
  toRenderTo: (
    str: string | Record<string, string>,
    options?: ToRenderToRenderOptions,
  ) => R;
  toRenderToAsync: (
    str: string | Record<string, string>,
    options?: ToRenderToRenderOptions,
  ) => Promise<R>;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<T = any> extends CustomMatchers<T> {}
}
