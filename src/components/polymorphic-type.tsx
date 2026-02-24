import { Children, code, For } from "@alloy-js/core";
import { TypeDeclaration } from "@alloy-js/typescript";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import { polymorphicTypeRefkey, typeRefkey } from "../utils/refkeys.js";

/**
 * Props for the {@link PolymorphicType} component.
 */
export interface PolymorphicTypeProps {
  /** The TCGC model type that has discriminated subtypes. */
  model: SdkModelType;
}

/**
 * Renders a TypeScript union type alias for a discriminated (polymorphic) model.
 *
 * When a model has a discriminator property with subtypes (e.g., a `Pet` model
 * discriminated by `kind` with subtypes `Cat`, `Dog`), this component generates
 * a union type alias that covers all direct subtypes plus the base model:
 *
 * ```typescript
 * export type PetUnion = Cat | Dog | Pet;
 * ```
 *
 * This follows the legacy emitter's pattern where the polymorphic union provides
 * a single type that callers can use to represent "any concrete subtype or the
 * base type". The base model is included at the end as a fallback for unknown
 * discriminator values.
 *
 * Only **direct** subtypes are included — subtypes whose `baseModel` points
 * directly to this model. Intermediate subtypes in a multi-level hierarchy
 * are excluded to avoid duplication (they appear in their own parent's union).
 *
 * Each subtype is referenced via `typeRefkey(subtype)`, enabling Alloy's
 * automatic cross-file import resolution. The union itself is identified
 * by `polymorphicTypeRefkey(model)` so that serializers and other consumers
 * can reference the polymorphic type.
 *
 * @param props - The component props containing the discriminated model.
 * @returns An Alloy JSX tree containing the union type alias, or `undefined`
 *          if the model has no direct subtypes.
 */
export function PolymorphicType(props: PolymorphicTypeProps) {
  const { model } = props;
  const directSubtypes = getDirectSubtypes(model);

  // No polymorphic type needed if there are no direct subtypes
  if (directSubtypes.length === 0) {
    return undefined;
  }

  const doc = getPolymorphicDoc(model);

  return (
    <TypeDeclaration
      name={`${model.name}Union`}
      refkey={polymorphicTypeRefkey(model)}
      export
      doc={doc}
    >
      <For each={directSubtypes} joiner=" | ">
        {(subtype) => code`${typeRefkey(subtype)}`}
      </For>
      {" | "}
      {code`${typeRefkey(model)}`}
    </TypeDeclaration>
  );
}

/**
 * Filters discriminated subtypes to only those directly extending this model.
 *
 * In a multi-level discriminator hierarchy (e.g., `Animal → Bird → Eagle`),
 * `Animal.discriminatedSubtypes` may contain both `Bird` and `Eagle`. This
 * function filters to only direct children — subtypes whose `baseModel`
 * property references the given model. Intermediate subtypes generate their
 * own polymorphic union via their own `PolymorphicType` component.
 *
 * @param model - The base model with discriminated subtypes.
 * @returns An array of `SdkModelType` that are direct subtypes of this model.
 */
export function getDirectSubtypes(model: SdkModelType): SdkModelType[] {
  if (!model.discriminatedSubtypes) {
    return [];
  }

  return Object.values(model.discriminatedSubtypes).filter(
    (subtype) => subtype.baseModel === model,
  );
}

/**
 * Builds JSDoc documentation for the polymorphic union type alias.
 *
 * Uses the model's `doc` field if available, otherwise generates a
 * descriptive fallback that references the base model name. This ensures
 * every polymorphic type has IntelliSense documentation.
 *
 * @param model - The base TCGC model type.
 * @returns A documentation string for the union type alias.
 */
function getPolymorphicDoc(model: SdkModelType): string {
  return model.doc ?? `Alias for \`${model.name}\``;
}
