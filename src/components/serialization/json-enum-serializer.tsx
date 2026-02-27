import { code } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type { SdkEnumType } from "@azure-tools/typespec-client-generator-core";
import { getEnumFunctionName } from "../../utils/model-name.js";
import { serializerRefkey, typeRefkey } from "../../utils/refkeys.js";

/**
 * Props for the {@link JsonEnumSerializer} component.
 */
export interface JsonEnumSerializerProps {
  /** The TCGC enum type (with `isUnionAsEnum: true`) to generate a serializer for. */
  type: SdkEnumType;
}

/**
 * Renders a pass-through JSON serializer function for a union-as-enum type.
 *
 * When `experimentalExtensibleEnums` is NOT true, the legacy emitter generates
 * pass-through serializer functions for union-as-enum types (TypeSpec `union`
 * types that TCGC flattens into `SdkEnumType` with `isUnionAsEnum: true`).
 * These serializers return the input unchanged:
 *
 * ```typescript
 * export function provisioningStateSerializer(item: ProvisioningState): any {
 *   return item;
 * }
 * ```
 *
 * The pass-through serializer exists so model serialization code can uniformly
 * call `serializerRefkey(enumType)` for enum property types, maintaining
 * consistency with model and union serializer patterns. It also ensures
 * consumers who import these functions are not broken.
 *
 * The function is registered with `serializerRefkey(type)` so it can be
 * referenced from `getSerializationExpression()` when a union-as-enum property
 * appears in a model serializer.
 *
 * @param props - The component props containing the TCGC enum type.
 * @returns An Alloy JSX tree representing the pass-through serializer function.
 */
export function JsonEnumSerializer(props: JsonEnumSerializerProps) {
  const { type } = props;

  return (
    <FunctionDeclaration
      name={getEnumFunctionName(type, "Serializer")}
      refkey={serializerRefkey(type)}
      export
      returnType="any"
      parameters={[{ name: "item", type: typeRefkey(type) }]}
    >
      {code`return item;`}
    </FunctionDeclaration>
  );
}
