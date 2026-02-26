import { For, SourceDirectory } from "@alloy-js/core";
import { BarrelFile, SourceFile } from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkEnumType,
  SdkHttpOperation,
  SdkModelType,
  SdkServiceMethod,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { getDirectSubtypes } from "./polymorphic-type.js";
import { getClientName } from "./client-context.js";

/**
 * Renders the root `index.ts` barrel file at `src/index.ts`.
 *
 * This component generates the public API entry point for the generated SDK
 * library. It produces selective `export { ... } from "..."` statements that
 * expose only the symbols that consumers should use, while keeping internal
 * implementation details (serializers, deserializers, `_prefixed` functions)
 * hidden from the public surface.
 *
 * The root index exports:
 * 1. **Model types** — interfaces, polymorphic union aliases, type aliases,
 *    enum type aliases, and known-values enums from `./models/index.js`
 * 2. **Client classes** — classical (class-based) clients from their
 *    individual source files
 * 3. **Client options** — `{Client}OptionalParams` interfaces from
 *    context files
 * 4. **Client context** — context interfaces and factory functions from
 *    context files
 * 5. **Operation options** — `{Operation}OptionalParams` interfaces
 *    from operation files
 *
 * Symbols that are explicitly excluded:
 * - Serializer and deserializer functions (internal implementation)
 * - `_prefixed` private functions (`_xxxSend`, `_xxxDeserialize`)
 * - Operation group factory functions (`_getXxxOperations`)
 *
 * @returns An Alloy JSX tree for the root `index.ts` source file, or
 *          `undefined` if neither clients nor exportable models exist.
 */
export function RootIndexFile() {
  const { clients, models, enums, unions } = useSdkContext();

  // Filter unions to only named SdkUnionType (exclude SdkNullableType)
  const namedUnions = unions.filter(
    (u): u is SdkUnionType => u.kind === "union",
  );

  // Collect model export names
  const modelExportNames = buildModelExportNames(models, enums, namedUnions);

  // For model-only packages (no clients), generate root index that re-exports
  // models. This matches the legacy emitter behavior where model-only packages
  // still get a root index.ts with model exports.
  if (clients.length === 0) {
    if (modelExportNames.length === 0) {
      return undefined;
    }
    return (
      <SourceFile path="index.ts">
        {buildExportStatement(modelExportNames, "./models/index.js")}
      </SourceFile>
    );
  }

  // Collect per-client export info
  const clientExports = clients.map((client) => ({
    client,
    clientName: getClientName(client),
    className: client.name,
    operationGroups: collectOperationGroupExports(client),
  }));

  // Collect all operation methods across all clients (for options exports)
  const allOperationExports = collectAllOperationExports(clients);

  return (
    <SourceFile path="index.ts">
      {modelExportNames.length > 0 && (
        <>
          {buildExportStatement(modelExportNames, "./models/index.js")}
        </>
      )}
      {modelExportNames.length > 0 && clientExports.length > 0 ? "\n" : undefined}
      <For each={clientExports} joiner={"\n"}>
        {(ce) => (
          <>
            {buildExportStatement(
              [ce.className],
              `./${camelCase(ce.className)}.js`,
            )}
            {"\n"}
            {buildExportStatement(
              [
                `${ce.clientName}Context`,
                `${ce.className}OptionalParams`,
                `create${ce.clientName}`,
              ],
              `./api/${camelCase(ce.className)}Context.js`,
            )}
            {ce.operationGroups.length > 0 ? (
              <>
                {"\n"}
                <For each={ce.operationGroups} joiner={"\n"}>
                  {(og) =>
                    buildExportStatement(
                      [`${og.name}Operations`],
                      `./classic/${og.path}/index.js`,
                    )
                  }
                </For>
              </>
            ) : undefined}
          </>
        )}
      </For>
      {allOperationExports.length > 0 ? (
        <>
          {"\n"}
          <For each={allOperationExports} joiner={"\n"}>
            {(oe) =>
              buildExportStatement(
                oe.names,
                `./api/${oe.filePath}`,
              )
            }
          </For>
        </>
      ) : undefined}
    </SourceFile>
  );
}

/**
 * Renders `models/index.ts` that re-exports public type declarations.
 *
 * This subpath index file re-exports all public types from `models.ts`
 * while excluding serializer/deserializer functions and any internal
 * symbols. Consumers can import from either `./models/index.js` or
 * the root `index.js`.
 *
 * Exported symbols include:
 * - Model interfaces (e.g., `Widget`, `User`)
 * - Polymorphic union type aliases (e.g., `PetUnion`)
 * - Enum type aliases (e.g., `Color`)
 * - Known-values enums (e.g., `KnownColor`)
 * - Union type aliases (e.g., `MyUnion`)
 *
 * @returns An Alloy JSX tree for `models/index.ts`, or `undefined`
 *          if no model types exist.
 */
