import { For, SourceDirectory } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import type {
  SdkEnumType,
  SdkModelType,
  SdkNullableType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { baseSerializerRefkey, baseDeserializerRefkey } from "../utils/refkeys.js";
import { EnumDeclaration } from "./enum-declaration.js";
import { ModelInterface } from "./model-interface.js";
import { getDirectSubtypes, PolymorphicType } from "./polymorphic-type.js";
import { JsonSerializer } from "./serialization/json-serializer.js";
import { JsonDeserializer } from "./serialization/json-deserializer.js";
import { JsonPolymorphicSerializer } from "./serialization/json-polymorphic-serializer.js";
import { JsonPolymorphicDeserializer } from "./serialization/json-polymorphic-deserializer.js";
import { MultipartSerializer } from "./serialization/multipart-serializer.js";
import { XmlSerializer } from "./serialization/xml-serializer.js";
import { XmlObjectSerializer } from "./serialization/xml-object-serializer.js";
import { XmlDeserializer } from "./serialization/xml-deserializer.js";
import { XmlObjectDeserializer } from "./serialization/xml-object-deserializer.js";
import { UnionDeclaration } from "./union-declaration.js";
import { extractSubEnums, SubEnumDeclarations } from "./sub-enum-declaration.js";
import { hasXmlSerialization } from "../utils/xml-detection.js";

/**
 * Orchestrator component that organizes all type declarations into model source files.
 *
 * This component is the top-level coordinator for Phase 1 type output. It collects
 * all models, enums, and unions from the SDK context and renders them into a
 * `models/models.ts` source file inside a `models/` directory.
 *
 * The declaration order inside the file follows the legacy emitter's convention:
 * 1. Model interfaces (each followed by its polymorphic type alias, if applicable)
 * 2. Enum declarations (type alias + KnownXXX enum for each)
 * 3. Union type declarations
 *
 * When serializers are implemented (Phase 2), they will be added to the same
 * `<SourceFile>` to prevent self-import bugs — a well-known Alloy pitfall where
 * splitting declarations and their serializers across separate files causes
 * circular or self-referencing imports.
 *
 * If no types exist in the SDK package (no models, enums, or unions), the
 * component renders nothing — no empty files or directories are emitted.
 *
 * @returns An Alloy JSX tree containing a `models/` directory with a `models.ts`
 *          source file, or `undefined` if no types need to be emitted.
 */
export function ModelFiles() {
  const { models, enums, unions } = useSdkContext();

  // Filter unions to include named SdkUnionType, including those wrapped in
  // SdkNullableType. When a union like `"A" | "B" | null` is defined, TCGC wraps
  // it as `{ kind: "nullable", type: { kind: "union", ... } }`. The inner union
  // still needs a TypeDeclaration so its refkey resolves when referenced via
  // `getTypeExpression()` in nullable contexts (e.g., `SomeUnion | null`).
  const namedUnions = unions
    .map((u) => (u.kind === "nullable" && u.type.kind === "union" ? u.type : u))
    .filter((u): u is SdkUnionType => u.kind === "union");

  // Extract enum types wrapped in nullable from the unions list. When TCGC
  // processes `"A" | "B" | null`, it stores a `{ kind: "nullable", type: { kind: "enum" } }`
  // in `sdkPackage.unions`. The inner enum is a DIFFERENT object from the non-nullable
  // version in `sdkPackage.enums` (it has a different name, e.g., "FooNullable" vs "Foo").
  // We must render an `EnumDeclaration` for these inner enums so their refkeys resolve
  // when `getTypeExpression()` renders `SomeEnum | null`.
  const nullableEnums = unions
    .filter((u): u is SdkNullableType =>
      u.kind === "nullable" && u.type.kind === "enum")
    .map((u) => u.type as SdkEnumType);

  // Extract sub-enums from union-as-enum types. When TCGC flattens `enum LR | enum UD`
  // into a combined `TestColor` enum, the individual enums (LR, UD) are lost. We
  // reconstruct them from __raw references so they appear as separate type aliases.
  const allSubEnums = enums.flatMap((e) => {
    const subs = extractSubEnums(e);
    return subs.length > 0 ? [{ parentEnum: e, subEnums: subs }] : [];
  });

  // Separate discriminated (polymorphic) models from regular models
  const isDiscriminated = (m: SdkModelType) =>
    m.discriminatorProperty !== undefined &&
    getDirectSubtypes(m).length > 0;

  // Check if a model is used in multipart/form-data context
  const isMultipartFormData = (m: SdkModelType) =>
    (m.usage & UsageFlags.MultipartFormData) !== 0;

  // Check if a model is used in XML context by inspecting serialization options.
  // TCGC sets UsageFlags.Xml only when operations explicitly use application/xml content type,
  // but @Xml.name decorators populate serializationOptions.xml on properties regardless.
  // The legacy emitter uses serializationOptions.xml for detection, so we do the same.
  const isXml = (m: SdkModelType) => hasXmlSerialization(m);

  // Filter models by usage flags for serialization/deserialization
  const inputModels = models.filter(
    (m) => (m.usage & UsageFlags.Input) !== 0,
  );
  const outputModels = models.filter(
    (m) =>
      (m.usage & UsageFlags.Output) !== 0 ||
      (m.usage & UsageFlags.Exception) !== 0,
  );

  // Separate multipart models from regular JSON models — multipart takes priority
  const multipartInputModels = inputModels.filter(isMultipartFormData);

  // Separate XML models from JSON models — XML takes priority over JSON
  const xmlInputModels = inputModels.filter(
    (m) => !isMultipartFormData(m) && isXml(m),
  );
  const xmlOutputModels = outputModels.filter(isXml);

  const jsonInputModels = inputModels.filter(
    (m) => !isMultipartFormData(m) && !isXml(m),
  );

  // Split JSON input models into regular and polymorphic for serialization
  const regularInputModels = jsonInputModels.filter((m) => !isDiscriminated(m));
  const polymorphicInputModels = jsonInputModels.filter(isDiscriminated);
  // Include XML output models in regular deserializers too — deserialize-operation.tsx
  // always references JSON deserializer refkeys because the HTTP runtime parses both
  // JSON and XML response bodies into plain objects before they reach the deserializer.
  // Without JSON deserializers for XML models, their refkeys would be unresolved.
  const regularOutputModels = outputModels.filter(
    (m) => !isDiscriminated(m),
  );
  const polymorphicOutputModels = outputModels.filter(
    (m) => isDiscriminated(m),
  );

  const hasSerializers =
    regularInputModels.length > 0 ||
    polymorphicInputModels.length > 0 ||
    multipartInputModels.length > 0;
  const hasDeserializers =
    regularOutputModels.length > 0 || polymorphicOutputModels.length > 0;
  const hasXmlSerializers = xmlInputModels.length > 0;
  const hasXmlDeserializers = xmlOutputModels.length > 0;

  // Skip rendering entirely if there are no type declarations to emit
  if (models.length === 0 && enums.length === 0 && namedUnions.length === 0 && nullableEnums.length === 0) {
    return undefined;
  }

  return (
    <SourceDirectory path="models">
      <SourceFile path="models.ts">
        <ModelDeclarations models={models} />
        {models.length > 0 && (enums.length > 0 || nullableEnums.length > 0) ? "\n\n" : undefined}
        <EnumDeclarations enums={enums} />
        {enums.length > 0 && nullableEnums.length > 0 ? "\n\n" : undefined}
        <EnumDeclarations enums={nullableEnums} />
        {(enums.length > 0 || nullableEnums.length > 0) && allSubEnums.length > 0 ? "\n\n" : undefined}
        <AllSubEnumDeclarations groups={allSubEnums} />
        {(models.length > 0 || enums.length > 0 || allSubEnums.length > 0) && namedUnions.length > 0
          ? "\n\n"
          : undefined}
        <UnionDeclarations unions={namedUnions} />
        {(models.length > 0 || enums.length > 0 || allSubEnums.length > 0 || namedUnions.length > 0) &&
        (hasSerializers || hasDeserializers || hasXmlSerializers || hasXmlDeserializers)
          ? "\n\n"
          : undefined}
        <SerializerDeclarations models={regularInputModels} />
        {regularInputModels.length > 0 && polymorphicInputModels.length > 0
          ? "\n\n"
          : undefined}
        <PolymorphicSerializerDeclarations models={polymorphicInputModels} />
        {(regularInputModels.length > 0 || polymorphicInputModels.length > 0) &&
        multipartInputModels.length > 0
          ? "\n\n"
          : undefined}
        <MultipartSerializerDeclarations models={multipartInputModels} />
        {hasSerializers && hasDeserializers ? "\n\n" : undefined}
        <DeserializerDeclarations models={regularOutputModels} />
        {regularOutputModels.length > 0 && polymorphicOutputModels.length > 0
          ? "\n\n"
          : undefined}
        <PolymorphicDeserializerDeclarations models={polymorphicOutputModels} />
        {(hasSerializers || hasDeserializers) && hasXmlSerializers
          ? "\n\n"
          : undefined}
        <XmlSerializerDeclarations models={xmlInputModels} />
        {hasXmlSerializers && hasXmlDeserializers ? "\n\n" : undefined}
        <XmlDeserializerDeclarations models={xmlOutputModels} />
      </SourceFile>
    </SourceDirectory>
  );
}

/**
 * Props for the {@link ModelDeclarations} component.
 */
interface ModelDeclarationsProps {
  /** The list of TCGC model types to render. */
  models: SdkModelType[];
}

/**
 * Renders all model interfaces and their polymorphic type aliases.
 *
 * Each model is rendered as an `<InterfaceDeclaration>` via {@link ModelInterface}.
 * If a model has discriminated subtypes, a polymorphic union type alias is
 * rendered immediately after it via {@link PolymorphicType}. This keeps related
 * declarations adjacent in the output, matching the legacy emitter's behavior.
 *
 * @param props - Component props containing the list of models to render.
 * @returns Alloy JSX tree with model declarations, or undefined if empty.
 */
function ModelDeclarations(props: ModelDeclarationsProps) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => <ModelWithPolymorphic model={model} />}
    </For>
  );
}

