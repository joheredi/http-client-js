#!/usr/bin/env node

/**
 * extract-api.ts — Extracts rolled-up `.d.ts` API surface from generated e2e packages.
 *
 * For each generated client library under `test/e2e/generated/`, this script:
 * 1. Runs the TypeScript compiler in declaration-only mode to emit `.d.ts` files
 * 2. Runs `@microsoft/api-extractor` to roll them up into a single `index.d.ts`
 * 3. Writes the result to `test/e2e/api/{spec-path}/index.d.ts`
 *
 * This produces the same format as the legacy emitter's `.d.ts` files in
 * `submodules/autorest.typescript/packages/typespec-ts/test/modularIntegration/generated/`,
 * enabling direct comparison of public API surfaces.
 *
 * Usage:
 *   pnpm extract-api:e2e                        # extract all
 *   pnpm extract-api:e2e --filter type/array     # only specs matching filter
 *
 * Prerequisites: `pnpm emit:e2e` must have been run first.
 */

import { cpus } from "node:os";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, rm, writeFile, readFile, cp } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCompilerHost,
  createProgram,
  type CompilerOptions,
} from "typescript";
import {
  Extractor,
  ExtractorConfig,
  ExtractorLogLevel,
  type IExtractorConfigPrepareOptions,
} from "@microsoft/api-extractor";
import pLimit from "p-limit";

/**
 * Simple deep merge (replaces lodash.merge for this single use case).
 * Arrays are replaced, not concatenated. Objects are recursively merged.
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Record<string, any>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = (result as any)[key];
    if (
      srcVal &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      (result as any)[key] = deepMerge(tgtVal, srcVal);
    } else {
      (result as any)[key] = srcVal;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const generatedRoot = join(projectRoot, "test", "e2e", "generated");
const apiOutputRoot = join(projectRoot, "test", "e2e", "api");
const logDirRoot = join(projectRoot, "temp", "extract-api-logs");

// ---------------------------------------------------------------------------
// CLI arguments
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { filter?: string } {
  const args: { filter?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--filter" && i + 1 < argv.length) {
      args.filter = argv[i + 1];
      i++;
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// Package discovery
// ---------------------------------------------------------------------------

interface PackageEntry {
  /** Absolute path to the generated package directory. */
  absolutePath: string;
  /** Path relative to generatedRoot (e.g. "authentication/api-key"). */
  relativePath: string;
}

/**
 * Recursively discovers generated packages by looking for directories
 * containing both `package.json` and `src/index.ts`.
 */
function discoverPackages(dir: string, filter?: string): PackageEntry[] {
  const packages: PackageEntry[] = [];

  function walk(d: string) {
    if (!existsSync(d)) return;

    const hasPackageJson = existsSync(join(d, "package.json"));
    const hasIndexTs = existsSync(join(d, "src", "index.ts"));

    if (hasPackageJson && hasIndexTs) {
      const rel = relative(generatedRoot, d);
      if (!filter || rel.includes(filter)) {
        packages.push({ absolutePath: d, relativePath: rel });
      }
      return; // Don't recurse into nested packages
    }

    for (const entry of readdirSync(d)) {
      if (entry === "node_modules" || entry === "dist" || entry === "types") {
        continue;
      }
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
    }
  }

  walk(dir);
  packages.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return packages;
}

// ---------------------------------------------------------------------------
// Declaration extraction
// ---------------------------------------------------------------------------

interface ExtractResult {
  status: "succeeded" | "failed";
  packagePath: string;
  durationMs: number;
  errorDetails?: string;
}

/**
 * Emits declaration files using the TypeScript compiler API.
 * Mirrors the legacy emitter's `emitDeclarationFiles()` approach.
 */
