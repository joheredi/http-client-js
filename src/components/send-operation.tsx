import { Children, code } from "@alloy-js/core";
import { FunctionDeclaration, type ParameterDescriptor } from "@alloy-js/typescript";
import type {
  SdkBodyParameter,
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkMethodParameter,
  SdkModelPropertyType,
  SdkPathParameter,
  SdkQueryParameter,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useRuntimeLib } from "../context/flavor-context.js";
import {
  operationOptionsRefkey,
  sendOperationRefkey,
} from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";
import { getSerializationExpression, needsTransformation } from "./serialization/index.js";

/**
 * Props for the {@link SendOperation} component.
 */
export interface SendOperationProps {
  /** The TCGC service method whose send function should be rendered. */
  method: SdkServiceMethod<SdkHttpOperation>;
}

/**
 * Renders a TypeScript function declaration for an operation's send function.
 *
 * The send function (`_xxxSend`) is the low-level request builder for each
 * operation. It is responsible for:
 * - Building the URL via RFC 6570 template expansion (`expandUrlTemplate`)
 * - Assembling request headers (Content-Type, Accept, custom headers)
 * - Serializing the request body via model serializer refkeys
 * - Dispatching the request via `context.path(path).{verb}({options})`
 *
 * The function follows the legacy emitter's pattern:
 * ```typescript
 * export function _getItemSend(
 *   context: Client,
 *   id: string,
 *   options: GetItemOptionalParams = { requestOptions: {} },
 * ): StreamableMethod {
 *   const path = expandUrlTemplate("/items/{id}", { id }, {
 *     allowReserved: options?.requestOptions?.skipUrlEncoding,
 *   });
 *   return context.path(path).get({
 *     ...operationOptionsToRequestParameters(options),
 *     headers: { accept: "application/json", ...options.requestOptions?.headers },
 *   });
 * }
 * ```
 *
 * @param props - The component props containing the TCGC service method.
 * @returns An Alloy JSX tree representing the send function declaration.
 */
export function SendOperation(props: SendOperationProps) {
  const runtimeLib = useRuntimeLib();
  const { method } = props;
  const operation = method.operation;
  const functionName = `_${method.name}Send`;
  const parameters = buildFunctionParameters(method);
  const verb = operation.verb;

  const urlTemplateParams = getUrlTemplateParameters(method);
  const hasUrlParams = urlTemplateParams.length > 0;
  const headerParams = getHeaderParameters(operation);
  const bodyParam = operation.bodyParam;
  const acceptHeader = getAcceptHeader(operation);
  const contentTypeExpr = getContentTypeExpression(method);

  // Build function body parts
  const bodyParts: Children[] = [];

  // URL template expansion (when there are path/query params)
  if (hasUrlParams) {
    bodyParts.push(buildUrlTemplateExpansion(method));
  }

  // Build the return statement
  const pathExpr = hasUrlParams ? "path" : `"${operation.uriTemplate}"`;
  bodyParts.push(buildReturnStatement(pathExpr, verb, contentTypeExpr, headerParams, bodyParam, acceptHeader, method));

  return (
    <FunctionDeclaration
      name={functionName}
      refkey={sendOperationRefkey(method)}
      export
      returnType={code`${runtimeLib.StreamableMethod}`}
      parameters={parameters}
    >
      {bodyParts.length > 1 ? bodyParts.map((p, i) => i > 0 ? ["\n", p] : p) : bodyParts}
    </FunctionDeclaration>
  );
}

/**
 * Builds the parameter list for the send function signature.
 *
 * The parameter order follows the legacy emitter convention:
 * 1. `context: Client` — the HTTP client context
 * 2. Required method parameters (path, required body, required query/header)
 * 3. `options: XxxOptionalParams = { requestOptions: {} }` — optional parameters
 *
 * Client-level parameters (onClient=true), auto-generated headers (contentType,
 * accept), and API version parameters are excluded from the function signature
 * since they're managed by the client infrastructure.
 *
 * @param method - The TCGC service method.
 * @returns An array of Alloy ParameterDescriptor objects.
 */
