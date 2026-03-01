import { Children, code } from "@alloy-js/core";
import {
  FunctionDeclaration,
  type ParameterDescriptor,
} from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkHttpOperation,
  SdkLroPagingServiceMethod,
  SdkLroServiceMethod,
  SdkMethodParameter,
  SdkModelPropertyType,
  SdkModelType,
  SdkPagingServiceMethod,
  SdkQueryParameter,
  SdkServiceMethod,
  SdkServiceResponseHeader,
} from "@azure-tools/typespec-client-generator-core";
import { azureCoreLroLib } from "../utils/external-packages.js";
import { useEmitterOptions } from "../context/emitter-options-context.js";
import { useFlavorContext, useRuntimeLib } from "../context/flavor-context.js";
import {
  collectSuccessResponseHeaders,
  buildHeaderReturnType,
} from "./deserialize-headers.js";
import {
  clientContextRefkey,
  deserializeHeadersRefkey,
  deserializeOperationRefkey,
  binaryResponseHelperRefkey,
  operationOptionsRefkey,
  pagingHelperRefkey,
  pollingHelperRefkey,
  publicOperationRefkey,
  sendOperationRefkey,
} from "../utils/refkeys.js";
import {
  getOptionsParamName,
  isRequiredSignatureParameter,
} from "./send-operation.js";
import { getTypeExpression } from "./type-expression.js";
import {
  isReservedOperationName,
  getEscapedParameterName,
} from "../utils/name-policy.js";
import { isBinaryBytesResponse } from "./deserialize-operation.js";

/**
 * Builds the JSDoc string for a public operation function, adding a @fixme
 * warning when the operation name is a reserved word.
 */
function getOperationDoc(
  method: SdkServiceMethod<SdkHttpOperation>,
): string | undefined {
  const fixmeNote = isReservedOperationName(method.name)
    ? ` @fixme ${method.name} is a reserved word that cannot be used as an operation name.\n        Please add @clientName("clientName") or @clientName("<JS-Specific-Name>", "javascript")\n        to the operation to override the generated name.`
    : undefined;

  if (method.doc && fixmeNote) return `${method.doc}\n${fixmeNote}`;
  if (fixmeNote) return fixmeNote;
  return method.doc;
}

/**
 * Props for the {@link PublicOperation} component.
 */
export interface PublicOperationProps {
  /** The TCGC service method whose public operation function should be rendered. */
  method: SdkServiceMethod<SdkHttpOperation>;
  /** The root-level client entity, used for the context type reference. */
  rootClient: SdkClientType<SdkHttpOperation>;
}

/**
 * Renders the public operation function that consumers call directly.
 *
 * The public operation function is the top-level API for each operation.
 * It dispatches to the appropriate pattern based on the method kind:
 *
 * - **basic**: An async function that awaits the send function and returns
 *   the deserialized result. This is the most common pattern.
 * - **lro**: A synchronous function that wraps the send/deserialize with
 *   `getLongRunningPoller()` and returns a `PollerLike`.
 * - **paging**: A synchronous function that wraps the send/deserialize with
 *   `buildPagedAsyncIterator()` and returns a `PagedAsyncIterableIterator`.
 * - **lropaging**: A synchronous function that combines both LRO polling
 *   and paging iteration.
 *
 * Example output for a standard operation:
 * ```typescript
 * export async function getItem(
 *   context: TestingContext,
 *   id: string,
 *   options: GetItemOptionalParams = { requestOptions: {} },
 * ): Promise<Item> {
 *   const result = await _getItemSend(context, id, options);
 *   return _getItemDeserialize(result);
 * }
 * ```
 *
 * @param props - The component props containing the TCGC service method.
 * @returns An Alloy JSX tree representing the public operation function.
 */
export function PublicOperation(props: PublicOperationProps) {
  const { method, rootClient } = props;
  const { flavor } = useFlavorContext();

  // Core flavor does not support Azure-specific LRO/paging patterns.
  // LRO, paging, and LRO+paging operations are rendered as regular async
  // functions that return the deserialized response directly (Promise<T>).
  if (
    flavor === "core" &&
    (method.kind === "lro" ||
      method.kind === "lropaging" ||
      method.kind === "paging")
  ) {
    return <BasicOperation method={method} rootClient={rootClient} />;
  }

  switch (method.kind) {
    case "basic":
      return <BasicOperation method={method} rootClient={rootClient} />;
    case "lro":
      return (
        <LroOperation
          method={method as SdkLroServiceMethod<SdkHttpOperation>}
          rootClient={rootClient}
        />
      );
    case "paging":
      return (
        <PagingOperation
          method={method as SdkPagingServiceMethod<SdkHttpOperation>}
          rootClient={rootClient}
        />
      );
    case "lropaging":
      return (
        <LroPagingOperation
          method={method as SdkLroPagingServiceMethod<SdkHttpOperation>}
          rootClient={rootClient}
        />
      );
  }
}

