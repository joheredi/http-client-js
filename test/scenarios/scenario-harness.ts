/**
 * Scenario test runner for the http-client-js emitter.
 *
 * Discovers `.md` files in `test/scenarios/`, parses them into scenarios with
 * TypeSpec input and expected TypeScript output blocks, compiles the TypeSpec,
 * runs the emitter, and validates the output matches expectations.
 *
 * ## Markdown Format
 *
 * Each scenario file contains one or more scenarios separated by H1 headers:
 *
 * ```markdown
 * # Scenario Title
 *
 * Optional description text.
 *
 * ```tsp
 * // TypeSpec input code
 * model Widget { id: string; }
 * op getWidget(): Widget;
 * ```
 *
 * ## Expected Output
 *
 * ```ts src/models/models.ts interface Widget
 * export interface Widget {
 *   id: string;
 * }
 * ```
 * ```
 *
 * ### Code Block Heading Format
 *
 * Expected output blocks use the heading format:
 * `<lang> <filepath> [type] [name]`
 *
 * - `lang`: `ts` or `typescript`
 * - `filepath`: relative path in emitter output (e.g., `src/models/models.ts`)
 * - `type` (optional): `interface`, `function`, `class`, `enum`, `type`
 * - `name` (optional): name of the declaration to extract
 *
 * When `type` and `name` are provided, the harness extracts only that specific
 * declaration from the generated file using tree-sitter AST parsing, allowing
 * focused assertions on individual declarations.
 *
 * ### Special Prefixes
 *
 * - `# only: Title` — Run only this scenario (maps to `describe.only`)
 * - `# skip: Title` — Skip this scenario (maps to `describe.skip`)
 *
 * ### Snapshot Update
 *
 * Set `SCENARIOS_UPDATE=true` or `RECORD=true` to regenerate expected output
 * blocks from actual emitter output:
 *
 * ```bash
 * SCENARIOS_UPDATE=true pnpm test
 * ```
 *
 * @module
 */
import {
  type SnippetExtractor,
  type LanguageConfiguration,
} from "@typespec/emitter-framework/testing";
import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { format } from "prettier";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emitForScenario } from "./emit-for-scenario.js";

const SCENARIOS_UPDATE =
  process.env["RECORD"] === "true" || process.env["SCENARIOS_UPDATE"] === "true";

// ─── Import Normalization ───────────────────────────────────────────────

/**
 * Normalizes TypeScript import statements for stable comparison.
 *
 * Alloy generates imports in non-deterministic order based on refkey resolution
 * order. This causes different import specifier orderings between runs.
 * Prettier preserves specifier order, so differently-ordered imports produce
 * different formatted output. Import ordering is an acceptable difference
 * per the PRD.
 *
 * This function:
 * 1. Finds all import statements (including multi-line)
 * 2. Sorts import specifiers alphabetically within each statement
 * 3. Sorts import statements by their module path
 *
 * @param code - The TypeScript code string to normalize
 * @returns The code with normalized import ordering
 */
function normalizeImports(code: string): string {
  // Match import statements including multi-line ones.
  // Handles: import { A, B } from "x"; and import {\n  A,\n  B,\n} from "x";
  const importRegex = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)";/gs;

  // Collect all imports and their positions
  const replacements: { start: number; end: number; module: string; normalized: string }[] = [];

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const typePrefix = match[1] ? "type " : "";
    const specifiersRaw = match[2];
    const module = match[3];

    // Parse specifiers (handle newlines, trailing commas, whitespace)
    const specifiers = specifiersRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .sort((a, b) => {
        // Sort by the binding name (ignoring "type " prefix and " as X" suffix)
        const nameA = a.replace(/^type\s+/, "").replace(/\s+as\s+.*/, "").trim();
        const nameB = b.replace(/^type\s+/, "").replace(/\s+as\s+.*/, "").trim();
        return nameA.localeCompare(nameB);
      });

    const normalized = `import ${typePrefix}{ ${specifiers.join(", ")} } from "${module}";`;
    replacements.push({
      start: match.index,
      end: match.index + match[0].length,
      module,
      normalized,
    });
  }

  if (replacements.length === 0) return code;

  // Sort imports by module path
  const sortedImports = [...replacements].sort((a, b) => a.module.localeCompare(b.module));

  // Replace each import with its normalized version (maintaining original positions
  // but with sorted specifiers and sorted import order)
  let result = "";
  let lastEnd = 0;

  // Use original positions for non-import content, but replace imports with sorted versions
  const firstImportStart = replacements[0].start;
  const lastImportEnd = replacements[replacements.length - 1].end;

  // Content before imports
  result += code.substring(0, firstImportStart);

  // Sorted imports
  result += sortedImports.map((i) => i.normalized).join("\n");

  // Content after imports
  result += code.substring(lastImportEnd);

  return result;
}

