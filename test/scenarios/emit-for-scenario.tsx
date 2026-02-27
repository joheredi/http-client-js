/**
 * Emitter output collection utility for scenario testing.
 *
 * Compiles TypeSpec input, runs the emitter pipeline (TCGC → Alloy JSX → render),
 * and collects the generated TypeScript files as a flat record. This bypasses
 * the TypeSpec compiler's module resolution (which requires the emitter to be
 * installed as a package) by calling the emitter components directly.
 *
 * Supports both simple scenarios (TypeSpec wrapped in a default @service namespace)
 * and complex legacy scenarios that define their own @service, imports, and namespace.
 *
 * @module
 */
import { renderAsync, type OutputDirectory } from "@alloy-js/core";
import { createEmitterNamePolicy } from "../../src/utils/name-policy.js";
import { nameConflictResolver } from "../../src/utils/name-conflict-resolver.js";
import { Output } from "@typespec/emitter-framework";
import { FlavorProvider } from "../../src/context/flavor-context.js";
import { EmitterOptionsProvider } from "../../src/context/emitter-options-context.js";
import { EmitterTree, applyClientRenames, azureExternals, coreExternals } from "../../src/emitter.js";
import { Tester, RawTester, TesterWithService, createSdkContextForTest } from "../test-host.js";
import type { FlavorKind } from "../../src/context/flavor-context.js";

/**
 * JSON example block from a scenario file, used for sample generation.
 */
interface JsonExample {
  filename: string;
  rawContent: string;
}

/**
 * Detects whether TypeSpec code already contains a @service decorator,
 * indicating it defines its own service namespace and should NOT be
 * wrapped in the default TesterWithService wrapper.
 *
 * @param code - Raw TypeSpec code from a scenario
 * @returns true if the code defines its own service
 */
function hasServiceDeclaration(code: string): boolean {
  return /@service\b/.test(code);
}

/**
 * Detects whether TypeSpec code has its own import statements,
 * requiring the raw tester (no auto-imports/using) to avoid
 * "imports must come before declarations" errors.
 *
 * @param code - Raw TypeSpec code from a scenario
 * @returns true if the code has import statements
 */
function hasOwnImports(code: string): boolean {
  return /^import\s+"/m.test(code);
}

/**
 * Analyzes TypeSpec code to determine which additional `using` statements
 * are needed beyond the Tester's defaults (Http, Rest, Versioning).
 *
 * Checks for usage of Azure-specific decorators and namespaces, and only
 * adds `using` statements that aren't already present in the code.
 * Uses a Set to prevent duplicate additions.
 *
 * @param code - Raw TypeSpec code from a scenario
 * @returns A string of extra `using` declarations to prepend, or empty string
 */
function buildExtraUsings(code: string): string {
  const usings = new Set<string>();

  /** Helper to add a using statement if not already in the code or set */
  function addUsing(usingStatement: string) {
    if (!code.includes(usingStatement)) {
      usings.add(usingStatement);
    }
  }

  // Check if the code uses XML features
  if (/\bXml\.\b/.test(code)) {
    addUsing("using TypeSpec.Xml;");
  }

  // Check if the code uses Azure Core features
  if (/\b(Azure\.Core|@resource|ResourceRead|ResourceList|LongRunningResourceDelete|ResourceCreateOrReplace|GetResourceOperationStatus|StandardResourceOperations|StandardListQueryParameters|ResourceOperations)\b/.test(code)) {
    addUsing("using Azure.Core;");
  }

  // Check if the code uses Azure Core Traits
  if (/\b(Azure\.Core\.Traits|ServiceTraits|RequestHeadersTrait|NoRepeatableRequests|NoConditionalRequests|SupportsClientRequestId)\b/.test(code)) {
    addUsing("using Azure.Core;");
    addUsing("using Azure.Core.Traits;");
  }

  // Check if the code uses Azure Core Foundations
  if (/\bFoundations\.\b/.test(code)) {
    addUsing("using Azure.Core;");
    addUsing("using Azure.Core.Foundations;");
  }

  // Check if the code uses TCGC decorators
  if (/@@?(clientName|usage|access|override)\b/.test(code)) {
    addUsing("using Azure.ClientGenerator.Core;");
  }

  // Check if the code uses ARM features
  if (/\b(Azure\.ResourceManager|@armProviderNamespace|@armCommonTypesVersion)\b/.test(code)) {
    addUsing("using Azure.ResourceManager;");
  }

  return [...usings].join("\n");
}

/**
 * Detects whether TypeSpec code uses Azure-specific features, indicating
 * that Azure flavor should be used for SDK generation.
 *
 * This checks for Azure Core, Azure Resource Manager, and other Azure-specific
 * namespace usages or imports. When any of these patterns are found, the
 * generated SDK should use Azure-flavored imports (`@azure-rest/core-client`,
 * `@azure/core-auth`, etc.) instead of `@typespec/ts-http-runtime`.
 *
 * @param code - Raw TypeSpec code from a scenario
 * @returns true if the code uses Azure-specific TypeSpec features
 */