/**
 * Renders a standard async operation function that awaits send then deserialize.
 *
 * This is the most common operation pattern. The function:
 * 1. Calls the private `_xxxSend` function to build and dispatch the HTTP request
 * 2. Awaits the response
 * 3. Passes the response to `_xxxDeserialize` for status validation and body parsing
 *
 * When `include-headers-in-response` is enabled and the operation has response
 * headers, the function also calls `_xxxDeserializeHeaders` and merges the header
 * values into the return value using spread:
 * ```typescript
 * const result = await _xxxSend(context, options);
 * const headers = _xxxDeserializeHeaders(result);
 * const payload = await _xxxDeserialize(result);
 * return { ...payload, ...headers };
 * ```
 *
 * For void-body responses with headers, validation is performed via deserialize
 * then only the headers object is returned.
 *
 * @param props - The component props containing the TCGC service method.
 * @returns An Alloy JSX tree for the standard async operation function.
 */
function BasicOperation(props: {
  method: SdkServiceMethod<SdkHttpOperation>;
  rootClient: SdkClientType<SdkHttpOperation>;
}) {
  const { method, rootClient } = props;
  const { includeHeadersInResponse } = useEmitterOptions();
  const parameters = buildFunctionParameters(method, rootClient);
  const callArgs = buildCallArguments(method);
  const hasBody = !!method.response.type;

  const headers = includeHeadersInResponse
    ? collectSuccessResponseHeaders(method)
    : [];
  const hasHeaders = headers.length > 0;

  // Check if this operation returns binary bytes (encode="bytes"/"binary").
  // Binary responses use the getBinaryResponse helper to read the HTTP stream
  // as raw bytes instead of the standard `await send()` pattern.
  const isBinaryResponse =
    hasBody && isBinaryBytesResponse(method.response.type!);

  // Build return type: model & headers intersection when both exist
  const returnType = getCompositeReturnType(method, headers);

  // Build function body based on whether we have headers and/or body
  let body: Children;
  if (isBinaryResponse) {
    // Binary response: use getBinaryResponse helper to read the stream
    // without UTF-8 corruption. The send function is NOT awaited — we pass
    // the StreamableMethod directly to getBinaryResponse.
    body = (
      <>
        {code`const streamableMethod = ${sendOperationRefkey(method)}(${callArgs});`}
        {"\n"}
        {code`const result = await ${binaryResponseHelperRefkey("getBinaryResponse")}(streamableMethod);`}
        {"\n"}
        {code`return ${deserializeOperationRefkey(method)}(result);`}
      </>
    );
  } else if (hasHeaders && hasBody) {
    // Merge payload + headers via spread
    body = (
      <>
        {code`const result = await ${sendOperationRefkey(method)}(${callArgs});`}
        {"\n"}
        {code`const headers = ${deserializeHeadersRefkey(method)}(result);`}
        {"\n"}
        {code`const payload = await ${deserializeOperationRefkey(method)}(result);`}
        {"\n"}
        {code`return { ...payload, ...headers };`}
      </>
    );
  } else if (hasHeaders && !hasBody) {
    // Header-only response: validate status then return headers
    body = (
      <>
        {code`const result = await ${sendOperationRefkey(method)}(${callArgs});`}
        {"\n"}
        {code`await ${deserializeOperationRefkey(method)}(result);`}
        {"\n"}
        {code`return { ...${deserializeHeadersRefkey(method)}(result) };`}
      </>
    );
  } else {
    // Standard: no header merging
    body = (
      <>
        {code`const result = await ${sendOperationRefkey(method)}(${callArgs});`}
        {"\n"}
        {code`return ${deserializeOperationRefkey(method)}(result);`}
      </>
    );
  }

  return (
    <FunctionDeclaration
      name={method.name}
      refkey={publicOperationRefkey(method)}
      export
      async
      returnType={returnType}
      parameters={parameters}
      doc={getOperationDoc(method)}
    >
      {body}
    </FunctionDeclaration>
  );
}

