import { Children } from "@alloy-js/core";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { Program } from "@typespec/compiler";
import { Output } from "@typespec/emitter-framework";

/**
 * Props for the TestFile wrapper component.
 */
export interface TestFileProps {
  /** The TypeSpec program instance from compilation. */
  program: Program;
  /** Child components to render inside the test source file. */
  children: Children;
}

/**
 * Minimal test wrapper that renders children inside an Alloy Output and SourceFile.
 *
 * This component provides the bare minimum structure needed to render and assert
 * on Alloy component output in unit tests. It wraps children in:
 * - `<Output>` with a TypeScript name policy and the compiled program
 * - `<SourceFile>` with a fixed path of "test.ts"
 *
 * Use this wrapper when testing leaf components that don't require
 * additional context providers (e.g., SDK context, declaration providers).
 *
 * @example
 * ```tsx
 * const template = (
 *   <TestFile program={program}>
 *     <MyComponent />
 *   </TestFile>
 * );
 * expect(template).toRenderTo(`expected output`);
 * ```
 */
export function TestFile(props: TestFileProps) {
  return (
    <Output program={props.program} namePolicy={createTSNamePolicy()}>
      <SourceFile path="test.ts">{props.children}</SourceFile>
    </Output>
  );
}