/**
 * Props for the {@link ModelWithPolymorphic} component.
 */
interface ModelWithPolymorphicProps {
  /** The TCGC model type to render. */
  model: SdkModelType;
}

/**
 * Renders a single model interface optionally followed by its polymorphic union.
 *
 * This component combines the model interface declaration with the polymorphic
 * type alias (if the model has discriminated subtypes). The polymorphic type
 * is placed directly after its base model interface, separated by a blank line.
 *
 * @param props - Component props with the model to render.
 * @returns Alloy JSX tree with the model interface and optional polymorphic type.
 */
function ModelWithPolymorphic(props: ModelWithPolymorphicProps) {
  const { model } = props;
  const hasSubtypes = getDirectSubtypes(model).length > 0;

  return (
    <>
      <ModelInterface model={model} />
      {hasSubtypes ? (
        <>
          {"\n\n"}
          <PolymorphicType model={model} />
        </>
      ) : undefined}
    </>
  );
}

/**
 * Props for the {@link EnumDeclarations} component.
 */
interface EnumDeclarationsProps {
  /** The list of TCGC enum types to render. */
  enums: import("@azure-tools/typespec-client-generator-core").SdkEnumType[];
}

/**
 * Renders all enum type declarations.
 *
 * Each enum produces two declarations (a type alias and a KnownXXX enum) via
 * {@link EnumDeclaration}. Declarations are separated by blank lines.
 *
 * @param props - Component props containing the list of enums to render.
 * @returns Alloy JSX tree with enum declarations, or undefined if empty.
 */
