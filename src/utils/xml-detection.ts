import type { SdkModelType, SdkType } from "@azure-tools/typespec-client-generator-core";

/**
 * Checks whether a model type requires XML serialization by inspecting
 * TCGC's `serializationOptions.xml` on the model itself and its properties.
 *
 * This mirrors the legacy emitter's detection logic. TCGC populates
 * `serializationOptions.xml` when `@Xml.name` or other XML decorators are
 * used, regardless of the operation's content type. This is more reliable
 * than checking `UsageFlags.Xml`, which is only set when the operation
 * explicitly uses `application/xml` content type.
 *
 * @param type - An SDK type to check for XML serialization metadata
 * @returns `true` if the type is a model with XML serialization options
 */
export function hasXmlSerialization(type: SdkType): boolean {
  if (type.kind !== "model") {
    return false;
  }

  // Check if the model itself has XML serialization options
  if (type.serializationOptions?.xml) {
    return true;
  }

  // Check if any property has XML serialization options
  return (
    type.properties?.some((p) => p.serializationOptions?.xml) ?? false
  );
}
