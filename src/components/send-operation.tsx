import { Children, code, namekey } from "@alloy-js/core";
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
  serializationHelperRefkey,
} from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";
import { getSerializationExpression, needsTransformation } from "./serialization/index.js";
import { getEscapedOperationName, getEscapedParameterName } from "../utils/name-policy.js";

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
  const functionName = namekey(`_${getEscapedOperationName(method.name)}Send`, { ignoreNamePolicy: true });
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
 * Determines the name for the optional parameters bag in the function signature.
 *
 * Normally the options bag is named "options". However, when a required method
 * parameter is already named "options" (e.g., when @@override groups parameters
 * into a model called "options"), we rename the bag to "optionalParams" to
 * avoid name conflicts, matching the legacy emitter's behavior.
 *
 * @param method - The TCGC service method.
 * @returns "optionalParams" if there is a naming conflict, "options" otherwise.
 */
export function getOptionsParamName(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const hasConflict = method.parameters.some(
    (p) => isRequiredSignatureParameter(p) && p.name === "options",
  );
  return hasConflict ? "optionalParams" : "options";
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
  const optionsName = getOptionsParamName(method);
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
    name: optionsName,
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
      const wrappedExpr =
        param.kind === "query"
          ? wrapWithCollectionFormat(valueExpr, param.collectionFormat)
          : valueExpr;
      // Query parameter keys must be percent-encoded to match the URI template
      // variable names that TCGC produces (e.g., `{?api%2Dversion}` needs key
      // `"api%2Dversion"`). Path parameter keys are NOT encoded because their
      // template variables use the plain name (e.g., `{key-name}`).
      const key =
        param.kind === "query"
          ? escapeUriTemplateParamName(param.serializedName)
          : param.serializedName;
      params.push({
        serializedName: key,
        valueExpression: wrappedExpr,
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
  /** The JavaScript expression that provides the parameter value. May be a code template with refkeys when collection format encoding is applied. */
  valueExpression: string | Children;
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
 * When `@@override` groups parameters into a model, the HTTP param's
 * `correspondingMethodParams[0]` is a model property (kind: "property")
 * rather than a method parameter (kind: "method"). In that case, we use
 * `methodParameterSegments` to traverse from the method parameter through
 * the model property with dot notation (e.g., `options.param1`).
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
      // When the apiVersion has a default value (from @versioned enum), generate
      // a nullish coalescing fallback to match legacy behavior:
      //   context.apiVersion ?? "2022-05-15-preview"
      const defaultValue = correspondingParam.clientDefaultValue;
      if (defaultValue !== undefined) {
        return `context.apiVersion ?? "${defaultValue}"`;
      }
      return "context.apiVersion";
    }
    return `context["${correspondingParam.name}"]`;
  }

  // Model property — the param is accessed via a model parameter (@@override grouping)
  if (correspondingParam.kind === "property") {
    return resolveModelPropertyAccessor(httpParam, method);
  }

  // Required params are direct function arguments
  const isRequired = isRequiredSignatureParameter(correspondingParam as SdkMethodParameter);
  if (isRequired) {
    return getEscapedParameterName(correspondingParam.name);
  }

  // Optional params come from the options bag
  const optionsName = getOptionsParamName(method);
  return `${optionsName}?.${correspondingParam.name}`;
}

/**
 * Resolves the accessor expression for an HTTP parameter that maps to a
 * model property via `@@override` parameter grouping.
 *
 * Uses `methodParameterSegments` to build a dot-notation path from the
 * method parameter to the nested property (e.g., `options.param1`).
 *
 * @param httpParam - The HTTP parameter with model property correspondence.
 * @param method - The parent service method.
 * @returns A dot-notation accessor string.
 */