function EnumDeclarations(props: EnumDeclarationsProps) {
  if (props.enums.length === 0) return undefined;

  return (
    <For each={props.enums} doubleHardline>
      {(enumType) => <EnumDeclaration type={enumType} />}
    </For>
  );
}

/**
 * Props for the {@link UnionDeclarations} component.
 */
interface UnionDeclarationsProps {
  /** The list of TCGC union types to render. */
  unions: SdkUnionType[];
}

/**
 * Renders all union type declarations.
 *
 * Each union produces a single type alias via {@link UnionDeclaration}.
 * Declarations are separated by blank lines.
 *
 * @param props - Component props containing the list of unions to render.
 * @returns Alloy JSX tree with union declarations, or undefined if empty.
 */
function UnionDeclarations(props: UnionDeclarationsProps) {
  if (props.unions.length === 0) return undefined;

  return (
    <For each={props.unions} doubleHardline>
      {(unionType) => <UnionDeclaration type={unionType} />}
    </For>
  );
}

/**
 * Props for the {@link AllSubEnumDeclarations} component.
 */
interface AllSubEnumDeclarationsProps {
  /** Groups of sub-enums, each with a parent enum and its extracted sub-enums. */
  groups: { parentEnum: import("@azure-tools/typespec-client-generator-core").SdkEnumType; subEnums: import("./sub-enum-declaration.js").SubEnumInfo[] }[];
}

/**
 * Renders all sub-enum type aliases extracted from union-as-enum types.
 *
 * When TCGC flattens `enum LR | enum UD` into a combined `TestColor` enum,
 * the original individual enums are not in `sdkPackage.enums`. This component
 * renders reconstructed sub-enums as separate type aliases so consumers can
 * reference the original enum types (e.g., `LR`, `UD`) independently.
 *
 * @param props - Component props containing the sub-enum groups.
 * @returns Alloy JSX tree with sub-enum type aliases, or undefined if empty.
 */
