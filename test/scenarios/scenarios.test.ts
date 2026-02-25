/**
 * Scenario test runner for the http-client-js emitter.
 *
 * Scenarios are split into per-directory test files (scenarios-*.test.ts)
 * for parallel execution across vitest workers. This file is kept as a
 * backward-compatible entry point that re-exports the normalize-imports
 * test and serves as documentation.
 *
 * ## Running Tests
 *
 * ```bash
 * pnpm test                           # Run all tests including scenarios
 * pnpm test test/scenarios            # Run only scenario tests
 * ```
 *
 * ## Updating Snapshots
 *
 * ```bash
 * SCENARIOS_UPDATE=true pnpm test     # Regenerate expected output blocks
 * RECORD=true pnpm test               # Alias for SCENARIOS_UPDATE
 * ```
 *
 * @see test/scenarios/scenario-harness.ts for the harness implementation
 * @see test/scenarios/emit-for-scenario.tsx for the emitter integration
 * @see test/scenarios/cases/ - each subdirectory has a scenarios.test.ts file
 */
import { readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const casesDir = join(__dirname, "cases");

// Scenario tests are colocated with their case directories:
// cases/models/scenarios.test.ts, cases/operations/scenarios.test.ts, etc.
// Each file runs its subset of scenarios in a separate vitest worker fork.
// See test/scenarios/scenario-setup.ts for shared initialization.

describe("scenario coverage", () => {
  it("every case directory with .md files has a scenarios.test.ts", () => {
    const dirs = readdirSync(casesDir).filter((name) =>
      statSync(join(casesDir, name)).isDirectory(),
    );

    const missing = dirs.filter((dir) => {
      const dirPath = join(casesDir, dir);
      const hasMdFiles = findMdFiles(dirPath);
      const hasTestFile = existsSync(join(dirPath, "scenarios.test.ts"));
      return hasMdFiles && !hasTestFile;
    });

    expect(
      missing,
      `These case directories have .md scenario files but no scenarios.test.ts:\n` +
        missing.map((d) => `  - cases/${d}/`).join("\n") +
        `\n\nAdd a scenarios.test.ts file. See cases/models/scenarios.test.ts for an example.`,
    ).toEqual([]);
  });
});

function findMdFiles(dir: string): boolean {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.endsWith(".md")) return true;
    if (statSync(full).isDirectory() && findMdFiles(full)) return true;
  }
  return false;
}
