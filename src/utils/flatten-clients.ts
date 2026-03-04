import type {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Flattens the TCGC client hierarchy by moving all children's methods
 * onto the root client and removing the children references.
 *
 * When `hierarchy-client` is false (the default), TypeSpec `interface` blocks
 * that TCGC models as child clients should have their operations placed
 * directly on the parent client — matching the legacy emitter behavior.
 *
 * Safety: if flattening would cause method name collisions (e.g., two
 * child clients both have a `delete` operation), the client hierarchy
 * is preserved to avoid generating duplicate function declarations.
 *
 * This function creates shallow clones of the client objects to avoid
 * mutating the original TCGC data.
 *
 * @param clients - The top-level TCGC client array from `sdkPackage.clients`
 * @returns A new array of (potentially flattened) client clones
 */
export function flattenClientHierarchy(
  clients: SdkClientType<SdkHttpOperation>[],
): SdkClientType<SdkHttpOperation>[] {
  return clients.map((client) => {
    if (canFlattenSafely(client)) {
      return flattenClient(client);
    }
    // Name collisions detected — preserve hierarchy
    return client;
  });
}

/**
 * Checks whether flattening a client's hierarchy would cause method
 * name collisions. Returns true only if all method names across the
 * entire descendant tree are unique.
 */
function canFlattenSafely(
  client: SdkClientType<SdkHttpOperation>,
): boolean {
  const allMethods = collectAllMethods(client);
  const names = new Set<string>();
  for (const method of allMethods) {
    if (names.has(method.name)) {
      return false;
    }
    names.add(method.name);
  }
  return true;
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
