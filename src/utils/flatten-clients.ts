import type {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Detects whether any two methods across a client's descendant tree share
 * the same name. This mirrors the legacy emitter's `detectIfNameConflicts()`
 * function used for auto-detecting `enable-operation-group`.
 *
 * When collisions exist, operation groups must be preserved to avoid
 * generating duplicate function declarations on the client class.
 *
 * @param clients - The top-level TCGC client array from `sdkPackage.clients`
 * @returns `true` if any client has method name collisions in its hierarchy
 */
export function detectNameConflicts(
  clients: SdkClientType<SdkHttpOperation>[],
): boolean {
  for (const client of clients) {
    const allMethods = collectAllMethods(client);
    const names = new Set<string>();
    for (const method of allMethods) {
      if (names.has(method.name)) {
        return true;
      }
      names.add(method.name);
    }
  }
  return false;
}

/**
 * Flattens the TCGC client hierarchy by moving all children's methods
 * onto the root client and removing the children references.
 *
 * This is called only when both `hierarchy-client` is false AND
 * `enable-operation-group` resolves to false — the most aggressive
 * flattening mode where all operations go directly on the root client.
 *
 * This function creates shallow clones of the client objects to avoid
 * mutating the original TCGC data.
 *
 * @param clients - The top-level TCGC client array from `sdkPackage.clients`
 * @returns A new array of flattened client clones
 */
export function flattenClientHierarchy(
  clients: SdkClientType<SdkHttpOperation>[],
): SdkClientType<SdkHttpOperation>[] {
  return clients.map((client) => flattenClient(client));
}

/**
 * Recursively collects all methods from a client and its descendants,
 * then returns a shallow clone with children removed.
 */
function flattenClient(
  client: SdkClientType<SdkHttpOperation>,
): SdkClientType<SdkHttpOperation> {
  const allMethods = collectAllMethods(client);
  return {
    ...client,
    methods: allMethods,
    children: undefined,
  };
}

/**
 * Recursively gathers all service methods from a client and its
 * entire descendant tree (BFS).
 */
function collectAllMethods(
  client: SdkClientType<SdkHttpOperation>,
): SdkServiceMethod<SdkHttpOperation>[] {
  const methods: SdkServiceMethod<SdkHttpOperation>[] = [...client.methods];
  const queue = [...(client.children ?? [])];

  while (queue.length > 0) {
    const child = queue.shift()!;
    methods.push(...child.methods);
    if (child.children) {
      queue.push(...child.children);
    }
  }

  return methods;
}
