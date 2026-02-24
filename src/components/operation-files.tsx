import { For, SourceDirectory } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { DeserializeOperation } from "./deserialize-operation.js";
import { OperationOptionsDeclaration } from "./operation-options.js";
import { PublicOperation } from "./public-operation.js";
import { SendOperation } from "./send-operation.js";

/**
 * Represents a group of operations sharing the same path prefix.
 *
 * The `prefixPath` determines the file location under `api/`:
 * - Empty string → `api/operations.ts` (root-level operations)
 * - `"users"` → `api/users/operations.ts`
 * - `"users/profiles"` → `api/users/profiles/operations.ts`
 */
interface OperationGroup {
  /** Slash-separated prefix path. Empty string for root-level operations. */
  prefixPath: string;
  /** The operations belonging to this group. */
  operations: SdkServiceMethod<SdkHttpOperation>[];
}

/**
 * Orchestrator component that organizes all operations into API source files.
 *
 * This component is the top-level coordinator for Phase 3 operation output. It:
 * 1. Collects all clients from the SDK context
 * 2. Traverses the client hierarchy to group operations by their operation
 *    group path (derived from nested client names)
 * 3. Renders each group as an `api/{group}/operations.ts` source file
 *
 * The generated file structure follows the legacy emitter's convention:
 * ```
 * api/
 *   operations.ts           // Root-level operations (no group)
 *   users/
 *     operations.ts         // Operations in the "users" group
 *   users/
 *     profiles/
 *       operations.ts       // Operations in the "users/profiles" group
 * ```
 *
 * Each operations file contains, per operation:
 * - `XxxOptionalParams` interface (operation options)
 * - `_xxxSend` function (request builder)
 * - `_xxxDeserialize` function (response processor)
 * - `xxx` function (public API that composes send + deserialize)
 *
 * If no operations exist in the SDK package, the component renders nothing.
 *
 * @returns An Alloy JSX tree containing the `api/` directory with operation
 *          files, or `undefined` if no operations need to be emitted.
 */
export function OperationFiles() {
  const { clients } = useSdkContext();

  const groups = collectOperationGroups(clients);

  if (groups.length === 0) {
    return undefined;
  }

  return (
    <SourceDirectory path="api">
      <For each={groups}>
        {(group) => <OperationGroupFile group={group} />}
      </For>
    </SourceDirectory>
  );
}

/**
 * Props for the {@link OperationGroupFile} component.
 */
interface OperationGroupFileProps {
  /** The operation group to render as a source file. */
  group: OperationGroup;
}

/**
 * Renders a single operations file for an operation group.
 *
 * For root-level operations (empty prefix), the file is `operations.ts`
 * directly under `api/`. For grouped operations, the file is nested
 * under subdirectories matching the group path (e.g., `users/operations.ts`).
 *
 * Each operation renders four declarations in order:
 * 1. `OperationOptionsDeclaration` — the options interface
 * 2. `SendOperation` — the private send function
 * 3. `DeserializeOperation` — the private deserialize function
 * 4. `PublicOperation` — the public API function
 *
 * @param props - Component props containing the operation group.
 * @returns An Alloy JSX tree for the operations source file.
 */
function OperationGroupFile(props: OperationGroupFileProps) {
  const { group } = props;

  const filePath = group.prefixPath
    ? `${group.prefixPath}/operations.ts`
    : "operations.ts";

  return (
    <SourceFile path={filePath}>
      <For each={group.operations} doubleHardline>
        {(method) => <OperationDeclarations method={method} />}
      </For>
    </SourceFile>
  );
}

/**
 * Props for the {@link OperationDeclarations} component.
 */
interface OperationDeclarationsProps {
  /** The TCGC service method to render all declarations for. */
  method: SdkServiceMethod<SdkHttpOperation>;
}

/**
 * Renders all four declarations for a single operation.
 *
 * The declarations are rendered in the legacy emitter's order:
 * 1. Options interface — defines the optional parameters bag
 * 2. Send function — builds and dispatches the HTTP request
 * 3. Deserialize function — validates and parses the response
 * 4. Public function — composes send + deserialize for consumers
 *
 * Each declaration is separated by a blank line (via Fragment + newlines)
 * to produce readable output.
 *
 * @param props - Component props containing the TCGC service method.
 * @returns An Alloy JSX tree with all four operation declarations.
 */
function OperationDeclarations(props: OperationDeclarationsProps) {
  const { method } = props;

  return (
    <>
      <OperationOptionsDeclaration method={method} />
      {"\n\n"}
      <SendOperation method={method} />
      {"\n\n"}
      <DeserializeOperation method={method} />
      {"\n\n"}
      <PublicOperation method={method} />
    </>
  );
}

/**
 * Collects all operations from the client hierarchy and groups them by
 * their operation group path.
 *
 * The traversal walks the client tree using a BFS queue pattern similar
 * to the legacy emitter's `getMethodHierarchiesMap()`. Each client's
 * `methods` are collected under their accumulated prefix path, and
 * child clients extend the path with their name.
 *
 * For example, given a client hierarchy:
 * ```
 * TestServiceClient
 *   ├─ methods: [ping]         → prefixPath: ""
 *   └─ children:
 *       └─ Users
 *           ├─ methods: [list] → prefixPath: "users"
 *           └─ children:
 *               └─ Profiles
 *                   └─ methods: [get] → prefixPath: "users/profiles"
 * ```
 *
 * This produces three groups:
 * - `{ prefixPath: "", operations: [ping] }`
 * - `{ prefixPath: "users", operations: [list] }`
 * - `{ prefixPath: "users/profiles", operations: [get] }`
 *
 * @param clients - The top-level TCGC clients from the SDK package.
 * @returns An array of operation groups, one per unique prefix path.
 */
function collectOperationGroups(
  clients: SdkClientType<SdkHttpOperation>[],
): OperationGroup[] {
  const groupMap = new Map<string, SdkServiceMethod<SdkHttpOperation>[]>();

  // BFS queue: [prefixes, client]
  const queue: [string[], SdkClientType<SdkHttpOperation>][] = clients.map(
    (c) => [[], c],
  );

  while (queue.length > 0) {
    const [prefixes, client] = queue.shift()!;
    const prefixKey = prefixes.join("/");

    // Collect methods from this client
    for (const method of client.methods) {
      if (!groupMap.has(prefixKey)) {
        groupMap.set(prefixKey, []);
      }
      groupMap.get(prefixKey)!.push(method);
    }

    // Enqueue child clients (operation groups) with extended prefix
    if (client.children) {
      for (const child of client.children) {
        queue.push([[...prefixes, normalizeName(child.name)], child]);
      }
    }
  }

  // Convert map to sorted array of OperationGroup objects
  return Array.from(groupMap.entries())
    .filter(([, ops]) => ops.length > 0)
    .map(([prefixPath, operations]) => ({ prefixPath, operations }));
}

/**
 * Normalizes a client/operation group name to a file-system-safe lowercase
 * name following the legacy emitter's convention.
 *
 * The legacy emitter converts operation group names to lowercase for use
 * in directory paths (e.g., `Users` → `users`, `ProfileSettings` →
 * `profileSettings`). This ensures consistent casing across platforms.
 *
 * @param name - The raw operation group name from TCGC.
 * @returns The normalized lowercase name for directory paths.
 */
function normalizeName(name: string): string {
  // Convert to camelCase-style lowercase: first char lowercase, rest unchanged
  return name.charAt(0).toLowerCase() + name.slice(1);
}