function AllSubEnumDeclarations(props: AllSubEnumDeclarationsProps) {
  if (props.groups.length === 0) return undefined;

  return (
    <For each={props.groups} doubleHardline>
      {(group) => (
        <SubEnumDeclarations parentEnum={group.parentEnum} subEnums={group.subEnums} />
      )}
    </For>
  );
}

/**
 * Props for the {@link SerializerDeclarations} component.
 */
interface SerializerDeclarationsProps {
  /** The list of TCGC model types that have Input usage and need serializers. */
  models: SdkModelType[];
}

/**
 * Checks whether a model is a child type in a discriminated hierarchy.
 *
 * A model is considered a discriminated child if any ancestor in its
 * `baseModel` chain has a `discriminatorProperty`. Such child models need
 * their serializers/deserializers to include inherited parent properties
 * so that all fields (own + inherited) are properly mapped.
 *
 * @param model - The TCGC model type to check.
 * @returns True if the model is a child in a discriminated hierarchy.
 */
function isDiscriminatedChild(model: SdkModelType): boolean {
  let current = model.baseModel;
  while (current) {
    if (current.discriminatorProperty !== undefined) {
      return true;
    }
    current = current.baseModel;
  }
  return false;
}

/**
 * Renders all JSON serializer function declarations.
 *
 * Each model with `UsageFlags.Input` gets a serializer function that converts
 * typed SDK objects into wire-format JSON. Serializers are placed in the same
 * source file as type declarations to prevent self-import bugs.
 *
 * Child models in discriminated hierarchies receive `includeParentProperties`
 * so their serializers include all inherited parent properties alongside
 * their own, ensuring complete wire-format output.
 *
 * @param props - Component props containing the list of input models.
 * @returns Alloy JSX tree with serializer declarations, or undefined if empty.
 */
function SerializerDeclarations(props: SerializerDeclarationsProps) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => (
        <JsonSerializer
          model={model}
          includeParentProperties={isDiscriminatedChild(model)}
        />
      )}
    </For>
  );
}

/**
 * Props for the {@link DeserializerDeclarations} component.
 */
interface DeserializerDeclarationsProps {
  /** The list of TCGC model types that have Output/Exception usage and need deserializers. */
  models: SdkModelType[];
}

/**
 * Renders all JSON deserializer function declarations.
 *
 * Each model with `UsageFlags.Output` or `UsageFlags.Exception` gets a
 * deserializer function that converts wire-format JSON into typed SDK objects.
 * Deserializers are placed in the same source file as type declarations to
 * prevent self-import bugs.
 *
 * Child models in discriminated hierarchies receive `includeParentProperties`
 * so their deserializers include all inherited parent properties alongside
 * their own, ensuring complete deserialized output.
 *
 * @param props - Component props containing the list of output/exception models.
 * @returns Alloy JSX tree with deserializer declarations, or undefined if empty.
 */
function DeserializerDeclarations(props: DeserializerDeclarationsProps) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => (
        <JsonDeserializer
          model={model}
          includeParentProperties={isDiscriminatedChild(model)}
        />
      )}
    </For>
  );
}

/**
 * Props for the {@link PolymorphicSerializerDeclarations} component.
 */
interface PolymorphicSerializerDeclarationsProps {
  /** The list of discriminated TCGC model types that need polymorphic serializers. */
  models: SdkModelType[];
}

/**
 * Renders all polymorphic (switch-based) JSON serializer function declarations.
 *
 * Each discriminated model with `UsageFlags.Input` gets:
 * 1. A base model serializer function that maps the base type's own properties
 *    (registered with `baseSerializerRefkey`). This serves as the default
 *    fallback in the switch statement.
 * 2. A polymorphic switch serializer that routes to the appropriate subtype
 *    serializer based on the discriminator value (registered with `serializerRefkey`).
 *
 * The base serializer is rendered first so it's available when the switch
 * serializer references it in its default case.
 *
 * @param props - Component props containing the list of discriminated input models.
 * @returns Alloy JSX tree with polymorphic serializer declarations, or undefined if empty.
 */
function PolymorphicSerializerDeclarations(
  props: PolymorphicSerializerDeclarationsProps,
) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => (
        <>
          <JsonSerializer
            model={model}
            refkeyOverride={baseSerializerRefkey(model)}
            nameSuffix="Serializer"
          />
          {"\n\n"}
          <JsonPolymorphicSerializer model={model} />
        </>
      )}
    </For>
  );
}