function resolveModelPropertyAccessor(
  httpParam: SdkPathParameter | SdkQueryParameter | SdkHeaderParameter,
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const segments = httpParam.methodParameterSegments;
  if (segments && segments.length > 0 && segments[0].length >= 2) {
    // segments[0] = [methodParam, modelProperty, ...]
    const parts = segments[0].map((s) => s.name);
    return parts.join(".");
  }

  // Fallback: try to find the parent method parameter by scanning models
  const prop = httpParam.correspondingMethodParams[0];
  for (const p of method.parameters) {
    if (p.type.kind === "model") {
      for (const modelProp of p.type.properties) {
        if (modelProp === prop) {
          return `${p.name}.${prop.name}`;
        }
      }
    }
  }

  return prop.name;
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

  // Build param entries as Children array to support both plain strings and
  // code templates with refkeys (needed when collection format helpers are used).
  const paramEntries: Children[] = urlParams.map((p, i) => {
    const sep = i > 0 ? ", " : "";
    return code`${sep}"${p.serializedName}": ${p.valueExpression}`;
  });

  return code`const path = ${useRuntimeLib().expandUrlTemplate}("${uriTemplate}", { ${paramEntries} }, { allowReserved: ${getOptionsParamName(method)}?.requestOptions?.skipUrlEncoding });`;
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
  // Collect all option parts as Children (some may contain refkeys)
  const optionParts: Children[] = [];

  if (contentType) {
    optionParts.push(`, contentType: "${contentType}"`);
  }

  const headerExpr = buildHeaderEntries(headerParams, acceptHeader, method);
  if (headerExpr) {
    optionParts.push(code`, headers: ${headerExpr}`);
  }

  // Build body expression (may contain refkeys via code template)
  if (bodyParam) {
    const bodyExpr = buildBodyExpression(bodyParam, method);
    optionParts.push(code`, body: ${bodyExpr}`);
  }

  const optionsName = getOptionsParamName(method);
  return code`return context.path(${pathExpr}).${verb}({ ...${useRuntimeLib().operationOptionsToRequestParameters}(${optionsName})${optionParts} });`;
}

/**
 * Builds the headers object expression for the request options.
 *
 * Combines explicit headers (accept, custom headers) with the spread of
 * `options.requestOptions?.headers` to allow consumer header overrides.
 * When a header parameter has a `collectionFormat` (e.g., CSV for array
 * headers), wraps the value with the appropriate collection builder helper.
 *
 * @param headerParams - Custom header parameters.
 * @param acceptHeader - The Accept header value.
 * @param method - The TCGC service method.
 * @returns The headers expression as Children (to support refkey interpolation), or undefined.
 */
function buildHeaderEntries(
  headerParams: SdkHeaderParameter[],
  acceptHeader: string | undefined,
  method: SdkServiceMethod<SdkHttpOperation>,
): Children | undefined {
  const entries: Children[] = [];

  if (acceptHeader) {
    entries.push(`accept: "${acceptHeader}"`);
  }

  for (const header of headerParams) {
    const accessor = getHeaderAccessor(header, method);
    // Apply date encoding for Date-typed headers (e.g., utcDateTime → toUTCString),
    // or collection format wrapping for array headers (e.g., CSV).
    const encodedAccessor = applyHeaderDateEncoding(accessor, header);
    const wrappedAccessor = encodedAccessor !== accessor
      ? encodedAccessor
      : wrapWithCollectionFormat(accessor, header.collectionFormat);
    entries.push(code`"${header.serializedName}": ${wrappedAccessor}`);
  }

  if (entries.length === 0) return undefined;

  const optionsName = getOptionsParamName(method);
  return code`{ ${entries.map((e, i) => (i > 0 ? code`, ${e}` : e))}, ...${optionsName}.requestOptions?.headers }`;
}

/**
 * Generates the value expression for a custom header parameter.
 *
 * Maps the header to its corresponding method parameter and generates
 * the appropriate accessor expression (direct for required, options bag
 * prefix for optional). When the header maps to a model property via
 * `@@override` grouping, resolves through the model parameter.
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

  // Model property — accessed via a model parameter (@@override grouping)
  if (corresponding.kind === "property") {
    return resolveModelPropertyAccessor(header, method);
  }

  if (corresponding.kind === "method") {
    const isRequired = isRequiredSignatureParameter(corresponding);
    const optionsName = getOptionsParamName(method);
    return isRequired ? getEscapedParameterName(corresponding.name) : `${optionsName}?.${corresponding.name}`;
  }

  // Exhaustive - correspondingMethodParams only contains "method" or "property" kinds
  return `"${header.serializedName}"`;
}

/**
 * Applies date encoding to a header parameter value when the type is a
 * date/datetime scalar.
 *
 * HTTP headers are strings, so `Date` values must be serialized before
 * being set as a header value. TCGC sets the encoding on the type:
 * - `utcDateTime` with `rfc7231` encoding → `.toUTCString()` (HTTP-date format)
 * - `utcDateTime` with `rfc3339` encoding → `.toISOString()` (ISO 8601)
 * - `utcDateTime` with `unixTimestamp` encoding → integer seconds
 * - `plainDate` → `.toISOString().split("T")[0]`
 *
 * For optional headers, a null guard is added so encoding is only applied
 * when the value is defined (prevents calling methods on `undefined`).
 *
 * Non-date types are returned unchanged — they don't need encoding here.
 *
 * @param accessor - The JavaScript expression that accesses the header value.
 * @param header - The TCGC header parameter (carries type and optionality info).
 * @returns The encoded expression as Alloy Children, or the original accessor string if no encoding is needed.
 */