export function detectAzureFlavor(code: string): boolean {
  // Match Azure.Core namespace patterns (same patterns that buildExtraUsings
  // uses to add Azure.Core/Azure.ResourceManager using statements)
  return /\bAzure\.Core\b|\bAzure\.ResourceManager\b|@azure-tools\/typespec-azure|@armProviderNamespace\b|@armCommonTypesVersion\b|\bFoundations\.\b|\b(@resource|ResourceRead|ResourceList|LongRunningResourceDelete|ResourceCreateOrReplace|GetResourceOperationStatus|StandardResourceOperations|StandardListQueryParameters|ResourceOperations)\b|\b(Azure\.Core\.Traits|ServiceTraits|RequestHeadersTrait|NoRepeatableRequests|NoConditionalRequests|SupportsClientRequestId)\b/.test(
    code,
  );
}

/**
 * Determines the SDK flavor for a scenario based on explicit YAML config
 * or auto-detection from the TypeSpec code.
 *
 * Priority:
 * 1. Explicit `flavor` in YAML config (highest priority)
 * 2. Auto-detection from Azure-specific TypeSpec patterns
 * 3. Default to "core" flavor
 *
 * @param code - Raw TypeSpec code from a scenario
 * @param yamlConfig - YAML configuration parsed from the scenario
 * @returns The resolved flavor kind ("core" or "azure")
 */
export function resolveFlavor(
  code: string,
  yamlConfig: Record<string, unknown>,
): FlavorKind {
  if (yamlConfig["flavor"] === "azure" || yamlConfig["flavor"] === "core") {
    return yamlConfig["flavor"] as FlavorKind;
  }
  return detectAzureFlavor(code) ? "azure" : "core";
}

/**
 * Compiles TypeSpec code and runs the http-client-js emitter, returning generated files.
 *
 * This function mirrors the `$onEmit` entry point but collects output in memory
 * instead of writing to disk. It:
 * 1. Detects if the code has its own @service — if so, uses plain Tester; otherwise wraps
 * 2. Creates a TCGC SDK context for the compiled program
 * 3. Builds the same JSX component tree as the real emitter
 * 4. Renders via Alloy's `renderAsync()` to produce an output directory tree
 * 5. Flattens the tree into a `Record<string, string>` of file paths to contents
 *
 * @param code - Raw TypeSpec code (may or may not include @service wrapper)
 * @param jsonExamples - Optional JSON example blocks for sample generation
 * @param yamlConfig - Optional YAML config for emitter behavior customization
 * @returns A record mapping relative file paths (e.g. "src/models/models.ts") to file contents
 */
export async function emitForScenario(
  code: string,
  jsonExamples: JsonExample[] = [],
  yamlConfig: Record<string, unknown> = {},
): Promise<Record<string, string>> {
  // Choose the right tester:
  // - withRawContent=true or own imports: use RawTester (no wrapping at all)
  // - own @service but no imports: use Tester with dynamic usings
  // - default: use TesterWithService with dynamic usings
  const useRaw = yamlConfig["withRawContent"] === true || hasOwnImports(code);

  // When withVersionedApiVersion is true, add @versioned(Versions) decorator
  // and a Versions enum to simulate a versioned API. This causes TCGC to mark
  // api-version parameters as client-level (onClient=true, isApiVersionParam=true),
  // matching the legacy test infrastructure behavior.
  const withVersionedApiVersion = yamlConfig["withVersionedApiVersion"] === true;

  let tester;
  if (useRaw) {
    tester = RawTester;
  } else {
    const ownService = hasServiceDeclaration(code);
    // Build extra using statements based on code content analysis
    const extraUsing = buildExtraUsings(code);

    const versionedDecorator = withVersionedApiVersion ? "@versioned(Versions)" : "";
    const versionsEnum = withVersionedApiVersion
      ? 'enum Versions { v2022_05_15_preview: "2022-05-15-preview"}'
      : "";

    if (ownService) {
      // Scenario defines its own @service — just add extra usings before code
      tester = extraUsing
        ? Tester.wrap((x) => `${extraUsing}\n${x}`)
        : Tester;
    } else {
      // No @service — wrap with service namespace, putting extra usings BEFORE namespace
      if (extraUsing || withVersionedApiVersion) {
        tester = Tester.wrap((x) => `
${extraUsing}
#suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
${versionedDecorator}
@service(#{title: "Azure TypeScript Testing"})
namespace Azure.TypeScript.Testing;

${versionsEnum}

${x}
`);
      } else {
        tester = TesterWithService;
      }
    }
  }

  const runner = await tester.createInstance();
  const { program } = await runner.compile(code);

  // Write JSON example files to the virtual filesystem so TCGC can load them.
  // TCGC's loadExamples() reads from {projectRoot}/examples/{apiVersion}/ or
  // {projectRoot}/examples/ (if no versioning). We parse the API version from
  // the TypeSpec code and place files in the correct directory.
  // When withVersionedApiVersion injects a version enum, append the injected
  // version so extractApiVersion can find it.
  if (jsonExamples.length > 0) {
    const codeForVersionDetection = withVersionedApiVersion
      ? `${code}\n"2022-05-15-preview"`
      : code;
    addExamplesToFs(runner.fs, jsonExamples, codeForVersionDetection);
  }

  const sdkContext = await createSdkContextForTest(program);

  // Apply typespec-title-map renames to client names before rendering.
  // This mirrors the $onEmit behavior where client names are mutated
  // in-place before the rendering pipeline runs.
  const titleMap = yamlConfig["typespec-title-map"] as Record<string, string> | undefined;
  if (titleMap) {
    applyClientRenames(sdkContext.sdkPackage.clients, titleMap);
  }

  // Resolve the SDK flavor from YAML config or auto-detection from code patterns.
  // Azure flavor uses Azure SDK package imports (@azure-rest/core-client, etc.)
  // while core flavor uses @typespec/ts-http-runtime.
  const flavor = resolveFlavor(code, yamlConfig);
  const externals = flavor === "azure" ? azureExternals : coreExternals;

  // Extract emitter options from YAML config
  const emitterOptions = {
    includeHeadersInResponse: yamlConfig["include-headers-in-response"] === true,
    experimentalExtensibleEnums: yamlConfig["experimental-extensible-enums"] === true,
    ignoreNullableOnOptional:
      (yamlConfig["ignore-nullable-on-optional"] as boolean | undefined) ?? (flavor === "azure"),
  };

  const output = (
    <Output
      program={program}
      namePolicy={createEmitterNamePolicy()}
      nameConflictResolver={nameConflictResolver}
      externals={externals}
    >
      <FlavorProvider flavor={flavor}>
        <EmitterOptionsProvider options={emitterOptions}>
          <EmitterTree sdkContext={sdkContext} />
        </EmitterOptionsProvider>
      </FlavorProvider>
    </Output>
  );

  const tree = await renderAsync(output);
  return collectFiles(tree);
}

