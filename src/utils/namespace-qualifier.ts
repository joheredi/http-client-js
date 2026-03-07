import type {
  SdkEnumType,
  SdkModelType,
  SdkUnionType,
} from "@azure-tools/typespec-client-generator-core";

/**
 * Metadata key for TCGC namespace on Alloy output symbols.
 *
 * When declaration components attach this key to their `metadata` prop,
 * the custom conflict resolver can inspect it to derive namespace-qualified
 * names (e.g., `NamespaceAFoo` instead of `Foo_1`).
 */
export const NAMESPACE_METADATA_KEY = "tcgcNamespace";

/**
 * TCGC types whose declarations may carry namespace metadata for
 * conflict resolution.
 */
export type NamespacedSdkType = SdkModelType | SdkEnumType | SdkUnionType;

/**
 * Creates the metadata record to pass to an Alloy declaration component's
 * `metadata` prop so the custom conflict resolver can use namespace-qualified
 * names instead of numbered suffixes.
 *
 * Returns `undefined` when the namespace is empty or missing, which means
 * no metadata is added and the resolver will fall back to its default
 * behavior.
 *
 * @param type - A TCGC type that has a `namespace` field.
 * @returns A metadata record, or `undefined` if no namespace is available.
 */
export function createNamespaceMetadata(
  type: NamespacedSdkType,
): Record<string, unknown> | undefined {
  const ns = type.namespace;
  if (!ns) return undefined;
  return { [NAMESPACE_METADATA_KEY]: ns };
}

/**
 * Computes the shortest unique PascalCase prefix for each namespace in a
 * group of conflicting symbols, so that prepending the prefix to the shared
 * base name disambiguates all entries.
 *
 * Algorithm:
 * 1. Split each namespace into dot-separated segments.
 * 2. Starting from the rightmost segment, check whether that suffix alone
 *    uniquely identifies every namespace in the group.
 * 3. If not, include one more segment from the left and repeat.
 * 4. Return the concatenated suffix segments in PascalCase.
 *
 * @example
 * computeNamespacePrefixes(["MyService.NamespaceA", "MyService.NamespaceB"])
 * // → ["NamespaceA", "NamespaceB"]
 *
 * computeNamespacePrefixes(["MyService.Group1.Sub1", "MyService.Group1.Sub2"])
 * // → ["Sub1", "Sub2"]
 *
 * computeNamespacePrefixes(["MyService.Group1.Sub", "MyService.Group2.Sub"])
 * // → ["Group1Sub", "Group2Sub"]
 *
 * @param namespaces - Array of TCGC namespace strings.
 * @returns Array of PascalCase prefix strings, one per input namespace.
 */
export function computeNamespacePrefixes(namespaces: string[]): string[] {
  if (namespaces.length <= 1) return namespaces.map(() => "");

  const segmentArrays = namespaces.map((ns) => ns.split("."));
  const maxDepth = Math.max(...segmentArrays.map((s) => s.length));

  for (let depth = 1; depth <= maxDepth; depth++) {
    const suffixes = segmentArrays.map((segments) =>
      segments.slice(Math.max(0, segments.length - depth)).join(""),
    );
    if (new Set(suffixes).size === suffixes.length) {
      return suffixes;
    }
  }

  // Identical namespaces — fall back to full concatenation
  return segmentArrays.map((segments) => segments.join(""));
}

/**
 * Prepends a PascalCase namespace prefix to a symbol name, preserving
 * the original casing convention.
 *
 * - PascalCase name (`"Foo"`) + prefix `"NamespaceA"` → `"NamespaceAFoo"`
 * - camelCase name (`"fooSerializer"`) + prefix `"NamespaceA"` → `"namespaceAFooSerializer"`
 *
 * @param name - The current (possibly post-policy) symbol name.
 * @param prefix - The PascalCase namespace prefix.
 * @returns The qualified name with the prefix prepended.
 */
export function applyNamespacePrefix(name: string, prefix: string): string {
  if (!prefix || !name) return name;

  const startsLower =
    name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase();

  if (startsLower) {
    // camelCase: lowercase the prefix, capitalize the original first char
    const lowerPrefix = prefix[0].toLowerCase() + prefix.slice(1);
    const capitalizedName = name[0].toUpperCase() + name.slice(1);
    return lowerPrefix + capitalizedName;
  }

  // PascalCase: direct concatenation
  return prefix + name;
}