// ─── Types ──────────────────────────────────────────────────────────────

interface ScenarioFileId {
  path: string;
  relativePath: string;
}

interface ScenarioFile extends ScenarioFileId {
  scenarios: Scenario[];
}

interface Scenario {
  title: string;
  content: ScenarioContents;
}

interface ScenarioContents {
  lines: Array<string | ScenarioCodeBlock>;
  specBlock: { kind: "spec"; content: string };
  testBlocks: TestCodeBlock[];
  /** JSON example blocks parsed from ```json for <operationId> blocks */
  jsonExamples: JsonExampleBlock[];
  /** YAML config blocks parsed from ```yaml blocks */
  yamlConfig: Record<string, unknown>;
}

/**
 * A JSON example block from a scenario file.
 * Used by the legacy emitter for sample generation — each block provides
 * example request/response data for a specific operation.
 */
interface JsonExampleBlock {
  /** Filename derived from the heading (e.g., "json_for_Widgets_ListWidgets") */
  filename: string;
  /** Raw JSON content of the example */
  rawContent: string;
}

interface TestCodeBlock {
  kind: "test";
  heading: string;
  content: string;
  expectation: CodeBlockExpectation;
}

type ScenarioCodeBlock =
  | { kind: "spec"; content: string }
  | { kind: "json"; heading: string; content: string }
  | { kind: "yaml"; content: string }
  | TestCodeBlock;

// ─── Legacy Category Name Resolution ────────────────────────────────────

/**
 * Known legacy category names used in the legacy emitter's scenario files.
 * These are short names like "models", "operations", etc. that map to
 * actual file paths in the emitter output.
 */
