import { For, SourceDirectory } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import type {
  SdkModelType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { EnumDeclaration } from "./enum-declaration.js";
import { ModelInterface } from "./model-interface.js";
import { getDirectSubtypes, PolymorphicType } from "./polymorphic-type.js";
import { JsonSerializer } from "./serialization/json-serializer.js";
import { JsonDeserializer } from "./serialization/json-deserializer.js";
import { UnionDeclaration } from "./union-declaration.js";

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

  // Filter unions to exclude SdkNullableType — only render named SdkUnionType
  const namedUnions = unions.filter(
    (u): u is SdkUnionType => u.kind === "union",
  );

  // Filter models by usage flags for serialization/deserialization
  const inputModels = models.filter(
    (m) => (m.usage & UsageFlags.Input) !== 0,
  );
  const outputModels = models.filter(
    (m) =>
      (m.usage & UsageFlags.Output) !== 0 ||
      (m.usage & UsageFlags.Exception) !== 0,
  );

  // Skip rendering entirely if there are no type declarations to emit
  if (models.length === 0 && enums.length === 0 && namedUnions.length === 0) {
    return undefined;
  }

  return (
    <SourceDirectory path="models">
      <SourceFile path="models.ts">
        <ModelDeclarations models={models} />
        {models.length > 0 && enums.length > 0 ? "\n\n" : undefined}
        <EnumDeclarations enums={enums} />
        {(models.length > 0 || enums.length > 0) && namedUnions.length > 0
          ? "\n\n"
          : undefined}
        <UnionDeclarations unions={namedUnions} />
        {(models.length > 0 || enums.length > 0 || namedUnions.length > 0) &&
        (inputModels.length > 0 || outputModels.length > 0)
          ? "\n\n"
          : undefined}
        <SerializerDeclarations models={inputModels} />
        {inputModels.length > 0 && outputModels.length > 0
          ? "\n\n"
          : undefined}
        <DeserializerDeclarations models={outputModels} />
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
 * Props for the {@link SerializerDeclarations} component.
 */
interface SerializerDeclarationsProps {
  /** The list of TCGC model types that have Input usage and need serializers. */
  models: SdkModelType[];
}

/**
 * Renders all JSON serializer function declarations.
 *
 * Each model with `UsageFlags.Input` gets a serializer function that converts
 * typed SDK objects into wire-format JSON. Serializers are placed in the same
 * source file as type declarations to prevent self-import bugs.
 *
 * @param props - Component props containing the list of input models.
 * @returns Alloy JSX tree with serializer declarations, or undefined if empty.
 */
function SerializerDeclarations(props: SerializerDeclarationsProps) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => <JsonSerializer model={model} />}
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
 * @param props - Component props containing the list of output/exception models.
 * @returns Alloy JSX tree with deserializer declarations, or undefined if empty.
 */
function DeserializerDeclarations(props: DeserializerDeclarationsProps) {
  if (props.models.length === 0) return undefined;

  return (
    <For each={props.models} doubleHardline>
      {(model) => <JsonDeserializer model={model} />}
    </For>
  );
}
