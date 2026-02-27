import { For, SourceDirectory } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { OperationOptionsDeclaration } from "./operation-options.js";

/**
 * Represents a group of operations sharing the same path prefix.
 *
 * Reused from the same structure as operation-files.tsx to ensure
 * the options.ts files mirror the operations.ts directory layout.
 */
interface OperationGroup {
  /** Slash-separated prefix path. Empty string for root-level operations. */
  prefixPath: string;
  /** The operations belonging to this group. */
  operations: SdkServiceMethod<SdkHttpOperation>[];
}

/**
 * Orchestrator component that generates `options.ts` files per operation group.
 *
 * The legacy emitter places operation options interfaces (e.g., `GetUserOptionalParams`)
 * in separate `api/{group}/options.ts` files rather than inside `operations.ts`.
 * This component mirrors that structure: one `options.ts` per operation group,
 * each containing all `XxxOptionalParams` interfaces for that group's operations.
 *
 * The generated file structure follows the legacy emitter's convention:
 * ```
 * api/
 *   options.ts                // Root-level operation options
 *   users/
 *     options.ts              // Options for the "users" group
 * ```
 *
 * The options interfaces use the same refkeys as when they were inline in
 * `operations.ts`, so Alloy automatically generates import statements in
 * `operations.ts` pointing to `options.ts`.
 *
 * @returns An Alloy JSX tree containing the `api/` directory with options files,
 *          or `undefined` if no operations exist.
 */
export function OperationOptionsFiles() {
  const { clients } = useSdkContext();

  const groups = collectOperationGroups(clients);

  if (groups.length === 0) {
    return undefined;
  }

  return (
    <SourceDirectory path="api">
      <For each={groups}>
        {(group) => <OperationOptionsGroupFile group={group} />}
      </For>
    </SourceDirectory>
  );
}

/**
 * Props for the {@link OperationOptionsGroupFile} component.
 */
interface OperationOptionsGroupFileProps {
  /** The operation group whose options interfaces to render. */
  group: OperationGroup;
}

/**
 * Renders a single `options.ts` file for an operation group.
 *
 * For root-level operations (empty prefix), the file is `options.ts`
 * directly under `api/`. For grouped operations, the file is nested
 * under subdirectories matching the group path (e.g., `users/options.ts`).
 *
 * Each operation in the group gets one `XxxOptionalParams` interface,
 * separated by blank lines.
 *
 * @param props - Component props containing the operation group.
 * @returns An Alloy JSX tree for the options source file.
 */
function OperationOptionsGroupFile(props: OperationOptionsGroupFileProps) {
  const { group } = props;

  const content = (
    <SourceFile path="options.ts">
      <For each={group.operations} doubleHardline>
        {(method) => <OperationOptionsDeclaration method={method} />}
      </For>
    </SourceFile>
  );

  // Use nested SourceDirectory for grouped options so Alloy computes
  // correct relative import paths (e.g., ./options.js instead of ./group/options.js).
  if (group.prefixPath) {
    return <SourceDirectory path={group.prefixPath}>{content}</SourceDirectory>;
  }
  return content;
}

/**
 * Collects all operations from the client hierarchy and groups them by
 * their operation group path.
 *
 * Uses the same BFS traversal as operation-files.tsx to ensure the
 * options.ts files match the operations.ts directory structure exactly.
 *
 * @param clients - The top-level TCGC clients from the SDK package.
 * @returns An array of operation groups, one per unique prefix path.
 */
function collectOperationGroups(
  clients: SdkClientType<SdkHttpOperation>[],
): OperationGroup[] {
  const groupMap = new Map<string, SdkServiceMethod<SdkHttpOperation>[]>();

  const queue: [string[], SdkClientType<SdkHttpOperation>][] = clients.map(
    (c) => [[], c],
  );

  while (queue.length > 0) {
    const [prefixes, client] = queue.shift()!;
    const prefixKey = prefixes.join("/");

    for (const method of client.methods) {
      if (!groupMap.has(prefixKey)) {
        groupMap.set(prefixKey, []);
      }
      groupMap.get(prefixKey)!.push(method);
    }

    if (client.children) {
      for (const child of client.children) {
        queue.push([[...prefixes, normalizeName(child.name)], child]);
      }
    }
  }

  return Array.from(groupMap.entries())
    .filter(([, ops]) => ops.length > 0)
    .map(([prefixPath, operations]) => ({ prefixPath, operations }));
}

/**
 * Normalizes a client/operation group name to a file-system-safe lowercase name.
 *
 * @param name - The raw operation group name from TCGC.
 * @returns The normalized lowercase name for directory paths.
 */
function normalizeName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
