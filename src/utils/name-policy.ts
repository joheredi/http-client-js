import { createNamePolicy, type NamePolicy } from "@alloy-js/core";
import { camelCase, pascalCase } from "change-case";

/**
 * TypeScript element types for the naming policy.
 * Must match @alloy-js/typescript's TypeScriptElements.
 */
type TypeScriptElements =
  | "function"
  | "parameter"
  | "class"
  | "variable"
  | "enum"
  | "object-member-data"
  | "object-member-getter"
  | "class-member-data"
  | "class-member-getter"
  | "enum-member"
  | "interface"
  | "interface-member"
  | "type";

/**
 * Case conversion options preserving `$` and `_` as prefix/suffix characters.
 * Matches @alloy-js/typescript's createTSNamePolicy behavior.
 */
const caseOptions = {
  prefixCharacters: "$_",
  suffixCharacters: "$_",
};

/**
 * Context types for reserved word escaping, mapped from legacy NameType.
 */
type ReservedContext =
  | "parameter"
  | "method"
  | "class"
  | "interface"
  | "operationGroup"
  | "property";

interface ReservedName {
  name: string;
  reservedFor: ReservedContext[];
}

/**
 * Legacy emitter reserved word list with context-specific scoping.
 * Ported from autorest.typescript/packages/rlc-common/src/helpers/nameUtils.ts.
 */
const RESERVED_NAMES: ReservedName[] = [
  { name: "any", reservedFor: ["parameter"] },
  { name: "as", reservedFor: ["parameter"] },
  { name: "assert", reservedFor: ["parameter"] },
  { name: "async", reservedFor: ["parameter"] },
  { name: "await", reservedFor: ["parameter", "method"] },
  {
    name: "boolean",
    reservedFor: ["parameter", "class", "interface", "operationGroup"],
  },
  { name: "break", reservedFor: ["parameter", "method"] },
  { name: "case", reservedFor: ["parameter", "method"] },
  { name: "catch", reservedFor: ["parameter", "method"] },
  { name: "class", reservedFor: ["parameter", "method"] },
  { name: "const", reservedFor: ["parameter", "method"] },
  { name: "constructor", reservedFor: ["parameter"] },
  { name: "continue", reservedFor: ["parameter", "method"] },
  {
    name: "date",
    reservedFor: ["parameter", "class", "interface", "operationGroup"],
  },
  { name: "debugger", reservedFor: ["parameter", "method"] },
  { name: "declare", reservedFor: ["parameter"] },
  { name: "default", reservedFor: ["parameter", "method"] },
  { name: "delete", reservedFor: ["parameter", "method"] },
  { name: "do", reservedFor: ["parameter", "method"] },
  { name: "else", reservedFor: ["parameter", "method"] },
  { name: "enum", reservedFor: ["parameter", "method"] },
  {
    name: "error",
    reservedFor: ["parameter", "class", "interface", "operationGroup"],
  },
  { name: "export", reservedFor: ["parameter", "method"] },
  { name: "extends", reservedFor: ["parameter", "method"] },
  { name: "false", reservedFor: ["parameter", "method"] },
  { name: "finally", reservedFor: ["parameter", "method"] },
  { name: "for", reservedFor: ["parameter", "method"] },
  { name: "from", reservedFor: ["parameter"] },
  {
    name: "function",
    reservedFor: [
      "parameter",
      "class",
      "interface",
      "operationGroup",
      "method",
    ],
  },
  { name: "get", reservedFor: ["parameter"] },
  { name: "if", reservedFor: ["parameter", "method"] },
  { name: "implements", reservedFor: ["parameter"] },
  { name: "import", reservedFor: ["parameter", "method"] },
  { name: "in", reservedFor: ["parameter", "method"] },
  { name: "instanceof", reservedFor: ["parameter", "method"] },
  { name: "interface", reservedFor: ["parameter"] },
  { name: "let", reservedFor: ["parameter", "method"] },
  { name: "module", reservedFor: ["parameter"] },
  { name: "new", reservedFor: ["parameter", "method"] },
  { name: "null", reservedFor: ["parameter", "method"] },
  {
    name: "number",
    reservedFor: ["parameter", "class", "interface", "operationGroup"],
  },
  { name: "of", reservedFor: ["parameter"] },
  { name: "package", reservedFor: ["parameter"] },
  { name: "private", reservedFor: ["parameter"] },
  { name: "protected", reservedFor: ["parameter"] },
  { name: "public", reservedFor: ["parameter", "method"] },
  { name: "requestoptions", reservedFor: ["parameter"] },
  { name: "require", reservedFor: ["parameter", "method"] },
  { name: "return", reservedFor: ["parameter", "method"] },
  {
    name: "set",
    reservedFor: ["parameter", "class", "interface", "operationGroup"],
  },
  { name: "static", reservedFor: ["parameter", "method"] },
  {
    name: "string",
    reservedFor: ["parameter", "class", "interface", "operationGroup"],
  },
  { name: "super", reservedFor: ["parameter", "method"] },
  { name: "switch", reservedFor: ["parameter", "method"] },
  {
    name: "symbol",
    reservedFor: ["parameter", "class", "interface", "operationGroup"],
  },
  { name: "this", reservedFor: ["parameter", "method"] },
  { name: "throw", reservedFor: ["parameter", "method"] },
  { name: "true", reservedFor: ["parameter", "method"] },
  { name: "try", reservedFor: ["parameter", "method"] },
  { name: "type", reservedFor: ["parameter"] },
  { name: "typeof", reservedFor: ["parameter", "method"] },
  { name: "var", reservedFor: ["parameter", "method"] },
  { name: "void", reservedFor: ["parameter", "method"] },
  { name: "while", reservedFor: ["parameter", "method"] },
  { name: "with", reservedFor: ["parameter", "method"] },
  { name: "yield", reservedFor: ["parameter", "method"] },
  { name: "arguments", reservedFor: ["parameter", "method"] },
  { name: "global", reservedFor: ["class", "interface", "operationGroup"] },
  // SDK-specific reserved names
  { name: "client", reservedFor: ["parameter"] },
  { name: "endpoint", reservedFor: ["parameter"] },
  { name: "apiVersion", reservedFor: ["parameter"] },
];

