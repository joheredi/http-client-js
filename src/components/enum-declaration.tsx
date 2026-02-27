import { Children, For, namekey } from "@alloy-js/core";
import {
  EnumDeclaration as TsEnumDeclaration,
  EnumMember as TsEnumMember,
  TypeDeclaration,
} from "@alloy-js/typescript";
import type {
  SdkEnumType,
  SdkEnumValueType,
} from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { useEmitterOptions } from "../context/emitter-options-context.js";
import { knownValuesRefkey, typeRefkey } from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";
import { extractSubEnums, subEnumRefkey } from "./sub-enum-declaration.js";

/**
 * Props for the {@link EnumDeclaration} component.
 */
export interface EnumDeclarationProps {
  /** The TCGC enum type to render as TypeScript declarations. */
  type: SdkEnumType;
}

/**
 * Renders TypeScript declarations for a TCGC `SdkEnumType`.
 *
 * The output depends on the enum's usage flags, `isFixed` property, and
 * the `experimentalExtensibleEnums` emitter option:
 *
 * - **API version enums** (`usage === ApiVersionEnum`): Produce only a
 *   `Known${Name}` enum (e.g., `enum KnownVersions { ... }`). These enums
 *   are only used by the `@versioned` decorator and never appear as operation
 *   parameters, so a type alias is not needed. This matches the legacy emitter's
 *   behavior of emitting a Known enum for API version enums.
 *
 * - **Fixed enums** (`isFixed === true`): Always produce only a type alias
 *   with a union of literal values (`type Name = "val1" | "val2"`).
 *
 * - **Extensible enums** (`isFixed === false`) **with** `experimentalExtensibleEnums`:
 *   Produce two declarations following the KnownXxx pattern:
 *   1. `type Name = string` — allows arbitrary runtime values
 *   2. `enum KnownName { Val1 = "val1", ... }` — documents known values
 *
 * - **Extensible enums without the flag**: Produce only a type alias with
 *   a union of all known literal values, matching the legacy emitter's
 *   default behavior.
 *
 * The KnownXxx enum is only generated when the extensible enum pattern is
 * explicitly enabled, matching the legacy emitter's `isExtensibleEnum()`
 * guard (`!type.isFixed && experimentalExtensibleEnums === true`).
 *
 * @param props - The component props containing the TCGC enum type.
 * @returns An Alloy JSX tree containing the type alias and optionally the Known enum.
 */
export function EnumDeclaration(props: EnumDeclarationProps) {
  const { type } = props;
  const { experimentalExtensibleEnums } = useEmitterOptions();

  // API version enums (only used by @versioned, not referenced in operations)
  // produce ONLY a Known enum — no type alias. This matches the legacy emitter's
  // behavior: `const apiVersionEnumOnly = type.usage === UsageFlags.ApiVersionEnum`.
  if (isApiVersionEnumOnly(type)) {
    return <ApiVersionEnumDeclaration type={type} />;
  }

  const shouldEmitKnownEnum = !type.isFixed && experimentalExtensibleEnums;

  const typeBody = getTypeAliasBody(type, shouldEmitKnownEnum);
  const typeDoc = getTypeAliasDoc(type);

  if (!shouldEmitKnownEnum) {
    return (
      <TypeDeclaration
        name={type.name}
        refkey={typeRefkey(type)}
        export
        doc={typeDoc}
      >
        {typeBody}
      </TypeDeclaration>
    );
  }

  const enumDoc = getKnownEnumDoc(type);

  return (
    <>
      <TypeDeclaration
        name={type.name}
        refkey={typeRefkey(type)}
        export
        doc={typeDoc}
      >
        {typeBody}
      </TypeDeclaration>
      {"\n\n"}
      <TsEnumDeclaration
        name={`Known${type.name}`}
        refkey={knownValuesRefkey(type)}
        export
        doc={enumDoc}
      >
        <For each={type.values} comma hardline enderPunctuation>
          {(member) => {
            const doc = getMemberDoc(member);
            return (
              <TsEnumMember
                name={member.name}
                jsValue={member.value}
                doc={doc}
              />
            );
          }}
        </For>
      </TsEnumDeclaration>
    </>
  );
}

