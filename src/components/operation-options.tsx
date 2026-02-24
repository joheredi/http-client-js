import { code, For } from "@alloy-js/core";
import {
  InterfaceDeclaration,
  InterfaceMember,
} from "@alloy-js/typescript";
import type {
  SdkHttpOperation,
  SdkMethodParameter,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useRuntimeLib } from "../context/flavor-context.js";
import { operationOptionsRefkey } from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";

/**
 * Props for the {@link OperationOptionsDeclaration} component.
 */
export interface OperationOptionsProps {
  /** The TCGC service method whose optional parameters should be rendered. */
  method: SdkServiceMethod<SdkHttpOperation>;
}

/**
 * Renders a TypeScript `interface` declaration for an operation's optional parameters.
 *
 * Each operation in the generated SDK gets an options interface
 * (e.g., `GetUserOptionalParams`) that extends `OperationOptions` from the
 * HTTP runtime. The interface contains all optional method-level parameters
 * that are not auto-managed (like auto-generated contentType/accept headers
 * or client-level parameters like endpoint and credentials).
 *
 * Key behaviors:
 * - Extends `OperationOptions` from `@typespec/ts-http-runtime` via refkey.
 * - Filters to only include parameters where `onClient` is false and `optional`
 *   is true (or has a `clientDefaultValue`).
 * - Excludes auto-generated contentType and accept parameters.
 * - Adds `updateIntervalInMs?: number` for LRO and LRO+paging operations.
 * - Adds `contentType?: string` for operations with dual-format (JSON/XML) body.
 * - Attaches JSDoc documentation from parameter descriptions.
 * - Registers a refkey via `operationOptionsRefkey(method)` for cross-component
 *   references.
 *
 * @param props - The component props containing the TCGC service method.
 * @returns An Alloy JSX tree representing the TypeScript interface declaration.
 */
export function OperationOptionsDeclaration(props: OperationOptionsProps) {
  const runtimeLib = useRuntimeLib();
  const { method } = props;
  const interfaceName = getOptionsInterfaceName(method);
  const optionalParams = getOptionalParameters(method);
  const additionalMembers = getAdditionalMembers(method);

  return (
    <InterfaceDeclaration
      name={interfaceName}
      refkey={operationOptionsRefkey(method)}
      export
      extends={code`${runtimeLib.OperationOptions}`}
      doc={`Optional parameters for the ${method.name} operation.`}
    >
      <For each={[...additionalMembers, ...optionalParams]} semicolon hardline enderPunctuation>
        {(param) => (
          <InterfaceMember
            name={param.name}
            type={param.type}
            optional
            doc={param.doc}
          />
        )}
      </For>
    </InterfaceDeclaration>
  );
}

/**
 * Represents a member to render in the options interface.
 *
 * This intermediate type decouples the rendering from the TCGC type model,
 * allowing both real parameters and synthetic ones (like `updateIntervalInMs`)
 * to be rendered uniformly.
 */
interface OptionsMember {
  /** The member name in the interface. */
  name: string;
  /** The TypeScript type expression for the member. */
  type: string;
  /** Optional JSDoc documentation for the member. */
  doc?: string;
}

/**
 * Computes the interface name for an operation's optional parameters.
 *
 * Follows the legacy emitter convention: PascalCase operation name + "OptionalParams".
 * The first character of the operation name is capitalized to match TypeScript
 * interface naming conventions (e.g., `getUser` → `GetUserOptionalParams`).
 *
 * @param method - The TCGC service method.
 * @returns The interface name string.
 */
function getOptionsInterfaceName(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const baseName = method.name.charAt(0).toUpperCase() + method.name.slice(1);
  return `${baseName}OptionalParams`;
}

/**
 * Filters method parameters to only those that belong in the options interface.
 *
 * A parameter is included if ALL of the following are true:
 * - `onClient` is false (not a client-level param like endpoint or credential)
 * - `optional` is true OR it has a `clientDefaultValue`
 * - It is NOT an auto-generated contentType or accept header
 * - It is NOT an API version parameter
 *
 * This matches the legacy emitter's filtering logic for `OptionalParams` interfaces.
 *
 * @param method - The TCGC service method whose parameters to filter.
 * @returns An array of OptionsMember objects for rendering.
 */
