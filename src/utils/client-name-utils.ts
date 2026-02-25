import { namekey } from "@alloy-js/core";
import type { Namekey, NamekeyOptions } from "@alloy-js/core";
import { getClientNameOverride } from "@azure-tools/typespec-client-generator-core";
import type { SdkContext } from "@azure-tools/typespec-client-generator-core";
import type { Type } from "@typespec/compiler";

/**
 * Check if a TCGC entity's name was explicitly set via the @clientName decorator.
 *
 * Uses `getClientNameOverride` from TCGC, which checks the decorator state map
 * on the underlying TypeSpec Type. Works uniformly for operations, properties,
 * parameters, and types since all expose `__raw?: Type`.
 *
 * This is deliberately NOT using `isGeneratedName` — that flag indicates whether
 * a name was auto-generated for anonymous types, not whether @clientName was applied.
 */
export function hasExplicitClientName(
  tcgcContext: SdkContext,
  entity: { __raw?: Type },
): boolean {
  if (!entity.__raw) return false;
  return getClientNameOverride(tcgcContext, entity.__raw) !== undefined;
}

/**
 * Get the appropriate name for a declaration, respecting @clientName overrides.
 *
 * When @clientName was used, returns a namekey with ignoreNamePolicy: true
 * so the naming policy won't transform the user's explicit name.
 *
 * When @clientName was NOT used, returns the plain name string so the naming
 * policy applies case conversion and reserved word escaping normally.
 */
export function getNameForDeclaration(
  tcgcContext: SdkContext,
  entity: { name: string; __raw?: Type },
): string | Namekey<NamekeyOptions> {
  if (hasExplicitClientName(tcgcContext, entity)) {
    return namekey(entity.name, { ignoreNamePolicy: true });
  }
  return entity.name;
}
