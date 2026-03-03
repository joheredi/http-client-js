/**
 * Calculates and reports Spector e2e test coverage.
 *
 * Reads the coverage JSON file produced by the Spector mock server during e2e
 * test runs and prints a summary of which scenarios passed, failed, or are not
 * yet implemented.
 *
 * Scenarios listed in NOT_APPLICABLE_SCENARIOS are reclassified from their
 * spector-reported status to "not-applicable" and excluded from the coverage
 * denominator. These are scenarios that test code-generation cosmetics (e.g.,
 * JSDoc formatting) rather than runtime behavior.
 *
 * Usage:
 *   npx tsx eng/scripts/calculate-coverage.ts
 *
 * The coverage file is written by the Spector server to temp/spector-coverage.json
 * during the e2e test global setup/teardown lifecycle.
 *
 * @see test/e2e/setup/global-setup.ts — where the coverage file path is configured
 * @see submodules/typespec/packages/http-client-js/eng/scripts/calculate-coverage.js — reference
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..");

/** Path to the Spector coverage JSON file produced during e2e tests. */
const coverageFilePath = join(projectRoot, "temp", "spector-coverage.json");

/**
 * Scenarios that are not applicable for e2e runtime testing.
 *
 * These test documentation/JSDoc formatting in generated code — a code-generation
 * cosmetic concern that is better validated via scenario tests (which verify
 * generated output text) rather than e2e tests (which verify runtime behavior
 * against a mock server). Neither the legacy emitter nor any reference emitter
 * tests these via e2e.
 */
const NOT_APPLICABLE_SCENARIOS: string[] = [
  "Documentation_Lists_bulletPointsModel",
  "Documentation_Lists_bulletPointsOp",
  "Documentation_Lists_numbered",
  "Documentation_TextFormatting_boldText",
  "Documentation_TextFormatting_italicText",
  "Documentation_TextFormatting_combinedFormatting",
];

interface CoverageReport {
  scenariosMetadata: {
    version: string;
    commit: string;
    packageName: string;
  };
  results: Record<string, string>;
  createdAt: string;
}

/**
 * Reads and parses the Spector coverage file, then prints a human-readable
 * summary including pass/fail/not-implemented counts and lists uncovered scenarios.
 */
async function calculateCoverage(): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(coverageFilePath, "utf8");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.error(`[coverage] Coverage file not found: ${coverageFilePath}`);
      console.error(
        "[coverage] Run 'pnpm test:e2e' first to generate coverage data.",
      );
      process.exit(1);
    }
    throw err;
  }

  const reports: CoverageReport[] = JSON.parse(raw);

  if (!Array.isArray(reports) || reports.length === 0) {
    console.error("[coverage] Coverage file is empty or malformed.");
    process.exit(1);
  }

  const { results, scenariosMetadata, createdAt } = reports[0];

  // Reclassify not-applicable scenarios before computing stats.
  // This overrides whatever status the spector server assigned (typically
  // "not-implemented" since these specs are skipped via .testignore).
  for (const scenario of NOT_APPLICABLE_SCENARIOS) {
    if (scenario in results) {
      results[scenario] = "not-applicable";
    }
  }

  const entries = Object.entries(results);
  const total = entries.length;

  const passed = entries.filter(([, status]) => status === "pass");
  const failed = entries.filter(([, status]) => status === "fail");
  const notImplemented = entries.filter(
    ([, status]) => status === "not-implemented",
  );
  const notSupported = entries.filter(
    ([, status]) => status === "not-supported",
  );
  const notApplicable = entries.filter(
    ([, status]) => status === "not-applicable",
  );

  // Exclude not-applicable and not-supported scenarios from the denominator.
  // These aren't runtime behavior tests, so they shouldn't count against coverage.
  const effectiveTotal = total - notApplicable.length - notSupported.length;
  const coveragePercent =
    effectiveTotal > 0
      ? ((passed.length / effectiveTotal) * 100).toFixed(2)
      : "0.00";

  console.log("═══════════════════════════════════════════════════════");
  console.log("  Spector E2E Coverage Report");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Package:    ${scenariosMetadata.packageName}`);
  console.log(`  Version:    ${scenariosMetadata.version}`);
  console.log(`  Commit:     ${scenariosMetadata.commit.slice(0, 12)}`);
  console.log(`  Created:    ${createdAt}`);
  console.log("───────────────────────────────────────────────────────");
  console.log(`  Total scenarios:    ${total}`);
  console.log(`  Passed:             ${passed.length}`);
  console.log(`  Failed:             ${failed.length}`);
  console.log(`  Not implemented:    ${notImplemented.length}`);
  if (notSupported.length > 0) {
    console.log(`  Not supported:      ${notSupported.length}`);
  }
  if (notApplicable.length > 0) {
    console.log(`  Not applicable:     ${notApplicable.length}`);
  }
  console.log("───────────────────────────────────────────────────────");
  console.log(
    `  Coverage:           ${coveragePercent}% (${passed.length}/${effectiveTotal})`,
  );
  console.log("═══════════════════════════════════════════════════════");

  if (failed.length > 0) {
    console.log("\n  FAILED scenarios:");
    for (const [name] of failed.sort()) {
      console.log(`    ✗ ${name}`);
    }
  }

  if (notImplemented.length > 0) {
    console.log("\n  NOT IMPLEMENTED scenarios:");
    for (const [name] of notImplemented.sort()) {
      console.log(`    - ${name}`);
    }
  }

  console.log("");
}

calculateCoverage().catch((err) => {
  console.error("[coverage] Unexpected error:", err);
  process.exit(1);
});