function getOptionalParameters(
  method: SdkServiceMethod<SdkHttpOperation>,
): OptionsMember[] {
  return method.parameters
    .filter((p) => isOptionalParameter(p))
    .map((p) => ({
      name: p.name,
      type: getTypeExpression(p.type) as string,
      doc: p.doc ?? p.summary,
    }));
}

/**
 * Determines whether a method parameter should appear in the options interface.
 *
 * Excludes:
 * - Client-level parameters (`onClient === true`) such as endpoint and credentials
 * - Required parameters without a default value (these go in the function signature)
 * - Auto-generated contentType/accept headers
 * - API version parameters (managed by the client infrastructure)
 *
 * @param param - The TCGC method parameter to evaluate.
 * @returns `true` if the parameter belongs in the options interface.
 */
function isOptionalParameter(param: SdkMethodParameter): boolean {
  // Client-level params (endpoint, credential) are not in the options interface
  if (param.onClient) return false;

  // API version params are managed by client infrastructure
  if (param.isApiVersionParam) return false;

  // Auto-generated contentType/accept headers are excluded
  if (isAutoGeneratedHeader(param)) return false;

  // Only optional params or those with client defaults go in options
  return param.optional || param.clientDefaultValue !== undefined;
}

/**
 * Checks whether a parameter is an auto-generated contentType or accept header.
 *
 * TCGC generates synthetic `contentType` and `accept` parameters for HTTP
 * operations. These are managed by the operation infrastructure (hardcoded
 * in the send function) rather than being exposed to the consumer.
 * We detect them by checking `isGeneratedName` — parameters with generated
 * names for `contentType` or `accept` are excluded from the options interface.
 *
 * @param param - The TCGC method parameter to check.
 * @returns `true` if this is an auto-generated contentType or accept parameter.
 */
function isAutoGeneratedHeader(param: SdkMethodParameter): boolean {
  if (!param.isGeneratedName) return false;
  const name = param.name.toLowerCase();
  return name === "contenttype" || name === "accept";
}

/**
 * Produces additional synthetic members for the options interface based on
 * the operation's characteristics.
 *
 * Currently handles:
 * - **LRO operations** (`kind === "lro"` or `kind === "lropaging"`):
 *   Adds `updateIntervalInMs?: number` for controlling polling delay.
 * - **Dual-format body operations** (body supports both JSON and XML):
 *   Adds `contentType?: string` for selecting the wire format.
 *
 * @param method - The TCGC service method to inspect.
 * @returns An array of synthetic OptionsMember objects.
 */
function getAdditionalMembers(
  method: SdkServiceMethod<SdkHttpOperation>,
): OptionsMember[] {
  const members: OptionsMember[] = [];

  // LRO operations get a polling interval option
  if (isLroOperation(method)) {
    members.push({
      name: "updateIntervalInMs",
      type: "number",
      doc: "Delay to wait until next poll, in milliseconds.",
    });
  }

  // Dual-format (JSON + XML) body operations get a contentType option
  if (hasDualFormatBody(method)) {
    members.push({
      name: "contentType",
      type: "string",
      doc: 'The content type for the request body. Defaults to "application/json". Use "application/xml" for XML serialization.',
    });
  }

  return members;
}

/**
 * Checks whether a service method is a long-running operation (LRO).
 *
 * LRO operations need an `updateIntervalInMs` option to let consumers
 * control the polling interval. Both pure LRO and LRO+paging methods
 * qualify.
 *
 * @param method - The TCGC service method to check.
 * @returns `true` if the method is an LRO or LRO+paging operation.
 */
function isLroOperation(
  method: SdkServiceMethod<SdkHttpOperation>,
): boolean {
  return method.kind === "lro" || method.kind === "lropaging";
}

/**
 * Checks whether an operation's body supports both JSON and XML content types.
 *
 * When a body parameter accepts both `application/json` and `application/xml`,
 * the consumer needs a `contentType` option to choose the wire format at
 * call time. This function inspects the HTTP operation's body parameter
 * content types to detect this dual-format case.
 *
 * @param method - The TCGC service method to check.
 * @returns `true` if the body supports both JSON and XML formats.
 */
function hasDualFormatBody(
  method: SdkServiceMethod<SdkHttpOperation>,
): boolean {
  const bodyParam = method.operation.bodyParam;
  if (!bodyParam) return false;

  const contentTypes = bodyParam.contentTypes;
  const hasJson = contentTypes.some((ct) => ct.includes("json"));
  const hasXml = contentTypes.some((ct) => ct.includes("xml"));
  return hasJson && hasXml;
}