function buildFunctionParameters(
  method: SdkServiceMethod<SdkHttpOperation>,
): ParameterDescriptor[] {
  const runtimeLib = useRuntimeLib();
  const params: ParameterDescriptor[] = [
    { name: "context", type: runtimeLib.Client },
  ];

  // Add required method-level parameters
  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param)) {
      params.push({
        name: param.name,
        type: getTypeExpression(param.type),
      });
    }
  }

  // Add options parameter with default
  params.push({
    name: "options",
    type: operationOptionsRefkey(method),
    default: "{ requestOptions: {} }",
  });

  return params;
}

/**
 * Determines whether a method parameter should appear in the function signature.
 *
 * A parameter appears in the signature if it is:
 * - NOT a client-level parameter (endpoint, credential)
 * - NOT optional (optional params go in the options bag)
 * - NOT an auto-generated header (contentType, accept)
 * - NOT an API version parameter
 * - Does NOT have a clientDefaultValue (those go in options)
 *
 * @param param - The TCGC method parameter to evaluate.
 * @returns `true` if the parameter belongs in the function signature.
 */
export function isRequiredSignatureParameter(param: SdkMethodParameter): boolean {
  if (param.onClient) return false;
  if (param.isApiVersionParam) return false;
  if (isAutoGeneratedHeader(param)) return false;
  if (param.optional || param.clientDefaultValue !== undefined) return false;
  return true;
}

/**
 * Checks whether a parameter is an auto-generated contentType or accept header.
 *
 * TCGC generates synthetic `contentType` and `accept` parameters for HTTP
 * operations. These are managed by the send function infrastructure rather
 * than being exposed to consumers.
 *
 * @param param - The TCGC method parameter to check.
 * @returns `true` if this is an auto-generated contentType or accept parameter.
 */
export function isAutoGeneratedHeader(param: SdkMethodParameter): boolean {
  if (!param.isGeneratedName) return false;
  const name = param.name.toLowerCase();
  return name === "contenttype" || name === "accept";
}

/**
 * Collects all URL template parameters (path + query) and generates their
 * value expressions for the `expandUrlTemplate` call.
 *
 * Path parameters map to their corresponding method parameter name directly.
 * Query parameters map from the method parameter name with an `options?.`
 * prefix if they are optional.
 *
 * @param method - The TCGC service method.
 * @returns An array of URL template parameter entries.
 */
function getUrlTemplateParameters(
  method: SdkServiceMethod<SdkHttpOperation>,
): UrlTemplateParam[] {
  const params: UrlTemplateParam[] = [];
  const operation = method.operation;

  for (const param of operation.parameters) {
    if (param.kind === "path" || param.kind === "query") {
      const valueExpr = getParameterAccessor(param, method);
      params.push({
        serializedName: param.serializedName,
        valueExpression: valueExpr,
      });
    }
  }

  return params;
}

/**
 * Represents a URL template parameter with its wire name and value expression.
 */
interface UrlTemplateParam {
  /** The wire name of the parameter as used in the URI template. */
  serializedName: string;
  /** The JavaScript expression that provides the parameter value. */
  valueExpression: string;
}

/**
 * Generates the JavaScript expression that accesses a parameter value from
 * either the function arguments (for required params) or the options bag
 * (for optional params).
 *
 * Required parameters appear as function arguments, so they are referenced
 * directly by name. Optional parameters live in the options bag, so they
 * use `options?.paramName`.
 *
 * For API version parameters on the client, uses `context.apiVersion`.
 *
 * @param httpParam - The HTTP parameter (path or query).
 * @param method - The parent service method for context.
 * @returns A JavaScript expression string for the parameter value.
 */
function getParameterAccessor(
  httpParam: SdkPathParameter | SdkQueryParameter,
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const correspondingParam = httpParam.correspondingMethodParams[0];
  if (!correspondingParam) return `"${httpParam.serializedName}"`;

  // Client-level params like apiVersion
  if (correspondingParam.kind === "method" && correspondingParam.onClient) {
    if (correspondingParam.isApiVersionParam) {
      return "context.apiVersion";
    }
    return `context["${correspondingParam.name}"]`;
  }

  // Required params are direct function arguments
  const isRequired = isRequiredSignatureParameter(correspondingParam as SdkMethodParameter);
  if (isRequired) {
    return correspondingParam.name;
  }

  // Optional params come from the options bag
  return `options?.${correspondingParam.name}`;
}

