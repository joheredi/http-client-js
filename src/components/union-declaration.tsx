import { Children, For } from "@alloy-js/core";
import { TypeDeclaration } from "@alloy-js/typescript";
import type { SdkUnionType } from "@azure-tools/typespec-client-generator-core";
import { getUnionName, getUnionDisplayName } from "../utils/model-name.js";
import { typeRefkey } from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";

/**
 * Props for the {@link UnionDeclaration} component.
 */
export interface UnionDeclarationProps {
  /** The TCGC union type to render as a TypeScript type alias. */
  type: SdkUnionType;
}

/**
 * Renders a TypeScript type alias declaration from a TCGC `SdkUnionType`.
 *
 * Every named union in the SDK package flows through this component, producing
 * a single exported type alias:
 *
 * ```typescript
 * export type MyUnion = string | number | SomeModel;
 * ```
 *
 * Variant types are resolved via {@link getTypeExpression}, which returns refkeys
 * for named types (models, enums, other unions) enabling Alloy's automatic
 * cross-file import resolution. Primitive variants resolve to plain strings.
 *
 * The component uses `<For>` with `joiner=" | "` to render pipe-separated
 * variant types, supporting both string expressions and refkey references.
 *
 * @param props - The component props containing the TCGC union type.
 * @returns An Alloy JSX tree containing the type alias declaration.
 */
export function UnionDeclaration(props: UnionDeclarationProps) {
  const { type } = props;
  const doc = getUnionDoc(type);

  return (
    <TypeDeclaration
      name={getUnionName(type)}
      refkey={typeRefkey(type)}
      export
      doc={doc}
    >
      <For each={type.variantTypes} joiner=" | ">
        {(variant) => getTypeExpression(variant) as Children}
      </For>
    </TypeDeclaration>
  );
}

/**
 * Builds JSDoc documentation for the union type alias.
 *
 * Uses the union's `doc` field if available from TypeSpec `@doc` decorators.
 * Falls back to a generated description following the legacy emitter pattern:
 * "Alias for {Name}". This ensures every union type has documentation for
 * IntelliSense consumers.
 *
 * @param type - The TCGC union type.
 * @returns A documentation string for the type alias.
 */
function getUnionDoc(type: SdkUnionType): string {
  return type.doc ?? `Alias for ${getUnionDisplayName(type)}`;
}
