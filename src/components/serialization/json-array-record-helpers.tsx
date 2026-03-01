import { Children, code } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkArrayType,
  SdkDictionaryType,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import {
  getArrayFunctionName,
  getRecordFunctionName,
} from "../../utils/model-name.js";
import {
  arraySerializerRefkey,
  arrayDeserializerRefkey,
  recordSerializerRefkey,
  recordDeserializerRefkey,
  typeRefkey,
  serializationHelperRefkey,
} from "../../utils/refkeys.js";
import {
  getSerializationExpression,
  needsTransformation,
} from "./json-serializer.js";
import { getDeserializationExpression } from "./json-deserializer.js";
import {
  typeHasDeserializerDeclaration,
  typeHasSerializerDeclaration,
} from "../../utils/serialization-predicates.js";

/**
 * Props for the {@link JsonArraySerializer} component.
 */
export interface JsonArraySerializerProps {
  /** The TCGC array type to generate a serializer helper function for. */
  type: SdkArrayType;
}

/**
 * Renders a named JSON array serializer helper function.
 *
 * Generates a standalone function that serializes an array of complex types
 * by mapping each element through its element serializer. This matches the
 * legacy emitter's pattern of generating dedicated array helper functions
 * instead of inlining `.map()` calls inside model serializers.
 *
 * Example output for `Array<Pet>`:
 * ```typescript
 * export function petArraySerializer(result: Array<Pet>): any[] {
 *   return result.map((item) => {
 *     return petSerializer(item);
 *   });
 * }
 * ```
 *
 * @param props - Component props containing the array type.
 * @returns An Alloy JSX tree representing the array serializer function declaration.
 */
export function JsonArraySerializer(props: JsonArraySerializerProps) {
  const { type } = props;
  const isNullable = type.valueType.kind === "nullable";
  const elementExpr = getSerializationExpression(type.valueType, "item");
  const mapBody = isNullable
    ? code`return !item ? item : ${elementExpr};`
    : code`return ${elementExpr};`;

  return (
    <FunctionDeclaration
      name={getArrayFunctionName(type, "Serializer")}
      refkey={arraySerializerRefkey(type.valueType)}
      export
      returnType="any[]"
      parameters={[
        {
          name: "result",
          type: code`Array<${getParameterTypeExpression(type.valueType)}>`,
        },
      ]}
    >
      {code`return result.map((item) => { ${mapBody} });`}
    </FunctionDeclaration>
  );
}

/**
 * Props for the {@link JsonArrayDeserializer} component.
 */
export interface JsonArrayDeserializerProps {
  /** The TCGC array type to generate a deserializer helper function for. */
  type: SdkArrayType;
}

/**
 * Renders a named JSON array deserializer helper function.
 *
 * Generates a standalone function that deserializes an array of complex types
 * by mapping each element through its element deserializer. Matches the legacy
 * emitter's pattern.
 *
 * Example output for `Array<Pet>`:
 * ```typescript
 * export function petArrayDeserializer(result: Array<any>): any[] {
 *   return result.map((item) => {
 *     return petDeserializer(item);
 *   });
 * }
 * ```
 *
 * @param props - Component props containing the array type.
 * @returns An Alloy JSX tree representing the array deserializer function declaration.
 */
export function JsonArrayDeserializer(props: JsonArrayDeserializerProps) {
  const { type } = props;
  const isNullable = type.valueType.kind === "nullable";
  const elementExpr = getDeserializationExpression(type.valueType, "item");
  const mapBody = isNullable
    ? code`return !item ? item : ${elementExpr};`
    : code`return ${elementExpr};`;

  return (
    <FunctionDeclaration
      name={getArrayFunctionName(type, "Deserializer")}
      refkey={arrayDeserializerRefkey(type.valueType)}
      export
      returnType="any[]"
      parameters={[
        {
          name: "result",
          type: code`Array<${getParameterTypeExpression(type.valueType)}>`,
        },
      ]}
    >
      {code`return result.map((item) => { ${mapBody} });`}
    </FunctionDeclaration>
  );
}

/**
 * Props for the {@link JsonRecordSerializer} component.
 */
export interface JsonRecordSerializerProps {
  /** The TCGC dictionary type to generate a serializer helper function for. */
  type: SdkDictionaryType;
}

/**
 * Renders a named JSON record serializer helper function.
 *
 * Generates a standalone function that serializes a Record by iterating
 * entries and serializing each value. Uses `serializeRecord` from the
 * static helpers for the implementation.
 *
 * Example output for `Record<string, Pet>`:
 * ```typescript
 * export function petRecordSerializer(
 *   result: Record<string, Pet>,
 * ): Record<string, any> {
 *   return serializeRecord(result as any, (v: any) => petSerializer(v));
 * }
 * ```
 *
 * @param props - Component props containing the dictionary type.
 * @returns An Alloy JSX tree representing the record serializer function declaration.
 */