function emitDeclarationFiles(
  packageDir: string,
  declarationDir: string,
): string[] {
  const compilerOptions: CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    declarationMap: false,
    removeComments: true,
    declarationDir,
    rootDir: packageDir,
    // Match the generated tsconfig settings
    target: 99, // ESNext
    module: 199, // NodeNext
    moduleResolution: 99, // NodeNext
    strict: true,
    skipLibCheck: true,
  };

  const rootFile = join(packageDir, "src", "index.ts");
  const host = createCompilerHost(compilerOptions);
  const program = createProgram({
    options: compilerOptions,
    rootNames: [rootFile],
    host,
  });

  // Load source files (required for emit to work)
  program.getSourceFiles();

  const { diagnostics } = program.emit();

  const errors = diagnostics.filter((d) => d.category === 0); // DiagnosticCategory.Error
  return errors.map((d) =>
    typeof d.messageText === "string"
      ? d.messageText
      : d.messageText.messageText,
  );
}

/**
 * Runs API Extractor to produce a rolled-up `.d.ts` from the declaration files.
 * Mirrors the legacy emitter's `emitDeclarationRollup()` approach.
 */
function runApiExtractor(
  packageDir: string,
  declarationDir: string,
  outputFile: string,
): { succeeded: boolean; errors: string[] } {
  const errors: string[] = [];

  // We need a package.json for api-extractor. Read the existing one.
  const packageJsonFullPath = join(packageDir, "package.json");

  const mainEntryPointFilePath = join(
    "<projectFolder>",
    relative(packageDir, declarationDir),
    "src",
    "index.d.ts",
  );

  const baseConfigObject = {
    apiReport: { enabled: false },
    docModel: { enabled: false },
    dtsRollup: {
      enabled: true,
      untrimmedFilePath: outputFile,
    },
    compiler: {
      overrideTsconfig: {
        compilerOptions: {
          declaration: true,
          emitDeclarationOnly: true,
          declarationDir,
          rootDir: packageDir,
          target: "esnext" as const,
          module: "nodenext" as const,
          moduleResolution: "nodenext" as const,
          strict: true,
          skipLibCheck: true,
        },
      },
    },
    mainEntryPointFilePath,
    messages: {
      compilerMessageReporting: {
        default: { logLevel: ExtractorLogLevel.None },
      },
      extractorMessageReporting: {
        default: { logLevel: ExtractorLogLevel.None },
      },
      tsdocMessageReporting: {
        default: { logLevel: ExtractorLogLevel.None },
      },
    },
    newlineKind: "lf",
    projectFolder: packageDir,
  };

  // Merge with api-extractor defaults (same technique as legacy)
  const configObject = deepMerge(
    JSON.parse(JSON.stringify((ExtractorConfig as any)._defaultConfig)),
    baseConfigObject,
  );
  ExtractorConfig.jsonSchema.validateObject(
    configObject,
    "api extractor config",
  );

  const prepareOptions: IExtractorConfigPrepareOptions = {
    configObject,
    packageJsonFullPath,
    configObjectFullPath: undefined!,
  };

  const extractorConfig = ExtractorConfig.prepare(prepareOptions);

  const result = Extractor.invoke(extractorConfig, {
    localBuild: true,
    messageCallback: (message) => {
      if (
        message.logLevel === ExtractorLogLevel.Error ||
        message.logLevel === ExtractorLogLevel.Warning
      ) {
        errors.push(message.text);
      }
      message.handled = true;
    },
  });

  return { succeeded: result.succeeded, errors };
}

/**
 * Extracts the API surface for a single generated package.
 */
