import type { SdkType } from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { isAzureCoreErrorType } from "./azure-core-error-types.js";
import { hasXmlSerialization } from "./xml-detection.js";

/**
 * Determines whether a type has a deserializer declaration rendered in the output.
 *
 * This is the single source of truth for "will this type have a `<JsonDeserializer>`
 * or `<JsonUnionDeserializer>` component rendered?" All predicates that need to know
 * whether a deserializer refkey will resolve should delegate to this function.
 *
 * The conditions here must exactly mirror the filtering logic in `model-files.tsx`
 * that decides which models/unions get deserializer components.
 *
 * @param type - The SDK type to check.
 * @returns True if the type will have a deserializer declaration in the render tree.
 */
export function typeHasDeserializerDeclaration(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      if (isAzureCoreErrorType(type)) return false;
      return (
        (type.usage & UsageFlags.Output) !== 0 ||
        (type.usage & UsageFlags.Exception) !== 0
      );
    case "union":
      return !!(
        type.name &&
        ((type.usage & UsageFlags.Output) !== 0 ||
          (type.usage & UsageFlags.Exception) !== 0)
      );
    case "nullable":
      return typeHasDeserializerDeclaration(type.type);
    default:
      return false;
  }
}

/**
 * Determines whether a type has a serializer declaration rendered in the output.
 *
 * This is the single source of truth for "will this type have a `<JsonSerializer>`
 * or `<JsonUnionSerializer>` component rendered?" All predicates that need to know
 * whether a serializer refkey will resolve should delegate to this function.
 *
 * The conditions here must exactly mirror the filtering logic in `model-files.tsx`
 * that decides which models/unions get serializer components.
 *
 * @param type - The SDK type to check.
 * @returns True if the type will have a serializer declaration in the render tree.
 */
export function typeHasSerializerDeclaration(type: SdkType): boolean {
  switch (type.kind) {
    case "model":
      if (isAzureCoreErrorType(type)) return false;
      // XML-only models get XmlObjectSerializer (xmlObjectSerializerRefkey), not
      // JsonSerializer (serializerRefkey). Returning true here would cause callers
      // to reference serializerRefkey(model) which is never declared → unresolved symbol.
      if (hasXmlSerialization(type)) return false;
      return (type.usage & UsageFlags.Input) !== 0;
    case "union":
      return !!(
        type.name &&
        !type.isGeneratedName &&
        (type.usage & UsageFlags.Input) !== 0
      );
    case "nullable":
      return typeHasSerializerDeclaration(type.type);
    default:
      return false;
  }
}