/**
 * Renders an LRO (Long Running Operation) function that returns a PollerLike.
 *
 * LRO functions are NOT async — they return a `PollerLike` immediately.
 * The poller manages the polling lifecycle (checking status, extracting
 * the final result) via `getLongRunningPoller()` from the polling helpers.
 *
 * The generated pattern matches the legacy emitter:
 * ```typescript
 * export function createResource(
 *   context: TestingContext,
 *   body: Resource,
 *   options: CreateResourceOptionalParams = { requestOptions: {} },
 * ): PollerLike<OperationState<Resource>, Resource> {
 *   return getLongRunningPoller(context, _createResourceDeserialize, ["200", "201"], {
 *     updateIntervalInMs: options?.updateIntervalInMs,
 *     abortSignal: options?.abortSignal,
 *     getInitialResponse: () => _createResourceSend(context, body, options),
 *     resourceLocationConfig: "azure-async-operation",
 *   }) as PollerLike<OperationState<Resource>, Resource>;
 * }
 * ```
 *
 * @param props - The component props containing the TCGC LRO service method.
 * @returns An Alloy JSX tree for the LRO operation function.
 */
function LroOperation(props: {
  method: SdkLroServiceMethod<SdkHttpOperation>;
  rootClient: SdkClientType<SdkHttpOperation>;
}) {
  const { method, rootClient } = props;
  const parameters = buildFunctionParameters(method, rootClient);
  const innerType = getReturnType(method);
  const callArgs = buildCallArguments(method);
  const expectedStatuses = buildExpectedStatusArray(method);
  const resourceLocationConfig = getResourceLocationConfig(method);

  const returnType = code`${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<${innerType}>, ${innerType}>`;
  const castExpr = code`${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<${innerType}>, ${innerType}>`;

  const resourceConfigPart = resourceLocationConfig
    ? `, resourceLocationConfig: "${resourceLocationConfig}"`
    : "";

  // Include apiVersion in poller options so polling requests carry the correct api-version query param.
  const apiVersionExpr = getApiVersionExpression(method);
  const apiVersionPart = apiVersionExpr
    ? `, apiVersion: ${apiVersionExpr}`
    : "";

  return (
    <FunctionDeclaration
      name={method.name}
      refkey={publicOperationRefkey(method)}
      export
      returnType={returnType}
      parameters={parameters}
      doc={getOperationDoc(method)}
    >
      {code`return ${pollingHelperRefkey("getLongRunningPoller")}(context, ${deserializeOperationRefkey(method)}, ${expectedStatuses}, { updateIntervalInMs: ${getOptionsParamName(method)}?.updateIntervalInMs, abortSignal: ${getOptionsParamName(method)}?.abortSignal, getInitialResponse: () => ${sendOperationRefkey(method)}(${callArgs})${resourceConfigPart}${apiVersionPart} }) as ${castExpr};`}
    </FunctionDeclaration>
  );
}

/**
 * Renders a paging operation function that returns a PagedAsyncIterableIterator.
 *
 * Paging functions are NOT async — they return a `PagedAsyncIterableIterator`
 * immediately. The iterator manages page fetching and element extraction
 * via `buildPagedAsyncIterator()` from the paging helpers.
 *
 * The generated pattern matches the legacy emitter:
 * ```typescript
 * export function listItems(
 *   context: TestingContext,
 *   options: ListItemsOptionalParams = { requestOptions: {} },
 * ): PagedAsyncIterableIterator<Item> {
 *   return buildPagedAsyncIterator(
 *     context,
 *     () => _listItemsSend(context, options),
 *     _listItemsDeserialize,
 *     ["200"],
 *     { itemName: "value", nextLinkName: "nextLink" },
 *   );
 * }
 * ```
 *
 * @param props - The component props containing the TCGC paging service method.
 * @returns An Alloy JSX tree for the paging operation function.
 */
