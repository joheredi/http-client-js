import { Children, code, For } from "@alloy-js/core";
import {
  InterfaceDeclaration,
  InterfaceMember,
} from "@alloy-js/typescript";
import type {
  SdkModelPropertyType,
  SdkModelType,
} from "@azure-tools/typespec-client-generator-core";
import { Visibility } from "@typespec/http";
import { getModelName } from "../utils/model-name.js";
import { typeRefkey } from "../utils/refkeys.js";
import { getOptionalAwareTypeExpression, getTypeExpression } from "./type-expression.js";
import { useEmitterOptions } from "../context/emitter-options-context.js";

/**
 * Props for the {@link ModelInterface} component.
 */
export interface ModelInterfaceProps {
  /** The TCGC model type to render as a TypeScript interface. */
  model: SdkModelType;
}

/**
 * Renders a TypeScript `interface` declaration from a TCGC `SdkModelType`.
 *
 * This is the primary component for generating model type declarations in the
 * emitter output. It maps every aspect of the TCGC model — name, properties,
 * inheritance, discriminators, additional properties, and documentation — into
 * an Alloy `<InterfaceDeclaration>` tree that Alloy renders to TypeScript source.
 *
 * Key behaviors:
 * - Properties are rendered as `<InterfaceMember>` with correct name, type,
 *   optional, and readonly attributes.
 * - Base model inheritance produces an `extends BaseModel` clause via refkey.
 * - Discriminator properties on subtypes use the literal `discriminatorValue`
 *   as their type instead of the general discriminator type.
 * - `additionalProperties` on the model becomes an index signature member
 *   (`[key: string]: T`).
 * - Flattened properties (property with `flatten: true` and a model type)
 *   are expanded inline — their nested model's properties become direct
 *   members of this interface.
 * - JSDoc documentation is attached to both the interface and its members
 *   from TCGC `doc` and `summary` fields.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the TypeScript interface declaration.
 */
export function ModelInterface(props: ModelInterfaceProps) {
  const { model } = props;

  const extendsClause = getExtendsClause(model);
  const doc = getModelDoc(model);
  const properties = getExpandedProperties(model);

  return (
    <InterfaceDeclaration
      name={getModelName(model)}
      refkey={typeRefkey(model)}
      export
      extends={extendsClause}
      doc={doc}
    >
      <For each={properties} semicolon hardline enderPunctuation>
        {(prop) => <ModelPropertyMember property={prop} model={model} />}
      </For>
      {model.additionalProperties ? <>
        {properties.length > 0 ? "\n" : ""}
        <AdditionalPropertiesMember model={model} />
      </> : undefined}
    </InterfaceDeclaration>
  );
}

/**
 * Props for the {@link ModelPropertyMember} component.
 */
interface ModelPropertyMemberProps {
  /** The TCGC property to render as an interface member. */
  property: SdkModelPropertyType;
  /** The owning model, used for discriminator value resolution. */
  model: SdkModelType;
}

/**
 * Renders a single property as a `<InterfaceMember>` inside an interface body.
 *
 * Handles three property variants:
 * 1. **Discriminator on subtype**: When the property is the discriminator and
 *    the model has a `discriminatorValue`, the type becomes the string literal
 *    `"value"` instead of the general discriminator union.
 * 2. **Regular property**: Type comes from `getTypeExpression(prop.type)`.
 * 3. **Readonly**: Determined by visibility — a property visible only for
 *    `Read` operations is marked `readonly`.
 *
 * @param props - The component props with the property and owning model.
 * @returns An Alloy JSX `<InterfaceMember>` element.
 */
function ModelPropertyMember(props: ModelPropertyMemberProps) {
  const { property, model } = props;

  const propertyType = getPropertyTypeExpression(property, model);
  const readonly = isReadOnly(property);
  const doc = property.doc ?? property.summary;

  return (
    <InterfaceMember
      name={property.name}
      type={propertyType}
      optional={property.optional}
      readonly={readonly}
      doc={doc}
    />
  );
}

/**
 * Renders an explicit `additionalProperties` field for models with additional properties.
 *
 * When a TCGC model has `additionalProperties` set, it means the model
 * accepts extra key-value pairs beyond its declared properties. This is
 * rendered as an explicit optional property:
 * ```typescript
 * additionalProperties?: Record<string, T>
 * ```
 *
 * This matches the legacy emitter's non-compatibility-mode output where
 * additional properties are collected in an explicit bag rather than using
 * a TypeScript index signature (`[key: string]: T`). The explicit field
 * approach is preferred because:
 * 1. It avoids type conflicts between index signatures and named properties
 * 2. It clearly communicates the extra-properties concept to SDK consumers
 * 3. It works correctly with the serializer's `item["additionalProperties"]` access
 *
 * If the model already has a property named `additionalProperties`, the field
 * is renamed to `additionalPropertiesBag` to avoid conflicts.
 *
 * @param props - Component props containing the model with additionalProperties.
 * @returns An Alloy JSX `<InterfaceMember>` for the explicit field, or undefined.
 */
function AdditionalPropertiesMember(props: { model: SdkModelType }) {
  const { model } = props;
  if (!model.additionalProperties) return undefined;

  const valueType = getTypeExpression(model.additionalProperties);
  const fieldName = getAdditionalPropertiesFieldName(model);

  return (
    <InterfaceMember
      name={fieldName}
      type={code`Record<string, ${valueType}>`}
      optional
      doc="Additional properties"
    />
  );
}