/**
 * Renders a KnownXxx enum declaration for API version enums.
 *
 * API version enums are only used by the `@versioned` decorator and are not
 * referenced as operation parameters. The legacy emitter generates only a
 * `Known${Name}` TypeScript enum for these — no type alias is produced.
 *
 * The refkey uses `knownValuesRefkey` so that any references to this enum
 * (from type expressions or other components) resolve to the Known enum.
 * Additionally, the `typeRefkey` is registered on the same declaration so
 * references via `typeRefkey(type)` also resolve correctly.
 *
 * @param props - Component props containing the API version enum type.
 * @returns An Alloy JSX tree with the Known enum declaration.
 */
function ApiVersionEnumDeclaration(props: { type: SdkEnumType }) {
  const { type } = props;
  const enumDoc = type.doc ?? `The available API versions.`;

  return (
    <TsEnumDeclaration
      name={`Known${type.name}`}
      refkey={[knownValuesRefkey(type), typeRefkey(type)]}
      export
      doc={enumDoc}
    >
      <For each={type.values} comma hardline enderPunctuation>
        {(member) => {
          const doc = getMemberDoc(member);
          const normalizedName = normalizeVersionMemberName(member.name);
          return (
            <TsEnumMember
              name={namekey(normalizedName, { ignoreNamePolicy: true })}
              jsValue={member.value}
              doc={doc}
            />
          );
        }}
      </For>
    </TsEnumDeclaration>
  );
}

/**
 * Checks whether an enum is used exclusively as an API version enum.
 *
 * TCGC sets `UsageFlags.ApiVersionEnum` on enums declared with the
 * `@versioned` decorator. When the enum is ONLY used for versioning
 * (not referenced by any operation parameter), its usage will be exactly
 * `ApiVersionEnum` with no other flags (like Input or Output).
 *
 * When an API version enum is also referenced directly in an operation
 * (e.g., `@header apiVersion: Versions`), TCGC adds `Input` flags, so
 * this check returns false and the enum is treated as a normal fixed enum.
 *
 * @param type - The TCGC enum type to check.
 * @returns True if the enum is used only for API versioning.
 */
export function isApiVersionEnumOnly(type: SdkEnumType): boolean {
  return (type.usage & UsageFlags.ApiVersionEnum) !== 0
    && (type.usage & UsageFlags.Input) === 0
    && (type.usage & UsageFlags.Output) === 0;
}

/**
 * Builds the body of the type alias declaration for an enum.
 *
 * For extensible enums with `experimentalExtensibleEnums` enabled, this
 * produces the base type (e.g., `string` or `number`) so consumers can
 * pass values not yet known to the SDK. For all other cases (fixed enums,
 * or extensible without the flag), this produces a union of all literal
 * values: `"Red" | "Green" | "Blue"`.
 *
 * For union-as-enum types (where TCGC flattened multiple enums into one),
 * the body composes sub-enum type references instead of flattening all
 * values. This preserves the individual enum identities (e.g.,
 * `ResourceProvisioningState | "Provisioning" | string`).
 *
 * @param type - The TCGC enum type.
 * @param isExtensible - Whether the extensible enum pattern is active.
 * @returns The type alias body as Alloy Children.
 */
function getTypeAliasBody(type: SdkEnumType, isExtensible: boolean): Children {
  if (isExtensible) {
    return getTypeExpression(type.valueType);
  }

  // For union-as-enum types, compose sub-enum references with remaining literals.
  // This matches the legacy emitter which preserves nested enum identities.
  if (type.isUnionAsEnum) {
    return buildComposedUnionBody(type);
  }

  return type.values.map((v) => getEnumValueLiteral(v)).join(" | ");
}

/**
 * Represents a part of a composed union type body.
 *
 * Used by {@link buildComposedUnionBody} to construct a type alias body
 * that mixes sub-enum refkey references with literal string values.
 */
type ComposedPart =
  | { kind: "ref"; subName: string }
  | { kind: "lit"; text: string };

