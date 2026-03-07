import { Children, code, For } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkModelPropertyType,
  SdkModelType,
} from "@azure-tools/typespec-client-generator-core";
import { computeFlattenCollisionMap } from "../../utils/flatten-collision.js";
import { getModelFunctionName } from "../../utils/model-name.js";
import { createNamespaceMetadata } from "../../utils/namespace-qualifier.js";
import {
  flattenSerializerRefkey,
  serializationHelperRefkey,
  serializerRefkey,
  typeRefkey,
  multipartHelperRefkey,
} from "../../utils/refkeys.js";

/**
 * Props for the {@link MultipartSerializer} component.
 */
export interface MultipartSerializerProps {
  /** The TCGC model type used in a multipart/form-data request body. */
  model: SdkModelType;
}

/**
 * Renders a multipart serializer function for a TCGC model type.
 *
 * Unlike the JSON serializer which returns a plain object, the multipart
 * serializer returns an **array of part descriptors** — each element describes
 * one part of the multipart/form-data request body.
 *
 * Part descriptor shapes:
 * - File parts: `createFilePartDescriptor("partName", value, "contentType")`
 * - Non-file parts: `{ name: "partName", body: value }`
 * - Multi (array) parts: spread with `.map()` to produce multiple entries
 * - Optional parts: wrapped in `...(value === undefined ? [] : [descriptor])`
 *
 * The generated function follows the legacy emitter's pattern:
 * ```typescript
 * export function uploadOptionsSerializer(item: UploadOptions): any {
 *   return [
 *     createFilePartDescriptor("file", item["file"], "application/octet-stream"),
 *     ...(item["description"] === undefined
 *       ? []
 *       : [{ name: "description", body: item["description"] }]),
 *   ];
 * }
 * ```
 *
 * The serializer is registered with `serializerRefkey(model)` (same as the
 * JSON serializer) because a model is either used in JSON or multipart context,
 * not both. The send function calls the serializer via the same refkey.
 *
 * Flatten properties are handled using the SA-C25a pattern: instead of
 * expanding nested properties inline, they are serialized as a single part
 * whose body is produced by a flatten helper function that maintains the
 * nested wire structure.
 *
 * @param props - The component props containing the TCGC model type.
 * @returns An Alloy JSX tree representing the multipart serializer function.
 */
export function MultipartSerializer(props: MultipartSerializerProps) {
  const { model } = props;
  const properties = getMultipartProperties(model);

  return (
    <FunctionDeclaration
      name={getModelFunctionName(model, "Serializer")}
      refkey={serializerRefkey(model)}
      export
      returnType="any"
      parameters={[{ name: "item", type: typeRefkey(model) }]}
      metadata={createNamespaceMetadata(model)}
    >
      {code`return [`}
      <For each={properties} comma softline>
        {(prop) =>
          prop.flatten && prop.type.kind === "model"
            ? buildFlattenPartExpression(prop, model)
            : buildPartExpression(prop)
        }
      </For>
      {code`];`}
    </FunctionDeclaration>
  );
}

/**
 * Collects properties from a model that participate in multipart serialization.
 *
 * Handles flattened properties in two ways depending on whether the nested
 * model's properties carry multipart metadata:
 *
 * - **Multipart nested props**: Expanded inline as individual parts, with
 *   collision-aware accessor names from `computeFlattenCollisionMap()`.
 * - **Non-multipart nested props**: Kept as a single flatten property. The
 *   render loop delegates to `buildFlattenPartExpression()` which uses a
 *   flatten helper function to produce a nested wire-format sub-object as
 *   the body of one multipart part.
 *
 * @param model - The TCGC model type.
 * @returns An array of properties for multipart serialization.
 */
