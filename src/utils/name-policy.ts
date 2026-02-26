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

    // Apply case conversion
    let transformed: string;
    switch (element) {
      case "enum-member":
        // Enum members use strict legacy normalization which preserves ≤3-char
        // ALL-CAPS segments and prefixes leading digits with _. Underscores are
        // always treated as word separators (e.g., pascal_case_5 → PascalCase5).
        transformed = normalizePascalCaseName(name);
        break;
      case "class":
      case "type":
      case "interface":
      case "enum":
        // Type names use legacy normalization when the name contains consecutive
        // uppercase letters (ALL-CAPS segments like FOO, NFV, PS) that change-case
        // would incorrectly lowercase. Otherwise, falls back to change-case's
        // pascalCase which correctly handles _<digits> patterns (Color_1) from
        // TCGC conflict resolution.
        transformed = normalizePascalCaseTypeName(name);
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

// ---------------------------------------------------------------------------
// Legacy enum member normalization
//
// Ported from autorest.typescript/packages/rlc-common/src/helpers/nameUtils.ts.
// Uses a custom word-splitting algorithm (deconstruct) that differs from
// change-case's pascalCase in how it handles ALL-CAPS segments, leading
// underscores, and numeric prefixes.
// ---------------------------------------------------------------------------

/**
 * Normalize a name using legacy PascalCase conventions.
 *
 * Used for enum member names and as the foundation for type name normalization.
 * Preserves ALL-CAPS segments ≤3 chars (e.g., `FOO`, `NFV`, `MLD`, `SAS`, `IP`)
 * and prefixes `_` for leading digits. Treats ALL underscores as word separators.
 *
 * This matches the legacy autorest.typescript `normalizeName` behavior for
 * `NameType.EnumMemberName`.
 *
 * @param name - The raw name to normalize.
 * @returns The PascalCase-normalized name with ALL-CAPS preservation.
 */
export function normalizePascalCaseName(name: string): string {
  const parts = deconstruct(name);
  if (parts.length === 0) return name;

  const [first, ...rest] = parts;
  const result =
    toPascal(first, true) + rest.map((p) => toPascal(p, false)).join("");
  return fixLeadingNumber(result);
}

/**
 * Normalize a type/interface/class/enum name using legacy PascalCase conventions,
 * with fallback to change-case for names without ALL-CAPS segments.
 *
 * When the name contains consecutive uppercase letters (≥2), uses the legacy
 * normalization which preserves ≤3-char ALL-CAPS segments (e.g., `FOO` → `FOO`,
 * `NFVIs` → `NFVIs`, `PSDog` → `PSDog`).
 *
 * When the name has no consecutive uppercase letters, falls back to change-case's
 * `pascalCase` which correctly handles `_<digits>` patterns from TCGC conflict
 * resolution (e.g., `Color_1` → `Color_1`, `ErrorDetail_1` → `ErrorDetail_1`).
 *
 * @param name - The raw type name to normalize.
 * @returns The PascalCase-normalized name.
 */
function normalizePascalCaseTypeName(name: string): string {
  // Names with 2+ consecutive uppercase letters need legacy normalization
  // to preserve ALL-CAPS segments (FOO, NFV, PS, etc.)
  if (/[A-Z]{2}/.test(name)) {
    return normalizePascalCaseName(name);
  }
  // Names without ALL-CAPS segments use change-case which correctly
  // preserves _<digits> patterns from TCGC conflict resolution
  return pascalCase(name, caseOptions);
}

/**
 * Split an identifier into word parts, preserving ALL-CAPS segments ≤3 chars.
 *
 * Examples:
 * - `"pascal_case_5"` → `["pascal", "case", "5"]`
 * - `"MAX_of_MLD"` → `["MAX", "of", "MLD"]`
 * - `"___pascal____case6666"` → `["pascal", "case", "6666"]`
 * - `"YES_OR_NO1"` → `["YES", "OR", "NO", "1"]`
 */
function deconstruct(identifier: string): string[] {
  return `${identifier}`
    .replace(/([a-z]+)([A-Z])/g, "$1 $2")
    .replace(/(\d+)/g, " $1 ")
    .replace(/_/g, " ")
    .replace(/\b([A-Z]+)([A-Z])s([^a-z])(.*)/g, "$1$2\u00AB $3$4")
    .replace(/\b([A-Z]+)([A-Z])([a-z]+)/g, "$1 $2$3")
    .replace(/\u00AB/g, "s")
    .trim()
    .split(/[\W|_]+/)
    .map((each) => (isFullyUpperCase(each) ? each : each.toLowerCase()))
    .filter((part) => !!part);
}

/**
 * Check if a segment is fully uppercase and ≤ maxUppercasePreserve chars.
 * These segments are preserved as-is (e.g., "MAX", "MLD", "SAS", "IP").
 */
function isFullyUpperCase(
  identifier: string,
  maxUppercasePreserve: number = 3,
): boolean {
  const len = identifier.length;
  if (len > 1) {
    if (len <= maxUppercasePreserve && identifier === identifier.toUpperCase()) {
      return true;
    }
    // Plural forms like "MBs"
    if (len <= maxUppercasePreserve + 1 && identifier.endsWith("s")) {
      const stem = identifier.substring(0, len - 1);
      if (stem.toUpperCase() === stem) return true;
    }
  }
  return false;
}

/**
 * Apply PascalCase to a single word part.
 * If keepConsistent is true and the part is ALL-CAPS, it stays ALL-CAPS
 * (only relevant for the first part with camelCase convention, not used here).
 */
function toPascal(str: string, _keepConsistent: boolean): string {
  return str.charAt(0).toUpperCase() + str.substring(1);
}

/**
 * Prefix `_` if the name starts with a digit.
 */
function fixLeadingNumber(name: string): string {
  if (!name || !/^[-.]?\d/.test(name)) return name;
  return `_${name}`;
}
