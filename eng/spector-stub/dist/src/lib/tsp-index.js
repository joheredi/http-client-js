/**
 * TypeSpec library entry point for @typespec/spector.
 *
 * Loaded by the TypeSpec compiler via lib/main.tsp → import "../dist/src/lib/tsp-index.js".
 * Only exports $lib and $decorators (namespace-qualified) — NO $-prefixed global exports
 * to avoid ambiguous-symbol errors when specs use "using Spector;".
 */

import { createTypeSpecLibrary } from "@typespec/compiler";
import { $scenario, $scenarioDoc, $scenarioService } from "./decorators.js";

export const $lib = createTypeSpecLibrary({
  name: "@typespec/spector",
  diagnostics: {},
  state: {
    Scenario: { description: "Mark a scenario to be executed" },
    ScenarioDoc: { description: "Mark a scenario documentation" },
    ScenarioService: { description: "Mark a scenario service to be executed" },
  },
});

/** @internal */
export const $decorators = {
  "TypeSpec.Spector": {
    scenario: $scenario,
    scenarioDoc: $scenarioDoc,
    scenarioService: $scenarioService,
  },
};
