import { Children, code, For } from "@alloy-js/core";
import {
  FunctionDeclaration,
  InterfaceDeclaration,
  InterfaceMember,
  SourceFile,
  type ParameterDescriptor,
} from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkCredentialParameter,
  SdkEndpointParameter,
  SdkHttpOperation,
  SdkMethodParameter,
  SdkPathParameter,
} from "@azure-tools/typespec-client-generator-core";
import { useFlavorContext, useRuntimeLib } from "../context/flavor-context.js";
import {
  clientContextRefkey,
  clientOptionsRefkey,
  createClientRefkey,
  loggerRefkey,
} from "../utils/refkeys.js";
import { getTypeExpression } from "./type-expression.js";

/**
 * Props for the {@link ClientContextFile} component.
 */
export interface ClientContextFileProps {
  /** The TCGC client type to generate context for. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Orchestrator component that generates a complete client context file.
 *
 * This component produces a single TypeScript source file at
 * `api/{clientName}Context.ts` containing:
 * 1. A context interface (`XxxContext extends Client`) that types the client
 *    instance with any custom client-level properties.
 * 2. An options interface (`XxxClientOptionalParams extends ClientOptions`)
 *    containing all optional client-initialization parameters.
 * 3. A factory function (`createXxx(...)`) that constructs the client by
 *    calling `getClient()` from the HTTP runtime with the appropriate
 *    endpoint URL, credentials, and options.
 *
 * The generated factory function handles:
 * - Endpoint URL construction from templates with parameter substitution
 * - Credential forwarding (API key, bearer token, OAuth2)
 * - User-agent prefix configuration for telemetry
 * - API version parameter extraction
 *
 * @param props - The component props containing the TCGC client type.
 * @returns An Alloy JSX tree representing the client context source file.
 */
export function ClientContextFile(props: ClientContextFileProps) {
  const { client } = props;
  const clientName = getClientName(client);
  const filePath = `${camelCase(client.name)}Context.ts`;

  return (
    <SourceFile path={filePath}>
      <ClientContextDeclaration client={client} />
      {"\n\n"}
      <ClientContextOptionsDeclaration client={client} />
      {"\n\n"}
      <ClientContextFactory client={client} />
    </SourceFile>
  );
}

/**
 * Props for the {@link ClientContextDeclaration} component.
 */
export interface ClientContextDeclarationProps {
  /** The TCGC client type. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Renders the client context interface declaration.
 *
 * Generates an interface like:
 * ```typescript
 * export interface TestServiceContext extends Client {
 *   apiVersion?: string;
 * }
 * ```
 *
 * The interface extends `Client` from the HTTP runtime and includes any
 * non-endpoint, non-credential client-level properties that need to be
 * accessible on the client context object (e.g., API version, custom
 * client parameters).
 *
 * @param props - The component props containing the TCGC client type.
 * @returns An Alloy JSX tree for the interface declaration.
 */
export function ClientContextDeclaration(props: ClientContextDeclarationProps) {
  const runtimeLib = useRuntimeLib();
  const { client } = props;
  const clientName = getClientName(client);
  const interfaceName = `${clientName}Context`;
  const contextMembers = getContextMembers(client);

  return (
    <InterfaceDeclaration
      name={interfaceName}
      refkey={clientContextRefkey(client)}
      export
      extends={code`${runtimeLib.Client}`}
    >
      {contextMembers.length > 0 && (
        <For each={contextMembers} semicolon hardline enderPunctuation>
          {(member) => (
            <InterfaceMember
              name={member.name}
              type={member.type}
              optional={member.optional}
              doc={member.doc}
            />
          )}
        </For>
      )}
    </InterfaceDeclaration>
  );
}

/**
 * Props for the {@link ClientContextOptionsDeclaration} component.
 */
export interface ClientContextOptionsDeclarationProps {
  /** The TCGC client type. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Renders the client options interface declaration.
 *
 * Generates an interface like:
 * ```typescript
 * export interface TestServiceClientOptionalParams extends ClientOptions {
 *   apiVersion?: string;
 * }
 * ```
 *
 * The interface extends `ClientOptions` from the HTTP runtime and includes
 * all optional client-initialization parameters: endpoint overrides, API
 * version, and any custom parameters with default values.
 *
 * @param props - The component props containing the TCGC client type.
 * @returns An Alloy JSX tree for the options interface declaration.
 */
export function ClientContextOptionsDeclaration(
  props: ClientContextOptionsDeclarationProps,
) {
  const runtimeLib = useRuntimeLib();
  const { client } = props;
  const interfaceName = `${client.name}OptionalParams`;
  const optionalMembers = getOptionsMembers(client);

  return (
    <InterfaceDeclaration
      name={interfaceName}
      refkey={clientOptionsRefkey(client)}
      export
      extends={code`${runtimeLib.ClientOptions}`}
    >
      {optionalMembers.length > 0 && (
        <For each={optionalMembers} semicolon hardline enderPunctuation>
          {(member) => (
            <InterfaceMember
              name={member.name}
              type={member.type}
              optional
              doc={member.doc}
            />
          )}
        </For>
      )}
    </InterfaceDeclaration>
  );
}

/**
 * Props for the {@link ClientContextFactory} component.
 */
export interface ClientContextFactoryProps {
  /** The TCGC client type. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Renders the client factory function that creates a configured client context.
 *
 * Generates a function like:
 * ```typescript
 * export function createTestService(
 *   endpointParam: string,
 *   options: TestServiceClientOptionalParams = {},
 * ): TestServiceContext {
 *   const endpointUrl = options.endpoint ?? endpointParam;
 *   const clientContext = getClient(endpointUrl, options);
 *   return clientContext as TestServiceContext;
 * }
 * ```
 *
 * The factory function:
 * 1. Accepts required parameters (endpoint if no default, credentials if auth)
 * 2. Constructs the endpoint URL from templates or defaults
 * 3. Forwards credentials to `getClient()` when authentication is configured
 * 4. Returns the client context typed as the context interface
 *
 * @param props - The component props containing the TCGC client type.
 * @returns An Alloy JSX tree for the factory function declaration.
 */
export function ClientContextFactory(props: ClientContextFactoryProps) {
  const { client } = props;
  const clientName = getClientName(client);
  const factoryName = `create${clientName}`;
  const parameters = buildFactoryParameters(client);
  const bodyLines = buildFactoryBody(client);

  return (
    <FunctionDeclaration
      name={factoryName}
      refkey={createClientRefkey(client)}
      export
      returnType={code`${clientContextRefkey(client)}`}
      parameters={parameters}
    >
      {bodyLines}
    </FunctionDeclaration>
  );
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Represents a member of the context or options interface.
 */
interface ContextMember {
  /** The member name in the interface. */
  name: string;
  /** The TypeScript type expression for the member. */
  type: Children;
  /** Whether the member is optional. */
  optional: boolean;
  /** Optional JSDoc documentation for the member. */
  doc?: string;
}

/**
 * Extracts the client name by stripping the "Client" suffix from the TCGC name.
 *
 * This matches the legacy emitter's `getClientName()` convention. For example,
 * `TestServiceClient` becomes `TestService`, which is used to form the factory
 * function name (`createTestService`) and context interface name (`TestServiceContext`).
 *
 * @param client - The TCGC client type.
 * @returns The client name without the "Client" suffix.
 */
export function getClientName(
  client: SdkClientType<SdkHttpOperation>,
): string {
  return client.name.replace(/Client$/, "");
}

/**
 * Converts a PascalCase name to camelCase by lowercasing the first character.
 *
 * Used for generating file paths from client names. For example,
 * `TestServiceClient` becomes `testServiceClient` for `testServiceClientContext.ts`.
 *
 * @param name - The PascalCase name to convert.
 * @returns The camelCase version of the name.
 */
function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Collects members for the client context interface.
 *
 * Context members are non-endpoint, non-credential client-level parameters
 * that need to be stored on the client context object. This includes API
 * version parameters and any custom client parameters.
 *
 * @param client - The TCGC client type.
 * @returns An array of context member descriptors.
 */
function getContextMembers(
  client: SdkClientType<SdkHttpOperation>,
): ContextMember[] {
  const members: ContextMember[] = [];
  const initParams = client.clientInitialization.parameters;

  for (const param of initParams) {
    if (param.kind === "endpoint" || param.kind === "credential") continue;

    // API version params go on the context
    if (param.kind === "method" && param.isApiVersionParam) {
      members.push({
        name: param.name,
        type: getTypeExpression(param.type),
        optional: param.optional || param.clientDefaultValue !== undefined,
        doc: param.doc ?? param.summary,
      });
      continue;
    }

    // Custom client parameters
    if (param.kind === "method") {
      members.push({
        name: param.name,
        type: getTypeExpression(param.type),
        optional: param.optional || param.clientDefaultValue !== undefined,
        doc: param.doc ?? param.summary,
      });
    }
  }

  return members;
}

/**
 * Collects members for the client options interface.
 *
 * Options members include all optional client-initialization parameters that
 * consumers can configure when creating the client. This includes:
 * - Endpoint template parameters with default values
 * - API version parameters
 * - Custom optional client parameters
 *
 * Credential parameters are excluded since they appear as required function
 * parameters when authentication is configured.
 *
 * @param client - The TCGC client type.
 * @returns An array of options member descriptors.
 */
function getOptionsMembers(
  client: SdkClientType<SdkHttpOperation>,
): ContextMember[] {
  const members: ContextMember[] = [];
  const initParams = client.clientInitialization.parameters;

  for (const param of initParams) {
    if (param.kind === "credential") continue;

    // Endpoint template parameters with defaults go in options
    if (param.kind === "endpoint") {
      const endpointType = param.type;
      if (endpointType.kind === "endpoint") {
        for (const templateArg of endpointType.templateArguments) {
          if (
            templateArg.clientDefaultValue !== undefined ||
            templateArg.optional
          ) {
            members.push({
              name: templateArg.name,
              type: getTypeExpression(templateArg.type),
              optional: true,
              doc: templateArg.doc ?? templateArg.summary,
            });
          }
        }
      } else if (endpointType.kind === "union") {
        // Union of endpoint variants — collect optional template args
        for (const variant of endpointType.variantTypes) {
          if (variant.kind === "endpoint") {
            for (const templateArg of variant.templateArguments) {
              if (
                templateArg.clientDefaultValue !== undefined ||
                templateArg.optional
              ) {
                members.push({
                  name: templateArg.name,
                  type: getTypeExpression(templateArg.type),
                  optional: true,
                  doc: templateArg.doc ?? templateArg.summary,
                });
              }
            }
          }
        }
      }
      continue;
    }

    // API version and custom optional params
    if (param.kind === "method") {
      if (param.optional || param.clientDefaultValue !== undefined) {
        members.push({
          name: param.name,
          type: getTypeExpression(param.type),
          optional: true,
          doc: param.doc ?? param.summary,
        });
      }
    }
  }

  return members;
}

/**
 * Builds the parameter list for the factory function signature.
 *
 * The parameter order follows the legacy emitter convention:
 * 1. Required endpoint parameter (if endpoint has no default value)
 * 2. Credential parameter (if authentication is configured)
 * 3. Options parameter (always last, with default `{}`)
 *
 * @param client - The TCGC client type.
 * @returns An array of Alloy ParameterDescriptor objects.
 */
function buildFactoryParameters(
  client: SdkClientType<SdkHttpOperation>,
): ParameterDescriptor[] {
  const params: ParameterDescriptor[] = [];
  const initParams = client.clientInitialization.parameters;

  // Add required endpoint parameters
  const endpointParam = initParams.find(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  if (endpointParam) {
    const requiredTemplateArgs = getRequiredEndpointArgs(endpointParam);
    for (const arg of requiredTemplateArgs) {
      params.push({
        name: arg.name,
        type: getTypeExpression(arg.type),
      });
    }
  }

  // Add credential parameter if authentication is configured
  const credentialParam = initParams.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );
  if (credentialParam) {
    params.push({
      name: "credential",
      type: getCredentialTypeExpression(credentialParam),
    });
  }

  // Add options parameter (always last)
  params.push({
    name: "options",
    type: clientOptionsRefkey(client),
    default: "{}",
  });

  return params;
}

/**
 * Extracts required (non-default, non-optional) endpoint template arguments.
 *
 * Template arguments with default values or that are optional become
 * options interface members instead of required function parameters.
 *
 * @param endpointParam - The TCGC endpoint parameter.
 * @returns An array of required template argument path parameters.
 */
function getRequiredEndpointArgs(
  endpointParam: SdkEndpointParameter,
): SdkPathParameter[] {
  const endpointType = endpointParam.type;

  if (endpointType.kind === "endpoint") {
    return endpointType.templateArguments.filter(
      (arg) => !arg.optional && arg.clientDefaultValue === undefined,
    );
  }

  if (endpointType.kind === "union") {
    // Use first endpoint variant's required args
    for (const variant of endpointType.variantTypes) {
      if (variant.kind === "endpoint") {
        return variant.templateArguments.filter(
          (arg) => !arg.optional && arg.clientDefaultValue === undefined,
        );
      }
    }
  }

  return [];
}

/**
 * Generates the TypeScript type expression for a credential parameter.
 *
 * Maps TCGC authentication scheme types to their TypeScript credential types:
 * - `apiKey` → `KeyCredential`
 * - `http` (e.g., bearer) → `KeyCredential`
 * - `oauth2` → `TokenCredential`
 * - `openIdConnect` → `TokenCredential`
 *
 * When multiple auth schemes are supported, produces a union type
 * (e.g., `KeyCredential | TokenCredential`).
 *
 * @param credentialParam - The TCGC credential parameter.
 * @returns Alloy Children representing the credential type expression.
 */
function getCredentialTypeExpression(
  credentialParam: SdkCredentialParameter,
): Children {
  const runtimeLib = useRuntimeLib();
  const credType = credentialParam.type;
  const types = new Set<string>();

  if (credType.kind === "credential") {
    addCredentialSchemeType(credType.scheme, types);
  } else if (credType.kind === "union") {
    for (const variant of credType.variantTypes) {
      if (variant.kind === "credential") {
        addCredentialSchemeType(variant.scheme, types);
      }
    }
  }

  if (types.size === 0) {
    return "Record<string, unknown>";
  }

  const refs: Children[] = [];
  if (types.has("KeyCredential")) {
    refs.push(runtimeLib.KeyCredential);
  }
  if (types.has("TokenCredential")) {
    refs.push(runtimeLib.TokenCredential);
  }

  if (refs.length === 1) {
    return refs[0];
  }

  return code`${refs[0]} | ${refs[1]}`;
}

/**
 * Maps an HTTP auth scheme to its corresponding TypeScript credential type name.
 *
 * @param scheme - The HTTP auth scheme from TCGC.
 * @param types - The set of type names to add to.
 */
function addCredentialSchemeType(
  scheme: { type: string },
  types: Set<string>,
): void {
  switch (scheme.type) {
    case "apiKey":
    case "http":
      types.add("KeyCredential");
      break;
    case "oauth2":
    case "openIdConnect":
      types.add("TokenCredential");
      break;
  }
}

/**
 * Builds the factory function body that constructs the client context.
 *
 * The body handles:
 * 1. Extracting optional template parameters from the options object
 * 2. Constructing the endpoint URL from the server URL template
 * 3. Calling `getClient()` with endpoint, credential (if any), and options
 * 4. Spreading any custom client properties onto the context object
 * 5. Returning the result typed as the context interface
 *
 * @param client - The TCGC client type.
 * @returns Alloy Children representing the function body.
 */
function buildFactoryBody(client: SdkClientType<SdkHttpOperation>): Children {
  const initParams = client.clientInitialization.parameters;
  const endpointParam = initParams.find(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  const credentialParam = initParams.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );
  const contextMembers = getContextMembers(client);

  const bodyParts: Children[] = [];

  // 1. Build endpoint URL
  if (endpointParam) {
    bodyParts.push(buildEndpointUrl(endpointParam));
  }

  // 2. Build user agent prefix and merge into options
  bodyParts.push(buildUserAgentOptions());

  // 3. Call getClient with updated options
  const getClientCall = buildGetClientCall(
    endpointParam !== undefined,
    credentialParam !== undefined,
  );

  // 4. Build return statement with optional context member spreading
  if (contextMembers.length > 0) {
    bodyParts.push(code`const clientContext = ${getClientCall}`);
    const spreadMembers = contextMembers
      .map((m) => {
        const value = getContextMemberValue(m.name, initParams);
        return value !== m.name ? `${m.name}: ${value}` : m.name;
      })
      .join(", ");
    bodyParts.push(
      code`return { ...clientContext, ${spreadMembers} } as ${clientContextRefkey(client)};`,
    );
  } else {
    bodyParts.push(
      code`return ${getClientCall} as ${clientContextRefkey(client)};`,
    );
  }

  return bodyParts.map((p, i) => (i > 0 ? ["\n", p] : p));
}

/**
 * Builds the endpoint URL construction statement.
 *
 * Handles three cases:
 * 1. Simple endpoint with a default value (e.g., `{endpoint}` with default "http://localhost:3000")
 *    → `const endpointUrl = options.endpoint ?? "http://localhost:3000";`
 * 2. Template endpoint with parameters (e.g., `{endpoint}/v{version}`)
 *    → Extracts params from options and constructs template string
 * 3. Endpoint with no default (required parameter)
 *    → `const endpointUrl = options.endpoint ?? endpointParam;`
 *
 * @param endpointParam - The TCGC endpoint parameter.
 * @returns Alloy Children for the endpoint URL construction.
 */
function buildEndpointUrl(endpointParam: SdkEndpointParameter): Children {
  const endpointType = endpointParam.type;

  if (endpointType.kind === "endpoint") {
    return buildEndpointFromType(endpointType);
  }

  if (endpointType.kind === "union") {
    // Use first endpoint variant
    for (const variant of endpointType.variantTypes) {
      if (variant.kind === "endpoint") {
        return buildEndpointFromType(variant);
      }
    }
  }

  // Fallback: simple endpoint string
  return code`const endpointUrl = options.endpoint ?? String(${endpointParam.name});`;
}

/**
 * Builds endpoint URL construction for a specific endpoint type.
 *
 * Processes the server URL template by:
 * 1. Extracting optional template arguments with defaults from options
 * 2. Replacing `{paramName}` placeholders with `${paramName}` template expressions
 * 3. Constructing `options.endpoint ?? \`template\`` expression
 *
 * @param endpointType - The TCGC endpoint type containing serverUrl and templateArguments.
 * @returns Alloy Children for the endpoint construction statements.
 */
function buildEndpointFromType(endpointType: {
  serverUrl: string;
  templateArguments: SdkPathParameter[];
}): Children {
  const { serverUrl, templateArguments } = endpointType;
  const parts: Children[] = [];

  // Extract optional/defaulted template args from options
  for (const arg of templateArguments) {
    if (arg.clientDefaultValue !== undefined) {
      const defaultVal =
        typeof arg.clientDefaultValue === "string"
          ? `"${arg.clientDefaultValue}"`
          : String(arg.clientDefaultValue);
      parts.push(
        code`const ${arg.name} = options.${arg.name} ?? ${defaultVal};`,
      );
    } else if (arg.optional) {
      parts.push(code`const ${arg.name} = options.${arg.name};`);
    }
  }

  // Build the template URL by replacing {paramName} with ${paramName}
  let templateUrl = serverUrl;
  for (const arg of templateArguments) {
    templateUrl = templateUrl.replace(
      `{${arg.name}}`,
      `\${${arg.name}}`,
    );
  }

  // If the template is just `{endpoint}` with no other params,
  // it simplifies to a direct reference
  const hasOnlyEndpoint =
    templateArguments.length === 1 &&
    templateArguments[0].name === "endpoint" &&
    serverUrl === "{endpoint}";

  if (hasOnlyEndpoint) {
    const arg = templateArguments[0];
    if (arg.clientDefaultValue !== undefined) {
      // Already extracted above, just reference the variable
      parts.push(code`const endpointUrl = options.endpoint ?? endpoint;`);
    } else {
      // Required endpoint parameter
      parts.push(code`const endpointUrl = options.endpoint ?? endpoint;`);
    }
  } else {
    parts.push(
      code`const endpointUrl = options.endpoint ?? \`${templateUrl}\`;`,
    );
  }

  return parts.map((p, i) => (i > 0 ? ["\n", p] : p));
}

/**
 * Builds the user agent prefix construction, logging options (Azure only),
 * and options merging statements.
 *
 * Generates code that:
 * 1. Extracts any user-provided prefix from `options.userAgentOptions.userAgentPrefix`
 * 2. Constructs a `userAgentPrefix` that prepends the user-provided prefix (if any)
 *    to the SDK identifier tag `azsdk-js-api`
 * 3. For Azure flavor, adds `loggingOptions` that wires the generated logger
 *    into the client pipeline, falling back to `logger.info` when the consumer
 *    hasn't provided a custom logger
 * 4. Creates `updatedOptions` by spreading the original options with the new
 *    `userAgentOptions.userAgentPrefix` and (for Azure) `loggingOptions`
 *
 * The `azsdk-js-api` tag identifies requests as originating from a modular
 * (API-layer) generated client, distinguishing them from classical (wrapper-layer)
 * clients that use `azsdk-js-client`. This telemetry tag is used by service teams
 * to track SDK adoption and diagnose issues.
 *
 * The loggingOptions integration (Azure only) ensures that HTTP pipeline logging
 * uses the package-scoped logger from `logger.ts` by default, while allowing
 * consumers to override via `options.loggingOptions.logger`. This is required
 * for Azure SDK compliance — without it, pipeline logs use the global logger
 * instead of the package-specific one.
 *
 * Generated output (core flavor):
 * ```typescript
 * const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
 * const userAgentPrefix = prefixFromOptions
 *   ? `${prefixFromOptions} azsdk-js-api`
 *   : `azsdk-js-api`;
 * const updatedOptions = {
 *   ...options,
 *   userAgentOptions: { userAgentPrefix },
 * };
 * ```
 *
 * Generated output (azure flavor):
 * ```typescript
 * const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
 * const userAgentPrefix = prefixFromOptions
 *   ? `${prefixFromOptions} azsdk-js-api`
 *   : `azsdk-js-api`;
 * const updatedOptions = {
 *   ...options,
 *   userAgentOptions: { userAgentPrefix },
 *   loggingOptions: { logger: options.loggingOptions?.logger ?? logger.info },
 * };
 * ```
 *
 * @returns Alloy Children for the user agent options construction statements.
 */
export function buildUserAgentOptions(): Children {
  const { flavor } = useFlavorContext();
  const parts: Children[] = [];

  parts.push(
    code`const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;`,
  );
  parts.push(
    code`const userAgentPrefix = prefixFromOptions ? \`\${prefixFromOptions} azsdk-js-api\` : \`azsdk-js-api\`;`,
  );

  if (flavor === "azure") {
    parts.push(code`const updatedOptions = {
  ...options,
  userAgentOptions: { userAgentPrefix },
  loggingOptions: { logger: options.loggingOptions?.logger ?? ${loggerRefkey()}.info },
};`);
  } else {
    parts.push(code`const updatedOptions = {
  ...options,
  userAgentOptions: { userAgentPrefix },
};`);
  }

  return parts.map((p, i) => (i > 0 ? ["\n", p] : p));
}

/**
 * Builds the `getClient(...)` call expression.
 *
 * The call signature varies based on whether credentials are present:
 * - With credentials: `getClient(endpointUrl, credential, updatedOptions)`
 * - Without credentials: `getClient(endpointUrl, updatedOptions)`
 *
 * Uses `updatedOptions` (which includes the merged user agent prefix)
 * rather than the raw `options` parameter, so the constructed user agent
 * string is forwarded to the HTTP runtime.
 *
 * @param hasEndpoint - Whether the client has an endpoint parameter.
 * @param hasCredential - Whether the client has a credential parameter.
 * @returns Alloy Children for the getClient call expression.
 */
function buildGetClientCall(
  hasEndpoint: boolean,
  hasCredential: boolean,
): Children {
  const runtimeLib = useRuntimeLib();
  const endpointArg = hasEndpoint ? "endpointUrl" : '""';

  if (hasCredential) {
    return code`${runtimeLib.getClient}(${endpointArg}, credential, updatedOptions);`;
  }
  return code`${runtimeLib.getClient}(${endpointArg}, updatedOptions);`;
}

/**
 * Gets the value expression for a context member in the factory function.
 *
 * For parameters with default values, extracts from options with a fallback.
 * For API version parameters, uses `options.apiVersion` with the default value.
 *
 * @param name - The member name.
 * @param initParams - The client initialization parameters.
 * @returns The JavaScript expression string for the member value.
 */
function getContextMemberValue(
  name: string,
  initParams: (
    | SdkEndpointParameter
    | SdkCredentialParameter
    | SdkMethodParameter
  )[],
): string {
  const param = initParams.find(
    (p) => p.kind === "method" && p.name === name,
  ) as SdkMethodParameter | undefined;

  if (!param) return name;

  if (param.clientDefaultValue !== undefined) {
    const defaultVal =
      typeof param.clientDefaultValue === "string"
        ? `"${param.clientDefaultValue}"`
        : String(param.clientDefaultValue);
    return `options.${name} ?? ${defaultVal}`;
  }

  if (param.optional) {
    return `options.${name}`;
  }

  return name;
}
