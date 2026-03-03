import { Children, code, For } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkModelType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { getUnionFunctionName } from "../../utils/model-name.js";
import { serializerRefkey, typeRefkey } from "../../utils/refkeys.js";
import { typeHasSerializerDeclaration } from "../../utils/serialization-predicates.js";
import {
  findUniquePropertyForModel,
  getDiscriminatedVariantMapping,
  unwrapNullable,
} from "../../utils/union-discrimination.js";

/**
 * Props for the {@link JsonUnionSerializer} component.
 */
export interface JsonUnionSerializerProps {
  /** The TCGC union type to generate a serializer function for. */
  type: SdkUnionType;
}

/**
 * Renders a JSON serializer function for a TCGC union type.
 *
 * For non-discriminated unions (e.g., `"bar" | Baz | string`), generates a
 * simple pass-through function since the variant cannot be determined at runtime.
 *
 * For discriminated unions (unions with `discriminatedOptions`), generates
 * variant-detection logic using property existence checks, then wraps the
 * serialized variant in the appropriate wire format:
 * - **Envelope mode**: `{ discriminator: "value", envelope: serialized }`
 * - **No-envelope mode**: `{ discriminator: "value", ...serialized }`
 *
 * @param props - The component props containing the TCGC union type.
 * @returns An Alloy JSX tree representing the serializer function.
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
      {buildUnionSerializerBody(type)}
    </FunctionDeclaration>
  );
}

/**
 * Builds the function body for a union serializer.
 *
 * If the union has `discriminatedOptions`, generates variant-aware serialization
 * with envelope/no-envelope handling. Otherwise, generates a simple pass-through.
 */
function buildUnionSerializerBody(type: SdkUnionType): Children {
  const discOpts = type.discriminatedOptions;
  if (!discOpts) {
    return code`return item;`;
  }

  // Build variant-to-discriminator-value mapping from the raw TypeSpec union
  const variantMapping = getDiscriminatedVariantMapping(type);
  if (!variantMapping || variantMapping.size === 0) {
    return code`return item;`;
  }

  // Extract model variants for property-based discrimination
  const modelVariants: SdkModelType[] = [];
  for (const v of type.variantTypes) {
    const base = unwrapNullable(v);
    if (base.kind === "model") {
      modelVariants.push(base);
    }
  }

  if (modelVariants.length === 0) {
    return code`return item;`;
  }

  return buildDiscriminatedSerializerBody(
    modelVariants,
    variantMapping,
    discOpts,
  );
}

/**
 * Generates if/else chains that detect the variant model at runtime using
 * unique property existence, then serialize it with the correct wire format.
 */
function buildDiscriminatedSerializerBody(
  modelVariants: SdkModelType[],
  variantMapping: Map<SdkModelType, string>,
  discOpts: NonNullable<SdkUnionType["discriminatedOptions"]>,
): Children {
  const { discriminatorPropertyName, envelope, envelopePropertyName } =
    discOpts;

  const checks: Children[] = [];
  let firstCheck = true;

  for (const model of modelVariants) {
    const discriminatorValue = variantMapping.get(model);
    if (!discriminatorValue) continue;

    const uniqueProp = findUniquePropertyForModel(model, modelVariants);
    if (!uniqueProp) continue;

    const keyword = firstCheck ? "if" : "else if";
    firstCheck = false;

    const serializeExpr = typeHasSerializerDeclaration(model)
      ? code`${serializerRefkey(model)}(item as any)`
      : "item";

    if (envelope === "object" && envelopePropertyName) {
      checks.push(
        <>
          {code`${keyword} ("${uniqueProp}" in (item as any)) {`}
          {"\n"}
          {code`  return { "${discriminatorPropertyName}": "${discriminatorValue}", "${envelopePropertyName}": ${serializeExpr} };`}
          {"\n"}
          {code`}`}
        </>,
      );
    } else {
      // No-envelope: discriminator is inline with the serialized properties
      checks.push(
        <>
          {code`${keyword} ("${uniqueProp}" in (item as any)) {`}
          {"\n"}
          {code`  return { "${discriminatorPropertyName}": "${discriminatorValue}", ...${serializeExpr} };`}
          {"\n"}
          {code`}`}
        </>,
      );
    }
  }

  // Fallback for unmatched variants
  checks.push(code`return item;`);

  return (
    <>
      <For each={checks} hardline>
        {(check) => <>{check}</>}
      </For>
    </>
  );
}