/**
 * Determines the field name for the additional properties bag on a model.
 *
 * Returns `"additionalProperties"` by default. If the model already has an
 * explicitly declared property named `"additionalProperties"`, returns
 * `"additionalPropertiesBag"` to avoid name collisions.
 *
 * This mirrors the legacy emitter's `getAdditionalPropertiesName()` logic.
 *
 * @param model - The TCGC model type to check for name conflicts.
 * @returns The field name to use for the additional properties bag.
 */
export function getAdditionalPropertiesFieldName(model: SdkModelType): string {
  const hasConflict = model.properties.some(
    (p) => p.name === "additionalProperties",
  );
  return hasConflict ? "additionalPropertiesBag" : "additionalProperties";
}

/**
 * Builds the `extends` clause for a model interface.
 *
 * When the model has a `baseModel`, this returns a refkey reference to the
 * base model's type declaration. Alloy resolves this refkey to the base model's
 * name and auto-generates imports if the base is in a different file.
 *
 * @param model - The TCGC model type to inspect for inheritance.
 * @returns Alloy Children for the extends clause, or undefined if no base model.
 */
function getExtendsClause(model: SdkModelType): Children | undefined {
  if (!model.baseModel) {
    return undefined;
  }
  return code`${typeRefkey(model.baseModel)}`;
}

/**
 * Constructs JSDoc documentation for a model interface.
 *
 * Prefers the model's `doc` field (detailed documentation), falling back to
 * `summary` (brief description). When neither is available, produces a default
 * comment of the form `"model interface <Name>"` to match legacy emitter output.
 *
 * This fallback ensures every generated interface has a JSDoc comment, which is
 * important for IDE tooltip consistency and matches the autorest.typescript
 * convention established in `buildModelInterface()`.
 *
 * @param model - The TCGC model type.
 * @returns The documentation string — always non-undefined.
 */
function getModelDoc(model: SdkModelType): string {
  return model.doc ?? model.summary ?? `model interface ${getModelDisplayName(model)}`;
}

/**
 * Returns the display name for a model as a plain string.
 *
 * Unlike {@link getModelName} which returns a `Namekey` for generated names,
 * this returns a plain string suitable for embedding in JSDoc comments.
 * For generated names, prepends `_` to match the rendered type name.
 *
 * @param model - The TCGC model type.
 * @returns A plain string name for use in documentation.
 */
function getModelDisplayName(model: SdkModelType): string {
  if (model.isGeneratedName) {
    return `_${model.name}`;
  }
  return model.name;
}

/**
 * Collects all properties for the interface, expanding flattened properties.
 *
 * When a property has `flatten: true` and its type is a model, that property
 * is replaced by the nested model's own properties (expanded inline). The
 * nested properties inherit the outer property's optionality — if the
 * flattened property is optional, all its expanded children become optional.
 *
 * Non-flattened properties are passed through unchanged.
 *
 * @param model - The TCGC model type whose properties to collect.
 * @returns An array of `SdkModelPropertyType` with flatten expansions applied.
 */
function getExpandedProperties(model: SdkModelType): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];

  for (const prop of model.properties) {
    if (prop.flatten && prop.type.kind === "model") {
      // Expand flattened model's properties inline
      for (const nestedProp of prop.type.properties) {
        result.push({
          ...nestedProp,
          // If the flattened wrapper is optional, children inherit that
          optional: prop.optional ? true : nestedProp.optional,
        });
      }
    } else {
      result.push(prop);
    }
  }

  return result;
}

/**
 * Computes the TypeScript type expression for a model property.
 *
 * For discriminator properties on subtypes (where the model has a
 * `discriminatorValue`), the type is the literal string value rather
 * than the full discriminator union. For all other properties, delegates
 * to `getTypeExpression()`.
 *
 * @param property - The TCGC property to get the type for.
 * @param model - The owning model, used for discriminator value detection.
 * @returns Alloy Children representing the TypeScript type expression.
 */
function getPropertyTypeExpression(
  property: SdkModelPropertyType,
  model: SdkModelType,
): Children {
  // If this is a discriminator property and the model has a specific
  // discriminator value (i.e., it's a subtype), use the literal value
  if (property.discriminator && model.discriminatorValue) {
    return `"${model.discriminatorValue}"`;
  }

  const { ignoreNullableOnOptional } = useEmitterOptions();
  return getOptionalAwareTypeExpression(property.type, property.optional, ignoreNullableOnOptional);
}

/**
 * Determines whether a model property should be marked `readonly`.
 *
 * A property is readonly when its visibility array contains exactly one
 * entry: `Visibility.Read`. This means the property is only visible in
 * response payloads and should not be set by the caller.
 *
 * This replicates the logic from TCGC's internal `isReadOnly()` utility,
 * which is not publicly exported.
 *
 * @param property - The TCGC property to check.
 * @returns `true` if the property should be rendered as `readonly`.
 */
function isReadOnly(property: SdkModelPropertyType): boolean {
  return (
    property.visibility !== undefined &&
    property.visibility.length === 1 &&
    property.visibility.includes(Visibility.Read)
  );
}
