import { Children, code, For, type Refkey } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import {
  polymorphicTypeRefkey,
  serializerRefkey,
  typeRefkey,
} from "../../utils/refkeys.js";

/**
 * Props for the {@link JsonPolymorphicSerializer} component.
 */
export interface JsonPolymorphicSerializerProps {
  /** The TCGC model type with a discriminator property and subtypes. */
  model: SdkModelType;
}

/**
 * Renders a JSON polymorphic serializer function for a discriminated model type.
 *
 * When a model has a discriminator property with subtypes (e.g., `Pet` discriminated
 * by `kind` with subtypes `Cat`, `Dog`), this component generates a switch-based
 * serializer function that routes to the appropriate subtype serializer based on
 * the discriminator value:
 *
 * ```typescript
 * export function petUnionSerializer(item: PetUnion): any {
 *   switch (item["kind"]) {
 *     case "cat":
 *       return catSerializer(item as Cat);
 *     case "dog":
 *       return dogSerializer(item as Dog);
 *     default:
 *       return item;
 *   }
 * }
 * ```
 *
 * The function accepts the polymorphic union type (not the base model type) as its
 * parameter, so callers don't need to know whether a model is polymorphic or not.
 * The switch uses the client-side property name for the discriminator, since the
 * item is already a typed SDK object at serialization time.
 *
 * The default case returns the item as-is for unknown discriminator values, providing
 * a safe fallback when new subtypes are added to the service.
 *
 * This serializer uses `serializerRefkey(model)`, so when other components reference
 * the serializer for a discriminated model, they get the polymorphic switch serializer
 * (not a plain property serializer).
 *
 * @param props - The component props containing the discriminated model type.
 * @returns An Alloy JSX tree representing the polymorphic serializer function declaration.
 */
export function JsonPolymorphicSerializer(
  props: JsonPolymorphicSerializerProps,
) {
  const { model } = props;
  const discriminatorProp = model.discriminatorProperty!;
  const entries = Object.entries(model.discriminatedSubtypes ?? {});

  return (
    <FunctionDeclaration
      name={`${model.name}UnionSerializer`}
      refkey={serializerRefkey(model)}
      export
      returnType="any"
      parameters={[
        { name: "item", type: code`${polymorphicTypeRefkey(model)}` },
      ]}
    >
      {buildPolymorphicSwitchBody(
        discriminatorProp.name,
        entries,
        serializerRefkey,
      )}
    </FunctionDeclaration>
  );
}

/**
 * Builds the switch statement body for a polymorphic serializer or deserializer.
 *
 * Generates a switch on the discriminator property that routes each known
 * discriminator value to the appropriate subtype serializer/deserializer. The
 * default case returns the item as-is for forward compatibility with unknown
 * discriminator values.
 *
 * This is a shared utility used by both {@link JsonPolymorphicSerializer} and
 * the polymorphic deserializer. The `refkeyFn` parameter determines which
 * refkey is used for each subtype's function reference (serializer or deserializer).
 *
 * @param discriminatorName - The property name to switch on (client or wire name).
 * @param entries - Entries from `discriminatedSubtypes` as `[discriminatorValue, subtypeModel]` pairs.
 * @param refkeyFn - Function that returns the appropriate refkey for each subtype
 *                   (e.g., `serializerRefkey` or `deserializerRefkey`).
 * @returns Alloy Children representing the complete switch statement.
 */
export function buildPolymorphicSwitchBody(
  discriminatorName: string,
  entries: [string, SdkModelType][],
  refkeyFn: (entity: unknown) => Refkey,
): Children {
  return (
    <>
      {code`switch (item["${discriminatorName}"]) {`}
      {"\n"}
      <For each={entries} hardline>
        {([value, subtype]) => (
          <>
            {code`  case "${value}":`}
            {"\n"}
            {code`    return ${refkeyFn(subtype)}(item as ${typeRefkey(subtype)});`}
          </>
        )}
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
