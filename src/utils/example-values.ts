import type {
  SdkExampleValue,
  SdkModelExampleValue,
  SdkModelPropertyType,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Converts a TCGC `SdkExampleValue` into a TypeScript code string.
 *
 * This function recursively translates TCGC example values (which come from
 * OpenAPI examples or TypeSpec `@example` decorators) into valid TypeScript
 * literal expressions. The output is used in generated sample files to show
 * consumers realistic parameter values.
 *
 * Handles all TCGC example value kinds: string, number, boolean, null,
 * unknown, array, dict, union, and model. Model values are rendered as
 * object literals with only writable (non-readonly) properties.
 *
 * @param exampleValue - The TCGC example value to convert.
 * @returns A TypeScript code string representing the example value.
 */
export function getExampleValueCode(exampleValue: SdkExampleValue): string {
  switch (exampleValue.kind) {
    case "string":
      return getStringExampleCode(exampleValue);
    case "number":
      return String(exampleValue.value);
    case "boolean":
      return String(exampleValue.value);
    case "null":
      return "null";
    case "unknown":
      return JSON.stringify(exampleValue.value);
    case "array":
      return getArrayExampleCode(exampleValue.value);
    case "dict":
      return getDictExampleCode(exampleValue.value);
    case "union":
      return JSON.stringify(exampleValue.value);
    case "model":
      return getModelExampleCode(exampleValue);
    default:
      return "undefined";
  }
}

/**
 * Converts a TCGC string example value to TypeScript code.
 *
 * Handles special string-encoded types from TCGC: date/dateTime values
 * are wrapped in `new Date(...)`, and regular strings are quoted.
 * The TCGC type's `kind` and `encode` fields determine the conversion.
 *
 * @param exampleValue - The TCGC string example value.
 * @returns A TypeScript string literal, Date constructor, or quoted string.
 */
function getStringExampleCode(exampleValue: {
  value: unknown;
  type: { kind: string; encode?: string };
}): string {
  const typeKind = exampleValue.type.kind;

  // Date/DateTime types should be wrapped in new Date()
  if (typeKind === "utcDateTime" || typeKind === "offsetDateTime") {
    return `new Date("${exampleValue.value}")`;
  }

  // Duration types are passed as strings
  if (typeKind === "duration") {
    return `"${exampleValue.value}"`;
  }

  return `"${escapeString(String(exampleValue.value))}"`;
}

/**
 * Converts an array of TCGC example values to a TypeScript array literal.
 *
 * @param items - Array of TCGC example values.
 * @returns A TypeScript array literal string like `["a", "b"]`.
 */
function getArrayExampleCode(items: SdkExampleValue[]): string {
  const elements = items.map((item) => getExampleValueCode(item));
  return `[${elements.join(", ")}]`;
}

/**
 * Converts a TCGC dictionary example value to a TypeScript object literal.
 *
 * @param dict - Record of string keys to TCGC example values.
 * @returns A TypeScript object literal string.
 */
function getDictExampleCode(dict: Record<string, SdkExampleValue>): string {
  const entries = Object.entries(dict).map(
    ([key, value]) => `${safePropertyName(key)}: ${getExampleValueCode(value)}`,
  );
  if (entries.length === 0) return "{}";
  return `{ ${entries.join(", ")} }`;
}

/**
 * Converts a TCGC model example value to a TypeScript object literal.
 *
 * Filters out readonly properties (users can't set these in requests)
 * and uses the client-side property names (not serialized wire names).
 * Recursively converts nested model values.
 *
 * @param exampleValue - The TCGC model example value.
 * @returns A TypeScript object literal string with writable properties only.
 */
function getModelExampleCode(exampleValue: SdkModelExampleValue): string {
  const entries: string[] = [];

  for (const [propName, propValue] of Object.entries(exampleValue.value)) {
    // Find the corresponding model property to check for readonly
    const modelProp = findModelProperty(exampleValue.type, propName);

    // Skip readonly properties — users can't set them
    if (modelProp && isReadOnly(modelProp)) {
      continue;
    }

    // Use the client-side name (which is the key in the value record)
    entries.push(`${safePropertyName(propName)}: ${getExampleValueCode(propValue)}`);
  }

  // Also include additionalProperties if present
  if (exampleValue.additionalPropertiesValue) {
    for (const [key, value] of Object.entries(exampleValue.additionalPropertiesValue)) {
      entries.push(`${safePropertyName(key)}: ${getExampleValueCode(value)}`);
    }
  }

  if (entries.length === 0) return "{}";
  return `{ ${entries.join(", ")} }`;
}

/**
 * Finds a model property by name in the TCGC model type.
 *
 * Searches the model's properties array for a property matching the
 * given name. Used to check readonly status when filtering example values.
 *
 * @param modelType - The TCGC model type containing property definitions.
 * @param propName - The client-side property name to find.
 * @returns The model property descriptor, or undefined if not found.
 */
function findModelProperty(
  modelType: { properties: SdkModelPropertyType[] },
  propName: string,
): SdkModelPropertyType | undefined {
  return modelType.properties.find((p) => p.name === propName);
}

/**
 * Checks whether a model property is read-only.
 *
 * A property is considered read-only if its visibility array does not
 * include "update" or "create" — meaning it can only be observed in
 * responses, not set in requests.
 *
 * @param prop - The TCGC model property to check.
 * @returns True if the property is read-only.
 */
function isReadOnly(prop: SdkModelPropertyType): boolean {
  if (!prop.visibility) return false;
  // If visibility doesn't include "create" or "update", it's readonly
  return (
    !prop.visibility.includes("create" as any) &&
    !prop.visibility.includes("update" as any)
  );
}

/**
 * Escapes special characters in a string for use in a TypeScript string literal.
 *
 * @param str - The raw string to escape.
 * @returns The escaped string safe for double-quoted TypeScript literals.
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * Wraps a property name in quotes if it contains special characters.
 *
 * JavaScript object keys that are valid identifiers don't need quotes,
 * but keys with hyphens, spaces, or starting with numbers do.
 *
 * @param name - The property name.
 * @returns The name as-is if it's a valid identifier, or quoted.
 */
function safePropertyName(name: string): string {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return name;
  }
  return `"${name}"`;
}
