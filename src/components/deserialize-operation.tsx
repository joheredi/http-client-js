import { Children, code, namekey } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkHttpOperation,
  SdkServiceMethod,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import type { HttpStatusCodeRange } from "@typespec/http";
import { useRuntimeLib } from "../context/flavor-context.js";
import {
  deserializeOperationRefkey,
} from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";
import {
  getDeserializationExpression,
  needsTransformation,
} from "./serialization/index.js";
import { getEscapedOperationName } from "../utils/name-policy.js";

/**
 * Props for the {@link DeserializeOperation} component.
 */
export interface DeserializeOperationProps {
  /** The TCGC service method whose deserialize function should be rendered. */
  method: SdkServiceMethod<SdkHttpOperation>;
}

/**
 * Renders a TypeScript function declaration for an operation's deserialize function.
 *
 * The deserialize function (`_xxxDeserialize`) is the response processor for each
 * operation. It is responsible for:
 * - Validating the HTTP response status code against expected status codes
 * - Throwing a `RestError` for unexpected status codes
 * - Deserializing the success response body using model deserializer refkeys
 * - Returning `void` for operations with no response body
 *
 * Error handling follows the legacy emitter's pattern of throwing directly
 * without deserializing error bodies:
 * ```typescript
 * export async function _getItemDeserialize(
 *   result: PathUncheckedResponse,
 * ): Promise<Item> {
 *   const expectedStatuses = ["200"];
 *   if (!expectedStatuses.includes(result.status)) {
 *     throw createRestError(result);
 *   }
 *   return itemDeserializer(result.body);
 * }
 * ```
 *
 * @param props - The component props containing the TCGC service method.
 * @returns An Alloy JSX tree representing the deserialize function declaration.
 */
export function DeserializeOperation(props: DeserializeOperationProps) {
  const runtimeLib = useRuntimeLib();
  const { method } = props;
  const functionName = namekey(`_${getEscapedOperationName(method.name)}Deserialize`, { ignoreNamePolicy: true });
  const returnTypeExpr = getReturnType(method);
  const expectedStatuses = getExpectedStatuses(method);
  const bodyExpression = getResponseBodyExpression(method);
  const errorBlock = buildErrorHandlingBlock(runtimeLib);

  return (
    <FunctionDeclaration
      name={functionName}
      refkey={deserializeOperationRefkey(method)}
      export
      async
      returnType={returnTypeExpr}
      parameters={[{ name: "result", type: runtimeLib.PathUncheckedResponse }]}
    >
      {code`const expectedStatuses = [${expectedStatuses}];`}
      {"\n"}
      {code`if (!expectedStatuses.includes(result.status)) {`}
      {"\n"}
      {errorBlock}
      {"\n"}
      {code`}`}
      {"\n\n"}
      {bodyExpression}
    </FunctionDeclaration>
  );
}

/**
 * Computes the TypeScript return type for the deserialize function.
 *
 * For paging/lropaging operations, uses the HTTP-level response body type
 * which preserves the wrapper collection model (e.g., `_OperationListResult`)
 * rather than the TCGC-normalized element type (e.g., `Operation[]`).
 * This matches the legacy emitter's behavior where deserialize functions
 * return the full wrapper model, and the paging helper extracts items from it.
 *
 * For other operations, uses the method's response type from TCGC directly.
 * If the method has no response type (e.g., a 204 No Content response),
 * the return type is `void`.
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the return type expression.
 */
function getReturnType(method: SdkServiceMethod<SdkHttpOperation>): Children {
  // For paging operations, use the HTTP-level response type which preserves
  // the wrapper model (e.g., _OperationListResult) rather than the
  // TCGC-normalized element type (e.g., Operation[])
  if (isPagingOperation(method)) {
    const wrapperType = getSuccessResponseType(method);
    if (wrapperType) {
      return getTypeExpression(wrapperType);
    }
  }

  const responseType = method.response.type;
  if (!responseType) {
    return "void";
  }
  return getTypeExpression(responseType);
}

/**
 * Builds the expected status codes string for the status code check.
 *
 * Examines the operation's HTTP responses and collects all status codes.
 * For LRO operations (non-GET), additional polling status codes are added
 * (200, 201, 202) to match the legacy emitter's behavior.
 *
 * Status codes are formatted as quoted strings (e.g., `"200", "201"`)
 * because `PathUncheckedResponse.status` is a string.
 *
 * @param method - The TCGC service method.
 * @returns A string of comma-separated quoted status codes.
 */