/**
 * Builds the `expandUrlTemplate(...)` call expression for URL construction.
 *
 * Generates code like:
 * ```typescript
 * const path = expandUrlTemplate("/items/{id}{?filter}", {
 *   id: id,
 *   filter: options?.filter,
 * }, {
 *   allowReserved: options?.requestOptions?.skipUrlEncoding,
 * });
 * ```
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the path variable declaration.
 */
function buildUrlTemplateExpansion(
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  const operation = method.operation;
  const uriTemplate = operation.uriTemplate;
  const urlParams = getUrlTemplateParameters(method);

  const paramEntries = urlParams
    .map((p) => `"${p.serializedName}": ${p.valueExpression}`)
    .join(", ");

  return code`const path = ${useRuntimeLib().expandUrlTemplate}("${uriTemplate}", { ${paramEntries} }, { allowReserved: options?.requestOptions?.skipUrlEncoding });`;
}

/**
 * Collects header parameters from the HTTP operation that need to be
 * explicitly set in the request options.
 *
 * Auto-generated accept headers are handled separately via `getAcceptHeader`.
 * Content-Type is handled by `getContentTypeExpression`.
 * Only custom headers (user-defined in the TypeSpec) are collected here.
 *
 * @param operation - The TCGC HTTP operation.
 * @returns An array of header parameters to include in the headers object.
 */
function getHeaderParameters(
  operation: SdkHttpOperation,
): SdkHeaderParameter[] {
  return operation.parameters.filter(
    (p): p is SdkHeaderParameter =>
      p.kind === "header" &&
      !isAcceptHeader(p) &&
      !isContentTypeHeader(p),
  );
}

/**
 * Checks whether a header parameter is the Accept header.
 *
 * @param param - The HTTP header parameter to check.
 * @returns `true` if this is the Accept header.
 */
function isAcceptHeader(param: SdkHeaderParameter): boolean {
  return param.serializedName.toLowerCase() === "accept";
}

/**
 * Checks whether a header parameter is the Content-Type header.
 *
 * @param param - The HTTP header parameter to check.
 * @returns `true` if this is the Content-Type header.
 */
function isContentTypeHeader(param: SdkHeaderParameter): boolean {
  return param.serializedName.toLowerCase() === "content-type";
}

/**
 * Determines the Accept header value from the operation's responses.
 *
 * Examines the operation's response content types and returns the appropriate
 * Accept header value. Returns undefined if no specific Accept header is needed.
 *
 * @param operation - The TCGC HTTP operation.
 * @returns The Accept header value string, or undefined.
 */
function getAcceptHeader(operation: SdkHttpOperation): string | undefined {
  const contentTypes = new Set<string>();
  for (const response of operation.responses) {
    if (response.contentTypes) {
      for (const ct of response.contentTypes) {
        contentTypes.add(ct);
      }
    }
  }

  if (contentTypes.size === 0) return undefined;
  return Array.from(contentTypes).join(", ");
}

/**
 * Determines the Content-Type expression for the request.
 *
 * For operations with a body parameter, returns the default content type.
 * For dual-format operations, returns a dynamic expression that uses the
 * options.contentType value.
 *
 * @param method - The TCGC service method.
 * @returns The Content-Type expression string, or undefined for no-body operations.
 */
function getContentTypeExpression(
  method: SdkServiceMethod<SdkHttpOperation>,
): string | undefined {
  const bodyParam = method.operation.bodyParam;
  if (!bodyParam) return undefined;

  return bodyParam.defaultContentType;
}

/**
 * Builds the complete `return context.path(path).verb({...})` statement.
 *
 * This constructs the return statement as a single code template to ensure
 * Alloy manages indentation consistently. All request options (contentType,
 * headers, body) are embedded directly in the template.
 *
 * @param pathExpr - The path expression (literal string or "path" variable).
 * @param verb - The HTTP verb (get, post, put, etc.).
 * @param contentType - The Content-Type expression, or undefined.
 * @param headerParams - Custom header parameters.
 * @param bodyParam - The body parameter, or undefined.
 * @param acceptHeader - The Accept header value, or undefined.
 * @param method - The TCGC service method.
 * @returns Alloy Children for the return statement.
 */
