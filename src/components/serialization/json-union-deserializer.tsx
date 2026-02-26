import { code } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type { SdkUnionType } from "@azure-tools/typespec-client-generator-core";
import { getUnionFunctionName } from "../../utils/model-name.js";
import { deserializerRefkey, typeRefkey } from "../../utils/refkeys.js";

/**
 * Props for the {@link JsonUnionDeserializer} component.
 */
export interface JsonUnionDeserializerProps {
  /** The TCGC union type to generate a deserializer function for. */
  type: SdkUnionType;
}

/**
 * Renders a pass-through JSON deserializer function for a TCGC union type.
 *
 * Non-discriminated unions (e.g., `Cat | Dog` without a discriminator) cannot
 * be routed to a specific subtype deserializer at runtime — the emitter has no
 * way to know which variant the response actually is. The legacy emitter solves
 * this by generating a simple pass-through function that returns the raw JSON
 * item unchanged:
 *
 * ```typescript
 * export function _readResponseDeserializer(item: any): _ReadResponse {
 *   return item;
 * }
 * ```
 *
 * This function exists so that operation response deserialization code can
 * uniformly call `deserializerRefkey(responseType)` regardless of whether the
 * response type is a model, union, or other entity. Without it, the refkey
 * would be unresolved, producing broken output.
 *
 * The function is registered with `deserializerRefkey(type)` so it can be
 * referenced from `getDeserializationExpression()` when the response type
 * is a union.
 *
 * @param props - The component props containing the TCGC union type.
 * @returns An Alloy JSX tree representing the pass-through deserializer function.
 */
export function JsonUnionDeserializer(props: JsonUnionDeserializerProps) {
  const { type } = props;

  return (
    <FunctionDeclaration
      name={getUnionFunctionName(type, "Deserializer")}
      refkey={deserializerRefkey(type)}
      export
      returnType={code`${typeRefkey(type)}`}
      parameters={[{ name: "item", type: "any" }]}
    >
      {code`return item;`}
    </FunctionDeclaration>
  );
}