function applyHeaderDateEncoding(
  accessor: string,
  header: SdkHeaderParameter,
): Children {
  const type = header.type.kind === "nullable" ? header.type.type : header.type;

  // Only encode date/datetime scalar types
  if (type.kind !== "utcDateTime" && type.kind !== "plainDate") {
    return accessor;
  }

  const encoded = getSerializationExpression(type, accessor);

  // Wrap optional or nullable headers with null guard to avoid calling methods on undefined
  if (header.optional || header.type.kind === "nullable") {
    return code`${accessor} !== undefined ? ${encoded} : undefined`;
  }

  return encoded;
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
    return getEscapedParameterName(prop.name);
  }
  const optionsName = getOptionsParamName(method);
  return `${optionsName}?.${prop.name}`;
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
    const optionsName = getOptionsParamName(method);
    return isRequired ? getEscapedParameterName(corresponding.name) : `${optionsName}?.${corresponding.name}`;
  }

  return getEscapedParameterName(corresponding.name);
}

/**
 * Wraps a parameter accessor expression with a collection format builder
 * helper when the parameter specifies a non-default collection format.
 *
 * Query parameters with `collectionFormat` of "pipes", "ssv", or "tsv"
 * need pre-encoding because `expandUrlTemplate` (RFC 6570) only supports
 * comma-separated arrays natively. Header parameters with `collectionFormat`
 * "csv" need `buildCsvCollection` because HTTP headers are strings, not arrays.
 *
 * The "multi" format is handled by RFC 6570's explode modifier (`{?param*}`)
 * and the default "csv" for query params is already comma-joined by RFC 6570,
 * so neither needs wrapping.
 *
 * @param accessor - The JavaScript expression that accesses the parameter value.
 * @param collectionFormat - The TCGC collection format, or undefined.
 * @returns The original accessor if no wrapping is needed, or a `code` template
 *   containing a refkey to the appropriate collection builder helper.
 */
export function wrapWithCollectionFormat(
  accessor: string,
  collectionFormat: string | undefined,
): string | Children {
  if (!collectionFormat) return accessor;

  const helperName = getCollectionBuilderName(collectionFormat);
  if (!helperName) return accessor;

  return code`${serializationHelperRefkey(helperName)}(${accessor})`;
}

/**
 * Maps a TCGC `CollectionFormat` value to the corresponding serialization
 * helper function name.
 *
 * Returns `undefined` for formats that don't need explicit builder calls:
 * - "multi" is handled by RFC 6570 explode (`{?param*}`)
 * - "csv" for query params is the default RFC 6570 behavior (comma-joining)
 *   but IS needed for headers (caller decides when to call)
 * - "form" and "simple" are not standard collection builders
 *
 * @param collectionFormat - The TCGC collection format string.
 * @returns The helper function name, or undefined if no wrapping is needed.
 */
function getCollectionBuilderName(
  collectionFormat: string,
): string | undefined {
  switch (collectionFormat) {
    case "csv":
      return "buildCsvCollection";
    case "pipes":
      return "buildPipeCollection";
    case "ssv":
      return "buildSsvCollection";
    case "tsv":
      return "buildTsvCollection";
    default:
      return undefined;
  }
}

/**
 * Percent-encodes a URI template parameter name so that the expansion
 * object key matches the variable name inside the RFC 6570 template.
 *
 * TCGC provides URI templates with percent-encoded query variable names
 * (e.g., `{?api%2Dversion,%24expand}`), so the expansion object keys
 * must be encoded the same way (`"api%2Dversion"`, `"%24expand"`).
 *
 * `encodeURIComponent` already encodes most special characters but leaves
 * hyphens (`-`) and colons (`:`) untouched. The extra `.replace` encodes
 * these two characters to match the template encoding.
 *
 * This matches the legacy emitter's `escapeUriTemplateParamName` function
 * in `operationHelpers.ts`.
 *
 * @param name - The plain parameter serialized name (e.g., `"api-version"`).
 * @returns The percent-encoded name (e.g., `"api%2Dversion"`).
 */
export function escapeUriTemplateParamName(name: string): string {
  return encodeURIComponent(name).replace(/[:-]/g, (c) => {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