function getMultipartProperties(model: SdkModelType): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];
  const collisionMap = computeFlattenCollisionMap(model);

  for (const prop of model.properties) {
    if (prop.flatten && prop.type.kind === "model") {
      const flatModel = prop.type as SdkModelType;
      const hasMultipartMetadata = flatModel.properties.some(
        (p) => p.serializationOptions?.multipart,
      );

      if (hasMultipartMetadata) {
        // Nested properties are individual multipart parts — expand inline
        // with collision-aware naming so accessors match the model interface.
        const renames = collisionMap.get(prop.serializedName);
        for (const nestedProp of flatModel.properties) {
          const renamedName = renames?.get(nestedProp.name);
          result.push({
            ...nestedProp,
            optional: prop.optional ? true : nestedProp.optional,
            ...(renamedName ? { name: renamedName } : {}),
          });
        }
      } else {
        // Non-multipart nested properties — keep as a single part whose body
        // is produced by a flatten helper function (nested wire format).
        result.push(prop);
      }
    } else {
      result.push(prop);
    }
  }

  return result;
}

/**
 * Builds the expression for a single part in the multipart serializer return array.
 *
 * Dispatches to the appropriate expression builder based on the property's
 * multipart metadata:
 * - File + multi → array of file part descriptors via `.map()`
 * - File + single → `createFilePartDescriptor(...)` call
 * - Non-file + multi → array of simple parts via `.map()`
 * - Non-file + single → `{ name, body }` object literal
 *
 * Optional properties are wrapped in conditional spread expressions to
 * exclude undefined values from the parts array.
 *
 * @param prop - The TCGC model property with multipart metadata.
 * @returns Alloy Children representing the part expression.
 */
function buildPartExpression(prop: SdkModelPropertyType): Children {
  const multipart = prop.serializationOptions?.multipart;
  const accessor = `item["${prop.name}"]`;

  // Determine the part name (from multipart metadata or serializedName)
  const partName = multipart?.name ?? prop.serializedName;

  let partExpr: Children;

  if (multipart?.isFilePart) {
    if (multipart.isMulti) {
      partExpr = buildMultiFilePartExpression(
        partName,
        accessor,
        multipart.defaultContentTypes,
      );
    } else {
      partExpr = buildFilePartExpression(
        partName,
        accessor,
        multipart.defaultContentTypes,
      );
    }
  } else if (multipart?.isMulti) {
    partExpr = buildMultiPartExpression(partName, accessor);
  } else {
    partExpr = buildSimplePartExpression(partName, accessor);
  }

  // Wrap optional properties in conditional spread
  if (prop.optional) {
    return code`...(${accessor} === undefined ? [] : [${partExpr}])`;
  }

  return partExpr;
}

/**
 * Builds a `createFilePartDescriptor(...)` call for a single file part.
 *
 * Uses the `createFilePartDescriptor` helper function (referenced via refkey)
 * to create a part descriptor that handles both raw binary values and
 * structured file objects with contents/contentType/filename metadata.
 *
 * @param partName - The wire name of the part.
 * @param accessor - The JavaScript accessor expression for the property value.
 * @param defaultContentTypes - Default content types from TCGC metadata.
 * @returns Alloy Children for the file part descriptor expression.
 */
function buildFilePartExpression(
  partName: string,
  accessor: string,
  defaultContentTypes?: string[],
): Children {
  const contentType = getDefaultContentType(defaultContentTypes);
  const createFn = multipartHelperRefkey("createFilePartDescriptor");

  if (contentType) {
    return code`${createFn}("${partName}", ${accessor}, "${contentType}")`;
  }

  return code`${createFn}("${partName}", ${accessor})`;
}

/**
 * Builds a spread expression for an array of file parts.
 *
 * When a property is marked as `isMulti`, each element in the array becomes
 * a separate file part. Uses `.map()` to transform each element into a
 * file part descriptor.
 *
 * @param partName - The wire name of the part.
 * @param accessor - The JavaScript accessor expression for the array property.
 * @param defaultContentTypes - Default content types from TCGC metadata.
 * @returns Alloy Children for the multi-file part spread expression.
 */
