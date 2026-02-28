import { type Children } from "@alloy-js/core";
import { PackageDirectory } from "@alloy-js/typescript";
import { useEmitterOptions } from "../context/emitter-options-context.js";
import { useFlavorContext } from "../context/flavor-context.js";
import { useSdkContext } from "../context/sdk-context.js";
import { ReadmeFile } from "./metadata/readme-file.js";
import { LicenseFile } from "./metadata/license-file.js";
import { ApiExtractorConfig } from "./metadata/api-extractor-config.js";
import { EslintConfig } from "./metadata/eslint-config.js";
import { VitestConfigs } from "./metadata/vitest-configs.js";

/**
 * Props for the {@link PackageScaffold} component.
 */
export interface PackageScaffoldProps {
  /** Child components (source files) to render inside the package. */
  children?: Children;
}

/**
 * Derives a package name from the SDK context when no explicit name is provided.
 */
function derivePackageName(sdkContext: {
  sdkPackage: { clients: Array<{ name?: string }> };
}): string {
  const firstClient = sdkContext.sdkPackage.clients[0];
  return firstClient?.name?.replace(/Client$/, "").toLowerCase() ?? "unknown";
}

/**
 * Conditional wrapper that provides package scaffolding when metadata generation
 * is enabled. When `generateMetadata` is false, this is a transparent pass-through
 * that does not affect the component tree.
 *
 * When enabled, wraps children in `ts.PackageDirectory` which:
 * - Auto-generates package.json with dependencies detected from code references
 * - Auto-generates tsconfig.json
 * - Provides `PackageContext` for export tracking
 *
 * Additional metadata files (README, LICENSE, etc.) are rendered as siblings
 * to the source directory inside the package.
 */
export function PackageScaffold(props: PackageScaffoldProps) {
  const { generateMetadata, packageName, packageVersion } = useEmitterOptions();

  if (!generateMetadata) {
    return props.children;
  }

  const { flavor } = useFlavorContext();
  const sdkContext = useSdkContext();
  const resolvedName = packageName ?? derivePackageName(sdkContext);
  const resolvedVersion = packageVersion ?? "1.0.0-beta.1";

  return (
    <PackageDirectory
      name={resolvedName}
      version={resolvedVersion}
      path="."
      type="module"
      license="MIT"
      devDependencies={{
        "@types/node": "^18.0.0",
      }}
      scripts={{
        build: "tsc --skipLibCheck",
        "build:samples": "echo skipped",
        "build:test": "echo skipped",
        "check-format":
          'prettier --list-different --config .prettierrc.json "src/**/*.ts" "test/**/*.ts" "*.{js,json}"',
        clean:
          "rimraf --glob dist dist-browser dist-esm test-dist temp types *.tgz *.log",
        "extract-api":
          "rimraf review && mkdirp ./review && api-extractor run --local",
        format:
          'prettier --write --config .prettierrc.json "src/**/*.ts" "test/**/*.ts" "*.{js,json}"',
        lint: "eslint package.json api-extractor.json src test",
        "lint:fix":
          "eslint package.json api-extractor.json src test --fix --fix-type [problem,suggestion]",
        test: "vitest run",
        "test:node": "vitest run",
        "test:browser": "vitest run --browser",
      }}
    >
      {props.children}
      <ReadmeFile packageName={resolvedName} />
      <LicenseFile />
      {flavor === "azure" && <ApiExtractorConfig />}
      {flavor === "azure" && <EslintConfig />}
      <VitestConfigs />
    </PackageDirectory>
  );
}