/**
 * Pre-computed lookup: Map<lowercased name, Map<ReservedContext, true>>
 */
const RESERVED_LOOKUP = buildReservedLookup();

function buildReservedLookup(): Map<string, Set<ReservedContext>> {
  const map = new Map<string, Set<ReservedContext>>();
  for (const entry of RESERVED_NAMES) {
    map.set(entry.name, new Set(entry.reservedFor));
  }
  return map;
}

/**
 * Map TypeScript element type to legacy reserved word context.
 */
function toReservedContext(
  element: TypeScriptElements,
): ReservedContext | undefined {
  switch (element) {
    case "function":
    case "variable":
      return "method";
    case "parameter":
      return "parameter";
    case "class":
      return "class";
    case "interface":
    case "type":
      return "interface";
    case "class-member-data":
    case "class-member-getter":
    case "interface-member":
    case "object-member-data":
    case "object-member-getter":
      return "property";
    case "enum":
    case "enum-member":
      return undefined; // PascalCase already avoids conflicts
    default:
      return undefined;
  }
}

/**
 * Check if a name is reserved in the given context.
 */
function isReservedInContext(
  name: string,
  context: ReservedContext,
): boolean {
  const contexts = RESERVED_LOOKUP.get(name.toLowerCase());
  return contexts !== undefined && contexts.has(context);
}

/**
 * Apply context-specific escaping for reserved words, matching legacy conventions.
 *
 * - function/variable: `$` prefix (`$continue`)
 * - parameter: `Param` suffix (`typeParam`)
 * - class/interface/type: `Model` suffix (`StringModel`)
 * - property/member: bare name (valid in JS property context)
 * - operationGroup: `Operations` suffix (already handled by component naming)
 */
function ensureNonReservedName(
  name: string,
  element: TypeScriptElements,
): string {
  const context = toReservedContext(element);
  if (!context) return name;

  if (!isReservedInContext(name, context)) return name;

  switch (context) {
    case "method":
      return `$${name}`;
    case "parameter":
      return `${name}Param`;
    case "class":
    case "interface":
      return `${name}Model`;
    case "property":
      // Reserved words are valid as property names in JS
      return name;
    default:
      return `$${name}`;
  }
}

/**
 * Creates a custom naming policy for the emitter that matches legacy
 * autorest.typescript conventions.
 *
 * Replaces `createTSNamePolicy()` from @alloy-js/typescript with:
 * - Same case conversion rules (PascalCase for types, camelCase for others)
 * - Legacy reserved word escaping ($ prefix for functions, Param suffix for params, etc.)
 * - Support for the `$DO_NOT_NORMALIZE$` marker to skip normalization entirely
 */
export function createEmitterNamePolicy(): NamePolicy<TypeScriptElements> {
  return createNamePolicy((name: string, element: TypeScriptElements) => {
    // Handle $DO_NOT_NORMALIZE$ marker — skip all normalization
    if (name.startsWith("$DO_NOT_NORMALIZE$")) {
      return name.replace("$DO_NOT_NORMALIZE$", "");
    }

    // Apply case conversion (same as createTSNamePolicy)
    let transformed: string;
    switch (element) {
      case "class":
      case "type":
      case "interface":
      case "enum":
      case "enum-member":
        transformed = pascalCase(name, caseOptions);
        break;
      default:
        transformed = camelCase(name, caseOptions);
        break;
    }

    // Apply legacy reserved word escaping per context
    return ensureNonReservedName(transformed, element);
  });
}

/**
 * Check if an operation name is a reserved word that would be escaped
 * when used as a function name. Used to add @fixme JSDoc warnings.
 */
export function isReservedOperationName(name: string): boolean {
  return isReservedInContext(camelCase(name, caseOptions), "method");
}

/**
 * Get the escaped operation name as it would appear after the naming policy.
 * Used to compose send/deserialize function names (e.g., `_$continueSend`).
 */
export function getEscapedOperationName(name: string): string {
  const cased = camelCase(name, caseOptions);
  if (isReservedInContext(cased, "method")) {
    return `$${cased}`;
  }
  return cased;
}

/**
 * Get the escaped parameter name as it would appear after the naming policy.
 * Used for body accessors when the parameter name is a reserved word.
 */
export function getEscapedParameterName(name: string): string {
  const cased = camelCase(name, caseOptions);
  if (isReservedInContext(cased, "parameter")) {
    return `${cased}Param`;
  }
  return cased;
}