/**
 * Builds a composed type alias body for a union-as-enum type.
 *
 * Instead of flattening all values into a single string literal union,
 * this preserves nested enum identities by referencing sub-enum type
 * aliases. Values that don't belong to any sub-enum are emitted as
 * inline literals. If the enum is extensible (`!isFixed`), `| string`
 * is appended to allow arbitrary values.
 *
 * Example: For `union ProvisioningState { ResourceProvisioningState, "Provisioning", string }`:
 * ```typescript
 * export type ProvisioningState = ResourceProvisioningState | "Provisioning" | string;
 * ```
 *
 * Falls back to a flat literal union if no sub-enums can be extracted
 * (e.g., when `__raw` references are unavailable).
 *
 * @param type - The TCGC enum type with `isUnionAsEnum === true`.
 * @returns Alloy Children representing the composed type body.
 */
function buildComposedUnionBody(type: SdkEnumType): Children {
  const subEnums = extractSubEnums(type);
  if (subEnums.length === 0) {
    // No external sub-enums — fall back to flat literal union matching
    // the current behavior (without | string extensibility).
    return type.values.map((v) => getEnumValueLiteral(v)).join(" | ");
  }

  // Build a lookup from value to sub-enum name for O(1) checks
  const valueToSubEnum = new Map<string, string>();
  for (const sub of subEnums) {
    for (const v of sub.values) {
      valueToSubEnum.set(String(v.value), sub.name);
    }
  }

  // Collect ungrouped literal values (not belonging to any sub-enum)
  const ungroupedValues = type.values.filter(
    (v) => !valueToSubEnum.has(String(v.value)),
  );

  // Try to reconstruct the original TypeSpec source order from __raw union variants.
  // TCGC flattens the union values and loses the original variant order.
  // The __raw TypeSpec Union preserves variant insertion order.
  const parts = buildPartsFromRawVariants(type, subEnums, ungroupedValues);

  if (!type.isFixed) {
    parts.push({ kind: "lit", text: "string" });
  }

  return (
    <For each={parts} joiner=" | ">
      {(part) => {
        if (part.kind === "ref") {
          return subEnumRefkey(type, part.subName) as Children;
        }
        return part.text;
      }}
    </For>
  );
}

/**
 * Reconstructs union parts in TypeSpec source order using the __raw union.
 *
 * The TypeSpec Union type preserves variant insertion order. Each variant
 * is either a named type (enum/union → sub-enum ref) or an anonymous
 * string literal. We walk the original variants to produce parts in the
 * correct source order.
 *
 * Falls back to a simple ordering (literals first, then sub-enum refs)
 * if the __raw union is not available.
 *
 * @param type - The TCGC enum-as-union type.
 * @param subEnums - The extracted sub-enum groups.
 * @param ungroupedValues - Literal values not belonging to any sub-enum.
 * @returns Ordered parts for the composed type body.
 */
function buildPartsFromRawVariants(
  type: SdkEnumType,
  subEnums: { name: string; values: SdkEnumValueType[] }[],
  ungroupedValues: SdkEnumValueType[],
): ComposedPart[] {
  const raw = (type as any).__raw;

  // If __raw is a Union, use its variants for ordering
  if (raw?.kind === "Union" && raw.variants) {
    const parts: ComposedPart[] = [];
    const emittedSubEnums = new Set<string>();
    const subEnumNames = new Set(subEnums.map((s) => s.name));

    for (const [, variant] of raw.variants) {
      // Check if this variant references a named type (enum or union)
      const variantType = variant.type;
      if (variantType && (variantType.kind === "Enum" || variantType.kind === "Union") && variantType.name) {
        if (subEnumNames.has(variantType.name) && !emittedSubEnums.has(variantType.name)) {
          emittedSubEnums.add(variantType.name);
          parts.push({ kind: "ref", subName: variantType.name });
        }
      } else if (variantType?.kind === "Scalar" && variantType.name === "string") {
        // Skip 'string' base type — handled separately via isFixed
      } else if (variantType?.kind === "String") {
        // String literal variant — emit as literal
        parts.push({ kind: "lit", text: `"${variantType.value}"` });
      }
    }
    return parts;
  }

  // Fallback: use type.values order (TCGC flattened order)
  const parts: ComposedPart[] = [];
  const emittedSubEnums = new Set<string>();
  for (const v of type.values) {
    const subName = valueToSubEnumLookup(v, subEnums);
    if (subName) {
      if (!emittedSubEnums.has(subName)) {
        emittedSubEnums.add(subName);
        parts.push({ kind: "ref", subName });
      }
    } else {
      parts.push({ kind: "lit", text: getEnumValueLiteral(v) });
    }
  }
  return parts;
}