export function JsonRecordSerializer(props: JsonRecordSerializerProps) {
  const { type } = props;
  const valueExpr = getSerializationExpression(type.valueType, "v");

  return (
    <FunctionDeclaration
      name={getRecordFunctionName(type, "Serializer")}
      refkey={recordSerializerRefkey(type.valueType)}
      export
      returnType="Record<string, any>"
      parameters={[
        {
          name: "result",
          type: code`Record<string, ${getParameterTypeExpression(type.valueType)}>`,
        },
      ]}
    >
      {code`return ${serializationHelperRefkey("serializeRecord")}(result as any, (v: any) => ${valueExpr});`}
    </FunctionDeclaration>
  );
}

/**
 * Props for the {@link JsonRecordDeserializer} component.
 */
export interface JsonRecordDeserializerProps {
  /** The TCGC dictionary type to generate a deserializer helper function for. */
  type: SdkDictionaryType;
}

/**
 * Renders a named JSON record deserializer helper function.
 *
 * Generates a standalone function that deserializes a Record by iterating
 * entries and deserializing each value. Uses `deserializeRecord` from the
 * static helpers for the implementation.
 *
 * Example output for `Record<string, Pet>`:
 * ```typescript
 * export function petRecordDeserializer(
 *   result: Record<string, any>,
 * ): Record<string, Pet> {
 *   return deserializeRecord(result as any, (v: any) => petDeserializer(v));
 * }
 * ```
 *
 * @param props - Component props containing the dictionary type.
 * @returns An Alloy JSX tree representing the record deserializer function declaration.
 */
export function JsonRecordDeserializer(props: JsonRecordDeserializerProps) {
  const { type } = props;
  const valueExpr = getDeserializationExpression(type.valueType, "v");

  return (
    <FunctionDeclaration
      name={getRecordFunctionName(type, "Deserializer")}
      refkey={recordDeserializerRefkey(type.valueType)}
      export
      returnType="Record<string, any>"
      parameters={[
        {
          name: "result",
          type: code`Record<string, ${getParameterTypeExpression(type.valueType)}>`,
        },
      ]}
    >
      {code`return ${serializationHelperRefkey("deserializeRecord")}(result as any, (v: any) => ${valueExpr});`}
    </FunctionDeclaration>
  );
}

/**
 * Generates the TypeScript type expression for an array/record helper function's
 * parameter type. Uses refkeys for model and union types to enable Alloy's
 * automatic import resolution.
 *
 * @param type - The element/value type.
 * @returns Alloy Children for the parameter type expression.
 */
function getParameterTypeExpression(type: SdkType): Children {
  switch (type.kind) {
    case "model":
      return code`${typeRefkey(type)}`;
    case "array":
      return code`Array<${getParameterTypeExpression(type.valueType)}>`;
    case "dict":
      return code`Record<string, ${getParameterTypeExpression(type.valueType)}>`;
    case "union":
      return code`${typeRefkey(type)}`;
    case "nullable":
      return getParameterTypeExpression(type.type);
    default:
      return "any";
  }
}

/**
 * Determines whether a type has a named serializer function that can be
 * called by reference, enabling generation of named array/record helper functions.
 *
 * Types that have named serializers:
 * - Models with Input usage (have `modelSerializer()` functions)
 * - Named non-generated unions with Input usage (have pass-through serializers)
 * - Arrays whose value types have named serializers (will get array helpers)
 * - Dicts whose value types have named serializers (will get record helpers)
 *
 * Types that do NOT have named serializers (stay inline):
 * - Dates, bytes, durations (use inline expressions like `.toISOString()`)
 * - Generated unions for serialization (pass through as-is)
 * - Simple types (string, number, boolean)
 *
 * @param type - The SDK type to check.
 * @returns True if the type has a named serializer function.
 */
export function valueTypeHasNamedSerializer(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
    case "union":
      return typeHasSerializerDeclaration(type);
    case "array":
      return (
        needsTransformation(type.valueType) &&
        valueTypeHasNamedSerializer(type.valueType)
      );
    case "dict":
      return (
        needsTransformation(type.valueType) &&
        valueTypeHasNamedSerializer(type.valueType)
      );
    case "nullable":
      return valueTypeHasNamedSerializer(type.type);
    default:
      return false;
  }
}