function PagingOperation(props: {
  method: SdkPagingServiceMethod<SdkHttpOperation>;
  rootClient: SdkClientType<SdkHttpOperation>;
}) {
  const { method, rootClient } = props;
  const parameters = buildFunctionParameters(method, rootClient);
  const innerType = getPagingItemType(method);
  const callArgs = buildCallArguments(method);
  const expectedStatuses = buildExpectedStatusArray(method);
  const pagingOptions = buildPagingOptions(method);

  const returnType = code`${pagingHelperRefkey("PagedAsyncIterableIterator")}<${innerType}>`;

  return (
    <FunctionDeclaration
      name={method.name}
      refkey={publicOperationRefkey(method)}
      export
      returnType={returnType}
      parameters={parameters}
      doc={getOperationDoc(method)}
    >
      {code`return ${pagingHelperRefkey("buildPagedAsyncIterator")}(context, () => ${sendOperationRefkey(method)}(${callArgs}), ${deserializeOperationRefkey(method)}, ${expectedStatuses}${pagingOptions});`}
    </FunctionDeclaration>
  );
}

/**
 * Renders an LRO+Paging operation function that combines polling with pagination.
 *
 * This pattern first creates a long-running poller that tracks the async operation,
 * then wraps the result in a paged async iterator. The function is NOT async.
 *
 * The generated pattern matches the legacy emitter:
 * ```typescript
 * export function createAndListItems(context, body, options) {
 *   const initialPagingPoller = getLongRunningPoller(context,
 *     async (result) => result, ["200", "201"], {
 *       updateIntervalInMs: options?.updateIntervalInMs,
 *       abortSignal: options?.abortSignal,
 *       getInitialResponse: () => _createAndListItemsSend(context, body, options),
 *       resourceLocationConfig: "...",
 *     }
 *   ) as PollerLike<OperationState<PathUncheckedResponse>, PathUncheckedResponse>;
 *
 *   return buildPagedAsyncIterator(context, async () => await initialPagingPoller,
 *     _createAndListItemsDeserialize, ["200"], { ... });
 * }
 * ```
 *
 * @param props - The component props containing the TCGC LRO+paging service method.
 * @returns An Alloy JSX tree for the combined LRO+paging operation function.
 */
function LroPagingOperation(props: {
  method: SdkLroPagingServiceMethod<SdkHttpOperation>;
  rootClient: SdkClientType<SdkHttpOperation>;
}) {
  const { method, rootClient } = props;
  const parameters = buildFunctionParameters(method, rootClient);
  const innerType = getPagingItemType(method);
  const callArgs = buildCallArguments(method);
  const expectedStatuses = buildExpectedStatusArray(method);
  const resourceLocationConfig = getResourceLocationConfig(method);
  const pagingOptions = buildPagingOptions(method);

  const returnType = code`${pagingHelperRefkey("PagedAsyncIterableIterator")}<${innerType}>`;
  const pollerCast = code`${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<${useRuntimeLib().PathUncheckedResponse}>, ${useRuntimeLib().PathUncheckedResponse}>`;

  const resourceConfigPart = resourceLocationConfig
    ? `, resourceLocationConfig: "${resourceLocationConfig}"`
    : "";

  // Include apiVersion in poller options so polling requests carry the correct api-version query param.
  const apiVersionExpr = getApiVersionExpression(method);
  const apiVersionPart = apiVersionExpr
    ? `, apiVersion: ${apiVersionExpr}`
    : "";

  return (
    <FunctionDeclaration
      name={method.name}
      refkey={publicOperationRefkey(method)}
      export
      returnType={returnType}
      parameters={parameters}
      doc={getOperationDoc(method)}
    >
      {code`const initialPagingPoller = ${pollingHelperRefkey("getLongRunningPoller")}(context, async (result: ${useRuntimeLib().PathUncheckedResponse}) => result, ${expectedStatuses}, { updateIntervalInMs: ${getOptionsParamName(method)}?.updateIntervalInMs, abortSignal: ${getOptionsParamName(method)}?.abortSignal, getInitialResponse: () => ${sendOperationRefkey(method)}(${callArgs})${resourceConfigPart}${apiVersionPart} }) as ${pollerCast};`}
      {"\n\n"}
      {code`return ${pagingHelperRefkey("buildPagedAsyncIterator")}(context, async () => await initialPagingPoller, ${deserializeOperationRefkey(method)}, ${expectedStatuses}${pagingOptions});`}
    </FunctionDeclaration>
  );
}

