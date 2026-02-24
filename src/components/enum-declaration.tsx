import { Children, For } from "@alloy-js/core";
import {
  EnumDeclaration as TsEnumDeclaration,
  EnumMember as TsEnumMember,
  TypeDeclaration,
} from "@alloy-js/typescript";
import type {
  SdkEnumType,
  SdkEnumValueType,
} from "@azure-tools/typespec-client-generator-core";
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
 * Every enum produces **two** declarations following the legacy emitter pattern:
 *
 * 1. **Type alias** (`type Name = "val1" | "val2" | ...`) — the primary type that
 *    other components reference via `typeRefkey(enum)`. For fixed enums, this is a
 *    union of literal values. For extensible enums (`isFixed === false`), this is the
 *    base type (e.g., `string`) to allow arbitrary values at runtime.
 *
 * 2. **Known-values enum** (`enum KnownName { Val1 = "val1", ... }`) — a TypeScript
 *    enum documenting all values the service currently accepts. Identified by
 *    `knownValuesRefkey(enum)`.
 *
 * This dual-declaration pattern ensures type safety for known values while allowing
 * extensibility when the service may add new values in the future.
 *
 * @param props - The component props containing the TCGC enum type.
 * @returns An Alloy JSX tree containing both the type alias and Known enum.
 */
export function EnumDeclaration(props: EnumDeclarationProps) {
  const { type } = props;

  const typeBody = getTypeAliasBody(type);
  const typeDoc = getTypeAliasDoc(type);
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
 * Builds the body of the type alias declaration for an enum.
 *
 * For fixed enums (closed set of values), this produces a union of all literal
 * values: `"Red" | "Green" | "Blue"`. For extensible enums (open set), this
 * produces the base type (e.g., `string` or `number`) so consumers can pass
 * values not yet known to the SDK.
 *
 * @param type - The TCGC enum type.
 * @returns The type alias body as Alloy Children.
 */
function getTypeAliasBody(type: SdkEnumType): Children {
  if (type.isFixed) {
    return type.values.map((v) => getEnumValueLiteral(v)).join(" | ");
  }
  return getTypeExpression(type.valueType);
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
