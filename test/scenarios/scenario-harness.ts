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
}

interface TestCodeBlock {
  kind: "test";
  heading: string;
  content: string;
  expectation: CodeBlockExpectation;
}

type ScenarioCodeBlock = { kind: "spec"; content: string } | TestCodeBlock;

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
 * Expected format: `ts src/path/file.ts [type] [name]`
 *
 * Examples:
 * - `ts src/models/models.ts` — full file comparison
 * - `ts src/models/models.ts interface Widget` — extract and compare a specific interface
 * - `ts src/api/operations.ts function _getWidgetSend` — extract a specific function
 *
 * @param heading - The code block heading (text after ```)
 * @param content - The code block content (expected output)
 * @returns Parsed expectation with file path and optional element query
 */
function parseCodeblockExpectation(heading: string, content: string): CodeBlockExpectation {
  const [lang, file, type, name] = heading.split(" ");
  if (!file) {
    throw new Error(
      `Invalid code block heading: "${heading}". Missing file path. Expected format: "<lang> <path>"`,
    );
  }
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
  const content = outputs[expectation.file];
  if (!content) {
    throw new Error(
      `File ${expectation.file} not found in emitted files:\n ${Object.keys(outputs).join("\n")}`,
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
    default:
      throw new Error("Unsupported type in code block expectation: " + type);
  }

  if (!excerpt) {
    throw new Error(
      `Could not find ${type} "${name}" in file "${expectation.file}".`,
    );
  }

  return excerpt;
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
 * Extracts TypeSpec input (```tsp blocks) and expected TypeScript output
 * (```ts blocks with file/type/name headings). Regular text lines are
 * preserved for snapshot regeneration.
 *
 * @param content - The content section of a scenario (after H1 header)
 * @returns Parsed scenario with spec block and test blocks
 */
function parseScenario(content: string): ScenarioContents {
  const rawLines = content.split("\n");
  const scenario: ScenarioContents = {
    lines: [],
    specBlock: { kind: "spec", content: "" },
    testBlocks: [],
  };

  let currentCodeBlock: { heading: string; content: string[] } | null = null;

  for (const line of rawLines) {
    if (line.startsWith("```") && currentCodeBlock) {
      // End of code block
      const heading = currentCodeBlock.heading;
      const isTsp = heading.includes("tsp") || heading.includes("typespec");
      const content = currentCodeBlock.content.join("\n");

      if (isTsp) {
        const block = { kind: "spec" as const, content };
        scenario.lines.push(block);
        scenario.specBlock.content = content;
      } else {
        const block: TestCodeBlock = {
          kind: "test",
          heading,
          content,
          expectation: parseCodeblockExpectation(heading, content),
        };
        scenario.lines.push(block);
        scenario.testBlocks.push(block);
      }
      currentCodeBlock = null;
    } else if (line.startsWith("```")) {
      // Start of code block
      currentCodeBlock = { heading: line.substring(3), content: [] };
    } else if (currentCodeBlock) {
      currentCodeBlock.content.push(line);
    } else {
      scenario.lines.push(line);
    }
  }

  return scenario;
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
      } else {
        const heading = line.kind === "test" ? line.heading : "tsp";
        newContent.push("```" + heading);
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

        let outputFiles: Record<string, string>;

        beforeAll(async () => {
          outputFiles = await emitForScenario(scenario.content.specBlock.content);
        });

        describeFn(`Scenario: ${scenario.title}`, () => {
          for (const testBlock of scenario.content.testBlocks) {
            it(`Test: ${testBlock.heading}`, async () => {
              const result = getExcerptForQuery(extractor, testBlock.expectation, outputFiles);

              if (SCENARIOS_UPDATE) {
                try {
                  testBlock.content = await languageConfig.format(result);
                } catch {
                  testBlock.content = result;
                }
              } else {
                let expected: string;
                let actual: string;
                try {
                  expected = await languageConfig.format(testBlock.content);
                  actual = await languageConfig.format(result);
                } catch {
                  // If formatting fails (e.g., invalid TypeScript), compare raw strings
                  expected = testBlock.content.trim();
                  actual = result.trim();
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
