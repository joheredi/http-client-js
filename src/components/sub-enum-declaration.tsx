import { For, refkey, type Refkey } from "@alloy-js/core";
import { namekey } from "@alloy-js/core";
import { TypeDeclaration } from "@alloy-js/typescript";
import type {
  SdkEnumType,
  SdkEnumValueType,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Represents a sub-enum extracted from a flattened union-as-enum type.
 *
 * When TCGC encounters a property typed as `LR | UD` (union of enums), it
 * flattens both enums into a single combined enum (e.g., `TestColor`) with
 * `isUnionAsEnum: true`. The original enum boundaries (LR, UD) are lost in
 * the SDK type model but preserved in the `__raw` TypeSpec references on each
 * value. This interface captures a reconstructed sub-enum group.
 */
export interface SubEnumInfo {
  /** The original enum/union name from TypeSpec (e.g., "LR", "leftAndRight"). */
  name: string;
  /** The enum values belonging to this sub-enum group. */
  values: SdkEnumValueType[];
}

/**
 * Extracts original sub-enum groups from a flattened union-as-enum type.
 *
 * TCGC flattens union-of-enum types into a single `SdkEnumType` with
 * `isUnionAsEnum: true`. The individual enums are not in `sdkPackage.enums`.
 * However, each value's `__raw` property still references the original TypeSpec
 * enum/union it came from.
 *
 * This function groups the flattened values back into their original enum/union
 * containers by inspecting `__raw.enum.name` (for TypeSpec enums) and
 * `__raw.union.name` (for TypeSpec unions). This applies to both TCGC-generated
 * names (e.g., inline `enum LR | enum UD` → `TestColor`) and user-defined names
 * (e.g., `union ProvisioningState { ResourceProvisioningState, ... }`).
 *
 * @param enumType - A flattened SdkEnumType with `isUnionAsEnum === true`.
 * @returns An array of sub-enum groups, one per original TypeSpec enum/union.
 *          Returns empty array if the enum is not a union-as-enum or has no
 *          reconstructable sub-enums.
 */
export function extractSubEnums(enumType: SdkEnumType): SubEnumInfo[] {
  if (!enumType.isUnionAsEnum) {
    return [];
  }

  const groups = new Map<string, SdkEnumValueType[]>();

  for (const value of enumType.values) {
    const raw = (value as any).__raw;
    if (!raw) continue;

    let sourceName: string | undefined;

    if (raw.kind === "EnumMember" && raw.enum?.name) {
      // Value comes from a TypeSpec `enum Foo { ... }`
      sourceName = raw.enum.name;
    } else if (raw.kind === "UnionVariant" && raw.union?.name) {
      // Value comes from a TypeSpec `union Foo { ... }`
      sourceName = raw.union.name;
    }

    if (sourceName) {
      if (!groups.has(sourceName)) {
        groups.set(sourceName, []);
      }
      groups.get(sourceName)!.push(value);
    }
  }

  // Filter out groups whose name matches the parent enum — these are
  // "self-reference" groups where the values trace back to the parent union
  // itself, not to a distinct nested enum. Including them would create
  // circular type alias references (e.g., `type Foo = Foo | string`).
  return Array.from(groups.entries())
    .filter(([name]) => name !== enumType.name)
    .map(([name, values]) => ({
      name,
      values,
    }));
}

/**
 * Creates a stable refkey for a sub-enum type alias.
 *
 * Sub-enums are not real TCGC entities — they are reconstructed from the
 * flattened union-as-enum. We use the original enum name as the refkey
 * discriminator so that other components can reference sub-enum type aliases
 * via Alloy's automatic import resolution.
 *
 * @param parentEnum - The parent flattened SdkEnumType.
 * @param subEnumName - The original sub-enum name (e.g., "LR").
 * @returns A stable refkey for the sub-enum type alias.
 */
export function subEnumRefkey(parentEnum: SdkEnumType, subEnumName: string): Refkey {
  return refkey(parentEnum, "subEnum", subEnumName);
}

/**
 * Props for the {@link SubEnumDeclaration} component.
 */
export interface SubEnumDeclarationProps {
  /** The parent flattened SdkEnumType (used for refkey generation). */
  parentEnum: SdkEnumType;
  /** The sub-enum info containing the original name and values. */
  subEnum: SubEnumInfo;
}

/**
 * Renders a TypeScript type alias for a sub-enum extracted from a union-as-enum.
 *
 * When TCGC flattens `enum LR | enum UD` into `TestColor`, the individual
 * enums LR and UD need to be emitted as separate type aliases so consumers
 * can reference them independently. This component renders:
 *
 * ```typescript
 * /** Type of LR *​/
 * export type LR = "left" | "right";
 * ```
 *
 * Unlike full enum declarations (which emit both a type alias and a KnownXXX
 * enum), sub-enums only produce a type alias because they are partial views
 * of the combined enum's known values.
 *
 * @param props - Component props with the parent enum and sub-enum info.
 * @returns An Alloy JSX tree containing the type alias declaration.
 */
export function SubEnumDeclaration(props: SubEnumDeclarationProps) {
  const { parentEnum, subEnum } = props;
  const normalizedName = normalizeSubEnumName(subEnum.name);
  const doc = `Type of ${normalizedName}`;

  const literals = subEnum.values.map((v) => {
    if (typeof v.value === "string") {
      return `"${v.value}"`;
    }
    return String(v.value);
  });

  // Use namekey with ignoreNamePolicy to prevent Alloy's name policy from
  // further transforming the already-normalized name. The change-case library's
  // pascalCase turns "LR" → "Lr", but the legacy emitter preserves all-caps
  // abbreviations. We normalize manually and skip the policy.
  const preservedName = namekey(normalizedName, { ignoreNamePolicy: true });

  return (
    <TypeDeclaration
      name={preservedName}
      refkey={subEnumRefkey(parentEnum, subEnum.name)}
      export
      doc={doc}
    >
      {literals.join(" | ")}
    </TypeDeclaration>
  );
}

/**
 * Props for the {@link SubEnumDeclarations} component.
 */
export interface SubEnumDeclarationsProps {
  /** The parent flattened SdkEnumType. */
  parentEnum: SdkEnumType;
  /** Array of sub-enum groups to render. */
  subEnums: SubEnumInfo[];
}

/**
 * Renders all sub-enum type aliases for a union-as-enum type.
 *
 * Iterates over the extracted sub-enum groups and renders each as a
 * separate type alias declaration, separated by blank lines.
 *
 * @param props - Component props with the parent enum and sub-enum groups.
 * @returns Alloy JSX tree with sub-enum type aliases, or undefined if empty.
 */
export function SubEnumDeclarations(props: SubEnumDeclarationsProps) {
  if (props.subEnums.length === 0) return undefined;

  return (
    <For each={props.subEnums} doubleHardline>
      {(subEnum) => (
        <SubEnumDeclaration parentEnum={props.parentEnum} subEnum={subEnum} />
      )}
    </For>
  );
}

/**
 * Normalizes a sub-enum name to PascalCase while preserving all-caps abbreviations.
 *
 * The legacy emitter uses a normalization that capitalizes the first letter and
 * preserves the rest of the name. This handles:
 * - "LR" → "LR" (all-caps preserved, first letter already uppercase)
 * - "leftAndRight" → "LeftAndRight" (camelCase → PascalCase)
 * - "upAndDown" → "UpAndDown" (camelCase → PascalCase)
 *
 * This differs from the `change-case` library's `pascalCase` which would
 * convert "LR" to "Lr" by splitting on word boundaries.
 *
 * @param name - The original TypeSpec enum or union name.
 * @returns The normalized PascalCase name.
 */
function normalizeSubEnumName(name: string): string {
  if (name.length === 0) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
