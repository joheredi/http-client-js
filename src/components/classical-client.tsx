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
import { getClientName } from "./client-context.js";
import { getOptionsParamName, isRequiredSignatureParameter } from "./send-operation.js";
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
 * is placed at the root of the source output (e.g., `testServiceClient.ts`).
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
 * export class TestServiceClient {
 *   private _client: TestServiceContext;
 *   public readonly pipeline: Pipeline;
 *
 *   constructor(endpointParam: string, options: TestServiceClientOptionalParams = {}) {
 *     this._client = createTestService(endpointParam, { ...options });
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
  const constructorParams = buildConstructorParameters(client);
  const constructorBody = buildConstructorBody(client);
  const methods = collectClientMethods(client);
  const childClients = client.children ?? [];

  return (
    <ClassDeclaration
      name={className}
      refkey={classicalClientRefkey(client)}
      export
    >
      <ClassField
        name="_client"
        private
        type={clientContextRefkey(client)}
      />
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
      <ClassMethod name="constructor" parameters={constructorParams}>
        {constructorBody}
      </ClassMethod>
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
 * 1. Calls the factory function with all constructor parameters to create
 *    the modular client context
 * 2. Assigns the context to `this._client`
 * 3. Delegates `this.pipeline` from the context's pipeline
 *
 * @param client - The TCGC client type.
 * @returns Alloy Children representing the constructor body statements.
 */
function buildConstructorBody(client: SdkClientType<SdkHttpOperation>): Children {
  const factoryArgs = buildFactoryCallArguments(client);
  const childClients = client.children ?? [];

  return (
    <>
      {code`this._client = ${createClientRefkey(client)}(${factoryArgs});`}
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
  const args: string[] = [];
  const initParams = client.clientInitialization.parameters;

  // Forward required endpoint parameters
  const endpointParam = initParams.find(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );
  if (endpointParam) {
    const requiredArgs = getRequiredEndpointArgs(endpointParam);
    for (const arg of requiredArgs) {
      args.push(arg.name);
    }
  }

  // Forward credential if present
  const credentialParam = initParams.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );
  if (credentialParam) {
    args.push("credential");
  }

  // Always forward options
  args.push("options");
  return args.join(", ");
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
    if (isRequiredSignatureParameter(param)) {
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
    if (isRequiredSignatureParameter(param)) {
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
 * Converts a PascalCase name to camelCase by lowercasing the first character.
 *
 * Used for generating file paths from client names. For example,
 * `TestServiceClient` → `testServiceClient.ts`.
 *
 * @param name - The PascalCase name to convert.
 * @returns The camelCase version of the name.
 */
function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