function buildMultiFilePartExpression(
  partName: string,
  accessor: string,
  defaultContentTypes?: string[],
): Children {
  const contentType = getDefaultContentType(defaultContentTypes);
  const createFn = multipartHelperRefkey("createFilePartDescriptor");

  if (contentType) {
    return code`...(${accessor}.map((x: unknown) => ${createFn}("${partName}", x, "${contentType}")))`;
  }

  return code`...(${accessor}.map((x: unknown) => ${createFn}("${partName}", x)))`;
}

/**
 * Builds an object literal expression for a simple (non-file) part.
 *
 * Simple parts are represented as `{ name: "partName", body: value }` objects
 * in the parts array.
 *
 * @param partName - The wire name of the part.
 * @param accessor - The JavaScript accessor expression for the property value.
 * @returns Alloy Children for the simple part object literal.
 */
function buildSimplePartExpression(
  partName: string,
  accessor: string,
): Children {
  return code`{ name: "${partName}", body: ${accessor} }`;
}

/**
 * Builds a spread expression for an array of simple (non-file) parts.
 *
 * When a non-file property is marked as `isMulti`, each element in the array
 * becomes a separate part with the same name. Uses `.map()` to transform
 * each element.
 *
 * @param partName - The wire name of the part.
 * @param accessor - The JavaScript accessor expression for the array property.
 * @returns Alloy Children for the multi-part spread expression.
 */
function buildMultiPartExpression(
  partName: string,
  accessor: string,
): Children {
  return code`...((${accessor}).map((x: unknown) => ({ name: "${partName}", body: x })))`;
}

/**
 * Builds a part expression for a flatten property using a helper function.
 *
 * Instead of expanding the flatten property's nested properties into individual
 * multipart parts, this produces a **single** part whose body is the nested
 * wire-format sub-object returned by the flatten serializer helper. This
 * mirrors the SA-C25a pattern used by the JSON serializer.
 *
 * For optional flatten properties, the expression is guarded with
 * `areAllPropsUndefined(item, [...])` to skip the part entirely when all
 * nested client properties are undefined.
 *
 * @param prop - The flatten property from the TCGC model.
 * @param model - The parent TCGC model (needed for the flatten helper refkey).
 * @returns Alloy Children for the flatten part expression.
 */
function buildFlattenPartExpression(
  prop: SdkModelPropertyType,
  model: SdkModelType,
): Children {
  const helperRef = flattenSerializerRefkey(model, prop.serializedName);
  const partName = prop.serializedName;

  if (prop.optional) {
    const clientNames = getFlattenClientNames(prop);
    const namesList = clientNames.map((n) => `"${n}"`).join(", ");
    return code`...(${serializationHelperRefkey("areAllPropsUndefined")}(item, [${namesList}]) ? [] : [{ name: "${partName}", body: ${helperRef}(item) }])`;
  }

  return code`{ name: "${partName}", body: ${helperRef}(item) }`;
}

/**
 * Collects client-side property names from a flatten property's nested model.
 *
 * These names are used by `areAllPropsUndefined()` to check whether all
 * expanded properties are undefined before serializing the optional flatten part.
 *
 * @param flattenProp - The flatten property whose nested model to inspect.
 * @returns Array of client-side property names.
 */
function getFlattenClientNames(flattenProp: SdkModelPropertyType): string[] {
  const flatModel = flattenProp.type as SdkModelType;
  return flatModel.properties.map((p) => p.name);
}

/**
 * Extracts the primary default content type from TCGC metadata.
 *
 * Returns `undefined` for wildcard content types (`*\/*`) since those
 * indicate no specific content type should be set. Also returns
 * `undefined` when no content types are provided.
 *
 * @param defaultContentTypes - Array of default content type strings from TCGC.
 * @returns The first non-wildcard content type, or undefined.
 */
function getDefaultContentType(
  defaultContentTypes?: string[],
): string | undefined {
  if (!defaultContentTypes || defaultContentTypes.length === 0)
    return undefined;
  const ct = defaultContentTypes[0];
  if (ct === "*/*") return undefined;
  return ct;
}