function buildReturnStatement(
  pathExpr: string,
  verb: string,
  contentType: string | undefined,
  headerParams: SdkHeaderParameter[],
  bodyParam: SdkBodyParameter | undefined,
  acceptHeader: string | undefined,
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  // Collect all option lines as strings
  const optionLines: string[] = [];

  if (contentType) {
    optionLines.push(`contentType: "${contentType}"`);
  }

  const headerStr = buildHeaderEntries(headerParams, acceptHeader, method);
  if (headerStr) {
    optionLines.push(`headers: ${headerStr}`);
  }

  // Build body expression (may contain refkeys via code template)
  let bodyExpr: Children | undefined;
  if (bodyParam) {
    bodyExpr = buildBodyExpression(bodyParam, method);
  }

  // Assemble into comma-separated option entries on a single line
  const stringParts = optionLines.map((l) => `, ${l}`).join("");
  const bodyPart = bodyExpr !== undefined ? code`, body: ${bodyExpr}` : "";

  return code`return context.path(${pathExpr}).${verb}({ ...${useRuntimeLib().operationOptionsToRequestParameters}(options)${stringParts}${bodyPart} });`;
}

/**
 * Builds the headers object expression for the request options.
 *
 * Combines explicit headers (accept, custom headers) with the spread of
 * `options.requestOptions?.headers` to allow consumer header overrides.
 *
 * @param headerParams - Custom header parameters.
 * @param acceptHeader - The Accept header value.
 * @param method - The TCGC service method.
 * @returns The headers object expression string, or undefined.
 */
function buildHeaderEntries(
  headerParams: SdkHeaderParameter[],
  acceptHeader: string | undefined,
  method: SdkServiceMethod<SdkHttpOperation>,
): string | undefined {
  const entries: string[] = [];

  if (acceptHeader) {
    entries.push(`accept: "${acceptHeader}"`);
  }

  for (const header of headerParams) {
    const accessor = getHeaderAccessor(header, method);
    entries.push(`"${header.serializedName}": ${accessor}`);
  }

  if (entries.length === 0) return undefined;

  return `{ ${entries.join(", ")}, ...options.requestOptions?.headers }`;
}

/**
 * Generates the value expression for a custom header parameter.
 *
 * Maps the header to its corresponding method parameter and generates
 * the appropriate accessor expression (direct for required, options?.
 * prefix for optional).
 *
 * @param header - The HTTP header parameter.
 * @param method - The parent service method.
 * @returns A JavaScript expression string for the header value.
 */
function getHeaderAccessor(
  header: SdkHeaderParameter,
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const corresponding = header.correspondingMethodParams[0];
  if (!corresponding) return `"${header.serializedName}"`;

  if (corresponding.kind === "method") {
    const isRequired = isRequiredSignatureParameter(corresponding);
    return isRequired ? corresponding.name : `options?.${corresponding.name}`;
  }

  return `options?.${corresponding.name}`;
}

/**
 * Determines whether a body parameter is spread from a model/alias.
 *
 * Spread bodies have their model properties flattened into individual method
 * parameters rather than a single body argument. This occurs when TypeSpec uses
 * the `...Model` syntax to spread model properties into operation parameters.
 *
 * Detection logic (mirrors legacy emitter's `isSpreadBodyParameter`):
 * - Multiple corresponding method params → definitely spread
 * - Single corresponding method param with a different type → spread alias
 *
 * @param bodyParam - The TCGC body parameter to check.
 * @returns `true` if the body parameter is spread.
 */
function isSpreadBody(bodyParam: SdkBodyParameter): boolean {
  const params = bodyParam.correspondingMethodParams;
  if (params.length > 1) return true;
  if (params.length === 1 && params[0].type !== bodyParam.type) return true;
  return false;
}

/**
 * Builds the body expression for the request options.
 *
 * Handles two cases:
 * 1. **Direct body**: Calls the model's serializer function via refkey
 *    (e.g., `body: itemSerializer(body)`)
 * 2. **Spread body**: Constructs an inline object literal with per-property
 *    serialization (e.g., `body: { prop1: prop1, prop2: prop2.toISOString() }`)
 *
 * Spread bodies occur when TypeSpec uses `...Model` or `...Alias` syntax to
 * flatten model properties into individual operation parameters. Since the
 * anonymous spread model has no declared serializer function, properties must
 * be serialized individually in an inline object.
 *
 * @param bodyParam - The TCGC body parameter.
 * @param method - The parent service method.
 * @returns Alloy Children representing the body expression.
 */
