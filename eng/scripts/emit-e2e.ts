#!/usr/bin/env node

/**
 * emit-e2e.ts — Discovers and generates client libraries from all Spector specs.
 *
 * Finds `client.tsp` / `main.tsp` files under both the @typespec/http-specs
 * and @azure-tools/azure-http-specs packages, runs `tsp compile` for each spec
 * in parallel, and writes the generated code to `test/e2e/generated/{spec-path}/`.
 * Specs listed in `test/e2e/.testignore` are skipped.
 *
 * Azure-sourced specs are compiled with `flavor=azure`; core specs use `flavor=core`.
 *
 * Usage:
 *   pnpm emit:e2e                      # generate all non-ignored specs
 *   pnpm emit:e2e --filter type/array   # only specs matching the filter
 *
 * Prerequisites: The emitter must be built first (`pnpm build`).
 */

import { execFile } from "node:child_process";
import { cpus } from "node:os";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { globby } from "globby";
import pLimit from "p-limit";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Root of this repository (two levels up from eng/scripts/). */
const projectRoot = resolve(__dirname, "../..");

/**
 * Root directory containing the core Spector specs.
 * Uses the @typespec/http-specs npm package installed in node_modules.
 */
const coreSpecsBasePath = join(
  projectRoot,
  "node_modules",
  "@typespec",
  "http-specs",
  "specs",
);

/**
 * Root directory containing the Azure Spector specs.
 * Uses the @azure-tools/azure-http-specs npm package installed in node_modules.
 */
const azureSpecsBasePath = join(
  projectRoot,
  "node_modules",
  "@azure-tools",
  "azure-http-specs",
  "specs",
);

/** Ignore file listing specs to skip (one path per line, # for comments). */
const ignoreFilePath = join(projectRoot, "test", "e2e", ".testignore");

/** Output root for generated code. */
const generatedRoot = join(projectRoot, "test", "e2e", "generated");

/** Directory for error logs from failed compilations. */
const logDirRoot = join(projectRoot, "temp", "emit-e2e-logs");

/** Summary report written after the run. */
const reportFilePath = join(logDirRoot, "report.txt");

// ---------------------------------------------------------------------------
// CLI argument parsing (lightweight — no yargs dependency)
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
// Ignore list
// ---------------------------------------------------------------------------

/**
 * Reads `test/e2e/.testignore` and returns an array of spec-relative paths
 * that should be skipped during generation.
 */
