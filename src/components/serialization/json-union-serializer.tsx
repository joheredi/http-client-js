import { code } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type { SdkUnionType } from "@azure-tools/typespec-client-generator-core";
import { getUnionFunctionName } from "../../utils/model-name.js";
import { serializerRefkey, typeRefkey } from "../../utils/refkeys.js";

/**
 * Props for the {@link JsonUnionSerializer} component.
 */
export interface JsonUnionSerializerProps {
  /** The TCGC union type to generate a serializer function for. */
  type: SdkUnionType;
}

/**
 * Renders a pass-through JSON serializer function for a TCGC union type.
 *
 * Non-discriminated unions (e.g., `"bar" | Baz | string`) cannot be routed
 * to a specific subtype serializer at runtime — the emitter has no way to
 * know which variant the value actually is. The legacy emitter solves this
 * by generating a simple pass-through function that returns the item unchanged:
 *
 * ```typescript
 * export function fooSerializer(item: Foo): any {
 *   return item;
 * }
 * ```
 *
 * This function exists so that model serialization code can uniformly call
 * `serializerRefkey(unionType)` regardless of whether the property type is
 * a model, union, or other entity. Without it, the refkey would be unresolved,
 * producing broken output. It also ensures consumers who import the serializer
 * function are not broken by the rewrite.
 *
 * The function is registered with `serializerRefkey(type)` so it can be
 * referenced from `getSerializationExpression()` when a union property
 * appears in a model serializer.
 *
 * @param props - The component props containing the TCGC union type.
 * @returns An Alloy JSX tree representing the pass-through serializer function.
 */
export function JsonUnionSerializer(props: JsonUnionSerializerProps) {
  const { type } = props;

  return (
    <FunctionDeclaration
      name={getUnionFunctionName(type, "Serializer")}
      refkey={serializerRefkey(type)}
      export
      returnType="any"
      parameters={[{ name: "item", type: typeRefkey(type) }]}
    >
      {code`return item;`}
    </FunctionDeclaration>
  );
}
