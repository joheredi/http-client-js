import { Children, code, For } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkArrayType,
  SdkModelType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { getUnionFunctionName } from "../../utils/model-name.js";
import { createNamespaceMetadata } from "../../utils/namespace-qualifier.js";
import { deserializerRefkey, typeRefkey } from "../../utils/refkeys.js";
import { typeHasDeserializerDeclaration } from "../../utils/serialization-predicates.js";
import {
  findDiscriminatorProperty,
  findUniquePropertyForModel,
  getDiscriminatedVariantMapping,
  unwrapNullable,
  variantNeedsDeserialization,
} from "../../utils/union-discrimination.js";

/**
 * Props for the {@link JsonUnionDeserializer} component.
 */
export interface JsonUnionDeserializerProps {
  /** The TCGC union type to generate a deserializer function for. */
  type: SdkUnionType;
}

/**
 * Renders a JSON deserializer function for a TCGC union type.
 *
 * When variant types require active deserialization (e.g., Date parsing from
 * ISO strings), this component generates discrimination logic to route each
 * value to the appropriate variant deserializer. Discrimination strategies
 * include:
 *
 * 1. **Constant property values** — if variants have a shared property with
 *    distinct constant values (e.g., `kind: "kind0"` vs `kind: "kind1"`),
 *    generates a switch statement.
 * 2. **Property existence** — if a variant needing transformation has a unique
 *    property not present in other variants, generates an `in` check.
 * 3. **Array vs object** — if the union includes array variants alongside
 *    non-array variants, generates an `Array.isArray()` check.
 *
 * When no variant needs transformation, or when discrimination is not possible,
 * falls back to a simple pass-through (`return item`).
 *
 * @param props - The component props containing the TCGC union type.
 * @returns An Alloy JSX tree representing the deserializer function.
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
      metadata={createNamespaceMetadata(type)}
    >
      {buildUnionDeserializerBody(type)}
    </FunctionDeclaration>
  );
}

/**
 * Builds the function body for a union deserializer.
 *
 * For discriminated unions (unions with `discriminatedOptions`), generates
 * a switch statement on the discriminator property that unwraps envelope
 * structures and deserializes the correct variant.
 *
 * For non-discriminated unions, analyzes the union's variant types and
 * generates the minimal discrimination code needed to correctly deserialize
 * each variant. Returns `return item;` when no variant requires transformation.
 */
function buildUnionDeserializerBody(type: SdkUnionType): Children {
  // Handle discriminated unions first — they always need deserialization
  // to unwrap envelope structures or strip inline discriminator properties
  const discOpts = type.discriminatedOptions;
  if (discOpts) {
    return buildDiscriminatedDeserializerBody(type, discOpts);
  }

  const variants = type.variantTypes;

  // If no variant needs active deserialization, keep pass-through
  if (!variants.some((v) => variantNeedsDeserialization(v))) {
    return code`return item;`;
  }

  // Separate array and non-array variants
  const arrayVariants: SdkArrayType[] = [];
  const modelVariants: SdkModelType[] = [];

  for (const v of variants) {
    const base = unwrapNullable(v);
    if (base.kind === "array") {
      arrayVariants.push(base);
    } else if (base.kind === "model") {
      modelVariants.push(base);
    }
  }

  // Build body parts
  const parts: Children[] = [];

  // Array check (if we have both array and non-array variants)
  if (arrayVariants.length > 0 && modelVariants.length > 0) {
    parts.push(buildArrayCheck(arrayVariants[0]));
  }

  // Model variant discrimination
  if (modelVariants.length >= 2) {
    parts.push(buildModelDiscrimination(modelVariants));
  } else if (modelVariants.length === 1 && arrayVariants.length > 0) {
    // Single model variant alongside array variants — no discrimination needed
    const model = modelVariants[0];
    if (typeHasDeserializerDeclaration(model)) {
      parts.push(code`return ${deserializerRefkey(model)}(item);`);
    } else {
      parts.push(code`return item;`);
    }
  } else {
    parts.push(code`return item;`);
  }

  return (
    <>
      <For each={parts} hardline>
        {(part) => <>{part}</>}
      </For>
    </>
  );
}

/**
 * Generates an Array.isArray() check for array variants.
 * If the array element type needs deserialization, maps over elements with
 * the element deserializer. Otherwise returns the array as-is.
 */
function buildArrayCheck(arrayType: SdkArrayType): Children {
  const elementType = unwrapNullable(arrayType.valueType);
  const elementHasDeser =
    elementType.kind === "model" && typeHasDeserializerDeclaration(elementType);
  const elementNeedsDeser = variantNeedsDeserialization(elementType);

  if (elementHasDeser && elementNeedsDeser) {
    return (
      <>
        {code`if (Array.isArray(item)) {`}
        {"\n"}
        {code`  return item.map((v: any) => ${deserializerRefkey(elementType)}(v));`}
        {"\n"}
        {code`}`}
      </>
    );
  }

  return (
    <>
      {code`if (Array.isArray(item)) {`}
      {"\n"}
      {code`  return item;`}
      {"\n"}
      {code`}`}
    </>
  );
}