function getExpectedStatuses(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const operation = method.operation;
  const statusCodes = new Set<string>();

  for (const response of operation.responses) {
    const codes = response.statusCodes;
    if (typeof codes === "number") {
      statusCodes.add(`"${codes}"`);
    } else {
      // HttpStatusCodeRange — expand to individual codes or use range representation
      const range = codes as HttpStatusCodeRange;
      for (let i = range.start; i <= range.end; i++) {
        statusCodes.add(`"${i}"`);
      }
    }
  }

  // LRO operations need additional polling status codes
  if (isLroOperation(method) && operation.verb !== "get") {
    statusCodes.add(`"200"`);
    statusCodes.add(`"202"`);
    if (operation.verb !== "delete") {
      statusCodes.add(`"201"`);
    }
  }

  return Array.from(statusCodes).join(", ");
}

/**
 * Checks whether a service method is a long-running operation (LRO).
 *
 * LRO operations may poll via GET on the same path, so they need additional
 * expected status codes (200, 201, 202) beyond what the TypeSpec defines.
 *
 * @param method - The TCGC service method.
 * @returns `true` if the method is an LRO or LRO+paging operation.
 */
function isLroOperation(
  method: SdkServiceMethod<SdkHttpOperation>,
): boolean {
  return method.kind === "lro" || method.kind === "lropaging";
}

/**
 * Builds the response body expression (return statement) for the deserialize function.
 *
 * Determines how to process the response body based on the response type:
 * - **void (no body)**: Returns `return;`
 * - **Model types**: Calls the model's deserializer function via refkey
 * - **Array of models**: Maps each element through the element deserializer
 * - **Primitive types**: Returns `result.body` directly
 *
 * For paging operations, uses the HTTP-level wrapper model type (e.g.,
 * `_OperationListResult`) so the deserializer processes the full response
 * body including pagination metadata like `nextLink`.
 *
 * This mirrors the legacy emitter's deserialization logic where model types
 * use dedicated deserializer functions and primitives pass through unchanged.
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the return statement.
 */
function getResponseBodyExpression(
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  // For paging operations, use the HTTP-level response type (wrapper model)
  // instead of the TCGC-normalized element type
  const responseType = isPagingOperation(method)
    ? getSuccessResponseType(method) ?? method.response.type
    : method.response.type;

  // Void response — no body to deserialize
  if (!responseType) {
    return code`return;`;
  }

  // For types that need deserialization (models, arrays of models, etc.)
  if (needsTransformation(responseType)) {
    const deserExpr = getDeserializationExpression(responseType, "result.body");
    return code`return ${deserExpr};`;
  }

  // Primitive types — pass through directly
  return code`return result.body;`;
}

/**
 * Builds the error handling block for the deserialize function's error path.
 *
 * Generates `throw createRestError(result)` which creates and throws a RestError
 * for unexpected HTTP status codes. This matches the legacy emitter's pattern
 * of throwing directly without deserializing error response bodies.
 *
 * @param runtimeLib - The runtime library providing `createRestError`.
 * @returns Alloy Children representing the error handling code block.
 */
function buildErrorHandlingBlock(
  runtimeLib: ReturnType<typeof useRuntimeLib>,
): Children {
  return code`  throw ${runtimeLib.createRestError}(result);`;
}

/**
 * Checks whether a service method is a paging operation.
 *
 * Paging operations (both pure paging and LRO+paging) have their
 * `method.response.type` normalized by TCGC to the element type,
 * but the deserialize function needs the full wrapper model type
 * from the HTTP response.
 *
 * @param method - The TCGC service method.
 * @returns `true` if the method is a paging or LRO+paging operation.
 */
function isPagingOperation(
  method: SdkServiceMethod<SdkHttpOperation>,
): boolean {
  return method.kind === "paging" || method.kind === "lropaging";
}

/**
 * Gets the HTTP-level success response body type for an operation.
 *
 * For paging operations, TCGC normalizes `method.response.type` to the element
 * type (e.g., `Operation` from `Operation[]`), but the HTTP-level response
 * preserves the wrapper model (e.g., `_OperationListResult` with `value` and
 * `nextLink` properties). This function retrieves that wrapper type.
 *
 * @param method - The TCGC service method.
 * @returns The SdkType of the first success response body, or undefined.
 */
function getSuccessResponseType(
  method: SdkServiceMethod<SdkHttpOperation>,
): SdkType | undefined {
  for (const response of method.operation.responses) {
    if (response.type) {
      return response.type;
    }
  }
  return undefined;
}
