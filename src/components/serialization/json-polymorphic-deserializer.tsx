import { code } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import {
  deserializerRefkey,
  polymorphicTypeRefkey,
} from "../../utils/refkeys.js";
import { buildPolymorphicSwitchBody } from "./json-polymorphic-serializer.js";

/**
 * Props for the {@link JsonPolymorphicDeserializer} component.
 */
export interface JsonPolymorphicDeserializerProps {
  /** The TCGC model type with a discriminator property and subtypes. */
  model: SdkModelType;
}

/**
 * Renders a JSON polymorphic deserializer function for a discriminated model type.
 *
 * When a model has a discriminator property with subtypes (e.g., `Pet` discriminated
 * by `kind` with subtypes `Cat`, `Dog`), this component generates a switch-based
 * deserializer function that routes to the appropriate subtype deserializer based on
 * the discriminator value in the raw JSON:
 *
 * ```typescript
 * export function petUnionDeserializer(item: any): PetUnion {
 *   switch (item["kind"]) {
 *     case "cat":
 *       return catDeserializer(item as Cat);
 *     case "dog":
 *       return dogDeserializer(item as Dog);
 *     default:
 *       return item;
 *   }
 * }
 * ```
 *
 * Unlike the serializer, the deserializer switches on the **wire property name**
 * (serializedName) because the item is a raw JSON response from the service.
 * The return type is the polymorphic union type, ensuring callers receive a
 * properly typed result.
 *
 * The default case returns the item as-is for unknown discriminator values, providing
 * a safe fallback when new subtypes are added to the service.
 *
 * This deserializer uses `deserializerRefkey(model)`, so when other components
 * reference the deserializer for a discriminated model, they get the polymorphic
 * switch deserializer (not a plain property deserializer).
 *
 * @param props - The component props containing the discriminated model type.
 * @returns An Alloy JSX tree representing the polymorphic deserializer function declaration.
 */
export function JsonPolymorphicDeserializer(
  props: JsonPolymorphicDeserializerProps,
) {
  const { model } = props;
  const discriminatorProp = model.discriminatorProperty!;
  const entries = Object.entries(model.discriminatedSubtypes ?? {});

  return (
    <FunctionDeclaration
      name={`${model.name}UnionDeserializer`}
      refkey={deserializerRefkey(model)}
      export
      returnType={code`${polymorphicTypeRefkey(model)}`}
      parameters={[{ name: "item", type: "any" }]}
    >
      {buildPolymorphicSwitchBody(
        discriminatorProp.serializedName,
        entries,
        deserializerRefkey,
      )}
    </FunctionDeclaration>
  );
}
