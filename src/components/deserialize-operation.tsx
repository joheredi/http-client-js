import { Children, code } from "@alloy-js/core";
import { FunctionDeclaration } from "@alloy-js/typescript";
import type {
  SdkHttpOperation,
  SdkHttpResponse,
  SdkServiceMethod,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import type { HttpStatusCodeRange } from "@typespec/http";
import { useRuntimeLib } from "../context/flavor-context.js";
import { deserializeOperationRefkey } from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";
import {
  getDeserializationExpression,
  needsTransformation,
} from "./serialization/index.js";

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
 * - Throwing `createRestError(result)` for unexpected status codes
 * - Deserializing the response body using model deserializer refkeys
 * - Returning `void` for operations with no response body
 *
 * The function follows the legacy emitter's pattern:
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
  const functionName = `_${method.name}Deserialize`;
  const returnTypeExpr = getReturnType(method);
  const expectedStatuses = getExpectedStatuses(method);
  const bodyExpression = getResponseBodyExpression(method);

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
      {code`  throw ${runtimeLib.createRestError}(result);`}
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
 * Uses the method's response type from TCGC. If the method has no response
 * type (e.g., a 204 No Content response), the return type is `void`.
 * Otherwise, the return type is the TypeScript type expression for the
 * response model.
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the return type expression.
 */
function getReturnType(method: SdkServiceMethod<SdkHttpOperation>): Children {
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
 * This mirrors the legacy emitter's deserialization logic where model types
 * use dedicated deserializer functions and primitives pass through unchanged.
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the return statement.
 */
function getResponseBodyExpression(
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  const responseType = method.response.type;

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
