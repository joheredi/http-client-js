/**
 * Shared setup for scenario tests.
 *
 * Provides tree-sitter language configuration and snippet extractor
 * initialization that can be imported by multiple per-directory test files
 * for parallel execution.
 *
 * @module
 */
import {
  createSnippetExtractor,
  type LanguageConfiguration,
} from "@typespec/emitter-framework/testing";
import { createRequire } from "node:module";
import { Language, Parser } from "web-tree-sitter";
import { format } from "prettier";

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
  const wasmPath =
    require.resolve("tree-sitter-typescript/tree-sitter-typescript.wasm");
  await Parser.init();
  return {
    codeBlockTypes: ["ts", "typescript"],
    language: await Language.load(wasmPath),
    format: async (content: string) =>
      format(content, { parser: "typescript" }),
    nodeKindMapping: {
      classNodeType: "class_declaration",
      functionNodeType: "function_declaration",
      interfaceNodeType: "interface_declaration",
      typeAliasNodeType: "type_alias_declaration",
      enumNodeType: "enum_declaration",
    },
  };
}

export const tsExtractorConfig = await createTsExtractorConfig();
export const snippetExtractor = createSnippetExtractor(tsExtractorConfig);