/**
 * Flattens an Alloy OutputDirectory tree into a flat record of file paths to contents.
 *
 * Recursively walks the directory tree produced by `renderAsync()`. In Alloy's output
 * tree, each entry has a `path` property containing the FULL relative path from the
 * root — not a path relative to its parent directory. So we use each entry's `path`
 * directly without concatenating parent paths.
 *
 * @param dir - The root OutputDirectory from Alloy's render pipeline
 * @returns A record mapping relative file paths to their string contents
 */
function collectFiles(dir: OutputDirectory): Record<string, string> {
  const files: Record<string, string> = {};

  for (const entry of dir.contents) {
    if ("contents" in entry) {
      if (Array.isArray(entry.contents)) {
        // It's a directory — recurse (paths are already absolute from root)
        Object.assign(files, collectFiles(entry as OutputDirectory));
      } else {
        // It's a file — use its path directly
        files[entry.path] = entry.contents as string;
      }
    }
  }

  return files;
}

/**
 * Extracts the API version string from TypeSpec code by matching version-like
 * patterns (e.g., "2021-10-01-preview") in enum definitions.
 *
 * Returns the last matched version because TypeSpec versioning enums list
 * versions chronologically, and TCGC uses the latest version to find examples.
 *
 * @param code - The raw TypeSpec code from a scenario
 * @returns The API version string, or undefined if no versioning is found
 */
function extractApiVersion(code: string): string | undefined {
  // Match date-based version strings in quotes or backticks (e.g., "2021-10-01-preview")
  const versionPattern = /["`](\d{4}-\d{2}-\d{2}(?:-[\w]+)?)["`]/g;
  let lastMatch: string | undefined;
  let match;
  while ((match = versionPattern.exec(code)) !== null) {
    lastMatch = match[1];
  }
  return lastMatch;
}

/**
 * Writes JSON example files to the test runner's virtual filesystem so TCGC
 * can load them during SDK context creation.
 *
 * TCGC's `loadExamples()` searches for `.json` files in the examples directory:
 * - If the service has versioning: `./examples/{apiVersion}/`
 * - If no versioning: `./examples/`
 *
 * The virtual filesystem's `stat()` derives directory existence from file paths,
 * so adding a file at `./examples/v1/test.json` implicitly creates the directory
 * structure needed for TCGC's directory existence check.
 *
 * @param fs - The test file system from the tester instance
 * @param examples - JSON example blocks parsed from the scenario markdown
 * @param code - The raw TypeSpec code (used to extract API version)
 */
function addExamplesToFs(
  fs: { addTypeSpecFile(path: string, contents: string): void },
  examples: JsonExample[],
  code: string,
): void {
  const apiVersion = extractApiVersion(code);
  const baseDir = apiVersion
    ? `./examples/${apiVersion}`
    : "./examples";

  for (const example of examples) {
    const filePath = `${baseDir}/${example.filename}.json`;
    fs.addTypeSpecFile(filePath, example.rawContent);
  }
}
