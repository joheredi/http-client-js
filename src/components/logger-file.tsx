import { code } from "@alloy-js/core";
import { SourceFile, VarDeclaration } from "@alloy-js/typescript";
import { azureLoggerLib } from "../utils/external-packages.js";
import { loggerRefkey } from "../utils/refkeys.js";

/**
 * Props for the {@link LoggerFile} component.
 */
export interface LoggerFileProps {
  /**
   * The package name to pass to `createClientLogger()`.
   *
   * This should be the package name without scope (e.g., `"confidential-ledger"`)
   * or the full scoped name (e.g., `"@azure/confidential-ledger"`). The legacy
   * emitter prefers `nameWithoutScope` when available.
   */
  packageName: string;
}

/**
 * Generates the `logger.ts` source file for Azure-flavored SDKs.
 *
 * This component produces a single TypeScript source file containing a
 * namespaced logger instance created via `createClientLogger()` from
 * `@azure/logger`. The logger integrates with the Azure SDK logging
 * infrastructure, enabling consumers to control logging verbosity
 * per-package via environment variables (e.g., `AZURE_LOG_LEVEL`).
 *
 * Generated output:
 * ```typescript
 * import { createClientLogger } from "@azure/logger";
 *
 * export const logger = createClientLogger("my-package");
 * ```
 *
 * This component should only be included in the component tree for
 * Azure-flavored SDK generation. The decision to include or exclude
 * it is made by the emitter orchestrator (e.g., based on flavor options),
 * not by this component itself.
 *
 * @param props - The component props containing the package name.
 * @returns An Alloy JSX tree representing the `logger.ts` source file.
 */
export function LoggerFile(props: LoggerFileProps) {
  return (
    <SourceFile path="logger.ts">
      <VarDeclaration name="logger" refkey={loggerRefkey()} const export>
        {code`${azureLoggerLib.createClientLogger}("${props.packageName}")`}
      </VarDeclaration>
    </SourceFile>
  );
}