// ────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Builds the parameter list for the public operation function signature.
 *
 * The parameter order follows the legacy emitter convention:
 * 1. `context: XxxContext` — the specific client context type
 * 2. Required method parameters (path, required body, required query/header)
 * 3. `options: XxxOptionalParams = { requestOptions: {} }` — optional parameters
 *
 * This matches the send function's parameter list exactly, since the public
 * function forwards all arguments to the send function.
 *
 * @param method - The TCGC service method.
 * @param rootClient - The root-level client entity for the context type reference.
 * @returns An array of Alloy ParameterDescriptor objects.
 */
function buildFunctionParameters(
  method: SdkServiceMethod<SdkHttpOperation>,
  rootClient: SdkClientType<SdkHttpOperation>,
): ParameterDescriptor[] {
  const optionsName = getOptionsParamName(method);
  const params: ParameterDescriptor[] = [
    { name: "context", type: clientContextRefkey(rootClient) },
  ];

  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param, method)) {
      params.push({
        name: param.name,
        type: getTypeExpression(param.type),
      });
    }
  }

  params.push({
    name: optionsName,
    type: operationOptionsRefkey(method),
    default: "{ requestOptions: {} }",
  });

  return params;
}

/**
 * Builds the comma-separated argument string for forwarding to the send function.
 *
 * Since the public operation function has the same parameters as the send function,
 * this constructs a simple forwarding list: `context, param1, param2, options`.
 *
 * @param method - The TCGC service method.
 * @returns A comma-separated string of argument names.
 */
function buildCallArguments(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const optionsName = getOptionsParamName(method);
  const args: string[] = ["context"];

  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param, method)) {
      args.push(getEscapedParameterName(param.name));
    }
  }

  args.push(optionsName);
  return args.join(", ");
}

/**
 * Computes the TypeScript return type for a standard operation.
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
 * Computes the composite return type when response headers should be merged.
 *
 * When the operation has both a model body and response headers, the return
 * type is an expanded inline object type containing all model properties plus
 * any non-duplicate header properties:
 * `{ modelProp1: type1; modelProp2: type2; headerProp: headerType }`.
 *
 * This matches the legacy emitter's behavior where the return type is a flat
 * inline object rather than an intersection type (`ModelType & { headers }`).
 *
 * When the body is not a model type, falls back to an intersection type.
 * When the operation has no body but has headers, the return type is just
 * the inline header object type.
 * When there are no headers, falls back to the standard return type.
 *
 * @param method - The TCGC service method.
 * @param headers - The collected success response headers.
 * @returns Alloy Children representing the composite return type expression.
 */
function getCompositeReturnType(
  method: SdkServiceMethod<SdkHttpOperation>,
  headers: SdkServiceResponseHeader[],
): Children {
  const hasBody = !!method.response.type;
  const hasHeaders = headers.length > 0;

  if (!hasHeaders) {
    return getReturnType(method);
  }

  if (hasBody) {
    const responseType = method.response.type!;
    if (responseType.kind === "model") {
      return buildExpandedCompositeReturnType(responseType, headers);
    }
    // Non-model body: intersection fallback
    const bodyType = getTypeExpression(responseType);
    const headerType = buildHeaderReturnType(headers);
    return code`${bodyType} & ${headerType}`;
  }

  // Header-only response
  return buildHeaderReturnType(headers);
}

/**
 * Builds an expanded inline object type that merges all model properties and
 * response header properties into a single flat object type literal.
 *
 * This matches the legacy emitter behavior where the return type for operations
 * with response headers is an expanded object type
 * (e.g., `{ name: string; email: string; requestId: string }`) rather than an
 * intersection type (e.g., `User & { requestId: string }`).
 *
 * Properties from the model type are listed first (including inherited properties
 * from the base model chain), followed by any response headers not already present
 * in the model. Deduplication is case-insensitive by property name.
 *
 * @param responseType - The response body model type.
 * @param headers - The collected success response headers.
 * @returns Alloy Children representing the expanded inline object type.
 */
function buildExpandedCompositeReturnType(
  responseType: SdkModelType,
  headers: SdkServiceResponseHeader[],
): Children {
  const modelProps = collectAllProperties(responseType);
  const modelPropNames = new Set(modelProps.map((p) => p.name.toLowerCase()));

  // Build property entries as code template Children
  const entries: Children[] = [];

  for (const prop of modelProps) {
    const opt = prop.optional ? "?" : "";
    const typeExpr = getTypeExpression(prop.type);
    entries.push(code`${prop.name}${opt}: ${typeExpr}`);
  }

  // Add non-duplicate headers
  for (const header of headers) {
    if (!modelPropNames.has(header.name.toLowerCase())) {
      const opt = header.optional ? "?" : "";
      const typeExpr = getTypeExpression(header.type);
      entries.push(code`${header.name}${opt}: ${typeExpr}`);
    }
  }

  // Join entries with "; " separators
  const parts: Children[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (i > 0) parts.push("; ");
    parts.push(entries[i]);
  }

  return code`{ ${parts} }`;
}

