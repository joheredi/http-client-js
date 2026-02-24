import { code, For, SourceDirectory } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkCredentialParameter,
  SdkEndpointParameter,
  SdkHttpOperation,
  SdkHttpOperationExample,
  SdkHttpParameterExampleValue,
  SdkMethodParameter,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { getClientName } from "./client-context.js";
import { isRequiredSignatureParameter } from "./send-operation.js";
import { getExampleValueCode } from "../utils/example-values.js";

/**
 * Orchestrator component that generates all sample files for the emitter output.
 *
 * This component iterates through all clients in the SDK package, collects
 * operations that have TCGC examples defined, and generates one sample file
 * per operation in the `samples-dev/` directory. Each sample file demonstrates
 * how to use the generated SDK client to call a specific operation.
 *
 * If no operations have examples, this component renders nothing (returns
 * undefined so Alloy skips it in the output tree).
 *
 * The generated samples use the classical client class (e.g., `new FooClient(...)`)
 * and demonstrate realistic parameter values from the TypeSpec examples.
 *
 * @returns An Alloy JSX tree with the `samples-dev/` directory, or undefined
 *          if no operations have examples.
 */
export function SampleFiles() {
  const { clients } = useSdkContext();

  const sampleInfos = collectSampleInfos(clients);

  if (sampleInfos.length === 0) {
    return undefined;
  }

  return (
    <SourceDirectory path="samples-dev">
      <For each={sampleInfos}>
        {(info) => <SampleFile info={info} />}
      </For>
    </SourceDirectory>
  );
}

// ============================================================================
// Types
// ============================================================================

/**
 * Information needed to generate a single sample file for one operation.
 *
 * Captures the operation's examples, the client hierarchy (for building
 * the method call chain like `client.widgets.getWidget(...)`), credential
 * info, and endpoint parameters.
 */