export function ModelsIndexFile() {
  const { models, enums, unions } = useSdkContext();

  const namedUnions = unions.filter(
    (u): u is SdkUnionType => u.kind === "union",
  );

  const exportNames = buildModelExportNames(models, enums, namedUnions);

  if (exportNames.length === 0) {
    return undefined;
  }

  return (
    <SourceFile path="index.ts">
      {buildExportStatement(exportNames, "./models.js")}
    </SourceFile>
  );
}

/**
 * Renders `api/index.ts` that re-exports public API symbols.
 *
 * This subpath index file re-exports from operation files and client
 * context files, providing a flat namespace for all API-layer symbols.
 *
 * Exported symbols include:
 * - Operation options interfaces (e.g., `GetWidgetOptionalParams`)
 * - Public operation functions (e.g., `getWidget`, `createWidget`)
 * - Client context interfaces (e.g., `TestingContext`)
 * - Client options interfaces (e.g., `TestingClientOptionalParams`)
 * - Client factory functions (e.g., `createTesting`)
 *
 * Excluded symbols:
 * - `_xxxSend` functions (private)
 * - `_xxxDeserialize` functions (private)
 *
 * @returns An Alloy JSX tree for `api/index.ts`, or `undefined`
 *          if no operations or clients exist.
 */
export function ApiIndexFile() {
  const { clients } = useSdkContext();

  if (clients.length === 0) {
    return undefined;
  }

  // Collect operation exports (public functions + options interfaces)
  const operationExports = collectAllOperationExports(clients);

  // Collect client context exports
  const contextExports = clients.map((client) => {
    const clientName = getClientName(client);
    return {
      names: [
        `${clientName}Context`,
        `${client.name}OptionalParams`,
        `create${clientName}`,
      ],
      filePath: `./${camelCase(client.name)}Context.js`,
    };
  });

  return (
    <SourceFile path="index.ts">
      <For each={contextExports} joiner={"\n"}>
        {(ce) => buildExportStatement(ce.names, ce.filePath)}
      </For>
      {contextExports.length > 0 && operationExports.length > 0 ? "\n" : undefined}
      <For each={operationExports} joiner={"\n"}>
        {(oe) => buildExportStatement(oe.names, `./${oe.filePath}`)}
      </For>
    </SourceFile>
  );
}

/**
 * Renders `classic/index.ts` that re-exports operation group interfaces.
 *
 * This subpath index file uses Alloy's `BarrelFile` to automatically
 * discover and re-export all symbols from nested operation group
 * directories under `classic/`.
 *
 * @returns An Alloy JSX `<BarrelFile>` for `classic/index.ts`.
 */
export function ClassicIndexFile() {
  return <BarrelFile />;
}

/**
 * Orchestrator component that generates all index files for the SDK output.
 *
 * This component produces the complete set of barrel/index files needed
 * to provide a clean public API surface:
 *
 * - `src/index.ts` — Root entry point with selective exports
 * - `src/models/index.ts` — Model type re-exports (no serializers)
 * - `src/api/index.ts` — API layer re-exports (no internals)
 * - `src/classic/index.ts` — Operation group interface re-exports
 *
 * All index files exclude internal implementation details:
 * - Serializer/deserializer functions
 * - `_prefixed` private functions
 * - Internal helper types
 *
 * @returns An Alloy JSX tree containing all index files, or `undefined`
 *          if the SDK package has neither clients nor exportable models.
 */
