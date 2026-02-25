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
 * @param type - The TCGC enum type.
 * @param isExtensible - Whether the extensible enum pattern is active.
 * @returns The type alias body as Alloy Children.
 */
function getTypeAliasBody(type: SdkEnumType, isExtensible: boolean): Children {
  if (isExtensible) {
    return getTypeExpression(type.valueType);
  }
  return type.values.map((v) => getEnumValueLiteral(v)).join(" | ");
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
  return type.doc ?? `Type of ${type.name}`;
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