const LEGACY_CATEGORIES: Record<string, (outputs: Record<string, string>) => string | undefined> = {
  models: (outputs) => findOutputFile(outputs, /models\/models\.ts$/),
  "models:withOptions": (outputs) => findOutputFile(outputs, /api\/.*options\.ts$/),
  operations: (outputs) => findOutputFile(outputs, /api\/operations\.ts$/),
  clientContext: (outputs) => findOutputFile(outputs, /Context\.ts$/),
  classicClient: (outputs) =>
    findOutputFile(outputs, /Client\.ts$/, (p) => !p.includes("Context")),
  "root index": (outputs) => findOutputFile(outputs, /^src\/index\.ts$/),
  samples: (outputs) => findOutputFile(outputs, /samples-dev\//),
};

/**
 * Finds the first output file matching a pattern, with an optional filter.
 *
 * Used to resolve legacy category names (like "models") to actual file paths
 * in the emitter output (like "src/models/models.ts").
 *
 * @param outputs - Record of emitter output files (path → content)
 * @param pattern - Regex pattern to match against file paths
 * @param filter - Optional additional filter function
 * @returns The first matching file path, or undefined if none match
 */
function findOutputFile(
  outputs: Record<string, string>,
  pattern: RegExp,
  filter?: (path: string) => boolean,
): string | undefined {
  return Object.keys(outputs).find((p) => pattern.test(p) && (!filter || filter(p)));
}

/**
 * Checks whether a file identifier is a legacy category name rather than
 * a real file path. Legacy categories don't contain "/" characters.
 *
 * @param file - The file identifier from a code block heading
 * @returns true if it's a legacy category name
 */
function isLegacyCategory(file: string): boolean {
  return !file.includes("/");
}

/**
 * Resolves a legacy category name to an actual file path in the emitter output.
 *
 * @param category - The legacy category name (e.g., "models", "operations")
 * @param outputs - Record of emitter output files
 * @returns The resolved file path
 * @throws If the category is unknown or no matching file is found
 */
function resolveLegacyCategory(category: string, outputs: Record<string, string>): string {
  const resolver = LEGACY_CATEGORIES[category];
  if (!resolver) {
    throw new Error(
      `Unknown legacy category "${category}". Known categories: ${Object.keys(LEGACY_CATEGORIES).join(", ")}`,
    );
  }
  const file = resolver(outputs);
  if (!file) {
    throw new Error(
      `No output file found for legacy category "${category}". Available files:\n  ${Object.keys(outputs).join("\n  ")}`,
    );
  }
  return file;
}

// ─── Code Block Expectation Parsing ─────────────────────────────────────

/**
 * Query for extracting a specific element from a generated file.
 * Corresponds to the optional `[type] [name]` suffix in code block headings.
 */
interface ElementQuery {
  /** Type to query: interface, function, class, enum, or type */
  type: string;
  /** Name of the declaration to extract */
  name: string;
}

/**
 * Parsed code block heading that specifies what file and optional element
 * the code block expectation is asserting against.
 */
interface CodeBlockQuery {
  /** Language identifier (e.g., "ts", "typescript") */
  lang: string;
  /** File path in the emitter output (e.g., "src/models/models.ts") */
  file: string;
  /** Optional query for a specific element in the file */
  query?: ElementQuery;
}

/**
 * A code block expectation combining the query (what to look for)
 * with the expected content (what it should match).
 */
interface CodeBlockExpectation extends CodeBlockQuery {
  /** Expected content of the code block */
  expected: string;
}

/**
 * Parses a markdown code block heading into a structured expectation.
 *
 * Supports two formats:
 * 1. **File path format**: `ts src/path/file.ts [type] [name]`
 * 2. **Legacy category format**: `ts models [type] [name]`, `ts root index`, etc.
 *
 * For legacy categories, the file path is resolved at query time via
 * `resolveLegacyCategory()`. Multi-word categories like "root index" are
 * detected and joined before parsing type/name.
 *
 * Examples:
 * - `ts src/models/models.ts` — full file comparison (path format)
 * - `ts models interface Widget` — extract interface from models (legacy format)
 * - `ts root index` — full root index file (legacy 2-word category)
 * - `ts models:withOptions` — options file (legacy category with modifier)
 *
 * @param heading - The code block heading (text after ```)
 * @param content - The code block content (expected output)
 * @returns Parsed expectation with file path and optional element query
 */
function parseCodeblockExpectation(heading: string, content: string): CodeBlockExpectation {
  const parts = heading.split(" ");
  const lang = parts[0];

  if (parts.length < 2) {
    throw new Error(
      `Invalid code block heading: "${heading}". Missing file path. Expected format: "<lang> <path>"`,
    );
  }

  // Handle multi-word legacy categories (e.g., "root index")
  // If parts[1] + " " + parts[2] form a known category, join them
  let file: string;
  let restStart: number;

  const twoWordCategory = parts.length >= 3 ? `${parts[1]} ${parts[2]}` : "";
  if (LEGACY_CATEGORIES[twoWordCategory]) {
    file = twoWordCategory;
    restStart = 3;
  } else {
    file = parts[1];
    restStart = 2;
  }

  const type = parts[restStart];
  const name = parts[restStart + 1];

  if (type && !name) {
    throw new Error(
      `Invalid code block heading: "${heading}". Missing name when using type. Expected format: "<lang> <path> [type] [name]"`,
    );
  }

  return {
    lang,
    file,
    query: type ? { type, name } : undefined,
    expected: content,
  };
}

/**
 * Extracts the relevant content from emitter output for a code block query.
 *
 * If the query specifies a `type` and `name`, uses the snippet extractor to
 * pull out just that declaration (e.g., a single interface). Otherwise, returns
 * the full file content.
 *
 * Supports both file path format (e.g., "src/models/models.ts") and legacy
 * category names (e.g., "models", "operations"). Legacy categories are resolved
 * to actual file paths via `resolveLegacyCategory()`.
 *
 * For the special "samples" category, all sample files are concatenated with
 * file path comments, matching the legacy emitter's output format.
 *
 * @param extractor - Tree-sitter snippet extractor
 * @param expectation - The code block query (file path + optional element query)
 * @param outputs - Record of emitter output files (path → content)
 * @returns The extracted code string matching the query
 * @throws If the file is not found or the element is not found in the file
 */
function getExcerptForQuery(
  extractor: SnippetExtractor,
  expectation: CodeBlockQuery,
  outputs: Record<string, string>,
): string {
  let filePath = expectation.file;

  // Handle legacy "samples" category specially — concatenate all sample files
  if (filePath === "samples") {
    return getSamplesConcatenated(outputs);
  }

  // Resolve legacy category names to actual file paths
  if (isLegacyCategory(filePath)) {
    filePath = resolveLegacyCategory(filePath, outputs);
  }

  const content = outputs[filePath];
  if (!content) {
    throw new Error(
      `File ${filePath} not found in emitted files:\n ${Object.keys(outputs).join("\n")}`,
    );
  }

  if (!expectation.query) {
    return content;
  }

  const { type, name } = expectation.query;
  let excerpt: string | null = null;

  switch (type) {
    case "interface":
      excerpt = extractor.getInterface(content, name);
      break;
    case "type":
      excerpt = extractor.getTypeAlias(content, name);
      break;
    case "enum":
      excerpt = extractor.getEnum(content, name);
      break;
    case "function":
      excerpt = extractor.getFunction(content, name);
      break;
    case "class":
      excerpt = extractor.getClass(content, name);
      break;
    case "alias":
      // Legacy format uses "alias" for type aliases
      excerpt = extractor.getTypeAlias(content, name);
      break;
    default:
      throw new Error("Unsupported type in code block expectation: " + type);
  }

  if (!excerpt) {
    throw new Error(
      `Could not find ${type} "${name}" in file "${filePath}".`,
    );
  }

  return excerpt;
}

/**
 * Concatenates all sample files from the emitter output into a single string,
 * with file path comments matching the legacy emitter's format.
 *
 * The legacy emitter outputs samples as a single string with
 * `/** This file path is /path/to/sample.ts *​/` comments separating each file.
 *
 * @param outputs - Record of emitter output files
 * @returns Concatenated sample file contents with path comments
 */
function getSamplesConcatenated(outputs: Record<string, string>): string {
  const sampleFiles = Object.entries(outputs)
    .filter(([path]) => path.includes("samples-dev/"))
    .sort(([a], [b]) => a.localeCompare(b));

  if (sampleFiles.length === 0) {
    throw new Error(
      `No sample files found in emitted output. Available files:\n  ${Object.keys(outputs).join("\n  ")}`,
    );
  }

  return sampleFiles
    .map(([path, content]) => `/** This file path is /${path} */\n ${content}`)
    .join("\n");
}

// ─── MD Parser ──────────────────────────────────────────────────────────

/**
 * Discovers all `.md` scenario files recursively under a directory.
 *
 * Walks the directory tree and returns file identifiers with both absolute
 * and relative paths. Only `.md` files are included.
 *
 * @param dir - Root directory to search
 * @returns Array of scenario file identifiers
 */
function discoverScenarios(dir: string): ScenarioFileId[] {
  const scenarios: ScenarioFileId[] = [];

  function recurse(current: string) {
    const children = readdirSync(join(dir, current));
    for (const child of children) {
      const fullPath = join(dir, current, child);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        recurse(join(current, child));
      } else if (child.endsWith(".md")) {
        scenarios.push({ path: fullPath, relativePath: join(current, child) });
      }
    }
  }

  recurse("");
  return scenarios;
}