/**
 * Looks up which sub-enum a value belongs to.
 */
function valueToSubEnumLookup(
  value: SdkEnumValueType,
  subEnums: { name: string; values: SdkEnumValueType[] }[],
): string | undefined {
  const valStr = String(value.value);
  for (const sub of subEnums) {
    for (const v of sub.values) {
      if (String(v.value) === valStr) return sub.name;
    }
  }
  return undefined;
}

/**
 * Converts an enum member to its TypeScript literal representation.
 *
 * String values are wrapped in double quotes (`"red"`), while numeric values
 * are rendered as bare numbers (`42`). These literals form the union type body
 * of fixed enum type aliases.
 *
 * @param value - The TCGC enum value to convert.
 * @returns A string literal representation suitable for a union type.
 */
function getEnumValueLiteral(value: SdkEnumValueType): string {
  if (typeof value.value === "string") {
    return `"${value.value}"`;
  }
  return String(value.value);
}

/**
 * Builds JSDoc documentation for the enum type alias.
 *
 * Uses the enum's `doc` field if available. Falls back to a generated
 * description following the legacy pattern: "Type of {Name}".
 *
 * @param type - The TCGC enum type.
 * @returns A documentation string for the type alias.
 */
function getTypeAliasDoc(type: SdkEnumType): string {
  if (type.doc) return type.doc;
  // Union-as-enum types that contain sub-enums use "Alias for" prefix
  // to match legacy emitter behavior for union types.
  if (type.isUnionAsEnum && extractSubEnums(type).length > 0) {
    return `Alias for ${type.name}`;
  }
  return `Type of ${type.name}`;
}

/**
 * Builds JSDoc documentation for the KnownXXX enum declaration.
 *
 * Uses the enum's `doc` field if available. Falls back to a generated
 * description referencing the type alias via `{@link}` to help consumers
 * navigate between the type and its known values.
 *
 * @param type - The TCGC enum type.
 * @returns A documentation string for the Known enum.
 */
function getKnownEnumDoc(type: SdkEnumType): string {
  return (
    type.doc ??
    `Known values of {@link ${type.name}} that the service accepts.`
  );
}

/**
 * Builds JSDoc documentation for an individual enum member.
 *
 * Uses the member's `doc` field if available. Falls back to using the
 * member's literal value as documentation, which matches the legacy
 * emitter's behavior of always providing some description for each member.
 *
 * @param member - The TCGC enum value.
 * @returns A documentation string for the enum member.
 */
function getMemberDoc(member: SdkEnumValueType): string {
  return member.doc ?? String(member.value);
}

/**
 * Normalizes a TCGC enum member name to PascalCase for API version enums.
 *
 * Converts underscore-separated version identifiers (e.g., `v2021_10_01_preview`)
 * to PascalCase (e.g., `V20211001Preview`), matching the legacy emitter's
 * `normalizeName(member.name, NameType.EnumMemberName, true)` behavior.
 *
 * The transformation splits on underscores, capitalizes the first character of
 * each segment, and joins them without separators. Numeric-only segments are
 * preserved as-is (they have no first character to capitalize).
 *
 * Uses `namekey` with `ignoreNamePolicy: true` in the caller to prevent
 * Alloy's TypeScript name policy from re-transforming the already-normalized name.
 *
 * @param name - The raw TCGC enum member name (e.g., `v2021_10_01_preview`).
 * @returns The PascalCase-normalized name (e.g., `V20211001Preview`).
 */
export function normalizeVersionMemberName(name: string): string {
  return name
    .split("_")
    .map((segment) => {
      if (!segment) return "";
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join("");
}
