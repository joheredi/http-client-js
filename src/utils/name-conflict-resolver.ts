import { tsNameConflictResolver } from "@alloy-js/typescript";

/**
 * Custom name conflict resolver that wraps Alloy's `tsNameConflictResolver` with
 * a guard against false-positive renames.
 *
 * The built-in `tsNameConflictResolver` always renames symbols that have the
 * `LocalImportSymbol` flag, even when there is only one symbol with a given name
 * (i.e., no actual conflict). This causes every imported symbol to receive a `_1`
 * suffix (e.g., `Client_1`, `StreamableMethod_1`), which doesn't match the legacy
 * emitter output.
 *
 * This resolver only delegates to `tsNameConflictResolver` when there are 2 or more
 * symbols with the same name — meaning a genuine naming conflict exists. With a
 * single symbol, no renaming is needed regardless of whether it's a local
 * declaration or an import.
 *
 * @param name - The original name shared by all conflicting symbols.
 * @param symbols - The array of symbols that share this name in the same scope.
 */
export function nameConflictResolver(
  name: string,
  symbols: unknown[],
): void {
  if (symbols.length <= 1) return;
  tsNameConflictResolver(name, symbols as any);
}
