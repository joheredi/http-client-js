/**
 * Test suite for the LoggerFile component.
 *
 * LoggerFile generates `logger.ts` containing a namespaced logger instance
 * created via `createClientLogger()` from `@azure/logger`.
 *
 * What is tested:
 * - The logger source file is generated at the correct path (logger.ts)
 * - The generated file imports `createClientLogger` from `@azure/logger`
 * - The logger constant is exported with the correct package name
 * - The logger refkey enables cross-file import resolution via Alloy
 * - Different package names are correctly embedded in the output
 *
 * Why this matters:
 * Azure SDK packages use `@azure/logger` for structured logging that
 * integrates with the Azure SDK logging infrastructure. Without the
 * logger file, Azure-flavored SDKs would lack proper logging support,
 * and consumers couldn't use `AZURE_LOG_LEVEL` or programmatic logging
 * controls to debug SDK behavior.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import {
  createTSNamePolicy,
  FunctionDeclaration,
  SourceFile,
} from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import { t } from "@typespec/compiler/testing";
import { LoggerFile } from "../../src/components/logger-file.js";
import { loggerRefkey } from "../../src/utils/refkeys.js";
import { azureLoggerLib } from "../../src/utils/external-packages.js";
import { TesterWithService } from "../test-host.js";

describe("LoggerFile", () => {
  /**
   * Tests that the logger file imports `createClientLogger` from `@azure/logger`.
   * This import is essential because it provides the factory function that creates
   * a namespaced logger integrated with Azure's logging system.
   */
  it("should import createClientLogger from @azure/logger", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[azureLoggerLib]}>
        <LoggerFile packageName="confidential-ledger" />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain('import { createClientLogger } from "@azure/logger"');
  });

  /**
   * Tests that the logger constant is exported with the `export` keyword.
   * The logger must be exported so that other modules in the generated SDK
   * can import and use it for logging operations.
   */
  it("should export the logger constant", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[azureLoggerLib]}>
        <LoggerFile packageName="confidential-ledger" />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export const logger");
  });

  /**
   * Tests that the package name is correctly embedded in the `createClientLogger()`
   * call. The package name is how Azure's logging system identifies which SDK
   * package generated a particular log entry.
   */
  it("should use the provided package name", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[azureLoggerLib]}>
        <LoggerFile packageName="confidential-ledger" />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain('createClientLogger("confidential-ledger")');
  });

  /**
   * Tests that different package names produce different logger output.
   * This ensures the package name is dynamically embedded rather than
   * being hardcoded.
   */
  it("should work with different package names", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[azureLoggerLib]}>
        <LoggerFile packageName="keyvault-secrets" />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain('createClientLogger("keyvault-secrets")');
    expect(result).not.toContain("confidential-ledger");
  });

  /**
   * Tests that the logger variable is declared with `const` (not `let` or `var`).
   * The logger instance should never be reassigned, making `const` the correct
   * declaration kind.
   */
  it("should declare logger as const", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[azureLoggerLib]}>
        <LoggerFile packageName="my-service" />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toMatch(/export const logger\s*=/);
  });

  /**
   * Tests that the logger is referenceable via its refkey from another file.
   * This verifies that Alloy's automatic import resolution works correctly
   * when another component references the logger via `loggerRefkey()`.
   */
  it("should be referenceable via loggerRefkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[azureLoggerLib]}>
        <LoggerFile packageName="my-service" />
        <SourceFile path="consumer.ts">
          <FunctionDeclaration name="doSomething">
            {code`${loggerRefkey()}.info("hello");`}
          </FunctionDeclaration>
        </SourceFile>
      </Output>
    );

    const result = renderToString(template);
    // The consumer file should import logger from the logger file
    expect(result).toContain('import { logger } from "./logger.js"');
  });

  /**
   * Tests the complete generated output matches the expected format.
   * The legacy emitter produces exactly:
   * ```
   * import { createClientLogger } from "@azure/logger";
   * export const logger = createClientLogger("package-name");
   * ```
   * This test ensures output parity with the legacy emitter.
   */
  it("should produce output matching legacy emitter format", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[azureLoggerLib]}>
        <LoggerFile packageName="confidential-ledger" />
      </Output>
    );

    const result = renderToString(template);
    // Verify the file has the import and the export statement
    expect(result).toContain('import { createClientLogger } from "@azure/logger"');
    expect(result).toContain('export const logger = createClientLogger("confidential-ledger")');
  });
});