/**
 * Collects all properties from a model type, including inherited properties
 * from the base model chain.
 *
 * Properties are returned in order: base model properties first (from
 * oldest ancestor to immediate parent), then the model's own properties.
 *
 * @param model - The SDK model type.
 * @returns An array of all model properties.
 */
function collectAllProperties(model: SdkModelType): SdkModelPropertyType[] {
  const result: SdkModelPropertyType[] = [];
  const ancestors: SdkModelType[] = [];
  let current = model.baseModel;
  while (current) {
    ancestors.push(current);
    current = current.baseModel;
  }
  ancestors.reverse();

  for (const ancestor of ancestors) {
    result.push(...ancestor.properties);
  }
  result.push(...model.properties);
  return result;
}

/**
 * Extracts the element type for a paging operation's iterable result.
 *
 * Paging operations return `PagedAsyncIterableIterator<ElementType>`. The
 * element type is determined from the paging metadata's `pageItemsSegments`,
 * which describes the path to the array property in the response model.
 * The element type is the array's element type.
 *
 * Falls back to the full response type if paging metadata is unavailable.
 *
 * @param method - The TCGC paging service method.
 * @returns Alloy Children representing the element type.
 */
export function getPagingItemType(
  method:
    | SdkPagingServiceMethod<SdkHttpOperation>
    | SdkLroPagingServiceMethod<SdkHttpOperation>,
): Children {
  const segments = method.pagingMetadata?.pageItemsSegments;
  if (segments && segments.length > 0) {
    // The last segment's type is the array — get its element type
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.type.kind === "array") {
      return getTypeExpression(lastSegment.type.valueType);
    }
    return getTypeExpression(lastSegment.type);
  }

  // Fallback to full response type
  const responseType = method.response.type;
  if (!responseType) {
    return "void";
  }
  return getTypeExpression(responseType);
}

/**
 * Builds the expected status codes as an array expression for LRO/paging helpers.
 *
 * Collects status codes from the operation's HTTP responses and formats
 * them as a JavaScript array literal: `["200", "201"]`.
 *
 * For LRO operations with non-GET verbs, adds polling status codes (200, 202,
 * and 201 for non-DELETE operations) to match the legacy emitter behavior.
 * LRO polling may call the same path with GET to check operation status,
 * so these additional codes are needed for status validation.
 *
 * @param method - The TCGC service method.
 * @returns A string representing the status code array expression.
 */
function buildExpectedStatusArray(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const statusCodes = new Set<string>();

  for (const response of method.operation.responses) {
    const codes = response.statusCodes;
    if (typeof codes === "number") {
      statusCodes.add(`"${codes}"`);
    } else {
      // HttpStatusCodeRange
      const range = codes as { start: number; end: number };
      for (let i = range.start; i <= range.end; i++) {
        statusCodes.add(`"${i}"`);
      }
    }
  }

  // LRO operations need additional polling status codes.
  // When polling via GET on the same path, the service may return
  // 200 (completed), 202 (still running), or 201 (created).
  if (isLroMethod(method) && method.operation.verb !== "get") {
    statusCodes.add(`"200"`);
    statusCodes.add(`"202"`);
    if (method.operation.verb !== "delete") {
      statusCodes.add(`"201"`);
    }
  }

  return `[${Array.from(statusCodes).join(", ")}]`;
}

/**
 * Checks whether a service method is a long-running operation (LRO).
 *
 * @param method - The TCGC service method.
 * @returns `true` if the method is an LRO or LRO+paging operation.
 */
function isLroMethod(method: SdkServiceMethod<SdkHttpOperation>): boolean {
  return method.kind === "lro" || method.kind === "lropaging";
}

/**
 * Extracts the resource location config from LRO metadata.
 *
 * The `finalStateVia` property indicates how the LRO final result location
 * is determined (e.g., "azure-async-operation", "location", "operation-location").
 * This is passed to `getLongRunningPoller` as `resourceLocationConfig`.
 *
 * @param method - The TCGC LRO service method.
 * @returns The resource location config string, or undefined if not available.
 */