export function IndexFiles() {
  const { clients, models, enums, unions } = useSdkContext();

  const namedUnions = unions.filter(
    (u): u is SdkUnionType => u.kind === "union",
  );

  const hasModels =
    models.length > 0 || enums.length > 0 || namedUnions.length > 0;

  // For model-only packages (no clients), only generate root index and
  // models index if there are models to export.
  if (clients.length === 0) {
    if (!hasModels) {
      return undefined;
    }
    return (
      <>
        <RootIndexFile />
        <SourceDirectory path="models">
          <ModelsIndexFile />
        </SourceDirectory>
      </>
    );
  }

  const hasOperationGroups = clients.some(
    (c) => c.children && c.children.length > 0,
  );

  return (
    <>
      <RootIndexFile />
      {hasModels && (
        <SourceDirectory path="models">
          <ModelsIndexFile />
        </SourceDirectory>
      )}
      <SourceDirectory path="api">
        <ApiIndexFile />
      </SourceDirectory>
      {hasOperationGroups && (
        <SourceDirectory path="classic">
          <ClassicIndexFile />
        </SourceDirectory>
      )}
    </>
  );
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Represents a group of export names and their source file path.
 */
interface OperationExportGroup {
  /** Symbol names to export. */
  names: string[];
  /** Relative file path (from api/) for the export source. */
  filePath: string;
}

/**
 * Represents an operation group with its name and directory path.
 */
interface OperationGroupExport {
  /** The PascalCase operation group name. */
  name: string;
  /** The file-system path under `classic/`. */
  path: string;
}

/**
 * Builds a list of model type names to export from the models directory.
 *
 * Collects names from:
 * - Model interfaces (e.g., `Widget`)
 * - Polymorphic union type aliases (e.g., `WidgetUnion`)
 * - Enum type aliases (e.g., `Color`)
 * - Known-values enums (e.g., `KnownColor`)
 * - Union type aliases (e.g., `MixedType`)
 *
 * Does NOT include serializer/deserializer function names.
 *
 * @param models - The TCGC model types from the SDK package.
 * @param enums - The TCGC enum types from the SDK package.
 * @param unions - The TCGC union types (filtered to SdkUnionType only).
 * @returns An array of export name strings.
 */
function buildModelExportNames(
  models: SdkModelType[],
  enums: SdkEnumType[],
  unions: SdkUnionType[],
): string[] {
  const names: string[] = [];

  for (const model of models) {
    names.push(model.name);

    // If model has discriminated subtypes, it also has a polymorphic union alias
    if (getDirectSubtypes(model).length > 0) {
      names.push(`${model.name}Union`);
    }
  }

  for (const enumType of enums) {
    names.push(enumType.name);
    names.push(`Known${enumType.name}`);
  }

  for (const union of unions) {
    names.push(union.name);
  }

  return names;
}

/**
 * Collects public operation export names grouped by their source file path.
 *
 * For each operation, exports the public function name and its options
 * interface name. Excludes `_send` and `_deserialize` private functions.
 *
 * @param clients - The top-level TCGC clients from the SDK package.
 * @returns An array of export groups, one per unique operations file.
 */
function collectAllOperationExports(
  clients: SdkClientType<SdkHttpOperation>[],
): OperationExportGroup[] {
  const groupMap = new Map<string, string[]>();

  // BFS traversal to collect all operations with their path
  const queue: [string[], SdkClientType<SdkHttpOperation>][] = clients.map(
    (c) => [[], c],
  );

  while (queue.length > 0) {
    const [prefixes, client] = queue.shift()!;
    const prefixPath = prefixes.join("/");
    const filePath = prefixPath
      ? `${prefixPath}/operations.js`
      : "operations.js";

    for (const method of client.methods) {
      if (!groupMap.has(filePath)) {
        groupMap.set(filePath, []);
      }
      const names = groupMap.get(filePath)!;
      names.push(getOptionsInterfaceName(method));
      names.push(method.name);
    }

    if (client.children) {
      for (const child of client.children) {
        queue.push([
          [...prefixes, normalizeName(child.name)],
          child,
        ]);
      }
    }
  }

  return Array.from(groupMap.entries())
    .filter(([, names]) => names.length > 0)
    .map(([filePath, names]) => ({ filePath, names }));
}

/**
 * Collects operation group export information for a single client.
 *
 * Uses BFS traversal to find all child clients (operation groups) and
 * their directory paths under `classic/`.
 *
 * @param client - The top-level TCGC client.
 * @returns An array of operation group export descriptors.
 */
function collectOperationGroupExports(
  client: SdkClientType<SdkHttpOperation>,
): OperationGroupExport[] {
  const groups: OperationGroupExport[] = [];

  if (!client.children) return groups;

  const queue: [string[], SdkClientType<SdkHttpOperation>][] =
    client.children.map((c) => [[], c]);

  while (queue.length > 0) {
    const [parentPrefixes, child] = queue.shift()!;
    const childPath = [...parentPrefixes, normalizeName(child.name)].join("/");
    groups.push({ name: child.name, path: childPath });

    if (child.children) {
      for (const grandchild of child.children) {
        queue.push([
          [...parentPrefixes, normalizeName(child.name)],
          grandchild,
        ]);
      }
    }
  }

  return groups;
}

/**
 * Computes the options interface name for an operation method.
 *
 * Matches the naming convention used by {@link OperationOptionsDeclaration}:
 * PascalCase operation name + "OptionalParams".
 *
 * @param method - The TCGC service method.
 * @returns The options interface name (e.g., `GetWidgetOptionalParams`).
 */
function getOptionsInterfaceName(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const baseName = method.name.charAt(0).toUpperCase() + method.name.slice(1);
  return `${baseName}OptionalParams`;
}

/**
 * Builds a TypeScript `export { ... } from "..."` statement string.
 *
 * @param names - The symbol names to export.
 * @param fromPath - The module specifier path.
 * @returns A string containing the export statement.
 */
function buildExportStatement(names: string[], fromPath: string): string {
  return `export { ${names.join(", ")} } from "${fromPath}";`;
}

/**
 * Converts a PascalCase name to camelCase by lowercasing the first character.
 *
 * @param name - The PascalCase name to convert.
 * @returns The camelCase version of the name.
 */
function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Normalizes a client/operation group name to a file-system-safe name.
 *
 * Converts the first character to lowercase, matching the convention
 * used in operation-files.tsx and classical-operation-groups.tsx.
 *
 * @param name - The raw operation group name from TCGC.
 * @returns The normalized name for directory paths.
 */
function normalizeName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
