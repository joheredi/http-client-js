import { Children, code, For } from "@alloy-js/core";
import { InterfaceDeclaration, InterfaceMember } from "@alloy-js/typescript";
import type {
  SdkModelPropertyType,
  SdkModelType,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import { Visibility } from "@typespec/http";
import { computeFlattenCollisionMap } from "../utils/flatten-collision.js";
import { getModelName } from "../utils/model-name.js";
import { typeRefkey } from "../utils/refkeys.js";
import {
  getOptionalAwareTypeExpression,
  getTypeExpression,
} from "./type-expression.js";
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
 * - `additionalProperties` on the model adds `Record<string, T>` to the
 *   `extends` clause. When named property types are compatible with `T`, the
 *   specific type is used; otherwise `any` is used to satisfy TypeScript's
 *   index-signature constraint.
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
 * Builds the `extends` clause for a model interface.
 *
 * Produces extends entries for two scenarios:
 * 1. When the model has a `baseModel` (type inheritance): adds a refkey reference
 *    to the base model's type declaration.
 * 2. When the model has `additionalProperties`: adds `Record<string, T>` where T
 *    is the additional properties type (or `any` if named property types are not
 *    compatible with T, to satisfy TypeScript's index-signature constraint).
 *
 * Both can be combined: `extends BaseModel, Record<string, T>`.
 *
 * @param model - The TCGC model type to inspect for inheritance.
 * @returns Alloy Children for the extends clause, or undefined if no extends needed.
 */
function getExtendsClause(model: SdkModelType): Children | undefined {
  const hasBase = !!model.baseModel;
  const hasAdditional = !!model.additionalProperties;

  if (!hasBase && !hasAdditional) return undefined;

  if (hasBase && hasAdditional) {
    const recordExpr = getAdditionalPropertiesRecordType(model);
    return code`${typeRefkey(model.baseModel!)}, ${recordExpr}`;
  }

  if (hasBase) {
    return code`${typeRefkey(model.baseModel!)}`;
  }

  return getAdditionalPropertiesRecordType(model);
}

/**
 * Builds the `Record<string, T>` type expression for the extends clause when
 * a model has additional properties.
 *
 * Determines the Record value type by checking whether all named property types
 * (own + inherited) are compatible with the additional properties type. When
 * compatible, uses the specific type; otherwise falls back to `any` so the
 * interface satisfies TypeScript's index-signature constraint.
 *
 * This matches the legacy emitter's `addExtendedDictInfo()` compatibility-mode
 * behavior where `extends Record<string, T>` is used instead of an explicit
 * `additionalProperties` bag property.
 *
 * @param model - The TCGC model type with additional properties.
 * @returns Alloy Children representing the `Record<string, T>` extends entry.
 */
function getAdditionalPropertiesRecordType(model: SdkModelType): Children {
  const apType = model.additionalProperties!;
  const allProps = collectAllModelProperties(model);

  if (allProps.length === 0) {
    const apTypeExpr = getTypeExpression(apType);
    return code`Record<string, ${apTypeExpr}>`;
  }

  const isCompatible = arePropertyTypesCompatibleWithRecord(allProps, apType);

  if (isCompatible) {
    const apTypeExpr = getTypeExpression(apType);
    return code`Record<string, ${apTypeExpr}>`;
  }

  return code`Record<string, any>`;
}

/**
 * Checks whether all named property types are compatible with the additional
 * properties type for use in an `extends Record<string, T>` clause.
 *
 * TypeScript requires that all named property types are assignable to the
 * index-signature type when using `extends Record<string, T>`. This function
 * performs a heuristic string-based check: it compares the TypeScript output
 * type string of each property with the additional properties type string.
 *
 * This matches the legacy emitter's compatibility check which uses
 * `additionalPropertiesType.includes(getTypeExpression(prop.type))`.
 *
 * @param properties - All named properties (own + inherited) of the model.
 * @param apType - The TCGC additional properties type.
 * @returns `true` if all property types are compatible with the Record type.
 */
function arePropertyTypesCompatibleWithRecord(
  properties: SdkModelPropertyType[],
  apType: SdkType,
): boolean {
  const apTypeStr = getTypeScriptTypeName(apType);
  if (apTypeStr === null) return false;

  return properties.every((p) => {
    const propTypeStr = getTypeScriptTypeName(p.type);
    return propTypeStr !== null && apTypeStr.includes(propTypeStr);
  });
}

/**
 * Returns a simple TypeScript type name string for an SdkType, used for
 * compatibility checking between property types and additional properties type.
 *
 * Returns `null` for complex types that cannot be represented as a simple string
 * (e.g., deeply nested generics), causing the compatibility check to fall back
 * to `any`.
 *
 * @param type - The TCGC type to get a TypeScript name for.
 * @returns A TypeScript type name string, or null for complex types.
 */
function getTypeScriptTypeName(type: SdkType): string | null {
  switch (type.kind) {
    case "string":
      return "string";
    case "int8":
    case "int16":
    case "int32":
    case "int64":
    case "uint8":
    case "uint16":
    case "uint32":
    case "uint64":
    case "float32":
    case "float64":
    case "decimal":
    case "decimal128":
    case "safeint":
      return "number";
    case "boolean":
      return "boolean";
    case "nullable":
      return getTypeScriptTypeName(type.type);
    case "model":
      return type.name;
    case "enum":
      return type.name;
    case "array": {
      const elem = getTypeScriptTypeName(type.valueType);
      return elem ? `${elem}[]` : null;
    }
    case "dict": {
      const val = getTypeScriptTypeName(type.valueType);
      return val ? `Record<string, ${val}>` : null;
    }
    case "union": {
      if (!type.variantTypes) return null;
      const parts = type.variantTypes.map((v) => getTypeScriptTypeName(v));
      if (parts.some((p) => p === null)) return null;
      return [...new Set(parts)].join(" | ");
    }
    default:
      return null;
  }
}

/**
 * Collects all named properties from a model, including inherited properties
 * from ancestor models.
 *
 * Walks the `baseModel` chain upward to gather ancestor properties, then
 * includes the model's own properties. Used for the extends Record<string, T>
 * compatibility check, which must consider all properties the interface will have.
 *
 * @param model - The TCGC model type to collect properties from.
 * @returns An array of all named properties (ancestors first, then own).
 */
function collectAllModelProperties(
  model: SdkModelType,
): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];

  let current = model.baseModel;
  while (current) {
    result.push(...current.properties);
    current = current.baseModel;
  }

  result.push(...model.properties);
  return result;
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
  return (
    model.doc ??
    model.summary ??
    `model interface ${getModelDisplayName(model)}`
  );
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
 * When a nested property name collides with an existing property on the model
 * (from the model's own properties, non-model flatten properties, or earlier
 * flatten expansions), the nested property is renamed using the legacy emitter's
 * convention: `${propName}${capitalize(flattenPropName)}${capitalize(propName)}`.
 * For example, `bar` from flatten property `properties` becomes `barPropertiesBar`.
 *
 * Non-flattened properties are passed through unchanged.
 *
 * @param model - The TCGC model type whose properties to collect.
 * @returns An array of `SdkModelPropertyType` with flatten expansions applied.
 */
function getExpandedProperties(model: SdkModelType): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];
  const collisionMap = computeFlattenCollisionMap(model);

  for (const prop of model.properties) {
    if (prop.flatten && prop.type.kind === "model") {
      const renames = collisionMap.get(prop.serializedName);
      // Expand flattened model's properties inline
      for (const nestedProp of prop.type.properties) {
        const renamedName = renames?.get(nestedProp.name);
        result.push({
          ...nestedProp,
          // If the flattened wrapper is optional, children inherit that
          optional: prop.optional ? true : nestedProp.optional,
          // Apply collision rename if needed
          ...(renamedName ? { name: renamedName } : {}),
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
  return getOptionalAwareTypeExpression(
    property.type,
    property.optional,
    ignoreNullableOnOptional,
  );
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
