import { Children, code } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkHttpOperation,
  SdkServiceMethod,
  SdkServiceResponseHeader,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import { useEmitterOptions } from "../context/emitter-options-context.js";
import { useRuntimeLib } from "../context/flavor-context.js";
import { deserializeHeadersRefkey } from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";

/**
 * Props for the {@link DeserializeHeaders} and {@link DeserializeExceptionHeaders} components.
 */
export interface DeserializeHeadersProps {
  /** The TCGC service method whose header deserialize function should be rendered. */
  method: SdkServiceMethod<SdkHttpOperation>;
}

/**
 * Renders a `_xxxDeserializeHeaders` function that extracts typed header values
 * from success HTTP responses.
 *
 * This function is only generated when the `include-headers-in-response` emitter
 * option is enabled AND the operation's success responses contain header properties.
 * The generated function reads raw string header values from `result.headers` and
 * converts them to their TypeScript types (Date, boolean, Uint8Array, etc.).
 *
 * Example output:
 * ```typescript
 * export function _getUserDeserializeHeaders(result: PathUncheckedResponse): {
 *   userId?: string;
 *   createdAt?: Date;
 * } {
 *   return {
 *     userId: result.headers["x-user-id"] === undefined || ...
 *     createdAt: result.headers["created-at"] === undefined || ...
 *   };
 * }
 * ```
 *
 * @param props - Component props containing the TCGC service method.
 * @returns An Alloy JSX tree for the header deserialize function, or undefined if not needed.
 */
export function DeserializeHeaders(props: DeserializeHeadersProps) {
  const { includeHeadersInResponse } = useEmitterOptions();
  if (!includeHeadersInResponse) return undefined;

  const runtimeLib = useRuntimeLib();
  const { method } = props;
  const headers = collectSuccessResponseHeaders(method);

  if (headers.length === 0) return undefined;

  const functionName = `_${method.name}DeserializeHeaders`;
  const returnType = buildHeaderReturnType(headers);
  const bodyExpression = buildHeaderReturnExpression(headers);

  return (
    <FunctionDeclaration
      name={functionName}
      refkey={deserializeHeadersRefkey(method)}
      export
      returnType={returnType}
      parameters={[{ name: "result", type: runtimeLib.PathUncheckedResponse }]}
    >
      {bodyExpression}
    </FunctionDeclaration>
  );
}

/**
 * Renders a `_xxxDeserializeExceptionHeaders` function that extracts typed header
 * values from error HTTP responses.
 *
 * Similar to {@link DeserializeHeaders} but operates on exception/error responses.
 * Only generated when `include-headers-in-response` is enabled AND the operation's
 * exception responses contain header properties. Used in the error handling path
 * to attach header data to error details.
 *
 * Example output:
 * ```typescript
 * export function _getWidgetDeserializeExceptionHeaders(result: PathUncheckedResponse): {
 *   errorCode: string;
 * } {
 *   return { errorCode: result.headers["x-ms-error-code"] };
 * }
 * ```
 *
 * @param props - Component props containing the TCGC service method.
 * @returns An Alloy JSX tree for the exception header deserialize function, or undefined if not needed.
 */
export function DeserializeExceptionHeaders(props: DeserializeHeadersProps) {
  const { includeHeadersInResponse } = useEmitterOptions();
  if (!includeHeadersInResponse) return undefined;

  const runtimeLib = useRuntimeLib();
  const { method } = props;
  const headers = collectExceptionResponseHeaders(method);

  if (headers.length === 0) return undefined;

  const functionName = `_${method.name}DeserializeExceptionHeaders`;
  const returnType = buildHeaderReturnType(headers);
  const bodyExpression = buildHeaderReturnExpression(headers);

  return (
    <FunctionDeclaration
      name={functionName}
      export
      returnType={returnType}
      parameters={[{ name: "result", type: runtimeLib.PathUncheckedResponse }]}
    >
      {bodyExpression}
    </FunctionDeclaration>
  );
}

/**
 * Collects all response headers from an operation's success responses.
 *
 * Iterates through `method.operation.responses` (success responses only)
 * and collects their header definitions. Headers are deduplicated by
 * serialized name to avoid duplicates when multiple success status codes
 * share the same headers.
 *
 * @param method - The TCGC service method.
 * @returns Array of unique response header definitions.
 */
export function collectSuccessResponseHeaders(
  method: SdkServiceMethod<SdkHttpOperation>,
): SdkServiceResponseHeader[] {
  const seen = new Set<string>();
  const headers: SdkServiceResponseHeader[] = [];

  for (const response of method.operation.responses) {
    for (const header of response.headers) {
      if (!seen.has(header.serializedName)) {
        seen.add(header.serializedName);
        headers.push(header);
      }
    }
  }

  return headers;
}

/**
 * Collects all response headers from an operation's exception responses.
 *
 * Iterates through `method.operation.exceptions` (error responses only)
 * and collects their header definitions. Headers are deduplicated by
 * serialized name to avoid duplicates when multiple error status codes
 * share the same headers.
 *
 * @param method - The TCGC service method.
 * @returns Array of unique exception response header definitions.
 */
function collectExceptionResponseHeaders(
  method: SdkServiceMethod<SdkHttpOperation>,
): SdkServiceResponseHeader[] {
  const seen = new Set<string>();
  const headers: SdkServiceResponseHeader[] = [];

  for (const exception of method.operation.exceptions) {
    for (const header of exception.headers) {
      if (!seen.has(header.serializedName)) {
        seen.add(header.serializedName);
        headers.push(header);
      }
    }
  }

  return headers;
}