/**
 * Generates discrimination logic for model variants.
 * Tries constant-value property discrimination first, falls back to
 * property existence checks.
 */
function buildModelDiscrimination(modelVariants: SdkModelType[]): Children {
  const discriminator = findDiscriminatorProperty(modelVariants);

  if (discriminator && discriminator.isFullyDistinct) {
    return buildSwitchDiscrimination(discriminator, modelVariants);
  }

  // Overlapping or no discriminator — use property existence checks
  return buildPropertyExistenceChecks(modelVariants);
}

/**
 * Generates a switch statement on a discriminator property with fully
 * distinct values across model variants.
 */
function buildSwitchDiscrimination(
  discriminator: {
    serializedName: string;
    valueToModels: Map<string, SdkModelType[]>;
  },
  _modelVariants: SdkModelType[],
): Children {
  const entries = [...discriminator.valueToModels.entries()];

  return (
    <>
      {code`switch (item["${discriminator.serializedName}"]) {`}
      {"\n"}
      <For each={entries} hardline>
        {([value, models]) => {
          const model = models[0];
          if (typeHasDeserializerDeclaration(model)) {
            return (
              <>
                {code`  case "${value}":`}
                {"\n"}
                {code`    return ${deserializerRefkey(model)}(item);`}
              </>
            );
          }
          return (
            <>
              {code`  case "${value}":`}
              {"\n"}
              {code`    return item;`}
            </>
          );
        }}
      </For>
      {"\n"}
      {code`  default:`}
      {"\n"}
      {code`    return item;`}
      {"\n"}
      {code`}`}
    </>
  );
}

/**
 * Generates if-checks based on unique property existence for models that
 * need deserialization. Falls back to `return item` for unmatched variants.
 */
function buildPropertyExistenceChecks(modelVariants: SdkModelType[]): Children {
  const checks: Children[] = [];

  for (const model of modelVariants) {
    if (
      variantNeedsDeserialization(model) &&
      typeHasDeserializerDeclaration(model)
    ) {
      const uniqueProp = findUniquePropertyForModel(model, modelVariants);
      if (uniqueProp) {
        checks.push(
          <>
            {code`if ("${uniqueProp}" in item) {`}
            {"\n"}
            {code`  return ${deserializerRefkey(model)}(item);`}
            {"\n"}
            {code`}`}
          </>,
        );
      }
    }
  }

  checks.push(code`return item;`);

  return (
    <>
      <For each={checks} hardline>
        {(check) => <>{check}</>}
      </For>
    </>
  );
}

/**
 * Generates deserialization logic for discriminated unions using a switch
 * statement on the discriminator property.
 *
 * For envelope mode (`{ kind: "cat", value: {...} }`), reads the discriminator,
 * then deserializes the data from the envelope property.
 *
 * For no-envelope mode (`{ kind: "cat", name: "whiskers", ... }`), reads the
 * discriminator, strips it from the item, and deserializes the remaining properties.
 */
function buildDiscriminatedDeserializerBody(
  type: SdkUnionType,
  discOpts: NonNullable<SdkUnionType["discriminatedOptions"]>,
): Children {
  const variantMapping = getDiscriminatedVariantMapping(type);
  if (!variantMapping || variantMapping.size === 0) {
    return code`return item;`;
  }

  const { discriminatorPropertyName, envelope, envelopePropertyName } =
    discOpts;

  const entries: Array<{ discriminatorValue: string; model: SdkModelType }> =
    [];
  for (const [model, discriminatorValue] of variantMapping) {
    entries.push({ discriminatorValue, model });
  }

  return (
    <>
      {code`switch (item["${discriminatorPropertyName}"]) {`}
      {"\n"}
      <For each={entries} hardline>
        {({ discriminatorValue, model }) => {
          const deserializeExpr = typeHasDeserializerDeclaration(model)
            ? (accessor: string) =>
                code`${deserializerRefkey(model)}(${accessor})`
            : (accessor: string) => code`${accessor}`;

          if (envelope === "object" && envelopePropertyName) {
            // Envelope: unwrap the data from the envelope property
            return (
              <>
                {code`  case "${discriminatorValue}":`}
                {"\n"}
                {code`    return ${deserializeExpr(`item["${envelopePropertyName}"]`)};`}
              </>
            );
          } else {
            // No-envelope: strip the discriminator and deserialize
            // The discriminator is part of the wire object but not the client model
            return (
              <>
                {code`  case "${discriminatorValue}": {`}
                {"\n"}
                {code`    const { ["${discriminatorPropertyName}"]: _, ...rest } = item;`}
                {"\n"}
                {code`    return ${deserializeExpr("rest")};`}
                {"\n"}
                {code`  }`}
              </>
            );
          }
        }}
      </For>
      {"\n"}
      {code`  default:`}
      {"\n"}
      {code`    return item;`}
      {"\n"}
      {code`}`}
    </>
  );
}
