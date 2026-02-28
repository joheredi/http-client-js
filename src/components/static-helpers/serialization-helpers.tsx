import { code } from "@alloy-js/core";
import {
  FunctionDeclaration,
  SourceFile,
  TypeDeclaration,
} from "@alloy-js/typescript";
import { serializationHelperRefkey } from "../../utils/refkeys.js";

/**
 * Renders the `helpers/serializationHelpers.ts` source file containing
 * shared utility functions used by model serializers and deserializers.
 *
 * These are static helpers — they don't depend on TCGC data or any specific
 * service definition. They provide:
 * - `serializeRecord` / `deserializeRecord`: Dictionary/record transformation with
 *   optional element-level serialization callbacks
 * - Collection builders: `buildCsvCollection`, `buildMultiCollection`,
 *   `buildPipeCollection`, `buildSsvCollection`, `buildTsvCollection`,
 *   `buildNewlineCollection` — format arrays into delimited strings for
 *   query parameters
 * - Collection parsers: `parseCsvCollection`, `parsePipeCollection`,
 *   `parseSsvCollection`, `parseNewlineCollection` — parse delimited
 *   strings back into arrays
 * - `areAllPropsUndefined`: Checks whether all specified properties on an
 *   object are undefined
 *
 * Each function is registered with a `serializationHelperRefkey` so other
 * components (serializers, send functions) can reference them via refkey
 * and Alloy auto-generates import statements.
 *
 * @returns An Alloy JSX tree for the serialization helpers source file.
 */
export function SerializationHelpersFile() {
  return (
    <SourceFile path="static-helpers/serializationHelpers.ts">
      <SerializeRecord />
      {"\n\n"}
      <DeserializeRecord />
      {"\n\n"}
      <BuildCsvCollection />
      {"\n\n"}
      <BuildMultiCollection />
      {"\n\n"}
      <BuildPipeCollection />
      {"\n\n"}
      <BuildSsvCollection />
      {"\n\n"}
      <BuildTsvCollection />
      {"\n\n"}
      <BuildNewlineCollection />
      {"\n\n"}
      <ParseCsvCollection />
      {"\n\n"}
      <ParsePipeCollection />
      {"\n\n"}
      <ParseSsvCollection />
      {"\n\n"}
      <ParseNewlineCollection />
      {"\n\n"}
      <AreAllPropsUndefined />
    </SourceFile>
  );
}

/**
 * Renders the `serializeRecord` function that transforms an object into a
 * serialized record, optionally excluding specific keys and applying a
 * per-value serializer callback.
 *
 * This is used by model serializers when a model has `additionalProperties`
 * (dictionary types) that need element-level serialization.
 */
