import { Children, code } from "@alloy-js/core";
import type { SdkModelType, SdkType } from "@azure-tools/typespec-client-generator-core";
import { typeRefkey } from "../utils/refkeys.js";

/**
 * Checks whether a model type represents an empty anonymous model (`{}`).
 *
 * Empty anonymous models are rendered as `Record<string, any>` in type
 * references (property types, operation parameters, return types) to match
 * legacy emitter behavior. The model declaration and its serializer/deserializer
 * are still generated with the `_` prefixed name — only the type references change.
 *
 * A model is considered empty-anonymous when it has a generated (auto) name,
 * no own properties, no base model, and no additional properties.
 */
export function isEmptyAnonymousModel(type: SdkModelType): boolean {
  return (
    type.isGeneratedName === true &&
    type.properties.length === 0 &&
    !type.baseModel &&
    !type.additionalProperties
  );
}

/**
 * Returns the TypeScript type expression for a property, stripping `| null`
 * when the property is optional and the `ignoreNullableOnOptional` config
 * is active.
 *
 * This implements the Azure SDK convention where optional properties are
 * implicitly nullable, so the explicit `| null` union is redundant and
 * stripped from the output. For example, `prop?: boolean | null` becomes
 * `prop?: boolean`.
 *
 * Required nullable properties always retain `| null` regardless of config,
 * because non-optional properties need the explicit null indication.
 *
 * @param type - The TCGC SdkType to convert to a TypeScript type expression.
 * @param isOptional - Whether the property/parameter is optional.
 * @param ignoreNullableOnOptional - Whether to strip `| null` from optional nullable types.
 * @returns Alloy Children representing the TypeScript type expression.
 */
export function getOptionalAwareTypeExpression(
  type: SdkType,
  isOptional: boolean,
  ignoreNullableOnOptional: boolean,
): Children {
  if (type.kind === "nullable" && isOptional && ignoreNullableOnOptional) {
    return getTypeExpression(type.type);
  }
  return getTypeExpression(type);
}

/**
 * Maps a TCGC SdkType to a TypeScript type expression.
 *
 * This is the foundational type-mapping function used throughout the emitter.
 * It converts TCGC's language-agnostic type model into TypeScript type syntax.
 * The returned value is Alloy `Children` — it can be a plain string (for scalars),
 * a refkey (for named types like models/enums/unions that need cross-file references),
 * or a `code` template (for composite types like arrays, dicts, nullable).
 *
 * Type mappings match the legacy emitter for output parity:
 * - All integer/float types → `number` (including int64, uint64)
 * - String-encoded numerics → `string`
 * - utcDateTime, plainDate → `Date`
 * - offsetDateTime, plainTime, duration → `string`
 * - bytes → `Uint8Array`
 * - Models, enums, unions → refkey reference (auto-imports)
 *
 * @param type - The TCGC SdkType to convert to a TypeScript type expression.
 * @returns Alloy Children representing the TypeScript type expression.
 */
export function getTypeExpression(type: SdkType): Children {
  switch (type.kind) {
    // ── Array ────────────────────────────────────────────────────────────
    case "array": {
      const elementType = getTypeExpression(type.valueType);
      return code`(${elementType})[]`;
    }

    // ── Named reference types (resolved via refkey → auto-import) ───────
    case "enum":
      return typeRefkey(type);

    // ── Scalars: unknown ─────────────────────────────────────────────────
    case "unknown":
      return "any";

    // ── Scalars: boolean ─────────────────────────────────────────────────
    case "boolean":
      return "boolean";

    // ── Scalars: numeric (all map to number unless string-encoded) ──────
    case "decimal":
    case "decimal128":
    case "float":
    case "float32":
    case "float64":
    case "integer":
    case "int16":
    case "int32":
    case "int64":
    case "int8":
    case "uint16":
    case "uint32":
    case "uint64":
    case "uint8":
    case "numeric":
    case "safeint":
      if (type.encode === "string") {
        return "string";
      }
      return "number";

    // ── Scalars: string-like ─────────────────────────────────────────────
    case "endpoint":
    case "plainTime":
    case "string":
    case "url":
      return "string";

    // ── Scalars: bytes ───────────────────────────────────────────────────
    case "bytes":
      return "Uint8Array";

    // ── Literal values (constants and enum members) ──────────────────────
    case "constant":
    case "enumvalue":
      if (type.valueType.kind === "string") {
        return `"${type.value}"`;
      }
      return String(type.value);

    // ── Duration ─────────────────────────────────────────────────────────
    case "duration":
      if (type.encode === "seconds") {
        return "number";
      }
      return getTypeExpression(type.wireType);

    // ── Credential (placeholder — full implementation in Phase 4) ────────
    case "credential":
      return "string";

    // ── Dictionary ───────────────────────────────────────────────────────
    case "dict": {
      const valueType = getTypeExpression(type.valueType);
      return code`Record<string, ${valueType}>`;
    }

    // ── Model (named type → refkey reference) ────────────────────────────
    case "model":
      if (isEmptyAnonymousModel(type)) {
        return "Record<string, any>";
      }
      return typeRefkey(type);

    // ── Nullable ─────────────────────────────────────────────────────────
    case "nullable":
      return code`${getTypeExpression(type.type)} | null`;

    // ── DateTime ─────────────────────────────────────────────────────────
    case "offsetDateTime":
      return "string";

    // ── Tuple ────────────────────────────────────────────────────────────
    case "tuple": {
      const elements = type.valueTypes.map((v) => getTypeExpression(v));
      return code`[${elements}]`;
    }

    // ── Union (named type → refkey reference) ────────────────────────────
    case "union":
      return typeRefkey(type);

    // ── Date types ───────────────────────────────────────────────────────
    case "utcDateTime":
    case "plainDate":
      return "Date";

    default:
      return "any";
  }
}