/**
 * Splits markdown content by H1 headers into sections.
 *
 * Each section has a `title` (the H1 text) and `content` (everything until
 * the next H1). This is the top-level structure of scenario files.
 *
 * @param content - Raw markdown file content
 * @returns Array of title/content pairs
 */
function splitByH1(content: string): { title: string; content: string }[] {
  return content.split(/\n(?=# )/).map((section) => {
    const lines = section.split("\n");
    const title = lines.shift()!.replace(/^#+\s+/, "");
    return { title, content: lines.join("\n") };
  });
}

/**
 * Parses a single scenario section into structured code blocks.
 *
 * Extracts TypeSpec input (```tsp blocks), expected TypeScript output
 * (```ts blocks with file/type/name headings), JSON example blocks
 * (```json for <operationId>), and YAML config blocks (```yaml).
 * Regular text lines are preserved for snapshot regeneration.
 *
 * @param content - The content section of a scenario (after H1 header)
 * @returns Parsed scenario with spec block, test blocks, examples, and config
 */
function parseScenario(content: string): ScenarioContents {
  const rawLines = content.split("\n");
  const scenario: ScenarioContents = {
    lines: [],
    specBlock: { kind: "spec", content: "" },
    testBlocks: [],
    jsonExamples: [],
    yamlConfig: {},
  };

  let currentCodeBlock: { heading: string; content: string[] } | null = null;

  for (const line of rawLines) {
    if (line.startsWith("```") && currentCodeBlock) {
      // End of code block
      const heading = currentCodeBlock.heading;
      const blockContent = currentCodeBlock.content.join("\n");

      if (!heading) {
        // Plain markdown code block (no language tag) — treat as text, not a test block
        scenario.lines.push("```");
        for (const codeLine of currentCodeBlock.content) {
          scenario.lines.push(codeLine);
        }
        scenario.lines.push("```");
      } else if (heading.includes("tsp") || heading.includes("typespec")) {
        const block = { kind: "spec" as const, content: blockContent };
        scenario.lines.push(block);
        scenario.specBlock.content = blockContent;
      } else if (heading.startsWith("json")) {
        // JSON example block (e.g., "json for Widgets_ListWidgets")
        const jsonBlock = {
          kind: "json" as const,
          heading,
          content: blockContent,
        };
        scenario.lines.push(jsonBlock);
        scenario.jsonExamples.push({
          filename: heading.trim().replace(/ /g, "_"),
          rawContent: blockContent,
        });
      } else if (heading.startsWith("yaml")) {
        // YAML config block
        const yamlBlock = { kind: "yaml" as const, content: blockContent };
        scenario.lines.push(yamlBlock);
        try {
          const parsed = parseYamlConfig(blockContent);
          Object.assign(scenario.yamlConfig, parsed);
        } catch {
          // Ignore invalid YAML — tests may still work without config
        }
      } else {
        const block: TestCodeBlock = {
          kind: "test",
          heading,
          content: blockContent,
          expectation: parseCodeblockExpectation(heading, blockContent),
        };
        scenario.lines.push(block);
        scenario.testBlocks.push(block);
      }
      currentCodeBlock = null;
    } else if (line.startsWith("```")) {
      // Start of code block
      currentCodeBlock = { heading: line.substring(3).trim(), content: [] };
    } else if (currentCodeBlock) {
      currentCodeBlock.content.push(line);
    } else {
      scenario.lines.push(line);
    }
  }

  return scenario;
}

/**
 * Parses a YAML config string into a key-value record.
 * Used for legacy scenario configs that modify emitter behavior.
 *
 * @param content - Raw YAML string
 * @returns Parsed config object
 */
function parseYamlConfig(content: string): Record<string, unknown> {
  // Simple YAML parser for key: value pairs (no nested objects needed)
  const result: Record<string, unknown> = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^(\S+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (value === "true") result[key] = true;
      else if (value === "false") result[key] = false;
      else if (!isNaN(Number(value))) result[key] = Number(value);
      else result[key] = value;
    }
  }
  return result;
}

