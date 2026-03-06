import type {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Represents a group of operations sharing the same path prefix.
 *
 * The `prefixPath` determines the file location under `api/`:
 * - Empty string → `api/operations.ts` (root-level operations)
 * - `"users"` → `api/users/operations.ts`
 * - `"users/profiles"` → `api/users/profiles/operations.ts`
 */
export interface OperationGroup {
  /** Slash-separated prefix path. Empty string for root-level operations. */
  prefixPath: string;
  /** PascalCase operation group names from the client hierarchy (for naming). */
  prefixes: string[];
  /** The operations belonging to this group. */
  operations: SdkServiceMethod<SdkHttpOperation>[];
  /** The root-level client entity, used for the context type reference. */
  rootClient: SdkClientType<SdkHttpOperation>;
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
 * TestingClient
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
export function collectOperationGroups(
  clients: SdkClientType<SdkHttpOperation>[],
): OperationGroup[] {
  const groupMap = new Map<
    string,
    {
      operations: SdkServiceMethod<SdkHttpOperation>[];
      prefixes: string[];
      rootClient: SdkClientType<SdkHttpOperation>;
    }
  >();

  // BFS queue: [dirPrefixes, namePrefixes, currentClient, rootClient]
  const queue: [
    string[],
    string[],
    SdkClientType<SdkHttpOperation>,
    SdkClientType<SdkHttpOperation>,
  ][] = clients.map((c) => [[], [], c, c]);

  while (queue.length > 0) {
    const [dirPrefixes, namePrefixes, client, rootClient] = queue.shift()!;
    const prefixKey = dirPrefixes.join("/");

    for (const method of client.methods) {
      if (!groupMap.has(prefixKey)) {
        groupMap.set(prefixKey, {
          operations: [],
          prefixes: namePrefixes,
          rootClient,
        });
      }
      groupMap.get(prefixKey)!.operations.push(method);
    }

    if (client.children) {
      for (const child of client.children) {
        queue.push([
          [...dirPrefixes, normalizeName(child.name)],
          [...namePrefixes, child.name],
          child,
          rootClient,
        ]);
      }
    }
  }

  return Array.from(groupMap.entries())
    .filter(([, group]) => group.operations.length > 0)
    .map(([prefixPath, group]) => ({
      prefixPath,
      prefixes: group.prefixes,
      operations: group.operations,
      rootClient: group.rootClient,
    }));
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
export function normalizeName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
