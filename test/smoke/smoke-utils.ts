/**
 * Shared smoke test harness.
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
 * Smoke tests are excluded from the main `pnpm test` pipeline to avoid
 * adding network-dependent overhead. Run them separately with `pnpm test:smoke`.
 *
 * Prerequisites: the emitter must be built (`pnpm build`) before running.
 */
import { rm, writeFile, mkdir } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, it, expect, beforeAll } from "vitest";

const smokeDir = fileURLToPath(new URL(".", import.meta.url));
const emitterRoot = resolve(smokeDir, "../..");

export interface SmokeTestConfig {
  /** Name used for the describe block, fixture subfolder, and output directory. */
  name: string;
  /** Package name written into the generated package.json. */
  packageName: string;
  /** Emitter flavor. */
  flavor: "azure" | "standard";
  /** Package version. Defaults to "1.0.0". */
  packageVersion?: string;
  /** Entry .tsp file relative to the fixture subfolder. Defaults to "main.tsp". */
  entryFile?: string;
  /** Whether to enable experimental extensible enums support. Defaults to false. */
  experimentalExtensibleEnums?: boolean;
}

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

/**
 * Defines a full smoke test suite for a given fixture.
 *
 * Usage in a test file:
 * ```ts
 * import { defineSmokeTest } from "./smoke-utils.js";
 *
 * defineSmokeTest({
 *   name: "my-service",
 *   packageName: "my-service-sdk",
 *   flavor: "azure",
 * });
 * ```
 */
export function defineSmokeTest(config: SmokeTestConfig): void {
  const {
    name,
    packageName,
    flavor,
    packageVersion = "1.0.0",
    entryFile = "main.tsp",
    experimentalExtensibleEnums = false,
  } = config;

  const fixturePath = join(smokeDir, "fixtures", name, entryFile);
  const outputRoot = join(emitterRoot, "temp", "smoke", name);

  describe(`${name} smoke test`, () => {
    beforeAll(async () => {
      await rm(outputRoot, { recursive: true, force: true });
      await mkdir(outputRoot, { recursive: true });
    });

    it(
      "tsp compile → npm install → npm run build",
      { timeout: 180_000 },
      async () => {
        // 1. Generate tspconfig.yaml referencing the local emitter
        const tspConfig = `
emit:
  - ${emitterRoot}
options:
  http-client-js:
    generate-metadata: true
    flavor: ${flavor}
    package-name: "${packageName}"
    package-version: "${packageVersion}"
    emitter-output-dir: "{output-dir}/http-client-js"
    examples-dir: "{project-root}/examples"
    experimental-extensible-enums: ${experimentalExtensibleEnums}
`;
        await writeFile(join(outputRoot, "tspconfig.yaml"), tspConfig);

        // 2. Compile
        const tspOutput = run(
          `npx tsp compile ${fixturePath} --config ${join(outputRoot, "tspconfig.yaml")} --output-dir ${outputRoot}`,
          emitterRoot,
          60_000,
        );
        expect(tspOutput).toContain("Compilation completed successfully");

        // 3. Verify generated files
        const outputDir = join(outputRoot, "http-client-js");
        expect(existsSync(join(outputDir, "package.json"))).toBe(true);
        expect(existsSync(join(outputDir, "tsconfig.json"))).toBe(true);
        expect(existsSync(join(outputDir, "src"))).toBe(true);

        const pkgJson = JSON.parse(
          readFileSync(join(outputDir, "package.json"), "utf-8"),
        );
        expect(pkgJson.name).toBe(packageName);
        expect(pkgJson.scripts.build).toBeDefined();

        // 4. Install & build
        run("npm install --prefer-offline", outputDir, 120_000);
        run("npm run build", outputDir, 60_000);

        // 5. Verify build output
        expect(existsSync(join(outputDir, "dist"))).toBe(true);
      },
    );
  });
}