/**
 * Parses a scenario markdown file into a structured ScenarioFile.
 *
 * Splits the file by H1 headers, then parses each section into a Scenario
 * with TypeSpec input and expected output blocks.
 *
 * @param file - The file identifier with path information
 * @returns Parsed scenario file with all scenarios
 */
function parseFile(file: ScenarioFileId): ScenarioFile {
  const rawContent = readFileSync(file.path, { encoding: "utf-8" });
  const sections = splitByH1(rawContent);

  return {
    ...file,
    scenarios: sections.map((section) => ({
      title: section.title,
      content: parseScenario(section.content),
    })),
  };
}

// ─── Test Runner ────────────────────────────────────────────────────────

/**
 * Writes back a scenario file with updated expected output blocks.
 *
 * Used when SCENARIOS_UPDATE=true to regenerate snapshots from actual
 * emitter output. Preserves the markdown structure (headings, text,
 * code block headings) while replacing code block content.
 *
 * @param scenarioFile - The scenario file with updated content
 */
async function updateFile(scenarioFile: ScenarioFile) {
  const newContent: string[] = [];

  for (const scenario of scenarioFile.scenarios) {
    newContent.push(`# ${scenario.title}`);
    for (const line of scenario.content.lines) {
      if (typeof line === "string") {
        newContent.push(line);
      } else if (line.kind === "spec") {
        newContent.push("```tsp");
        newContent.push(line.content);
        newContent.push("```");
      } else if (line.kind === "json") {
        newContent.push("```" + line.heading);
        newContent.push(line.content);
        newContent.push("```");
      } else if (line.kind === "yaml") {
        newContent.push("```yaml");
        newContent.push(line.content);
        newContent.push("```");
      } else {
        newContent.push("```" + line.heading);
        newContent.push(line.content);
        newContent.push("```");
      }
    }
  }

  const formattedContent = await format(newContent.join("\n"), { parser: "markdown" });
  writeFileSync(scenarioFile.path, formattedContent, { encoding: "utf-8" });
}