async function extractPackageApi(pkg: PackageEntry): Promise<ExtractResult> {
  const start = Date.now();
  const declarationDir = join(pkg.absolutePath, "types");
  const outputDir = join(apiOutputRoot, pkg.relativePath, "src");
  const outputFile = join(outputDir, "index.d.ts");

  try {
    // Clean previous output
    if (existsSync(declarationDir)) {
      await rm(declarationDir, { recursive: true, force: true });
    }
    await mkdir(outputDir, { recursive: true });

    // Step 1: Emit declaration files
    const tscErrors = emitDeclarationFiles(pkg.absolutePath, declarationDir);
    if (tscErrors.length > 0) {
      // Log but don't fail — some declaration errors are non-fatal
      const logDir = join(logDirRoot, pkg.relativePath);
      await mkdir(logDir, { recursive: true });
      await writeFile(
        join(logDir, "tsc-warnings.log"),
        tscErrors.join("\n"),
        "utf8",
      );
    }

    // Verify declaration entry point exists
    const declEntryPoint = join(declarationDir, "src", "index.d.ts");
    if (!existsSync(declEntryPoint)) {
      throw new Error(
        `Declaration entry point not found: ${declEntryPoint}\n` +
          `TSC errors: ${tscErrors.join("; ")}`,
      );
    }

    // Step 2: Run API Extractor for rollup
    const { succeeded, errors } = runApiExtractor(
      pkg.absolutePath,
      declarationDir,
      outputFile,
    );

    if (!succeeded && !existsSync(outputFile)) {
      throw new Error(`API Extractor failed:\n${errors.join("\n")}`);
    }

    // Step 3: Clean up intermediate declaration files
    await rm(declarationDir, { recursive: true, force: true });

    return {
      status: "succeeded",
      packagePath: pkg.relativePath,
      durationMs: Date.now() - start,
    };
  } catch (error: unknown) {
    const err = error as Error;

    // Write error log
    const logDir = join(logDirRoot, pkg.relativePath);
    await mkdir(logDir, { recursive: true });
    await writeFile(join(logDir, "error.log"), err.message, "utf8");

    // Clean up intermediate files
    if (existsSync(declarationDir)) {
      await rm(declarationDir, { recursive: true, force: true });
    }

    return {
      status: "failed",
      packagePath: pkg.relativePath,
      durationMs: Date.now() - start,
      errorDetails: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = process.hrtime.bigint();

  console.log("🔍 Discovering generated packages...");
  const packages = discoverPackages(generatedRoot, cliArgs.filter);

  if (packages.length === 0) {
    console.log("⚠️  No packages found. Run 'pnpm emit:e2e' first.");
    return;
  }

  console.log(
    `📦 Found ${packages.length} package(s)` +
      (cliArgs.filter ? ` [filter: ${cliArgs.filter}]` : ""),
  );

  // Clean previous output and logs
  if (existsSync(apiOutputRoot) && !cliArgs.filter) {
    await rm(apiOutputRoot, { recursive: true, force: true });
  }
  if (existsSync(logDirRoot)) {
    await rm(logDirRoot, { recursive: true, force: true });
  }

  // Process packages in parallel
  const concurrency = Math.min(Math.max(1, cpus().length), 4);
  console.log(`⚡ Parallelism: ${concurrency}\n`);

  const limit = pLimit(concurrency);
  let completed = 0;

  const tasks = packages.map((pkg) =>
    limit(async () => {
      const result = await extractPackageApi(pkg);
      completed++;
      const icon = result.status === "succeeded" ? "✅" : "❌";
      const timing = `(${(result.durationMs / 1000).toFixed(1)}s)`;
      console.log(
        `${icon} [${completed}/${packages.length}] ${result.packagePath} ${timing}`,
      );
      return result;
    }),
  );

  const results = await Promise.all(tasks);

  // Summary
  const succeeded = results.filter((r) => r.status === "succeeded");
  const failed = results.filter((r) => r.status === "failed");

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Succeeded: ${succeeded.length}`);
  console.log(`❌ Failed:    ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed packages:");
    for (const f of failed) {
      console.log(`  - ${f.packagePath}`);
    }
    console.log(`\n📁 Error logs: ${logDirRoot}`);
  }

  // Timing
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e9;
  console.log(`\n📄 API declarations written to: ${apiOutputRoot}`);
  console.log(`⏱️  Total time: ${duration.toFixed(1)}s`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
