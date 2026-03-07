import { tsNameConflictResolver } from "@alloy-js/typescript";
import {
  NAMESPACE_METADATA_KEY,
  applyNamespacePrefix,
  computeNamespacePrefixes,
} from "./namespace-qualifier.js";

interface SymbolLike {
  name: string;
  originalName: string;
  metadata: Record<string, unknown>;
}

/**
 * Custom name conflict resolver that attempts namespace-qualified renaming
 * before falling back to Alloy's numeric-suffix `tsNameConflictResolver`.
 *
 * When two or more symbols share a name and carry TCGC namespace metadata,
 * the resolver computes the shortest unique namespace prefix for each and
 * prepends it to the symbol name (e.g., `Foo` → `NamespaceAFoo`). Symbols
 * without namespace metadata, or those that still conflict after
 * qualification, are delegated to `tsNameConflictResolver`.
 *
 * @param name - The original name shared by all conflicting symbols.
 * @param symbols - The array of symbols that share this name in the same scope.
 */
export function nameConflictResolver(name: string, symbols: unknown[]): void {
  if (symbols.length <= 1) return;

  const syms = symbols as SymbolLike[];

  // Partition into symbols with and without namespace metadata
  const withNs: { sym: SymbolLike; ns: string }[] = [];
  const withoutNs: SymbolLike[] = [];

  for (const sym of syms) {
    const ns = sym.metadata?.[NAMESPACE_METADATA_KEY];
    if (typeof ns === "string" && ns) {
      withNs.push({ sym, ns });
    } else {
      withoutNs.push(sym);
    }
  }

  // Namespace-qualify when 2+ symbols have distinct namespaces
  const namespaces = withNs.map((e) => e.ns);
  const hasDistinctNamespaces = new Set(namespaces).size >= 2;

  if (withNs.length >= 2 && hasDistinctNamespaces) {
    const prefixes = computeNamespacePrefixes(namespaces);
    for (let i = 0; i < withNs.length; i++) {
      withNs[i].sym.name = applyNamespacePrefix(
        withNs[i].sym.name,
        prefixes[i],
      );
    }
  }

  // Group all symbols by their (possibly updated) name to find remaining conflicts
  const groups = new Map<string, SymbolLike[]>();
  for (const sym of syms) {
    let group = groups.get(sym.name);
    if (!group) {
      group = [];
      groups.set(sym.name, group);
    }
    group.push(sym);
  }

  // Delegate still-conflicting groups to the fallback resolver
  for (const [groupName, groupSymbols] of groups) {
    if (groupSymbols.length > 1) {
      tsNameConflictResolver(groupName, groupSymbols as any);
    }
  }
}
