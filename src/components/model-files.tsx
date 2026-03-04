import { For, SourceDirectory } from "@alloy-js/core";
import { BarrelFile, SourceFile } from "@alloy-js/typescript";
import type {
  SdkArrayType,
  SdkClientType,
  SdkDictionaryType,
  SdkEnumType,
  SdkHttpOperation,
  SdkModelType,
  SdkNullableType,
  SdkType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { useEmitterOptions } from "../context/emitter-options-context.js";
import {
  baseSerializerRefkey,
  baseDeserializerRefkey,
} from "../utils/refkeys.js";
import { EnumDeclaration } from "./enum-declaration.js";
import { ModelInterface } from "./model-interface.js";
import { getDirectSubtypes, PolymorphicType } from "./polymorphic-type.js";
import { JsonSerializer } from "./serialization/json-serializer.js";
import { FlattenSerializerHelper } from "./serialization/json-serializer.js";
import { JsonDeserializer } from "./serialization/json-deserializer.js";
import { FlattenDeserializerHelper } from "./serialization/json-deserializer.js";
import { JsonPolymorphicSerializer } from "./serialization/json-polymorphic-serializer.js";
import { JsonPolymorphicDeserializer } from "./serialization/json-polymorphic-deserializer.js";
import { MultipartSerializer } from "./serialization/multipart-serializer.js";
import { XmlSerializer } from "./serialization/xml-serializer.js";
import { XmlObjectSerializer } from "./serialization/xml-object-serializer.js";
import { XmlDeserializer } from "./serialization/xml-deserializer.js";
import { XmlObjectDeserializer } from "./serialization/xml-object-deserializer.js";
import { UnionDeclaration } from "./union-declaration.js";
import { JsonUnionDeserializer } from "./serialization/json-union-deserializer.js";
import { JsonUnionSerializer } from "./serialization/json-union-serializer.js";
import { JsonEnumSerializer } from "./serialization/json-enum-serializer.js";
import {
  extractSubEnums,
  SubEnumDeclarations,
} from "./sub-enum-declaration.js";
import { hasXmlSerialization } from "../utils/xml-detection.js";
import {
  JsonArraySerializer,
  JsonArrayDeserializer,
  JsonRecordSerializer,
  JsonRecordDeserializer,
  collectArrayTypes,
  collectDictTypes,
} from "./serialization/json-array-record-helpers.js";
import { needsTransformation } from "./serialization/json-serializer.js";
import { isAzureCoreErrorType } from "../utils/azure-core-error-types.js";

/**
 * ESLint disable directives placed at the top of generated model files.
 *
 * These directives match the legacy emitter's output and suppress lint rules
 * that conflict with generated code patterns:
 * - `@typescript-eslint/naming-convention`: Generated internal models may use
 *   leading underscores (e.g., `_FooRequest`) which violate default naming rules.
 * - `@typescript-eslint/explicit-module-boundary-types`: Deserializer functions
 *   accept `any` for raw JSON input, which triggers this rule.
 */
const MODEL_FILE_ESLINT_DIRECTIVES = [
  "/**",
  " * This file contains only generated model types and their (de)serializers.",
  " * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.",
  " */",
  "/* eslint-disable @typescript-eslint/naming-convention */",
  "/* eslint-disable @typescript-eslint/explicit-module-boundary-types */",
  "",
].join("\n");

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
  const { models: allModels, enums, unions, clients } = useSdkContext();

  // Azure Core error types (ErrorModel, InnerError, ErrorResponse) are imported
  // from the runtime package, not generated locally. Filter them from the model
  // list so no local interface definitions or deserializers are emitted.
  const models = allModels.filter((m) => !isAzureCoreErrorType(m));

  // Filter unions to include user-defined SdkUnionType, excluding those with
  // generated names (isGeneratedName === true). Generated-name unions are inlined
  // at all usage sites by type-expression.tsx, so they don't need type alias
  // declarations, serializers, or deserializers. Also unwrap nullable wrappers:
  // when a union like `"A" | "B" | null` is defined, TCGC wraps it as
  // `{ kind: "nullable", type: { kind: "union", ... } }`. The inner union
  // still needs a TypeDeclaration so its refkey resolves when referenced via
  // `getTypeExpression()` in nullable contexts (e.g., `SomeUnion | null`).
  const namedUnions = unions
    .map((u) => (u.kind === "nullable" && u.type.kind === "union" ? u.type : u))
    .filter((u): u is SdkUnionType => u.kind === "union")
    .filter((u) => !u.isGeneratedName);

  // Extract enum types wrapped in nullable from the unions list. When TCGC
  // processes `"A" | "B" | null`, it stores a `{ kind: "nullable", type: { kind: "enum" } }`
  // in `sdkPackage.unions`. The inner enum is a DIFFERENT object from the non-nullable
  // version in `sdkPackage.enums` (it has a different name, e.g., "FooNullable" vs "Foo").
  // We must render an `EnumDeclaration` for these inner enums so their refkeys resolve
  // when `getTypeExpression()` renders `SomeEnum | null`.
  const nullableEnums = unions
    .filter(
      (u): u is SdkNullableType =>
        u.kind === "nullable" && u.type.kind === "enum",
    )
    .map((u) => u.type as SdkEnumType);

  // Extract sub-enums from union-as-enum types. When TCGC flattens union-of-enum
  // types into a combined enum, the individual enums are lost. We reconstruct them
  // from __raw references so they appear as separate type aliases. Sub-enums are
  // only needed when the composed pattern is used (not the KnownXxx extensible
  // pattern), because the extensible pattern's type alias is just `string` and
  // doesn't reference sub-enum types.
  const { experimentalExtensibleEnums } = useEmitterOptions();
  const allSubEnums = enums.flatMap((e) => {
    const shouldEmitKnownEnum = !e.isFixed && experimentalExtensibleEnums;
    if (shouldEmitKnownEnum) return [];
    const subs = extractSubEnums(e);
    return subs.length > 0 ? [{ parentEnum: e, subEnums: subs }] : [];
  });

  // When experimentalExtensibleEnums is on, generated-name enums that are
  // composed from sub-enums (union-of-enums like `LR | UD`) are inlined at
  // usage sites by model-interface.tsx. Both the parent enum and its sub-enums
  // are dead code and should be filtered from rendering.
  const composedEnumNames = new Set(
    allSubEnums
      .filter((g) => g.parentEnum.isGeneratedName && experimentalExtensibleEnums)
      .map((g) => g.parentEnum.name),
  );
  const filteredSubEnums = experimentalExtensibleEnums
    ? allSubEnums.filter((g) => !composedEnumNames.has(g.parentEnum.name))
    : allSubEnums;
  const renderableEnums = composedEnumNames.size > 0
    ? enums.filter((e) => !composedEnumNames.has(e.name))
    : enums;

  // Separate discriminated (polymorphic) models from regular models
  const isDiscriminated = (m: SdkModelType) =>
    m.discriminatorProperty !== undefined && getDirectSubtypes(m).length > 0;

  // Check if a model is used in multipart/form-data context
  const isMultipartFormData = (m: SdkModelType) =>
    (m.usage & UsageFlags.MultipartFormData) !== 0;

  // Check if a model is used in XML context by inspecting serialization options.
  // TCGC sets UsageFlags.Xml only when operations explicitly use application/xml content type,
  // but @Xml.name decorators populate serializationOptions.xml on properties regardless.
  // The legacy emitter uses serializationOptions.xml for detection, so we do the same.
  const isXml = (m: SdkModelType) => hasXmlSerialization(m);

  // Filter models by usage flags for serialization/deserialization
  const inputModels = models.filter((m) => (m.usage & UsageFlags.Input) !== 0);
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
  // Include XML output models in regular deserializers too — some models may
  // appear in both JSON and XML contexts, so having a JSON deserializer ensures
  // no unresolved refkeys when the model is used in non-XML operations.
  const regularOutputModels = outputModels.filter((m) => !isDiscriminated(m));
  const polymorphicOutputModels = outputModels.filter((m) =>
    isDiscriminated(m),
  );

  // Filter unions that appear in Input context — they need serializers.
  // Non-discriminated unions get simple pass-through serializers that return the
  // item unchanged, matching the legacy emitter's behavior.
  // Only user-defined unions (isGeneratedName = false) get serializers — generated
  // unions (e.g., additional property type wrappers like _VegetablesAdditionalProperty)
  // are internal implementation details that don't need standalone serializer functions.
  const inputUnions = namedUnions.filter(
    (u) => !u.isGeneratedName && (u.usage & UsageFlags.Input) !== 0,
  );

  // Filter unions that appear in Output/Exception context — they need deserializers.
  // Non-discriminated unions get simple pass-through deserializers that return the
  // raw JSON item unchanged, matching the legacy emitter's behavior.
  const outputUnions = namedUnions.filter(
    (u) =>
      (u.usage & UsageFlags.Output) !== 0 ||
      (u.usage & UsageFlags.Exception) !== 0,
  );

  // Collect union-as-enum types that need pass-through serializers.
  // When experimentalExtensibleEnums is NOT true, union-as-enum types
  // (TypeSpec unions flattened by TCGC into SdkEnumType with isUnionAsEnum: true)
  // generate pass-through serializer functions matching the legacy emitter's behavior.
  // Include both regular enums and nullable-wrapped enums (from sdkPackage.unions).
  const inputEnumSerializers = [
    ...enums.filter(
      (e) =>
        e.isUnionAsEnum &&
        !experimentalExtensibleEnums &&
        (e.usage & UsageFlags.Input) !== 0,
    ),
    ...nullableEnums.filter(
      (e) => e.isUnionAsEnum && !experimentalExtensibleEnums,
    ),
  ];

  const hasSerializers =
    regularInputModels.length > 0 ||
    polymorphicInputModels.length > 0 ||
    multipartInputModels.length > 0;
  const hasDeserializers =
    regularOutputModels.length > 0 || polymorphicOutputModels.length > 0;
  const hasUnionSerializers = inputUnions.length > 0;
  const hasEnumSerializers = inputEnumSerializers.length > 0;
  const hasUnionDeserializers = outputUnions.length > 0;
  const hasXmlSerializers = xmlInputModels.length > 0;
  const hasXmlDeserializers = xmlOutputModels.length > 0;

  // Collect all types that appear in model properties and operation signatures
  // to find array/record types that need named helper functions.
  const allPropertyTypes = collectAllPropertyAndOperationTypes(models, clients);

  // Collect unique array/dict types needing serialization helpers
  const inputArrayTypes = collectArrayTypes(
    allPropertyTypes.inputTypes,
    "input",
  );
  const outputArrayTypes = collectArrayTypes(
    allPropertyTypes.outputTypes,
    "output",
  );
  const inputDictTypes = collectDictTypes(allPropertyTypes.inputTypes, "input");
  const outputDictTypes = collectDictTypes(
    allPropertyTypes.outputTypes,
    "output",
  );

  const hasArrayRecordSerializers =
    inputArrayTypes.length > 0 || inputDictTypes.length > 0;
  const hasArrayRecordDeserializers =
    outputArrayTypes.length > 0 || outputDictTypes.length > 0;

  // Skip rendering entirely if there are no type declarations to emit
  if (
    models.length === 0 &&
    enums.length === 0 &&
    namedUnions.length === 0 &&
    nullableEnums.length === 0
  ) {
    return undefined;
  }

  return (
    <SourceDirectory path="models">
      <BarrelFile />
      <SourceFile path="models.ts" header={MODEL_FILE_ESLINT_DIRECTIVES}>
        <ModelDeclarations models={models} />
        {models.length > 0 &&
        (renderableEnums.length > 0 || nullableEnums.length > 0)
          ? "\n\n"
          : undefined}
        <EnumDeclarations enums={renderableEnums} />
        {renderableEnums.length > 0 && nullableEnums.length > 0
          ? "\n\n"
          : undefined}
        <EnumDeclarations enums={nullableEnums} />
        {(renderableEnums.length > 0 || nullableEnums.length > 0) &&
        filteredSubEnums.length > 0
          ? "\n\n"
          : undefined}
        <AllSubEnumDeclarations groups={filteredSubEnums} />
        {(models.length > 0 ||
          renderableEnums.length > 0 ||
          filteredSubEnums.length > 0) &&
        namedUnions.length > 0
          ? "\n\n"
          : undefined}
        <UnionDeclarations unions={namedUnions} />
        {(models.length > 0 ||
          renderableEnums.length > 0 ||
          filteredSubEnums.length > 0 ||
          namedUnions.length > 0) &&
        (hasSerializers ||
          hasUnionSerializers ||
          hasEnumSerializers ||
          hasDeserializers ||
          hasXmlSerializers ||
          hasXmlDeserializers)
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
        {hasSerializers && hasUnionSerializers ? "\n\n" : undefined}
        <UnionSerializerDeclarations unions={inputUnions} />
        {(hasSerializers || hasUnionSerializers) && hasEnumSerializers
          ? "\n\n"
          : undefined}
        <EnumSerializerDeclarations enums={inputEnumSerializers} />
        {(hasSerializers || hasUnionSerializers || hasEnumSerializers) &&
        hasArrayRecordSerializers
          ? "\n\n"
          : undefined}
        <ArrayRecordSerializerDeclarations
          arrayTypes={inputArrayTypes}
          dictTypes={inputDictTypes}
        />
        {(hasSerializers ||
          hasUnionSerializers ||
          hasEnumSerializers ||
          hasArrayRecordSerializers) &&
        hasDeserializers
          ? "\n\n"
          : undefined}
        <DeserializerDeclarations models={regularOutputModels} />
        {regularOutputModels.length > 0 && polymorphicOutputModels.length > 0
          ? "\n\n"
          : undefined}
        <PolymorphicDeserializerDeclarations models={polymorphicOutputModels} />
        {(hasDeserializers ||
          hasSerializers ||
          hasUnionSerializers ||
          hasEnumSerializers) &&
        hasUnionDeserializers
          ? "\n\n"
          : undefined}
        <UnionDeserializerDeclarations unions={outputUnions} />
        {(hasDeserializers ||
          hasSerializers ||
          hasUnionSerializers ||
          hasEnumSerializers ||
          hasUnionDeserializers) &&
        hasArrayRecordDeserializers
          ? "\n\n"
          : undefined}
        <ArrayRecordDeserializerDeclarations
          arrayTypes={outputArrayTypes}
          dictTypes={outputDictTypes}
        />
        {(hasSerializers ||
          hasUnionSerializers ||
          hasEnumSerializers ||
          hasDeserializers ||
          hasUnionDeserializers ||
          hasArrayRecordSerializers ||
          hasArrayRecordDeserializers) &&
        hasXmlSerializers
          ? "\n\n"
          : undefined}
        <XmlSerializerDeclarations models={xmlInputModels} />
        {hasXmlSerializers && hasXmlDeserializers ? "\n\n" : undefined}
        <XmlDeserializerDeclarations models={xmlOutputModels} />
        {hasSerializers ||
        hasUnionSerializers ||
        hasEnumSerializers ||
        hasDeserializers ||
        hasUnionDeserializers ||
        hasArrayRecordSerializers ||
        hasArrayRecordDeserializers ||
        hasXmlSerializers ||
        hasXmlDeserializers ? (
          <FlattenHelperDeclarations
            inputModels={[...regularInputModels, ...multipartInputModels]}
            outputModels={regularOutputModels}
          />
        ) : undefined}
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
  groups: {
    parentEnum: import("@azure-tools/typespec-client-generator-core").SdkEnumType;
    subEnums: import("./sub-enum-declaration.js").SubEnumInfo[];
  }[];
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
        <SubEnumDeclarations
          parentEnum={group.parentEnum}
          subEnums={group.subEnums}
        />
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
 * Determines whether a model has a parent model (base model) in the inheritance hierarchy.
 *
 * When a model has a base model, its (de)serializers must include all inherited
 * parent properties alongside its own properties to ensure complete wire-format
 * output. This applies to both discriminated and non-discriminated inheritance.
 *
 * For example, if `Cat extends Pet`, the `catDeserializer` must produce an object
 * with both Pet's properties (`name`, `weight`) and Cat's own properties (`kind`, `meow`).
 * Without this, the deserialized object would be missing inherited data.
 *
 * @param model - The TCGC model type to check.
 * @returns True if the model has a base model and needs inherited properties in (de)serializers.
 */
function hasParentModel(model: SdkModelType): boolean {
  return model.baseModel !== undefined;
}

/**
 * Renders all JSON serializer function declarations.
 *
 * Each model with `UsageFlags.Input` gets a serializer function that converts
 * typed SDK objects into wire-format JSON. Serializers are placed in the same
 * source file as type declarations to prevent self-import bugs.
 *
 * Child models with parent models receive `includeParentProperties`
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
          includeParentProperties={hasParentModel(model)}
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
 * Child models with parent models receive `includeParentProperties`
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
          includeParentProperties={hasParentModel(model)}
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
            includeParentProperties={hasParentModel(model)}
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
            includeParentProperties={hasParentModel(model)}
          />
          {"\n\n"}
          <JsonPolymorphicDeserializer model={model} />
        </>
      )}
    </For>
  );
}

/**
 * Props for the {@link UnionSerializerDeclarations} component.
 */
interface UnionSerializerDeclarationsProps {
  /** The list of TCGC union types that have Input usage and need serializers. */
  unions: SdkUnionType[];
}

/**
 * Renders all pass-through JSON serializer function declarations for union types.
 *
 * Non-discriminated unions (e.g., `"bar" | Baz | string`) get a simple pass-through
 * serializer that returns `item` as-is. This exists so that model serialization code
 * can uniformly reference a serializer refkey for property types, regardless of
 * whether the type is a model or union. It also ensures consumers who import these
 * serializer functions are not broken.
 *
 * @param props - Component props containing the list of input union types.
 * @returns Alloy JSX tree with union serializer declarations, or undefined if empty.
 */
function UnionSerializerDeclarations(props: UnionSerializerDeclarationsProps) {
  if (props.unions.length === 0) return undefined;

  return (
    <For each={props.unions} doubleHardline>
      {(unionType) => <JsonUnionSerializer type={unionType} />}
    </For>
  );
}

/**
 * Props for the {@link EnumSerializerDeclarations} component.
 */
interface EnumSerializerDeclarationsProps {
  /** The list of union-as-enum types that need pass-through serializers. */
  enums: SdkEnumType[];
}

/**
 * Renders all pass-through JSON serializer function declarations for union-as-enum types.
 *
 * When `experimentalExtensibleEnums` is NOT true, union-as-enum types (TypeSpec
 * unions flattened by TCGC into `SdkEnumType` with `isUnionAsEnum: true`) get
 * simple pass-through serializers matching the legacy emitter's behavior.
 *
 * @param props - Component props containing the list of union-as-enum types.
 * @returns Alloy JSX tree with enum serializer declarations, or undefined if empty.
 */
function EnumSerializerDeclarations(props: EnumSerializerDeclarationsProps) {
  if (props.enums.length === 0) return undefined;

  return (
    <For each={props.enums} doubleHardline>
      {(enumType) => <JsonEnumSerializer type={enumType} />}
    </For>
  );
}

/**
 * Props for the {@link UnionDeserializerDeclarations} component.
 */
interface UnionDeserializerDeclarationsProps {
  /** The list of TCGC union types that have Output/Exception usage and need deserializers. */
  unions: SdkUnionType[];
}

/**
 * Renders all pass-through JSON deserializer function declarations for union types.
 *
 * Non-discriminated unions (e.g., `Cat | Dog` without a discriminator property)
 * get a simple pass-through deserializer that returns `item` as-is. This exists
 * so that operation response deserialization can uniformly reference a deserializer
 * refkey for the response type, regardless of whether it is a model or union.
 *
 * @param props - Component props containing the list of output/exception union types.
 * @returns Alloy JSX tree with union deserializer declarations, or undefined if empty.
 */
function UnionDeserializerDeclarations(
  props: UnionDeserializerDeclarationsProps,
) {
  if (props.unions.length === 0) return undefined;

  return (
    <For each={props.unions} doubleHardline>
      {(unionType) => <JsonUnionDeserializer type={unionType} />}
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

/**
 * Props for the {@link FlattenHelperDeclarations} component.
 */
interface FlattenHelperDeclarationsProps {
  /** Input models that may need flatten serializer helpers. */
  inputModels: SdkModelType[];
  /** Output models that may need flatten deserializer helpers. */
  outputModels: SdkModelType[];
}

/**
 * Collects (model, flattenProp) pairs from a list of models.
 *
 * @param models - The models to scan for flatten properties.
 * @returns An array of { model, flattenProp } pairs.
 */
function collectFlattenPairs(models: SdkModelType[]) {
  const pairs: {
    model: SdkModelType;
    flattenProp: import("@azure-tools/typespec-client-generator-core").SdkModelPropertyType;
  }[] = [];
  for (const model of models) {
    for (const prop of model.properties) {
      if (prop.flatten && prop.type.kind === "model") {
        pairs.push({ model, flattenProp: prop });
      }
    }
  }
  return pairs;
}

/**
 * Renders flatten helper function declarations for both serializers and deserializers.
 *
 * Scans all input and output models for flatten properties and renders the
 * corresponding helper functions. Each flatten property gets a serializer helper
 * (if the model has Input usage) and/or a deserializer helper (if the model has
 * Output/Exception usage). Helpers are rendered at the end of the models file,
 * matching the legacy emitter's output ordering.
 *
 * @param props - Component props with input and output model lists.
 * @returns Alloy JSX tree with flatten helper declarations, or undefined if none needed.
 */
function FlattenHelperDeclarations(props: FlattenHelperDeclarationsProps) {
  const serPairs = collectFlattenPairs(props.inputModels);
  const deserPairs = collectFlattenPairs(props.outputModels);

  if (serPairs.length === 0 && deserPairs.length === 0) return undefined;

  // Build a combined list: for each (model, prop), emit ser helper, deser helper, or both
  const allModels = new Set([...props.inputModels, ...props.outputModels]);
  const combinedPairs: {
    model: SdkModelType;
    flattenProp: import("@azure-tools/typespec-client-generator-core").SdkModelPropertyType;
    needsSer: boolean;
    needsDeser: boolean;
  }[] = [];

  for (const model of allModels) {
    for (const prop of model.properties) {
      if (prop.flatten && prop.type.kind === "model") {
        const needsSer = props.inputModels.includes(model);
        const needsDeser = props.outputModels.includes(model);
        if (needsSer || needsDeser) {
          combinedPairs.push({
            model,
            flattenProp: prop,
            needsSer,
            needsDeser,
          });
        }
      }
    }
  }

  if (combinedPairs.length === 0) return undefined;

  return (
    <>
      {"\n\n"}
      <For each={combinedPairs} doubleHardline>
        {({ model, flattenProp, needsSer, needsDeser }) => (
          <>
            {needsSer ? (
              <FlattenSerializerHelper
                parentModel={model}
                flattenProp={flattenProp}
              />
            ) : undefined}
            {needsSer && needsDeser ? "\n\n" : undefined}
            {needsDeser ? (
              <FlattenDeserializerHelper
                parentModel={model}
                flattenProp={flattenProp}
              />
            ) : undefined}
          </>
        )}
      </For>
    </>
  );
}

/**
 * Props for the {@link ArrayRecordSerializerDeclarations} component.
 */
interface ArrayRecordSerializerDeclarationsProps {
  /** Unique array types that need serializer helper functions. */
  arrayTypes: SdkArrayType[];
  /** Unique dict types that need serializer helper functions. */
  dictTypes: SdkDictionaryType[];
}

/**
 * Renders all named array and record serializer helper functions.
 *
 * These functions wrap `.map()` or `serializeRecord()` calls in standalone
 * exported functions, matching the legacy emitter's pattern. For example:
 * `petArraySerializer(result: Array<Pet>): any[]`
 *
 * @param props - Component props with array and dict types.
 * @returns Alloy JSX tree with array/record serializer declarations, or undefined if empty.
 */
function ArrayRecordSerializerDeclarations(
  props: ArrayRecordSerializerDeclarationsProps,
) {
  const all = [
    ...props.arrayTypes.map((t) => ({ kind: "array" as const, type: t })),
    ...props.dictTypes.map((t) => ({ kind: "dict" as const, type: t })),
  ];
  if (all.length === 0) return undefined;

  return (
    <For each={all} doubleHardline>
      {(item) =>
        item.kind === "array" ? (
          <JsonArraySerializer type={item.type as SdkArrayType} />
        ) : (
          <JsonRecordSerializer type={item.type as SdkDictionaryType} />
        )
      }
    </For>
  );
}

/**
 * Props for the {@link ArrayRecordDeserializerDeclarations} component.
 */
interface ArrayRecordDeserializerDeclarationsProps {
  /** Unique array types that need deserializer helper functions. */
  arrayTypes: SdkArrayType[];
  /** Unique dict types that need deserializer helper functions. */
  dictTypes: SdkDictionaryType[];
}

/**
 * Renders all named array and record deserializer helper functions.
 *
 * @param props - Component props with array and dict types.
 * @returns Alloy JSX tree with array/record deserializer declarations, or undefined if empty.
 */
function ArrayRecordDeserializerDeclarations(
  props: ArrayRecordDeserializerDeclarationsProps,
) {
  const all = [
    ...props.arrayTypes.map((t) => ({ kind: "array" as const, type: t })),
    ...props.dictTypes.map((t) => ({ kind: "dict" as const, type: t })),
  ];
  if (all.length === 0) return undefined;

  return (
    <For each={all} doubleHardline>
      {(item) =>
        item.kind === "array" ? (
          <JsonArrayDeserializer type={item.type as SdkArrayType} />
        ) : (
          <JsonRecordDeserializer type={item.type as SdkDictionaryType} />
        )
      }
    </For>
  );
}

/**
 * Collects all SDK types from model properties and operation signatures
 * that need to be examined for array/record helper function generation.
 *
 * Walks all model properties and all operation method parameters/responses
 * to find every SdkType that might contain array or record types needing
 * named helper functions.
 *
 * @param models - All models in the SDK package.
 * @param clients - All top-level clients in the SDK package.
 * @returns Separate lists of input and output types to walk.
 */
function collectAllPropertyAndOperationTypes(
  models: SdkModelType[],
  clients: SdkClientType<SdkHttpOperation>[],
): { inputTypes: SdkType[]; outputTypes: SdkType[] } {
  const inputTypes: SdkType[] = [];
  const outputTypes: SdkType[] = [];

  // Walk model properties
  for (const model of models) {
    const isInput = (model.usage & UsageFlags.Input) !== 0;
    const isOutput =
      (model.usage & UsageFlags.Output) !== 0 ||
      (model.usage & UsageFlags.Exception) !== 0;

    for (const prop of model.properties) {
      if (isInput) inputTypes.push(prop.type);
      if (isOutput) outputTypes.push(prop.type);
    }
  }

  // Walk operations from clients to find array/dict types in
  // request bodies and response types not covered by model properties.
  // All method kinds (basic, lro, paging, lropaging) are included so that
  // array/dict helpers are generated for every response shape.
  function walkClient(client: SdkClientType<SdkHttpOperation>) {
    for (const method of client.methods) {
      if (
        method.kind === "basic" ||
        method.kind === "lro" ||
        method.kind === "paging" ||
        method.kind === "lropaging"
      ) {
        // Request body type
        for (const param of method.parameters) {
          if (param.kind === "method") {
            inputTypes.push(param.type);
          }
        }
        // Response type
        if (method.response?.type) {
          outputTypes.push(method.response.type);
        }
      }
    }
    // Recurse into child clients
    if (client.children) {
      for (const child of client.children) {
        walkClient(child);
      }
    }
  }

  for (const client of clients) {
    walkClient(client);
  }

  return { inputTypes, outputTypes };
}