async function getIgnoreList(): Promise<string[]> {
  try {
    const content = await readFile(ignoreFilePath, "utf8");
    return content
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => line.trim());
  } catch {
    console.warn("⚠️  No .testignore file found — processing all specs.");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Spec discovery
// ---------------------------------------------------------------------------

interface SpecEntry {
  /** Absolute path to the .tsp file. */
  fullPath: string;
  /** Path relative to its specsBasePath (e.g. "authentication/api-key/client.tsp"). */
  relativePath: string;
  /** Emitter flavor to use for this spec. */
  flavor: "core" | "azure";
  /** Optional override for the output directory (relative to generatedRoot). Defaults to dirname(relativePath). */
  outputDir?: string;
}

/**
 * Specs that are not auto-discovered (not named client.tsp or main.tsp)
 * but still need to be compiled and tested.
 */
const MANUAL_SPECS: Array<{
  /** Path relative to its specs base (e.g. "resiliency/srv-driven/old.tsp"). */
  relativePath: string;
  /** Which specs base: "core" or "azure". */
  flavor: "core" | "azure";
  /** Custom output directory name (relative to generatedRoot). */
  outputDir: string;
}> = [
  {
    relativePath: "resiliency/srv-driven/old.tsp",
    flavor: "azure",
    outputDir: "resiliency/srv-driven-old",
  },
];

/**
 * Discovers all compilable specs under a given specs directory.
 *
 * Prefers `client.tsp` over `main.tsp` when both exist in the same directory.
 */
async function discoverSpecsFromDir(
  specsBasePath: string,
  flavor: "core" | "azure",
): Promise<SpecEntry[]> {
  if (!existsSync(specsBasePath)) {
    return [];
  }

  const patterns = ["**/client.tsp", "**/main.tsp"];
  const discovered = await globby(patterns, { cwd: specsBasePath });

  const byDir = new Map<string, SpecEntry>();
  for (const relPath of discovered) {
    const dir = dirname(relPath);
    const existing = byDir.get(dir);

    if (existing && existing.relativePath.endsWith("client.tsp")) {
      continue;
    }

    byDir.set(dir, {
      fullPath: join(specsBasePath, relPath),
      relativePath: relPath,
      flavor,
    });
  }

  return Array.from(byDir.values());
}

/**
 * Discovers all compilable specs under both core and azure spec directories.
 *
 * Prefers `client.tsp` over `main.tsp` when both exist in the same directory.
 * Filters results against the ignore list and the optional `--filter` flag.
 */
async function discoverSpecs(
  ignoreList: string[],
  filter?: string,
): Promise<SpecEntry[]> {
  const coreSpecs = await discoverSpecsFromDir(coreSpecsBasePath, "core");
  const azureSpecs = await discoverSpecsFromDir(azureSpecsBasePath, "azure");

  if (coreSpecs.length === 0 && azureSpecs.length === 0) {
    console.error(
      `❌ No specs directories found.\n` +
        `   Make sure @typespec/http-specs and/or @azure-tools/azure-http-specs are installed (pnpm install).`,
    );
    process.exit(1);
  }

  let specs = [...coreSpecs, ...azureSpecs];

  // Add manually registered specs that aren't auto-discovered.
  for (const manual of MANUAL_SPECS) {
    const basePath = manual.flavor === "core" ? coreSpecsBasePath : azureSpecsBasePath;
    const fullPath = join(basePath, manual.relativePath);
    if (existsSync(fullPath)) {
      specs.push({
        fullPath,
        relativePath: manual.relativePath,
        flavor: manual.flavor,
        outputDir: manual.outputDir,
      });
    }
  }

  // Apply ignore list (match on directory prefix, relative to specs root).
  specs = specs.filter((spec) => {
    const specDir = dirname(spec.relativePath);
    return !ignoreList.some(
      (ignored) => specDir === ignored || specDir.startsWith(ignored + "/"),
    );
  });

  // Apply --filter (substring match on spec directory).
  if (filter) {
    specs = specs.filter((spec) => {
      const specDir = dirname(spec.relativePath);
      return specDir.includes(filter);
    });
  }

  // Sort for deterministic output.
  specs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return specs;
}

// ---------------------------------------------------------------------------
// Compilation
// ---------------------------------------------------------------------------

interface CompileResult {
  status: "succeeded" | "failed" | "skipped";
  specDir: string;
  errorDetails?: string;
  durationMs?: number;
}

/**
 * Compiles a single spec by invoking `npx tsp compile`.
 *
 * The tspconfig.e2e.yaml configures the emitter to load from the project root
 * (which must be built first — emitter is loaded from dist/).
 */
async function compileSpec(spec: SpecEntry): Promise<CompileResult> {
  const specDir = spec.outputDir ?? dirname(spec.relativePath);
  const outputDir = join(generatedRoot, specDir);
  const logDir = join(logDirRoot, specDir);
  const start = Date.now();

  try {
    // Ensure output directory exists (cleanup is done in the serial pre-pass).
    await mkdir(outputDir, { recursive: true });

    // Run tsp compile with emitter options passed via --option flags.
    // This avoids tspconfig.yaml issues with emitter-output-dir resolution.
    await execFileAsync(
      "npx",
      [
        "tsp",
        "compile",
        spec.fullPath,
        "--emit",
        projectRoot,
        "--option",
        `http-client-js.emitter-output-dir={output-dir}`,
        "--option",
        "http-client-js.generate-metadata=true",
        "--option",
        `http-client-js.flavor=${spec.flavor}`,
        "--output-dir",
        outputDir,
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          NODE_ENV: "test",
          TYPESPEC_JS_EMITTER_TESTING: "true",
        },
        maxBuffer: 10 * 1024 * 1024, // 10 MB
        timeout: 60_000, // 60 seconds per spec
      },
    );

    return {
      status: "succeeded",
      specDir,
      durationMs: Date.now() - start,
    };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    // tsp writes diagnostics to stdout; stderr contains spinner/progress output.
    const errorDetails =
      [err.stdout, err.stderr].filter(Boolean).join("\n") ||
      err.message ||
      "Unknown error";

    // Write error log.
    await mkdir(logDir, { recursive: true });
    const logFile = join(
      logDir,
      `${basename(spec.relativePath, ".tsp")}-error.log`,
    );
    await writeFile(logFile, errorDetails, "utf8");

    return {
      status: "failed",
      specDir,
      errorDetails,
      durationMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = process.hrtime.bigint();

  console.log("🔍 Discovering specs...");
  const ignoreList = await getIgnoreList();
  const specs = await discoverSpecs(ignoreList, cliArgs.filter);

  if (specs.length === 0) {
    console.log("⚠️  No specs to process.");
    return;
  }

  const skippedCount = ignoreList.length;
  console.log(
    `📦 Found ${specs.length} spec(s) to compile` +
      (skippedCount > 0 ? ` (${skippedCount} ignored)` : "") +
      (cliArgs.filter ? ` [filter: ${cliArgs.filter}]` : ""),
  );

  // Clear previous logs.
  if (existsSync(logDirRoot)) {
    await rm(logDirRoot, { recursive: true, force: true });
  }

  // Pre-pass: clean all output directories serially before parallel compilation.
  // This avoids an ENOTEMPTY race condition when specs have parent-child output
  // directory relationships (e.g., type/union and type/union/discriminated).
  // If cleaned during parallel compilation, rm(type/union) can collide with
  // concurrent file writes into type/union/discriminated/.
  console.log("🧹 Cleaning output directories...");
  for (const spec of specs) {
    const specDir = spec.outputDir ?? dirname(spec.relativePath);
    const outputDir = join(generatedRoot, specDir);
    if (existsSync(outputDir)) {
      await rm(outputDir, { recursive: true, force: true });
    }
  }
  // Create all output directories after cleanup is complete.
  for (const spec of specs) {
    const specDir = spec.outputDir ?? dirname(spec.relativePath);
    const outputDir = join(generatedRoot, specDir);
    await mkdir(outputDir, { recursive: true });
  }

  // Process specs in parallel.
  const concurrency = Math.min(Math.max(1, cpus().length), 4);
  console.log(`⚡ Parallelism: ${concurrency} concurrent compilations\n`);

  const limit = pLimit(concurrency);
  let completed = 0;

  const tasks = specs.map((spec) =>
    limit(async () => {
      const result = await compileSpec(spec);
      completed++;
      const icon = result.status === "succeeded" ? "✅" : "❌";
      const timing = result.durationMs
        ? ` (${(result.durationMs / 1000).toFixed(1)}s)`
        : "";
      console.log(
        `${icon} [${completed}/${specs.length}] ${result.specDir}${timing}`,
      );
      return result;
    }),
  );

  const results = await Promise.all(tasks);

  // Summarize.
  const succeeded = results.filter((r) => r.status === "succeeded");
  const failed = results.filter((r) => r.status === "failed");

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Succeeded: ${succeeded.length}`);
  console.log(`❌ Failed:    ${failed.length}`);
  console.log(`⏭️  Skipped:   ${skippedCount} (via .testignore)`);

  if (failed.length > 0) {
    console.log("\nFailed specs:");
    for (const f of failed) {
      console.log(`  - ${f.specDir}`);
    }
    console.log(`\n📁 Error logs: ${logDirRoot}`);
  }

  // Write summary report.
  await mkdir(logDirRoot, { recursive: true });
  const report = [
    `Emit E2E Report — ${new Date().toISOString()}`,
    `Succeeded: ${succeeded.length}`,
    `Failed: ${failed.length}`,
    `Skipped: ${skippedCount}`,
    "",
    "Succeeded:",
    ...succeeded.map((r) => `  ✅ ${r.specDir}`),
    "",
    "Failed:",
    ...failed.map(
      (r) => `  ❌ ${r.specDir}\n     ${(r.errorDetails ?? "").split("\n")[0]}`,
    ),
  ].join("\n");
  await writeFile(reportFilePath, report, "utf8");
  console.log(`\n📄 Report: ${reportFilePath}`);

  // Timing.
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1e9;
  console.log(`⏱️  Total time: ${duration.toFixed(1)}s`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