/**
 * Builds the inline return type for a header deserialize function.
 *
 * Generates a TypeScript object type literal with one property per header,
 * using the header's client name and TypeScript type expression. Optional
 * headers are marked with `?`.
 *
 * Example: `{ userId?: string; createdAt?: Date; }`
 *
 * @param headers - The response headers to include in the return type.
 * @returns A string representing the inline object type literal.
 */
export function buildHeaderReturnType(headers: SdkServiceResponseHeader[]): string {
  const properties = headers.map((header) => {
    const typeExpr = getHeaderTypeExpression(header.type);
    const optionalMark = header.optional ? "?" : "";
    return `${header.name}${optionalMark}: ${typeExpr}`;
  });

  return `{ ${properties.join("; ")} }`;
}

/**
 * Builds the return expression (object literal) for a header deserialize function.
 *
 * Each header property is extracted from `result.headers[serializedName]` with
 * appropriate type coercion based on the header's SdkType:
 * - **string**: Direct pass-through (with null check for optional)
 * - **boolean**: `.trim().toLowerCase() === "true"` conversion
 * - **utcDateTime**: `new Date(value)` construction
 * - **bytes**: `stringToUint8Array(value, "base64")` conversion
 * - **constant**: `value as any` cast
 *
 * Optional headers are wrapped in a null/undefined guard that passes through
 * null/undefined values without attempting type conversion.
 *
 * @param headers - The response headers to deserialize.
 * @returns Alloy Children representing the return statement with object literal.
 */
function buildHeaderReturnExpression(
  headers: SdkServiceResponseHeader[],
): Children {
  const properties = headers.map((header) => {
    const headerAccess = `result.headers["${header.serializedName}"]`;
    const valueExpr = buildHeaderValueExpression(header.type, headerAccess, header.optional);
    return `${header.name}: ${valueExpr}`;
  });

  if (properties.length === 1) {
    return code`return { ${properties[0]} };`;
  }

  const formattedProperties = properties.join(",\n");
  return code`return {\n${formattedProperties},\n};`;
}

/**
 * Builds the value extraction expression for a single response header.
 *
 * Applies the appropriate type coercion based on the header's SdkType.
 * For optional or nullable headers, wraps the expression in a null/undefined
 * guard that short-circuits to the raw value when it's null/undefined.
 *
 * @param type - The SdkType of the header value.
 * @param access - The JavaScript expression to access the raw header value (e.g., `result.headers["x-header"]`).
 * @param optional - Whether the header is optional.
 * @returns A string containing the JavaScript expression for the coerced value.
 */
function buildHeaderValueExpression(
  type: SdkType,
  access: string,
  optional: boolean,
): string {
  const coerced = getCoercionExpression(type, access);

  // If the raw value and coerced value are the same (e.g., string → string),
  // still wrap optional headers in a null guard for legacy parity
  if (optional || isNullableType(type)) {
    const nullGuard = `${access} === undefined || ${access} === null\n? ${access}\n: `;
    return `\n${nullGuard}${coerced}`;
  }

  return coerced;
}

/**
 * Generates the type coercion expression for a header value based on its SdkType.
 *
 * This maps the wire format (always a string in HTTP headers) to the TypeScript
 * type. The conversion patterns match the legacy emitter exactly:
 * - boolean: `.trim().toLowerCase() === "true"`
 * - utcDateTime/plainDate: `new Date(value)`
 * - bytes: `stringToUint8Array(value, "base64")`
 * - constant: `value as any`
 * - string/number/other: direct pass-through
 *
 * @param type - The SdkType to convert to.
 * @param access - The JavaScript expression accessing the raw header string.
 * @returns A string with the coercion expression.
 */
function getCoercionExpression(type: SdkType, access: string): string {
  switch (type.kind) {
    case "boolean":
      return `${access}.trim().toLowerCase() === "true"`;

    case "utcDateTime":
    case "plainDate":
      return `new Date(${access})`;

    case "bytes":
      return `typeof ${access} === "string"\n? stringToUint8Array(${access}, "base64")\n: ${access}`;

    case "constant":
    case "enumvalue":
      return `${access} as any`;

    default:
      return access;
  }
}

/**
 * Gets the TypeScript type expression for a response header type.
 *
 * This is a simplified version of `getTypeExpression` that returns plain
 * strings suitable for use in inline object type literals. Response headers
 * use a subset of possible types (scalars, constants).
 *
 * @param type - The SdkType of the header.
 * @returns A string representing the TypeScript type.
 */
function getHeaderTypeExpression(type: SdkType): string {
  switch (type.kind) {
    case "boolean":
      return "boolean";
    case "utcDateTime":
    case "plainDate":
      return "Date";
    case "bytes":
      return "Uint8Array";
    case "constant":
    case "enumvalue":
      if (type.valueType.kind === "string") {
        return `"${type.value}"`;
      }
      return String(type.value);
    default:
      return "string";
  }
}

/**
 * Checks whether a type is nullable (wraps another type in `| null`).
 *
 * @param type - The SdkType to check.
 * @returns True if the type is a nullable wrapper.
 */
function isNullableType(type: SdkType): boolean {
  return type.kind === "nullable";
}
