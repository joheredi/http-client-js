import { Children, code, For } from "@alloy-js/core";
import {
  ClassDeclaration,
  ClassField,
  ClassMethod,
  SourceFile,
  type ParameterDescriptor,
} from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkCredentialParameter,
  SdkEndpointParameter,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useRuntimeLib } from "../context/flavor-context.js";
import { getEscapedParameterName } from "../utils/name-policy.js";
import {
  classicalClientRefkey,
  clientContextRefkey,
  clientOptionsRefkey,
  createClientRefkey,
  operationGroupFactoryRefkey,
  operationGroupInterfaceRefkey,
  operationOptionsRefkey,
  publicOperationRefkey,
} from "../utils/refkeys.js";
import { getClientName, getRequiredMethodParams } from "./client-context.js";
import {
  getOptionsParamName,
  isRequiredSignatureParameter,
} from "./send-operation.js";
import { getTypeExpression } from "./type-expression.js";

/**
 * Props for the {@link ClassicalClientFile} component.
 */
export interface ClassicalClientFileProps {
  /** The TCGC client type to generate a classical client class for. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Orchestrator component that generates a complete classical client file.
 *
 * This component produces a TypeScript source file containing the class-based
 * client that wraps the modular API layer. The classical client provides a
 * familiar object-oriented API surface for SDK consumers who prefer class-based
 * patterns.
 *
 * The generated file contains:
 * - A re-export of the client options type (from the context file)
 * - The client class with constructor, pipeline property, and operation methods
 *
 * File location follows the legacy emitter convention: the client class file
 * is placed at the root of the source output (e.g., `testingClient.ts`).
 *
 * @param props - The component props containing the TCGC client type.
 * @returns An Alloy JSX tree representing the classical client source file.
 */
export function ClassicalClientFile(props: ClassicalClientFileProps) {
  const { client } = props;
  const fileName = `${camelCase(client.name)}.ts`;

  return (
    <SourceFile path={fileName}>
      <ClassicalClientDeclaration client={client} />
    </SourceFile>
  );
}

/**
 * Props for the {@link ClassicalClientDeclaration} component.
 */
export interface ClassicalClientDeclarationProps {
  /** The TCGC client type to generate a class for. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Renders the classical client class declaration.
 *
 * Generates a class like:
 * ```typescript
 * export class TestingClient {
 *   private _client: TestingContext;
 *   public readonly pipeline: Pipeline;
 *
 *   constructor(endpointParam: string, options: TestingClientOptionalParams = {}) {
 *     this._client = createTesting(endpointParam, { ...options });
 *     this.pipeline = this._client.pipeline;
 *   }
 *
 *   foo(options: FooOptionalParams = { requestOptions: {} }): Promise<void> {
 *     return foo(this._client, options);
 *   }
 * }
 * ```
 *
 * The class provides:
 * - A private `_client` field holding the modular client context
 * - A public readonly `pipeline` property for direct pipeline access
 * - A constructor that delegates to the factory function
 * - Operation methods that delegate to the public API functions
 *
 * @param props - The component props containing the TCGC client type.
 * @returns An Alloy JSX tree for the class declaration.
 */
export function ClassicalClientDeclaration(
  props: ClassicalClientDeclarationProps,
) {
  const { client } = props;
  const className = client.name;
  const methods = collectClientMethods(client);
  const childClients = client.children ?? [];
  const needsOverloads = needsConstructorOverloads(client);

  return (
    <ClassDeclaration
      name={className}
      refkey={classicalClientRefkey(client)}
      export
    >
      <ClassField name="_client" private type={clientContextRefkey(client)} />
      {"\n"}
      {code`/** The pipeline used by this client to make requests */\npublic readonly pipeline: ${useRuntimeLib().Pipeline};`}
      {childClients.length > 0 && (
        <>
          {"\n"}
          {childClients.map((child) => (
            <>
              {"\n"}
              {code`/** The operation group for ${child.name} */\npublic readonly ${camelCase(child.name)}: ${operationGroupInterfaceRefkey(child)};`}
            </>
          ))}
        </>
      )}
      {"\n\n"}
      {needsOverloads ? (
        <OverloadedConstructor client={client} />
      ) : (
        <ClassMethod
          name="constructor"
          parameters={buildConstructorParameters(client)}
        >
          {buildConstructorBody(client)}
        </ClassMethod>
      )}
      {methods.length > 0 && (
        <>
          {"\n\n"}
          <For each={methods} doubleHardline>
            {(method) => <ClientOperationMethod method={method} />}
          </For>
        </>
      )}
    </ClassDeclaration>
  );
}

/**
 * Props for the {@link ClientOperationMethod} component.
 */
interface ClientOperationMethodProps {
  /** The TCGC service method to render as a class method. */
  method: SdkServiceMethod<SdkHttpOperation>;
}

/**
 * Renders a single operation method on the classical client class.
 *
 * Each method is a thin wrapper that delegates to the corresponding
 * public API function, passing `this._client` as the first argument
 * (the context) followed by all other parameters.
 *
 * For standard (basic) operations, the method is NOT marked async —
 * it simply returns the promise from the API function. This avoids
 * an unnecessary async wrapper and matches the legacy emitter's output.
 *
 * Example output:
 * ```typescript
 * foo(options: FooOptionalParams = { requestOptions: {} }): Promise<void> {
 *   return foo(this._client, options);
 * }
 * ```
 *
 * @param props - The component props containing the TCGC service method.
 * @returns An Alloy JSX tree for the class method.
 */
function ClientOperationMethod(props: ClientOperationMethodProps) {
  const { method } = props;
  const parameters = buildMethodParameters(method);
  const returnType = getMethodReturnType(method);
  const delegateArgs = buildDelegateArguments(method);

  return (
    <ClassMethod
      name={method.name}
      parameters={parameters}
      returnType={returnType}
    >
      {code`return ${publicOperationRefkey(method)}(this._client, ${delegateArgs});`}
    </ClassMethod>
  );
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Builds the constructor parameter list for the classical client class.
 *
 * The constructor mirrors the factory function's parameter list:
 * 1. Required endpoint parameters (if endpoint has no default)
 * 2. Credential parameter (if authentication is configured)
 * 3. Options parameter (always last, defaults to `{}`)
 *
 * This ensures the classical client constructor has the same signature
 * as the modular `createXxx()` factory function.
 *
 * @param client - The TCGC client type.
 * @returns An array of Alloy ParameterDescriptor objects for the constructor.
 */
function buildConstructorParameters(
  client: SdkClientType<SdkHttpOperation>,
): ParameterDescriptor[] {
  const params: ParameterDescriptor[] = [];
  const initParams = client.clientInitialization.parameters;

  // Add required endpoint parameters
  const endpointParam = initParams.find(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  if (endpointParam) {
    const requiredArgs = getRequiredEndpointArgs(endpointParam);
    for (const arg of requiredArgs) {
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

  // Add required method parameters (e.g., subscriptionId for ARM services)
  for (const methodParam of getRequiredMethodParams(client)) {
    params.push({
      name: methodParam.name,
      type: getTypeExpression(methodParam.type),
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
 * Builds the constructor body that initializes the client context and pipeline.
 *
 * The constructor body:
 * 1. Assembles a `userAgentPrefix` with the `azsdk-js-client` tag, preserving
 *    any user-provided prefix from `options.userAgentOptions.userAgentPrefix`
 * 2. Calls the factory function with all constructor parameters plus the
 *    wrapped options (spreading the original options with the new userAgentPrefix)
 * 3. Assigns the context to `this._client`
 * 4. Delegates `this.pipeline` from the context's pipeline
 *
 * The `azsdk-js-client` tag distinguishes classical (class-based) clients
 * from the modular API layer which uses `azsdk-js-api`. This telemetry tag
 * is appended to the HTTP User-Agent header for tracking SDK usage.
 *
 * @param client - The TCGC client type.
 * @returns Alloy Children representing the constructor body statements.
 */
function buildConstructorBody(
  client: SdkClientType<SdkHttpOperation>,
): Children {
  const childClients = client.children ?? [];
  const nonOptionsArgs = buildNonOptionsArguments(client);
  const argPrefix =
    nonOptionsArgs.length > 0 ? nonOptionsArgs.join(", ") + ", " : "";

  return (
    <>
      {code`const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;`}
      {"\n"}
      {code`const userAgentPrefix = prefixFromOptions ? \`\${prefixFromOptions} azsdk-js-client\` : \`azsdk-js-client\`;`}
      {"\n"}
      {code`this._client = ${createClientRefkey(client)}(${argPrefix}{
  ...options,
  userAgentOptions: { userAgentPrefix },
});`}
      {"\n"}
      {code`this.pipeline = this._client.pipeline;`}
      {childClients.map((child) => (
        <>
          {"\n"}
          {code`this.${camelCase(child.name)} = ${operationGroupFactoryRefkey(child)}(this._client);`}
        </>
      ))}
    </>
  );
}

/**
 * Builds the list of non-options arguments for the factory function call.
 *
 * Returns just the endpoint, credential, and required method parameter names
 * (e.g., subscriptionId) WITHOUT the trailing `options` argument. This is
 * used by `buildConstructorBody` to construct the factory call with wrapped
 * options (including userAgentPrefix).
 *
 * @param client - The TCGC client type.
 * @returns An array of argument name strings (excluding options).
 */
function buildNonOptionsArguments(
  client: SdkClientType<SdkHttpOperation>,
): string[] {
  const args: string[] = [];
  const initParams = client.clientInitialization.parameters;

  const endpointParam = initParams.find(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  if (endpointParam) {
    for (const arg of getRequiredEndpointArgs(endpointParam)) {
      args.push(getEscapedParameterName(arg.name));
    }
  }

  const credentialParam = initParams.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );
  if (credentialParam) {
    args.push("credential");
  }

  for (const methodParam of getRequiredMethodParams(client)) {
    args.push(getEscapedParameterName(methodParam.name));
  }

  return args;
}

/**
 * Builds the argument list for calling the factory function from the constructor.
 *
 * The arguments mirror the constructor parameters, forwarding endpoint,
 * credential, and options to the factory function in the same order.
 *
 * @param client - The TCGC client type.
 * @returns A comma-separated string of argument names for the factory call.
 */
function buildFactoryCallArguments(
  client: SdkClientType<SdkHttpOperation>,
): string {
  return [...buildNonOptionsArguments(client), "options"].join(", ");
}

/**
 * Builds the parameter list for a classical client operation method.
 *
 * The method parameters include all required signature parameters
 * (path, body) and the options bag. The `context` parameter from the
 * public API function is NOT included — the class method uses
 * `this._client` instead.
 *
 * @param method - The TCGC service method.
 * @returns An array of Alloy ParameterDescriptor objects.
 */
function buildMethodParameters(
  method: SdkServiceMethod<SdkHttpOperation>,
): ParameterDescriptor[] {
  const params: ParameterDescriptor[] = [];

  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param, method)) {
      params.push({
        name: param.name,
        type: getTypeExpression(param.type),
      });
    }
  }

  params.push({
    name: getOptionsParamName(method),
    type: operationOptionsRefkey(method),
    default: "{ requestOptions: {} }",
  });

  return params;
}

/**
 * Computes the return type for a classical client operation method.
 *
 * The return type matches the public operation function's return type:
 * - Basic operations: `Promise<T>` (or `Promise<void>`)
 * - Paging operations: `PagedAsyncIterableIterator<T>`
 * - LRO operations: `PollerLike<OperationState<T>, T>`
 *
 * For basic operations, `Promise<...>` is manually constructed since
 * the class method is NOT async (it returns the promise from the API
 * function directly).
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the return type expression.
 */
function getMethodReturnType(
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  const responseType = method.response.type;
  const innerType = responseType ? getTypeExpression(responseType) : "void";

  // Basic operations return Promise<T>
  return code`Promise<${innerType}>`;
}

/**
 * Builds the argument list for delegating to the public API function.
 *
 * Constructs the comma-separated arguments that follow `this._client`
 * in the delegation call. This includes required parameters (path, body)
 * and the options bag.
 *
 * @param method - The TCGC service method.
 * @returns A comma-separated string of argument names (excluding context).
 */
function buildDelegateArguments(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const args: string[] = [];

  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param, method)) {
      args.push(param.name);
    }
  }

  args.push(getOptionsParamName(method));
  return args.join(", ");
}

/**
 * Collects all root-level operation methods for the classical client.
 *
 * Gathers the service methods directly on the client (not on child
 * clients / operation groups). Child client operations will be handled
 * by operation group getters in task 5.2.
 *
 * @param client - The TCGC client type.
 * @returns An array of service methods to render as class methods.
 */
function collectClientMethods(
  client: SdkClientType<SdkHttpOperation>,
): SdkServiceMethod<SdkHttpOperation>[] {
  return [...client.methods];
}

/**
 * Extracts required (non-default, non-optional) endpoint template arguments.
 *
 * Replicates the logic from `client-context.tsx` to ensure the constructor
 * signature matches the factory function signature exactly.
 *
 * @param endpointParam - The TCGC endpoint parameter.
 * @returns An array of required template argument path parameters.
 */
function getRequiredEndpointArgs(
  endpointParam: SdkEndpointParameter,
): { name: string; type: { kind: string } & any }[] {
  const endpointType = endpointParam.type;

  if (endpointType.kind === "endpoint") {
    return endpointType.templateArguments.filter(
      (arg) => !arg.optional && arg.clientDefaultValue === undefined,
    );
  }

  if (endpointType.kind === "union") {
    for (const variant of endpointType.variantTypes) {
      if (variant.kind === "endpoint") {
        return variant.templateArguments.filter(
          (arg: any) => !arg.optional && arg.clientDefaultValue === undefined,
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
 * - `apiKey` / `http` → `KeyCredential`
 * - `oauth2` / `openIdConnect` → `TokenCredential`
 *
 * When multiple auth schemes are supported, produces a union type.
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
 * Determines whether the classical client constructor needs overloads
 * for optional subscriptionId handling.
 *
 * Constructor overloads are needed when an ARM service has both:
 * 1. A `subscriptionId` client initialization parameter (indicating some operations
 *    are subscription-scoped)
 * 2. Tenant-level operations that don't require subscriptionId
 *
 * In this scenario, the constructor generates two overloads:
 * - One without subscriptionId (for consumers only using tenant-level operations)
 * - One with subscriptionId (for consumers using subscription-level operations)
 * Plus an implementation signature with a `subscriptionIdOrOptions` discriminator.
 *
 * @param client - The TCGC client type.
 * @returns True if constructor overloads are needed.
 */
function needsConstructorOverloads(
  client: SdkClientType<SdkHttpOperation>,
): boolean {
  const requiredMethodParams = getRequiredMethodParams(client);
  const hasSubscriptionId = requiredMethodParams.some(
    (p) => p.name.toLowerCase() === "subscriptionid",
  );

  if (!hasSubscriptionId) return false;

  return hasTenantLevelOperations(client);
}

/**
 * Checks whether the client has any tenant-level operations — operations
 * that don't require subscriptionId in their HTTP path.
 *
 * ARM services can have a mix of:
 * - Subscription-level operations (e.g., resource CRUD under /subscriptions/{subscriptionId}/...)
 * - Tenant-level operations (e.g., listing SKUs at /providers/Namespace/skus)
 *
 * Standard ARM boilerplate operations are excluded from the check:
 * - `Azure.ResourceManager.Operations.list` (the standard operations list endpoint)
 * - Provider-level `checkNameAvailability` actions
 *
 * These exclusions match the legacy emitter's `isTenantLevelOperation()` behavior
 * to ensure the same services get constructor overloads.
 *
 * @param client - The TCGC client type.
 * @returns True if at least one non-boilerplate tenant-level operation exists.
 */
function hasTenantLevelOperations(
  client: SdkClientType<SdkHttpOperation>,
): boolean {
  const allMethods = collectAllMethods(client);

  for (const method of allMethods) {
    if (isTenantLevelOperation(method, client)) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively collects all service methods from a client and its children.
 *
 * @param client - The TCGC client type.
 * @returns A flat array of all service methods across the client hierarchy.
 */
function collectAllMethods(
  client: SdkClientType<SdkHttpOperation>,
): SdkServiceMethod<SdkHttpOperation>[] {
  const methods: SdkServiceMethod<SdkHttpOperation>[] = [...client.methods];
  for (const child of client.children ?? []) {
    methods.push(...collectAllMethods(child));
  }
  return methods;
}

/**
 * Determines whether a single operation is tenant-level (doesn't use
 * the client's subscriptionId).
 *
 * An operation is considered tenant-level if:
 * - It has NO subscriptionId path parameter marked as `onClient`
 * - AND it is not a standard ARM boilerplate operation (Operations.list,
 *   checkNameAvailability) which are excluded from the tenant-level check
 *
 * @param method - The TCGC service method to check.
 * @param client - The parent client type (used for namespace-based exclusions).
 * @returns True if the operation is a non-boilerplate tenant-level operation.
 */
function isTenantLevelOperation(
  method: SdkServiceMethod<SdkHttpOperation>,
  client: SdkClientType<SdkHttpOperation>,
): boolean {
  const operation = method.operation;

  // Check if this operation has a client-level subscriptionId path parameter
  const subscriptionIdParam = operation.parameters.find(
    (param) =>
      param.name.toLowerCase() === "subscriptionid" && param.kind === "path",
  );

  if (subscriptionIdParam && subscriptionIdParam.onClient) {
    // Operation uses the client's subscriptionId → NOT tenant-level
    return false;
  }

  if (!subscriptionIdParam) {
    // No subscriptionId param — check if this is a standard ARM boilerplate operation
    // that should be excluded from the tenant-level detection

    // Exclude Azure.ResourceManager.Operations.list
    if (
      method.crossLanguageDefinitionId
        ?.toLowerCase()
        .includes("azure.resourcemanager.operations.list")
    ) {
      return false;
    }

    // Exclude provider-level checkNameAvailability actions
    const pathLower = operation.path.toLowerCase();
    const namespaceLower = (client.namespace ?? "").toLowerCase();
    if (
      namespaceLower &&
      pathLower.includes(`${namespaceLower}/checknameavailability`)
    ) {
      return false;
    }
  }

  // Operation is tenant-level (no client subscriptionId usage, not boilerplate)
  return true;
}

/**
 * Renders constructor overload signatures and implementation for mixed
 * tenant/subscription-level ARM services.
 *
 * Generates three constructor forms:
 * 1. Overload signature without subscriptionId: `constructor(credential, options?)`
 * 2. Overload signature with subscriptionId: `constructor(credential, subscriptionId, options?)`
 * 3. Implementation with discriminator: `constructor(credential, subscriptionIdOrOptions?, options?)`
 *
 * The implementation body uses `typeof` checks to determine whether the second
 * parameter is a string (subscriptionId) or an object (options), matching the
 * legacy emitter's polymorphic constructor pattern.
 *
 * Uses raw `code` templates for overload signatures because Alloy's ClassMethod
 * component doesn't support body-less declarations.
 *
 * @param props - Component props containing the TCGC client type.
 * @returns Alloy JSX tree for the overloaded constructor.
 */
function OverloadedConstructor(props: {
  client: SdkClientType<SdkHttpOperation>;
}) {
  const { client } = props;
  const initParams = client.clientInitialization.parameters;

  // Build prefix parameter fragments (before subscriptionId) using proper refkeys
  const prefixParamFragments: Children[] = [];
  const prefixArgNames: string[] = [];

  const endpointParam = initParams.find(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  if (endpointParam) {
    for (const arg of getRequiredEndpointArgs(endpointParam)) {
      prefixParamFragments.push(
        code`${arg.name}: ${getTypeExpression(arg.type)}`,
      );
      prefixArgNames.push(arg.name);
    }
  }

  const credentialParam = initParams.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );
  if (credentialParam) {
    prefixParamFragments.push(
      code`credential: ${getCredentialTypeExpression(credentialParam)}`,
    );
    prefixArgNames.push("credential");
  }

  // Build the factory call arguments without options — options will be wrapped with userAgentPrefix
  const factoryCallPrefix = [...prefixArgNames, 'subscriptionId ?? ""'].join(
    ", ",
  );

  const childClients = client.children ?? [];
  const optionsRef = clientOptionsRefkey(client);

  // Construct the prefix param string for use in overload signatures
  // Each overload signature is a single code template with refkey interpolation
  return (
    <>
      {code`constructor(`}
      {prefixParamFragments.map((f, i) => (
        <>
          {i > 0 && ", "}
          {f}
        </>
      ))}
      {prefixParamFragments.length > 0 && ", "}
      {code`options?: ${optionsRef});`}
      {"\n"}
      {code`constructor(`}
      {prefixParamFragments.map((f, i) => (
        <>
          {i > 0 && ", "}
          {f}
        </>
      ))}
      {prefixParamFragments.length > 0 && ", "}
      {code`subscriptionId: string, options?: ${optionsRef});`}
      {"\n"}
      {code`constructor(`}
      {prefixParamFragments.map((f, i) => (
        <>
          {i > 0 && ", "}
          {f}
        </>
      ))}
      {prefixParamFragments.length > 0 && ", "}
      {code`subscriptionIdOrOptions?: string | ${optionsRef}, options?: ${optionsRef}) {`}
      {"\n"}
      {code`  let subscriptionId: string | undefined;`}
      {"\n\n"}
      {code`  if (typeof subscriptionIdOrOptions === "string") {`}
      {"\n"}
      {code`    subscriptionId = subscriptionIdOrOptions;`}
      {"\n"}
      {code`  } else if (typeof subscriptionIdOrOptions === "object") {`}
      {"\n"}
      {code`    options = subscriptionIdOrOptions;`}
      {"\n"}
      {code`  }`}
      {"\n\n"}
      {code`  options = options ?? {};`}
      {"\n"}
      {code`  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;`}
      {"\n"}
      {code`  const userAgentPrefix = prefixFromOptions ? \`\${prefixFromOptions} azsdk-js-client\` : \`azsdk-js-client\`;`}
      {"\n"}
      {code`  this._client = ${createClientRefkey(client)}(${factoryCallPrefix}, {
    ...options,
    userAgentOptions: { userAgentPrefix },
  });`}
      {"\n"}
      {code`  this.pipeline = this._client.pipeline;`}
      {childClients.map((child) => (
        <>
          {"\n"}
          {code`  this.${camelCase(child.name)} = ${operationGroupFactoryRefkey(child)}(this._client);`}
        </>
      ))}
      {"\n"}
      {code`}`}
    </>
  );
}

/**
 * Converts a PascalCase name to camelCase by lowercasing the first character.
 *
 * Used for generating file paths from client names. For example,
 * `TestingClient` → `testingClient.ts`.
 *
 * @param name - The PascalCase name to convert.
 * @returns The camelCase version of the name.
 */
function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