function SerializeRecord() {
  return (
    <FunctionDeclaration
      name="serializeRecord"
      refkey={serializationHelperRefkey("serializeRecord")}
      export
      returnType={code`Record<string, any>`}
      parameters={[
        { name: "item", type: "any" },
        { name: "serializer", type: "(item: any) => any", optional: true },
        { name: "excludes", type: "string[]", optional: true },
      ]}
    >
      {code`const result: Record<string, any> = {};
const excludeSet = new Set(excludes);
for (const key of Object.keys(item)) {
  if (excludeSet.has(key) || item[key] === undefined) {
    continue;
  }
  result[key] = serializer ? serializer(item[key]) : item[key];
}
return result;`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `deserializeRecord` function that transforms a raw record
 * into a deserialized record, optionally applying a per-value deserializer
 * callback and excluding specific keys.
 *
 * This is the inverse of `serializeRecord` and is used by model deserializers
 * for dictionary-typed additional properties.
 */
function DeserializeRecord() {
  return (
    <FunctionDeclaration
      name="deserializeRecord"
      refkey={serializationHelperRefkey("deserializeRecord")}
      export
      returnType={code`Record<string, any>`}
      parameters={[
        { name: "item", type: "any" },
        { name: "deserializer", type: "(item: any) => any", optional: true },
        { name: "excludes", type: "string[]", optional: true },
      ]}
    >
      {code`const result: Record<string, any> = {};
const excludeSet = new Set(excludes);
for (const key of Object.keys(item)) {
  if (excludeSet.has(key) || item[key] === undefined) {
    continue;
  }
  result[key] = deserializer ? deserializer(item[key]) : item[key];
}
return result;`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `buildCsvCollection` which joins array items with commas.
 * Used for CSV-format query parameter serialization (RFC 6570 style).
 */
function BuildCsvCollection() {
  return (
    <FunctionDeclaration
      name="buildCsvCollection"
      refkey={serializationHelperRefkey("buildCsvCollection")}
      export
      returnType="string"
      parameters={[{ name: "items", type: "string[] | number[]" }]}
    >
      {code`return items.join(",");`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `buildMultiCollection` which formats an array as repeated
 * query parameter entries (e.g., `item&param=item&param=item`).
 * Used for multi-format query parameter serialization.
 */
function BuildMultiCollection() {
  return (
    <FunctionDeclaration
      name="buildMultiCollection"
      refkey={serializationHelperRefkey("buildMultiCollection")}
      export
      returnType="string"
      parameters={[
        { name: "items", type: "string[]" },
        { name: "parameterName", type: "string" },
      ]}
    >
      {code`return items
  .map((item, index) => {
    if (index === 0) {
      return item;
    }
    return \`\${parameterName}=\${item}\`;
  })
  .join("&");`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `buildPipeCollection` which joins array items with pipe characters.
 * Used for pipe-delimited query parameter serialization.
 */
function BuildPipeCollection() {
  return (
    <FunctionDeclaration
      name="buildPipeCollection"
      refkey={serializationHelperRefkey("buildPipeCollection")}
      export
      returnType="string"
      parameters={[{ name: "items", type: "string[] | number[]" }]}
    >
      {code`return items.join("|");`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `buildSsvCollection` which joins array items with spaces.
 * Used for space-separated value query parameter serialization.
 */
function BuildSsvCollection() {
  return (
    <FunctionDeclaration
      name="buildSsvCollection"
      refkey={serializationHelperRefkey("buildSsvCollection")}
      export
      returnType="string"
      parameters={[{ name: "items", type: "string[] | number[]" }]}
    >
      {code`return items.join(" ");`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `buildTsvCollection` which joins array items with tab characters.
 * Used for tab-separated value query parameter serialization.
 */
function BuildTsvCollection() {
  return (
    <FunctionDeclaration
      name="buildTsvCollection"
      refkey={serializationHelperRefkey("buildTsvCollection")}
      export
      returnType="string"
      parameters={[{ name: "items", type: "string[] | number[]" }]}
    >
      {code`return items.join("\\t");`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `buildNewlineCollection` which joins array items with newlines.
 * Used for newline-separated value query parameter serialization.
 */
function BuildNewlineCollection() {
  return (
    <FunctionDeclaration
      name="buildNewlineCollection"
      refkey={serializationHelperRefkey("buildNewlineCollection")}
      export
      returnType="string"
      parameters={[{ name: "items", type: "string[] | number[]" }]}
    >
      {code`return items.join("\\n");`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `parseCsvCollection` which splits a comma-separated string into
 * an array. Used for deserializing CSV-format response values.
 */
function ParseCsvCollection() {
  return (
    <FunctionDeclaration
      name="parseCsvCollection"
      refkey={serializationHelperRefkey("parseCsvCollection")}
      export
      returnType="string[]"
      parameters={[{ name: "value", type: "string" }]}
    >
      {code`return value ? value.split(",") : [];`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `parsePipeCollection` which splits a pipe-delimited string into
 * an array. Used for deserializing pipe-format response values.
 */
function ParsePipeCollection() {
  return (
    <FunctionDeclaration
      name="parsePipeCollection"
      refkey={serializationHelperRefkey("parsePipeCollection")}
      export
      returnType="string[]"
      parameters={[{ name: "value", type: "string" }]}
    >
      {code`return value ? value.split("|") : [];`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `parseSsvCollection` which splits a space-separated string into
 * an array. Used for deserializing SSV-format response values.
 */
function ParseSsvCollection() {
  return (
    <FunctionDeclaration
      name="parseSsvCollection"
      refkey={serializationHelperRefkey("parseSsvCollection")}
      export
      returnType="string[]"
      parameters={[{ name: "value", type: "string" }]}
    >
      {code`return value ? value.split(" ") : [];`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `parseNewlineCollection` which splits a newline-separated string
 * into an array. Used for deserializing newline-format response values.
 */
function ParseNewlineCollection() {
  return (
    <FunctionDeclaration
      name="parseNewlineCollection"
      refkey={serializationHelperRefkey("parseNewlineCollection")}
      export
      returnType="string[]"
      parameters={[{ name: "value", type: "string" }]}
    >
      {code`return value ? value.split("\\n") : [];`}
    </FunctionDeclaration>
  );
}

/**
 * Renders `areAllPropsUndefined` which checks if all specified properties
 * on an object are undefined. Used by serializers to skip optional object
 * groups when all their constituent properties are absent.
 */
function AreAllPropsUndefined() {
  return (
    <FunctionDeclaration
      name="areAllPropsUndefined"
      refkey={serializationHelperRefkey("areAllPropsUndefined")}
      export
      returnType="boolean"
      parameters={[
        { name: "item", type: "Record<string, any>" },
        { name: "properties", type: "string[]" },
      ]}
    >
      {code`for (const property of properties) {
  if (item[property] !== undefined) {
    return false;
  }
}
return true;`}
    </FunctionDeclaration>
  );
}
