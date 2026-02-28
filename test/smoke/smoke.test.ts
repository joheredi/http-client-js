/**
 * Smoke test for generated TypeScript libraries.
 *
 * Validates the full emitter pipeline end-to-end:
 * 1. Run `tsp compile` with the local emitter (via absolute path in emit config)
 * 2. The TypeSpec compiler loads the emitter, calls `$onEmit`, writes files to disk
 * 3. Run `npm install` on the generated library
 * 4. Run `npm run build` (tsc) to compile the generated code
 *
 * This tests that:
 * - The emitter is correctly loadable by the TypeSpec compiler
 * - `$lib` registration and options schema work
 * - The full compile → emit → install → build pipeline succeeds
 *
 * This test is excluded from the main `pnpm test` pipeline to avoid
 * adding network-dependent overhead. Run it separately with `pnpm test:smoke`.
 *
 * Prerequisites: the emitter must be built (`pnpm build`) before running.
 */
import { mkdtemp, rm, writeFile } from "fs/promises";
import { execSync } from "child_process";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { describe, it, expect, afterAll } from "vitest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Absolute path to the emitter project root. */
const emitterRoot = resolve(__dirname, "../..");

/** Absolute path to the .tsp fixture (must be inside the project tree for import resolution). */
const fixturePath = join(__dirname, "fixtures", "main.tsp");

/**
 * Runs a shell command, capturing output for diagnostics on failure.
 */
function run(command: string, cwd: string, timeoutMs: number): string {
  try {
    return execSync(command, {
      cwd,
      timeout: timeoutMs,
      stdio: "pipe",
      env: {
        ...process.env,
        npm_config_fund: "false",
        npm_config_audit: "false",
      },
    }).toString();
  } catch (error: any) {
    const stderr = error.stderr?.toString() ?? "";
    const stdout = error.stdout?.toString() ?? "";
    throw new Error(
      `Command failed: ${command}\n` +
        `Exit code: ${error.status}\n` +
        `stderr: ${stderr}\n` +
        `stdout: ${stdout}`,
    );
  }
}

describe("smoke test", () => {
  let tempDir: string | undefined;

  it(
    "tsp compile → npm install → npm run build",
    { timeout: 180_000 },
    async () => {
      // 1. Create temp directory for output + config
      tempDir = await mkdtemp(join(tmpdir(), "http-client-js-smoke-"));

      // 2. Generate a tspconfig.yaml that references the local emitter by absolute path
      const tspConfig = `
emit:
  - ${emitterRoot}
options:
  http-client-js:
    generate-metadata: true
    package-name: smoke-test-sdk
    package-version: "1.0.0"
    emitter-output-dir: "{output-dir}/http-client-js"
`;
      await writeFile(join(tempDir, "tspconfig.yaml"), tspConfig);

      // 3. Run tsp compile from the emitter project root (where @typespec/http etc. are installed).
      //    The fixture .tsp file is inside the project tree so its imports resolve.
      const tspOutput = run(
        `npx tsp compile ${fixturePath} --config ${join(tempDir, "tspconfig.yaml")} --output-dir ${tempDir}`,
        emitterRoot,
        60_000,
      );
      expect(tspOutput).toContain("Compilation completed successfully");

      // 4. Verify generated files exist
      const outputDir = join(tempDir, "http-client-js");
      const { existsSync, readFileSync } = await import("fs");
      expect(existsSync(join(outputDir, "package.json"))).toBe(true);
      expect(existsSync(join(outputDir, "tsconfig.json"))).toBe(true);
      expect(existsSync(join(outputDir, "src"))).toBe(true);

      // Verify package.json has correct name and build script
      const pkgJson = JSON.parse(
        readFileSync(join(outputDir, "package.json"), "utf-8"),
      );
      expect(pkgJson.name).toBe("smoke-test-sdk");
      expect(pkgJson.scripts.build).toBeDefined();

      // 5. Install dependencies
      run("npm install --prefer-offline", outputDir, 120_000);

      // 6. Build the library
      run("npm run build", outputDir, 60_000);

      // 7. Verify build output exists
      expect(existsSync(join(outputDir, "dist"))).toBe(true);
    },
  );
});