function getResourceLocationConfig(
  method:
    | SdkLroServiceMethod<SdkHttpOperation>
    | SdkLroPagingServiceMethod<SdkHttpOperation>,
): string | undefined {
  return method.lroMetadata?.finalStateVia;
}

/**
 * Builds the paging options object for `buildPagedAsyncIterator`.
 *
 * Extracts paging configuration from the TCGC paging metadata:
 * - `itemName`: path to the items array in the response body
 * - `nextLinkName`: path to the continuation token in the response body
 * - `nextLinkMethod`: HTTP verb for next-page requests (only emitted when not "GET")
 * - `apiVersion`: API version expression for next-page URL injection
 *
 * This matches the legacy emitter behavior which includes full paging
 * configuration in the `buildPagedAsyncIterator` call.
 *
 * @param method - The TCGC paging service method.
 * @returns A string with the paging options object, or empty string if defaults apply.
 */
function buildPagingOptions(
  method:
    | SdkPagingServiceMethod<SdkHttpOperation>
    | SdkLroPagingServiceMethod<SdkHttpOperation>,
): string {
  const parts: string[] = [];

  // Extract item name from pageItemsSegments
  const itemSegments = method.pagingMetadata?.pageItemsSegments;
  if (itemSegments && itemSegments.length > 0) {
    const itemName = itemSegments[itemSegments.length - 1].serializedName;
    if (itemName) {
      parts.push(`itemName: "${itemName}"`);
    }
  }

  // Extract next link name from nextLinkSegments (preferred) or
  // continuationTokenResponseSegments (fallback).
  // nextLinkSegments maps the path to the next-page URL in the response body.
  const nextLinkSegs =
    method.pagingMetadata?.nextLinkSegments ??
    method.pagingMetadata?.continuationTokenResponseSegments;
  if (nextLinkSegs && nextLinkSegs.length > 0) {
    const lastSegment = nextLinkSegs[nextLinkSegs.length - 1];
    if ("serializedName" in lastSegment) {
      parts.push(`nextLinkName: "${lastSegment.serializedName}"`);
    }
  }

  // Extract next link HTTP method — only emit when not "GET" (the default)
  const nextLinkVerb = method.pagingMetadata?.nextLinkVerb;
  if (nextLinkVerb && nextLinkVerb !== "GET") {
    parts.push(`nextLinkMethod: "${nextLinkVerb}"`);
  }

  // Extract API version from the HTTP operation's query parameters.
  // When present, the paging helper appends api-version to next-page URLs.
  const apiVersionExpr = getApiVersionExpression(method);
  if (apiVersionExpr) {
    parts.push(`apiVersion: ${apiVersionExpr}`);
  }

  if (parts.length === 0) return "";
  return `, { ${parts.join(", ")} }`;
}

/**
 * Extracts the API version expression from a service method's HTTP operation
 * query parameters. Looks for a query parameter marked with `isApiVersionParam`
 * and returns a JavaScript expression for accessing its value.
 *
 * For client-level API version params with a default, returns:
 *   `context.apiVersion ?? "2023-12-01"`
 *
 * For client-level API version params without a default, returns:
 *   `context.apiVersion`
 *
 * @param method - The TCGC service method.
 * @returns A JavaScript expression string, or undefined if no API version param exists.
 */
function getApiVersionExpression(
  method: SdkServiceMethod<SdkHttpOperation>,
): string | undefined {
  const queryParams = method.operation.parameters.filter(
    (p): p is SdkQueryParameter => p.kind === "query",
  );
  const apiVersionParam = queryParams.find((p) => p.isApiVersionParam);
  if (!apiVersionParam) return undefined;

  const correspondingParam = apiVersionParam.correspondingMethodParams[0];
  if (!correspondingParam) return undefined;

  if (correspondingParam.kind === "method" && correspondingParam.onClient) {
    // Uses the param's actual name (e.g., "apiVersion" or "version") to match
    // the property name generated on the client context interface.
    const defaultValue = correspondingParam.clientDefaultValue;
    if (defaultValue !== undefined) {
      return `context.${correspondingParam.name} ?? "${defaultValue}"`;
    }
    return `context.${correspondingParam.name}`;
  }

  return undefined;
}
