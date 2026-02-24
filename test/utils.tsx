import { Children } from "@alloy-js/core";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { Program } from "@typespec/compiler";
import { Output } from "@typespec/emitter-framework";
import type { SdkContext, SdkHttpOperation } from "@azure-tools/typespec-client-generator-core";
import { SdkContextProvider } from "../src/context/sdk-context.js";

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

/**
 * Props for the SdkTestFile wrapper component.
 */
export interface SdkTestFileProps {
  /** The TCGC SdkContext obtained from `createSdkContextForTest()`. */
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  /** Child components to render inside the test source file. */
  children: Children;
}

/**
 * Test wrapper that provides both Alloy Output/SourceFile and the
 * SdkContextProvider for components that depend on TCGC SDK data.
 *
 * This wraps children in:
 * - `<Output>` with a TypeScript name policy and the compiled program
 * - `<SdkContextProvider>` with the TCGC context
 * - `<SourceFile>` with a fixed path of "test.ts"
 *
 * Use this wrapper when testing components that call `useSdkContext()`.
 *
 * @example
 * ```tsx
 * const sdkContext = await createSdkContextForTest(program);
 * const template = (
 *   <SdkTestFile sdkContext={sdkContext}>
 *     <MyModelComponent />
 *   </SdkTestFile>
 * );
 * expect(template).toRenderTo(`expected output`);
 * ```
 */
export function SdkTestFile(props: SdkTestFileProps) {
  return (
    <Output program={props.sdkContext.emitContext.program} namePolicy={createTSNamePolicy()}>
      <SdkContextProvider sdkContext={props.sdkContext}>
        <SourceFile path="test.ts">{props.children}</SourceFile>
      </SdkContextProvider>
    </Output>
  );
}
