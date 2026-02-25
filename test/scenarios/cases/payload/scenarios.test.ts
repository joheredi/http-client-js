import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { tsExtractorConfig, snippetExtractor } from "../../scenario-setup.js";
import { executeScenarios } from "../../scenario-harness.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

executeScenarios(__dirname, tsExtractorConfig, snippetExtractor);