/**
 * Props for the {@link PolymorphicDeserializerDeclarations} component.
 */
interface PolymorphicDeserializerDeclarationsProps {
  /** The list of discriminated TCGC model types that need polymorphic deserializers. */
  models: SdkModelType[];
}

/**
 * Renders all polymorphic (switch-based) JSON deserializer function declarations.
 *
 * Each discriminated model with `UsageFlags.Output` or `UsageFlags.Exception` gets:
 * 1. A base model deserializer function that maps the base type's own properties
 *    (registered with `baseDeserializerRefkey`). This serves as the default
 *    fallback in the switch statement.
 * 2. A polymorphic switch deserializer that routes to the appropriate subtype
 *    deserializer based on the wire-format discriminator value (registered with
 *    `deserializerRefkey`).
 *
 * The base deserializer is rendered first so it's available when the switch
 * deserializer references it in its default case.
 *
 * @param props - Component props containing the list of discriminated output/exception models.
 * @returns Alloy JSX tree with polymorphic deserializer declarations, or undefined if empty.
 */
function PolymorphicDeserializerDeclarations(
  props: PolymorphicDeserializerDeclarationsProps,
) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => (
        <>
          <JsonDeserializer
            model={model}
            refkeyOverride={baseDeserializerRefkey(model)}
            nameSuffix="Deserializer"
          />
          {"\n\n"}
          <JsonPolymorphicDeserializer model={model} />
        </>
      )}
    </For>
  );
}

/**
 * Props for the {@link MultipartSerializerDeclarations} component.
 */
interface MultipartSerializerDeclarationsProps {
  /** The list of TCGC model types with MultipartFormData usage that need multipart serializers. */
  models: SdkModelType[];
}

/**
 * Renders all multipart serializer function declarations.
 *
 * Each model with `UsageFlags.MultipartFormData` gets a multipart serializer
 * function that converts typed SDK objects into an array of part descriptors
 * for multipart/form-data request bodies. These serializers are used instead
 * of (not in addition to) JSON serializers for the same model.
 *
 * @param props - Component props containing the list of multipart input models.
 * @returns Alloy JSX tree with multipart serializer declarations, or undefined if empty.
 */
function MultipartSerializerDeclarations(
  props: MultipartSerializerDeclarationsProps,
) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => <MultipartSerializer model={model} />}
    </For>
  );
}

/**
 * Props for the {@link XmlSerializerDeclarations} component.
 */
interface XmlSerializerDeclarationsProps {
  /** The list of TCGC model types with Xml usage that need XML serializers. */
  models: SdkModelType[];
}

/**
 * Renders all XML serializer function declarations (4 functions per model).
 *
 * Each model with `UsageFlags.Xml` and `UsageFlags.Input` gets:
 * - `{name}XmlSerializer` — root-level XML string serializer
 * - `{name}XmlObjectSerializer` — nested object serializer (returns XmlSerializedObject)
 *
 * These are used instead of JSON serializers for models in XML content type contexts.
 *
 * @param props - Component props containing the list of XML input models.
 * @returns Alloy JSX tree with XML serializer declarations, or undefined if empty.
 */
function XmlSerializerDeclarations(props: XmlSerializerDeclarationsProps) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => (
        <>
          <XmlSerializer model={model} />
          {"\n\n"}
          <XmlObjectSerializer model={model} />
        </>
      )}
    </For>
  );
}

/**
 * Props for the {@link XmlDeserializerDeclarations} component.
 */
interface XmlDeserializerDeclarationsProps {
  /** The list of TCGC model types with Xml usage that need XML deserializers. */
  models: SdkModelType[];
}

/**
 * Renders all XML deserializer function declarations (2 functions per model).
 *
 * Each model with `UsageFlags.Xml` and `UsageFlags.Output`/`UsageFlags.Exception` gets:
 * - `{name}XmlDeserializer` — root-level XML string deserializer
 * - `{name}XmlObjectDeserializer` — nested object deserializer (takes Record<string, unknown>)
 *
 * These are used instead of JSON deserializers for models in XML content type contexts.
 *
 * @param props - Component props containing the list of XML output/exception models.
 * @returns Alloy JSX tree with XML deserializer declarations, or undefined if empty.
 */
function XmlDeserializerDeclarations(props: XmlDeserializerDeclarationsProps) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => (
        <>
          <XmlDeserializer model={model} />
          {"\n\n"}
          <XmlObjectDeserializer model={model} />
        </>
      )}
    </For>
  );
}