function buildBodyExpression(
  bodyParam: SdkBodyParameter,
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  // Spread bodies must be handled as inline objects
  if (isSpreadBody(bodyParam)) {
    return buildSpreadBodyExpression(bodyParam, method);
  }

  const accessor = getBodyAccessor(bodyParam, method);
  const bodyType = bodyParam.type;

  // For model types that need serialization
  if (needsTransformation(bodyType)) {
    const serExpr = getSerializationExpression(bodyType, accessor);
    // Wrap with null check for optional bodies
    if (bodyParam.optional) {
      return code`!${accessor} ? ${accessor} : ${serExpr}`;
    }
    return serExpr;
  }

  return accessor;
}

/**
 * Builds an inline object literal for a spread body parameter.
 *
 * When operation parameters are spread from a model/alias, the body is not
 * a single argument but a collection of individual method parameters that
 * must be assembled into a JSON object. Each property is individually
 * serialized based on its type (dates → toISOString, models → serializer call,
 * etc.) and mapped to its wire-format name via `serializedName`.
 *
 * For example, given `...Foo` where Foo has `{ name: string; date: utcDateTime }`:
 * ```typescript
 * body: { name: name, date: date.toISOString() }
 * ```
 *
 * @param bodyParam - The spread body parameter.
 * @param method - The parent service method.
 * @returns Alloy Children representing the inline body object.
 */
function buildSpreadBodyExpression(
  bodyParam: SdkBodyParameter,
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  const bodyType = bodyParam.type;

  // For non-model spread types, fall back to simple accessor
  if (bodyType.kind !== "model") {
    return getBodyAccessor(bodyParam, method);
  }

  const properties = bodyType.properties;
  const parts: Children[] = [];

  for (const prop of properties) {
    const accessor = getSpreadPropertyAccessor(prop, method);
    let valueExpr: Children;

    if (needsTransformation(prop.type)) {
      const serExpr = getSerializationExpression(prop.type, accessor);
      // Null guard for optional/nullable properties that need transformation
      const isNullable = prop.type.kind === "nullable" || prop.optional;
      if (isNullable) {
        valueExpr = code`!${accessor} ? ${accessor} : ${serExpr}`;
      } else {
        valueExpr = serExpr;
      }
    } else {
      valueExpr = accessor;
    }

    if (parts.length > 0) {
      parts.push(", ");
    }
    parts.push(code`"${prop.serializedName}": ${valueExpr}`);
  }

  return code`{ ${parts} }`;
}

/**
 * Determines the accessor expression for a property within a spread body.
 *
 * Maps a body model property to its corresponding method parameter. Required
 * parameters are direct function arguments (accessed by name); optional
 * parameters are in the options bag (accessed as `options?.name`).
 *
 * @param prop - The body model property.
 * @param method - The parent service method for parameter lookup.
 * @returns A JavaScript expression string for accessing the property value.
 */
function getSpreadPropertyAccessor(
  prop: SdkModelPropertyType,
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const methodParam = method.parameters.find((p) => p.name === prop.name);
  if (methodParam && isRequiredSignatureParameter(methodParam)) {
    return prop.name;
  }
  return `options?.${prop.name}`;
}

/**
 * Generates the accessor expression for the body parameter.
 *
 * The body parameter can come from a direct method parameter (required body)
 * or from the options bag (optional body).
 *
 * @param bodyParam - The TCGC body parameter.
 * @param method - The parent service method.
 * @returns A JavaScript expression string for accessing the body value.
 */
function getBodyAccessor(
  bodyParam: SdkBodyParameter,
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const corresponding = bodyParam.correspondingMethodParams[0];
  if (!corresponding) return "body";

  if (corresponding.kind === "method") {
    const isRequired = isRequiredSignatureParameter(corresponding);
    return isRequired ? corresponding.name : `options?.${corresponding.name}`;
  }

  return corresponding.name;
}