/**
 * Determines whether a type has a named deserializer function that can be
 * called by reference, enabling generation of named array/record helper functions.
 *
 * Similar to {@link valueTypeHasNamedSerializer} but checks Output/Exception usage.
 * Also includes generated unions (unlike serializers), because the deserialization
 * code generates deserializer functions for generated unions too.
 *
 * @param type - The SDK type to check.
 * @returns True if the type has a named deserializer function.
 */
export function valueTypeHasNamedDeserializer(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
    case "union":
      return typeHasDeserializerDeclaration(type);
    case "array":
      return (
        needsTransformation(type.valueType) &&
        valueTypeHasNamedDeserializer(type.valueType)
      );
    case "dict":
      return (
        needsTransformation(type.valueType) &&
        valueTypeHasNamedDeserializer(type.valueType)
      );
    case "nullable":
      return valueTypeHasNamedDeserializer(type.type);
    default:
      return false;
  }
}

/**
 * Collects all unique array types from a list of SDK types that need
 * serializer or deserializer helper functions.
 *
 * Walks model properties, operation parameters, and response types recursively
 * to find all SdkArrayType instances whose value types have named serializer/
 * deserializer functions. Returns arrays deduped by type signature.
 *
 * @param types - SDK types to walk (e.g., from model properties, operation parameters).
 * @param direction - Whether to check for serializer ("input") or deserializer ("output").
 * @returns Unique array types that need helper functions.
 */
export function collectArrayTypes(
  types: SdkType[],
  direction: "input" | "output",
): SdkArrayType[] {
  const seen = new Set<string>();
  const result: SdkArrayType[] = [];
  const hasNamed =
    direction === "input"
      ? valueTypeHasNamedSerializer
      : valueTypeHasNamedDeserializer;

  function visit(type: SdkType) {
    if (type.kind === "array") {
      if (needsTransformation(type.valueType) && hasNamed(type.valueType)) {
        const sig = getTypeSignatureForCollection(type);
        if (!seen.has(sig)) {
          seen.add(sig);
          result.push(type);
        } else if (type.valueType.kind === "nullable") {
          // Prefer the nullable variant so the generated helper includes a null guard.
          // Both Array<T> and Array<T | null> share the same signature (nullable is unwrapped),
          // but the helper needs nullable info to generate correct code.
          const idx = result.findIndex(
            (t) => getTypeSignatureForCollection(t) === sig,
          );
          if (idx >= 0) result[idx] = type;
        }
        // Recurse into value type for nested arrays/dicts
        visit(type.valueType);
      }
    } else if (type.kind === "dict") {
      // Walk into dict value types to find nested arrays
      visit(type.valueType);
    } else if (type.kind === "nullable") {
      visit(type.type);
    }
  }

  for (const type of types) {
    visit(type);
  }
  return result;
}

/**
 * Collects all unique dict types from a list of SDK types that need
 * serializer or deserializer helper functions.
 *
 * @param types - SDK types to walk.
 * @param direction - Whether to check for serializer ("input") or deserializer ("output").
 * @returns Unique dict types that need helper functions.
 */
export function collectDictTypes(
  types: SdkType[],
  direction: "input" | "output",
): SdkDictionaryType[] {
  const seen = new Set<string>();
  const result: SdkDictionaryType[] = [];
  const hasNamed =
    direction === "input"
      ? valueTypeHasNamedSerializer
      : valueTypeHasNamedDeserializer;

  function visit(type: SdkType) {
    if (type.kind === "dict") {
      if (needsTransformation(type.valueType) && hasNamed(type.valueType)) {
        const sig = getTypeSignatureForCollection(type);
        if (!seen.has(sig)) {
          seen.add(sig);
          result.push(type);
        } else if (type.valueType.kind === "nullable") {
          const idx = result.findIndex(
            (t) => getTypeSignatureForCollection(t) === sig,
          );
          if (idx >= 0) result[idx] = type;
        }
        // Recurse into value type for nested arrays/dicts
        visit(type.valueType);
      }
    } else if (type.kind === "array") {
      // Walk into array value types to find nested dicts
      visit(type.valueType);
    } else if (type.kind === "nullable") {
      visit(type.type);
    }
  }

  for (const type of types) {
    visit(type);
  }
  return result;
}

/**
 * Generates a deterministic string signature for deduplication during collection.
 */
function getTypeSignatureForCollection(type: SdkType): string {
  switch (type.kind) {
    case "model":
      return `model:${type.name}`;
    case "array":
      return `array:${getTypeSignatureForCollection(type.valueType)}`;
    case "dict":
      return `dict:${getTypeSignatureForCollection(type.valueType)}`;
    case "nullable":
      return getTypeSignatureForCollection(type.type);
    case "union":
      return `union:${type.name ?? "anon"}`;
    case "enum":
      return `enum:${type.name ?? "anon"}`;
    default:
      return type.kind;
  }
}
