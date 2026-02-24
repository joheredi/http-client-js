/**
 * Scenario test runner for the http-client-js emitter.
 *
 * This file wires up the custom scenario harness to validate emitter output
 * against expected TypeScript code blocks defined in markdown (.md) files
 * under `test/scenarios/cases/`.
 *
 * The harness compiles TypeSpec input, runs the emitter pipeline, and compares
 * the generated output against expectations using tree-sitter for snippet
 * extraction and prettier for formatting normalization.
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
 */
import {
  createSnippetExtractor,
  type LanguageConfiguration,
} from "@typespec/emitter-framework/testing";
import { createRequire } from "node:module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { format } from "prettier";
import { Language, Parser } from "web-tree-sitter";
import { executeScenarios } from "./scenario-harness.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates a TypeScript language configuration for the snippet extractor.
 *
 * This is a custom implementation that avoids the `require.resolve` call in
 * `@typespec/emitter-framework/testing`'s `createTypeScriptExtractorConfig`,
 * which fails in ESM contexts. Uses `createRequire` from `node:module` to
 * resolve the tree-sitter-typescript WASM file path.
 *
 * @returns A LanguageConfiguration compatible with the snippet extractor
 */
async function createTsExtractorConfig(): Promise<LanguageConfiguration> {
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("tree-sitter-typescript/tree-sitter-typescript.wasm");
  await Parser.init();
  return {
    codeBlockTypes: ["ts", "typescript"],
    language: await Language.load(wasmPath),
    format: async (content: string) => format(content, { parser: "typescript" }),
    nodeKindMapping: {
      classNodeType: "class_declaration",
      functionNodeType: "function_declaration",
      interfaceNodeType: "interface_declaration",
      typeAliasNodeType: "type_alias_declaration",
      enumNodeType: "enum_declaration",
    },
  };
}

const tsExtractorConfig = await createTsExtractorConfig();
const snippetExtractor = createSnippetExtractor(tsExtractorConfig);

const scenarioPath = join(__dirname, "cases");

executeScenarios(scenarioPath, tsExtractorConfig, snippetExtractor);