function isTestCodeBlock(block: ScenarioCodeBlock): block is TestCodeBlock {
  return block.kind === "test";
}

/**
 * Executes all scenario tests from the given directory.
 *
 * This is the main entry point for the scenario test harness. It:
 * 1. Discovers all `.md` files recursively in the scenarios directory
 * 2. Parses each file into scenarios with TypeSpec input and expected output
 * 3. Creates vitest `describe`/`it` blocks for each scenario and test block
 * 4. Compiles TypeSpec, runs the emitter, and compares output
 * 5. Supports `only:`/`skip:` prefixes and snapshot regeneration
 *
 * @param scenariosDir - Absolute path to the scenarios directory
 * @param languageConfig - Language configuration for formatting and extraction
 * @param extractor - Snippet extractor for declaration-level extraction
 */
export function executeScenarios(
  scenariosDir: string,
  languageConfig: LanguageConfiguration,
  extractor: SnippetExtractor,
) {
  const scenarioFileIds = discoverScenarios(scenariosDir);
  const scenarioFiles = scenarioFileIds.map((f) => parseFile(f));

  for (const scenarioFile of scenarioFiles) {
    describe(scenarioFile.relativePath, () => {
      for (const scenario of scenarioFile.scenarios) {
        const isOnly = scenario.title.includes("only:");
        const isSkip = scenario.title.includes("skip:");
        const describeFn = isSkip ? describe.skip : isOnly ? describe.only : describe;

        describeFn(`Scenario: ${scenario.title}`, () => {
          let outputFiles: Record<string, string>;

          beforeAll(async () => {
            outputFiles = await emitForScenario(
              scenario.content.specBlock.content,
              scenario.content.jsonExamples,
              scenario.content.yamlConfig,
            );
          });

          for (const testBlock of scenario.content.testBlocks) {
            it(`Test: ${testBlock.heading}`, async () => {
              const result = getExcerptForQuery(extractor, testBlock.expectation, outputFiles);

              if (SCENARIOS_UPDATE) {
                try {
                  // Double-format to reach prettier's stable state. Prettier is not
                  // fully idempotent for certain chain expressions — formatting raw
                  // single-line code can produce different output than formatting
                  // already-broken code. Double-formatting ensures consistent output.
                  const firstPass = await languageConfig.format(normalizeImports(result));
                  testBlock.content = await languageConfig.format(firstPass);
                } catch {
                  testBlock.content = result;
                }
              } else {
                let expected: string;
                let actual: string;
                try {
                  // Normalize import order in raw output BEFORE formatting.
                  // Alloy generates imports in non-deterministic order. Different
                  // import orderings cause different line lengths, which cascade
                  // into different prettier line-breaking decisions throughout
                  // the file. Import ordering is an acceptable difference per PRD.
                  //
                  // Double-format to reach prettier's stable state. Prettier is not
                  // fully idempotent for certain chain expressions — formatting raw
                  // single-line code can produce different output than formatting
                  // already-broken code. Double-formatting ensures consistent output.
                  const normalizedResult = normalizeImports(result);
                  const normalizedExpected = normalizeImports(testBlock.content);
                  const firstPassResult = await languageConfig.format(normalizedResult);
                  actual = (await languageConfig.format(firstPassResult)).trim();
                  const firstPassExpected = await languageConfig.format(normalizedExpected);
                  expected = (await languageConfig.format(firstPassExpected)).trim();
                } catch {
                  // If formatting fails (e.g., invalid TypeScript), compare raw strings
                  expected = normalizeImports(testBlock.content).trim();
                  actual = normalizeImports(result).trim();
                }
                expect(actual).toBe(expected);
              }
            });
          }
        });
      }

      afterAll(async () => {
        if (SCENARIOS_UPDATE) {
          await updateFile(scenarioFile);
        }
      });
    });
  }
}