interface SampleInfo {
  /** The top-level client type (for client class name and constructor params). */
  topLevelClient: SdkClientType<SdkHttpOperation>;
  /** The method that the sample demonstrates. */
  method: SdkServiceMethod<SdkHttpOperation>;
  /** The TCGC examples for this operation. */
  examples: SdkHttpOperationExample[];
  /** The camelCase prefix path for the method call chain (e.g., ["widgets"]). */
  callChainPrefixes: string[];
  /** The sample file name (e.g., "getWidgetSample.ts"). */
  fileName: string;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Props for the {@link SampleFile} component.
 */
interface SampleFileProps {
  /** The sample info containing all data needed to render the sample. */
  info: SampleInfo;
}

/**
 * Renders a single sample file for one operation.
 *
 * Each sample file contains:
 * 1. A file path comment (`/** This file path is /samples-dev/...`)
 * 2. Import statements (client class from package, credentials if needed)
 * 3. One async function per example with JSDoc documentation
 * 4. A `main()` function that calls all example functions
 * 5. `main().catch(console.error)` for error handling
 *
 * The import uses the package name (not a relative path) because sample
 * files are in `samples-dev/` and import the SDK as a dependency. Since
 * Alloy's refkey system generates relative imports (unsuitable here),
 * the import is rendered as a raw string.
 *
 * @param props - The component props containing the sample info.
 * @returns An Alloy JSX tree for the sample source file.
 */
function SampleFile(props: SampleFileProps) {
  const { info } = props;
  const { topLevelClient, method, examples } = info;

  const clientClassName = topLevelClient.name;
  const apiVersion = getApiVersion(topLevelClient);
  const exampleFunctions = examples.map((example) =>
    buildExampleFunction(example, info),
  );
  const functionNames = exampleFunctions.map((f) => f.name);

  // Build import line — uses package name placeholder since samples
  // import the SDK as an external package dependency
  const importLines = buildSampleImports(topLevelClient, clientClassName);

  // Build main function
  const mainBody = functionNames.map((name) => `  await ${name}();`).join("\n");

  const fileComment = `/** This file path is /samples-dev/${info.fileName} */`;

  const exampleBodies = exampleFunctions
    .map((f) => {
      const jsdoc = buildExampleJsDoc(f.example, apiVersion);
      return `${jsdoc}\nasync function ${f.name}(): Promise<void> {\n${f.body}\n}`;
    })
    .join("\n\n");

  const content = `${fileComment}
${importLines}

${exampleBodies}

async function main(): Promise<void> {
${mainBody}
}

main().catch(console.error);
`;

  return <SourceFile path={info.fileName}>{content}</SourceFile>;
}

// ============================================================================
// Data collection
// ============================================================================

/**
 * Collects sample info for all operations with examples across all clients.
 *
 * Performs a BFS traversal of the client hierarchy (root → children → grandchildren)
 * and collects operations that have `operation.examples` defined. For each such
 * operation, creates a `SampleInfo` with the call chain prefix, file name, and
 * example data needed to generate the sample file.
 *
 * @param clients - The top-level clients from the SDK package.
 * @returns An array of SampleInfo objects, one per operation with examples.
 */
function collectSampleInfos(
  clients: SdkClientType<SdkHttpOperation>[],
): SampleInfo[] {
  const infos: SampleInfo[] = [];

  for (const topLevelClient of clients) {
    // Collect from root client methods
    collectFromClient(topLevelClient, topLevelClient, [], infos);
  }

  return infos;
}

/**
 * Recursively collects sample infos from a client and its children.
 *
 * For each method with examples, creates a SampleInfo. For child clients,
 * appends the child's camelCase name to the call chain prefix so that
 * the generated sample calls the operation through the correct path
 * (e.g., `client.widgets.getWidget(...)` instead of `client.getWidget(...)`).
 *
 * @param client - The current client being processed.
 * @param topLevelClient - The root client (for constructor info).
 * @param prefixes - The accumulated call chain prefixes.
 * @param infos - The output array to push sample infos into.
 */
function collectFromClient(
  client: SdkClientType<SdkHttpOperation>,
  topLevelClient: SdkClientType<SdkHttpOperation>,
  prefixes: string[],
  infos: SampleInfo[],
): void {
  for (const method of client.methods) {
    const operation = method.operation;
    if (!operation.examples || operation.examples.length === 0) {
      continue;
    }

    const fileName = buildSampleFileName(prefixes, method.name);

    infos.push({
      topLevelClient,
      method,
      examples: operation.examples,
      callChainPrefixes: prefixes,
      fileName,
    });
  }

  // Recurse into children
  if (client.children) {
    for (const child of client.children) {
      collectFromClient(
        child,
        topLevelClient,
        [...prefixes, camelCase(child.name)],
        infos,
      );
    }
  }
}

// ============================================================================
// Sample code generation
// ============================================================================

/**
 * Represents a generated example function's metadata and body.
 */
interface ExampleFunctionInfo {
  /** The function name (camelCase). */
  name: string;
  /** The function body (TypeScript code). */
  body: string;
  /** The original TCGC example (for JSDoc generation). */
  example: SdkHttpOperationExample;
}

/**
 * Builds the body of a single example function.
 *
 * The function body:
 * 1. Initializes client parameters from environment variables
 * 2. Sets up credentials based on auth scheme (API key, OAuth2, etc.)
 * 3. Constructs the client instance
 * 4. Calls the operation with example parameter values
 * 5. Logs the result
 *
 * @param example - The TCGC example containing parameter values.
 * @param info - The sample info with client/method context.
 * @returns An ExampleFunctionInfo with the function name and body.
 */
function buildExampleFunction(
  example: SdkHttpOperationExample,
  info: SampleInfo,
): ExampleFunctionInfo {
  const { topLevelClient, method, callChainPrefixes } = info;
  const funcName = normalizeFunctionName(example.name);
  const lines: string[] = [];

  // 1. Setup client parameters from env vars
  const clientParams = buildClientConstructorParams(topLevelClient);
  for (const param of clientParams) {
    if (param.envVar) {
      lines.push(`  const ${param.name} = process.env.${param.envVar} || "";`);
    }
  }

  // 2. Setup credential
  const credentialCode = getCredentialSetupCode(topLevelClient);
  if (credentialCode) {
    lines.push(`  const credential = ${credentialCode};`);
  }

  // 3. Construct client
  const constructorArgs = clientParams
    .map((p) => p.name)
    .concat(credentialCode ? ["credential"] : []);
  lines.push(`  const client = new ${topLevelClient.name}(${constructorArgs.join(", ")});`);

  // 4. Build operation call
  const methodCallChain = callChainPrefixes.length > 0
    ? `client.${callChainPrefixes.join(".")}.${method.name}`
    : `client.${method.name}`;

  const callArgs = buildOperationCallArgs(method, example);
  const isPaging = method.kind === "paging" || method.kind === "lropaging";

  if (isPaging) {
    lines.push(`  const resArray = new Array();`);
    lines.push(`  for await (const item of ${methodCallChain}(${callArgs})) {`);
    lines.push(`    resArray.push(item);`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  console.log(resArray);`);
  } else {
    lines.push(`  const result = await ${methodCallChain}(${callArgs});`);
    lines.push(`  console.log(result);`);
  }

  return {
    name: funcName,
    body: lines.join("\n"),
    example,
  };
}

/**
 * Builds the import lines for a sample file.
 *
 * Generates two types of imports:
 * 1. The client class from the SDK package (using `@azure/internal-test`
 *    as the default package name)
 * 2. `DefaultAzureCredential` from `@azure/identity` for OAuth2 auth
 *
 * @param client - The TCGC client type.
 * @param clientClassName - The name of the classical client class.
 * @returns A string containing all import declarations.
 */
function buildSampleImports(
  client: SdkClientType<SdkHttpOperation>,
  clientClassName: string,
): string {
  const lines: string[] = [];

  // Import client class — use placeholder package name
  // The actual package name comes from emitter configuration at build time
  const packageName = "@azure/internal-test";
  lines.push(`import { ${clientClassName} } from "${packageName}";`);

  // Import DefaultAzureCredential for OAuth2/bearer auth
  if (hasOAuth2Auth(client)) {
    lines.push(`import { DefaultAzureCredential } from "@azure/identity";`);
  }

  return lines.join("\n");
}

/**
 * Builds the JSDoc comment for an example function.
 *
 * Generates a JSDoc block with:
 * - A description derived from the operation's doc/summary
 * - A `@summary` tag with the lowercase description
 * - An `x-ms-original-file` reference to the example source
 *
 * @param example - The TCGC example with metadata.
 * @param apiVersion - The API version string for the original file reference.
 * @returns A JSDoc comment string.
 */
function buildExampleJsDoc(
  example: SdkHttpOperationExample,
  apiVersion: string | undefined,
): string {
  const doc = example.doc || `execute ${example.name}`;
  const summary = doc.charAt(0).toLowerCase() + doc.slice(1);
  const filePath = example.filePath
    ? example.filePath.replace(/^.*[/\\]/, "")
    : "json.json";
  const version = apiVersion ?? "unknown";

  return `/**
 * This sample demonstrates how to ${summary}
 *
 * @summary ${summary}
 * x-ms-original-file: ${version}/${filePath}
 */`;
}

// ============================================================================
// Client parameter helpers
// ============================================================================

/**
 * Represents a client constructor parameter for the sample.
 */
interface ClientParam {
  /** The parameter name in the sample code. */
  name: string;
  /** The environment variable name (or undefined if hardcoded). */
  envVar?: string;
}

/**
 * Builds the list of constructor parameters for the client in the sample.
 *
 * Extracts required endpoint parameters from the client's initialization
 * configuration. Each endpoint parameter without a default becomes a
 * required constructor argument initialized from an environment variable.
 *
 * Parameters with default values (like `endpoint` with a default URL) are
 * NOT included because the client will use the default automatically.
 *
 * @param client - The TCGC client type.
 * @returns An array of ClientParam objects for the constructor.
 */
function buildClientConstructorParams(
  client: SdkClientType<SdkHttpOperation>,
): ClientParam[] {
  const params: ClientParam[] = [];
  const initParams = client.clientInitialization.parameters;
  const clientName = getClientName(client);

  const endpointParam = initParams.find(
    (p): p is SdkEndpointParameter => p.kind === "endpoint",
  );

  if (endpointParam) {
    const endpointType = endpointParam.type;
    if (endpointType.kind === "endpoint") {
      for (const arg of endpointType.templateArguments) {
        if (!arg.optional && arg.clientDefaultValue === undefined) {
          params.push({
            name: arg.name,
            envVar: toUpperSnakeCase(clientName) + "_" + toUpperSnakeCase(arg.name),
          });
        }
      }
    } else if (endpointType.kind === "union") {
      for (const variant of endpointType.variantTypes) {
        if (variant.kind === "endpoint") {
          for (const arg of variant.templateArguments) {
            if (!arg.optional && arg.clientDefaultValue === undefined) {
              params.push({
                name: arg.name,
                envVar: toUpperSnakeCase(clientName) + "_" + toUpperSnakeCase(arg.name),
              });
            }
          }
          break;
        }
      }
    }
  }

  // Add non-credential, non-endpoint required params
  for (const param of initParams) {
    if (param.kind === "endpoint" || param.kind === "credential") continue;
    if (param.kind === "method" && !param.optional && param.clientDefaultValue === undefined) {
      params.push({
        name: param.name,
        envVar: toUpperSnakeCase(clientName) + "_" + toUpperSnakeCase(param.name),
      });
    }
  }

  return params;
}

/**
 * Gets the credential setup code for a sample file based on auth scheme.
 *
 * Returns the appropriate credential initialization code:
 * - OAuth2/OpenIDConnect: `new DefaultAzureCredential()`
 * - API Key: `{ key: "INPUT_YOUR_KEY_HERE" }`
 * - No auth: undefined (no credential needed)
 *
 * @param client - The TCGC client type with authentication configuration.
 * @returns A TypeScript expression string for credential setup, or undefined.
 */
function getCredentialSetupCode(
  client: SdkClientType<SdkHttpOperation>,
): string | undefined {
  const credentialParam = client.clientInitialization.parameters.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );

  if (!credentialParam) return undefined;

  const credType = credentialParam.type;

  if (credType.kind === "credential") {
    return getCredentialCodeForScheme(credType.scheme);
  }

  if (credType.kind === "union") {
    // Use first credential variant
    for (const variant of credType.variantTypes) {
      if (variant.kind === "credential") {
        return getCredentialCodeForScheme(variant.scheme);
      }
    }
  }

  return `{ key: "INPUT_YOUR_KEY_HERE" }`;
}

/**
 * Returns the TypeScript credential expression for a specific auth scheme.
 *
 * @param scheme - The auth scheme from TCGC.
 * @returns A TypeScript expression string for the credential.
 */
function getCredentialCodeForScheme(scheme: { type: string }): string {
  switch (scheme.type) {
    case "oauth2":
    case "openIdConnect":
      return "new DefaultAzureCredential()";
    case "apiKey":
    case "http":
      return `{ key: "INPUT_YOUR_KEY_HERE" }`;
    default:
      return `{ key: "INPUT_YOUR_KEY_HERE" }`;
  }
}

/**
 * Checks if a client uses OAuth2 or OpenIDConnect authentication.
 *
 * Used to determine whether to import `DefaultAzureCredential` from
 * `@azure/identity` in the sample file.
 *
 * @param client - The TCGC client type.
 * @returns True if the client uses OAuth2 or OpenIDConnect.
 */
function hasOAuth2Auth(client: SdkClientType<SdkHttpOperation>): boolean {
  const credentialParam = client.clientInitialization.parameters.find(
    (p): p is SdkCredentialParameter => p.kind === "credential",
  );

  if (!credentialParam) return false;

  const credType = credentialParam.type;
  if (credType.kind === "credential") {
    return credType.scheme.type === "oauth2" || credType.scheme.type === "openIdConnect";
  }

  if (credType.kind === "union") {
    return credType.variantTypes.some(
      (v: any) =>
        v.kind === "credential" &&
        (v.scheme.type === "oauth2" || v.scheme.type === "openIdConnect"),
    );
  }

  return false;
}

// ============================================================================
// Operation call helpers
// ============================================================================

/**
 * Builds the argument list for the operation call in the sample.
 *
 * Maps TCGC example parameter values to the method's signature parameters.
 * Required parameters appear as positional arguments, and optional parameters
 * are collected into an options object.
 *
 * The function uses the method's parameter list (not the HTTP operation's
 * parameters) because the classical client method signature determines
 * the call syntax.
 *
 * @param method - The TCGC service method being called.
 * @param example - The TCGC example with parameter values.
 * @returns A comma-separated argument string for the method call.
 */
function buildOperationCallArgs(
  method: SdkServiceMethod<SdkHttpOperation>,
  example: SdkHttpOperationExample,
): string {
  const args: string[] = [];

  // Build a map from parameter serializedName/name to example value
  const exampleValueMap = buildExampleValueMap(example.parameters);

  // Process required parameters first (in order)
  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param)) {
      const exampleValue = findExampleValue(param, exampleValueMap);
      if (exampleValue) {
        args.push(getExampleValueCode(exampleValue));
      } else {
        // Fallback: use a placeholder for required params without examples
        args.push(getDefaultPlaceholder(param));
      }
    }
  }

  // Collect optional parameters into an options object
  const optionalEntries: string[] = [];
  for (const param of method.parameters) {
    if (!isRequiredSignatureParameter(param) && param.name !== "options") {
      const exampleValue = findExampleValue(param, exampleValueMap);
      if (exampleValue) {
        optionalEntries.push(`${param.name}: ${getExampleValueCode(exampleValue)}`);
      }
    }
  }

  // Also check for HTTP-level optional parameters (query, header) in examples
  for (const exParam of example.parameters) {
    const httpParam = exParam.parameter;
    // Skip body params and params already handled as method params
    if (httpParam.kind === "body") continue;

    const alreadyHandled = method.parameters.some(
      (p) =>
        p.name === httpParam.name ||
        (p as any).serializedName === httpParam.serializedName,
    );

    if (!alreadyHandled) {
      // These are likely query/header params that go into the options bag
      const propName = httpParam.name;
      optionalEntries.push(`${propName}: ${getExampleValueCode(exParam.value)}`);
    }
  }

  if (optionalEntries.length > 0) {
    args.push(`{ ${optionalEntries.join(", ")} }`);
  }

  return args.join(", ");
}

/**
 * Builds a lookup map from parameter names to example values.
 *
 * Creates a map keyed by both the serialized name and the client-side
 * name of each parameter, so lookups can match either naming convention.
 *
 * @param exampleParams - The TCGC example parameter values.
 * @returns A Map from parameter name to SdkExampleValue.
 */
function buildExampleValueMap(
  exampleParams: SdkHttpParameterExampleValue[],
): Map<string, SdkHttpParameterExampleValue> {
  const map = new Map<string, SdkHttpParameterExampleValue>();

  for (const ep of exampleParams) {
    map.set(ep.parameter.name, ep);
    if (ep.parameter.serializedName && ep.parameter.serializedName !== ep.parameter.name) {
      map.set(ep.parameter.serializedName, ep);
    }
  }

  return map;
}

/**
 * Finds the example value for a method parameter.
 *
 * Searches the example value map by the parameter's name and serialized name.
 * For body parameters, returns the example value directly since the body
 * is typically a model that maps to the method's body parameter.
 *
 * @param param - The TCGC method parameter.
 * @param map - The example value lookup map.
 * @returns The example value, or undefined if no example exists for this param.
 */
function findExampleValue(
  param: SdkMethodParameter,
  map: Map<string, SdkHttpParameterExampleValue>,
): import("@azure-tools/typespec-client-generator-core").SdkExampleValue | undefined {
  // Try client-side name first
  const byName = map.get(param.name);
  if (byName) return byName.value;

  // Try serialized name
  const serialized = (param as any).serializedName;
  if (serialized) {
    const bySerialized = map.get(serialized);
    if (bySerialized) return bySerialized.value;
  }

  // For body params, look for "body" or "resource" key in the map
  if (param.type.kind === "model") {
    const bodyParam = map.get("body") ?? map.get("resource");
    if (bodyParam) return bodyParam.value;
  }

  return undefined;
}

/**
 * Returns a type-appropriate placeholder value for a required parameter
 * that has no example value.
 *
 * @param param - The TCGC method parameter.
 * @returns A TypeScript expression string for the placeholder.
 */
function getDefaultPlaceholder(param: SdkMethodParameter): string {
  const typeKind = param.type.kind;
  switch (typeKind) {
    case "string":
      return `"${param.name}"`;
    case "int32":
    case "int64":
    case "float32":
    case "float64":
    case "numeric":
      return "0";
    case "boolean":
      return "true";
    case "model":
      return "{}";
    default:
      return `"${param.name}"`;
  }
}

// ============================================================================
// Naming helpers
// ============================================================================

/**
 * Builds the sample file name from the call chain prefix and operation name.
 *
 * The file name follows the legacy emitter convention:
 * - Single client: `{operationName}Sample.ts`
 * - With prefix: `{prefix}{OperationName}Sample.ts`
 *
 * @param prefixes - The call chain prefixes (e.g., ["widgets"]).
 * @param methodName - The operation method name.
 * @returns The file name string (e.g., "widgetsGetWidgetSample.ts").
 */
function buildSampleFileName(prefixes: string[], methodName: string): string {
  const prefix = prefixes.join("");
  const name = prefix
    ? `${prefix}${methodName.charAt(0).toUpperCase() + methodName.slice(1)}`
    : methodName;
  return `${name}Sample.ts`;
}

/**
 * Normalizes a TCGC example name into a valid JavaScript function name.
 *
 * Converts the example title (which may contain spaces, special characters)
 * into a camelCase identifier suitable for use as a function name.
 *
 * @param name - The raw example name from TCGC.
 * @returns A valid camelCase JavaScript function name.
 */
function normalizeFunctionName(name: string): string {
  // Replace special characters with spaces, then camelCase
  const cleaned = name
    .replace(/[^a-zA-Z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (cleaned.length === 0) return "example";

  return cleaned
    .map((word, i) =>
      i === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join("");
}

/**
 * Gets the API version string from a client's initialization parameters.
 *
 * Used for the `x-ms-original-file` reference in sample JSDoc comments.
 *
 * @param client - The TCGC client type.
 * @returns The API version string, or undefined if not configured.
 */
function getApiVersion(client: SdkClientType<SdkHttpOperation>): string | undefined {
  if (client.apiVersions && client.apiVersions.length > 0) {
    return client.apiVersions[client.apiVersions.length - 1];
  }
  return undefined;
}

/**
 * Converts a camelCase or PascalCase name to UPPER_SNAKE_CASE.
 *
 * Used for generating environment variable names from client and parameter
 * names. For example, `TestService` → `TEST_SERVICE`, `endpoint` → `ENDPOINT`.
 *
 * @param name - The camelCase or PascalCase name to convert.
 * @returns The UPPER_SNAKE_CASE version.
 */
function toUpperSnakeCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toUpperCase();
}

/**
 * Converts a PascalCase name to camelCase by lowercasing the first character.
 *
 * @param name - The PascalCase name to convert.
 * @returns The camelCase version.
 */
function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
