import { Children, code, SourceDirectory } from "@alloy-js/core";
import {
  FunctionDeclaration,
  InterfaceDeclaration,
  InterfaceMember,
  SourceFile,
} from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import {
  azureCoreLroLib,
} from "../utils/external-packages.js";
import { useRuntimeLib } from "../context/flavor-context.js";
import {
  classicalClientRefkey,
  deserializeOperationRefkey,
  pollingHelperRefkey,
} from "../utils/refkeys.js";

/**
 * Information about an LRO operation needed for the deserialize map.
 *
 * Collected during BFS traversal of the client hierarchy to build
 * the operation-to-deserializer mapping in restorePollerHelpers.ts.
 */
interface LroOperationInfo {
  /** The TCGC service method for this LRO operation. */
  method: SdkServiceMethod<SdkHttpOperation>;
  /** The HTTP verb in uppercase (e.g., "PUT", "DELETE"). */
  verb: string;
  /** The URL path template (e.g., "/resources/{id}"). */
  path: string;
  /** The expected status codes formatted as quoted strings (e.g., '"200", "201"'). */
  expectedStatuses: string;
}

/**
 * Props for the {@link RestorePollerFile} component.
 */
export interface RestorePollerFileProps {
  /** The TCGC client type to generate restore poller helpers for. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Orchestrator component that generates `api/restorePollerHelpers.ts`.
 *
 * This file enables consumers to restore (rehydrate) a long-running operation
 * poller from its serialized state. This is useful when a poller needs to be
 * reconstructed on a different host or after the original scope is lost.
 *
 * The generated file contains:
 * - `RestorePollerOptions<TResult>` — configuration interface for restoration
 * - `restorePoller()` — the main function that reconstructs a poller
 * - `deserializeMap` — maps "VERB /path" to deserializer + expected statuses
 * - `getDeserializationHelper()` — URL template matching for routing
 * - Utility functions for path and API version extraction
 *
 * Only rendered when the client has at least one LRO operation. If no LRO
 * operations exist, the component returns `undefined` (emits nothing).
 *
 * @param props - The component props containing the TCGC client type.
 * @returns An Alloy JSX tree for the restore poller helpers file, or undefined.
 */
export function RestorePollerFile(props: RestorePollerFileProps) {
  const { client } = props;
  const lroOps = collectLroOperations(client);

  if (lroOps.length === 0) {
    return undefined;
  }

  return (
    <SourceDirectory path="api">
      <SourceFile path="restorePollerHelpers.ts">
        <RestorePollerOptionsInterface />
        {"\n\n"}
        <RestorePollerFunction client={client} lroOps={lroOps} />
        {"\n\n"}
        <DeserializationHelperInterface />
        {"\n\n"}
        <DeserializeMapDeclaration lroOps={lroOps} />
        {"\n\n"}
        <GetDeserializationHelperFunction />
        {"\n\n"}
        <GetPathFromMapKeyFunction />
        {"\n\n"}
        <GetApiVersionFromUrlFunction />
      </SourceFile>
    </SourceDirectory>
  );
}

/**
 * Renders the `RestorePollerOptions` interface.
 *
 * This interface extends `OperationOptions` and provides configuration
 * for restoring a serialized poller, including polling interval, abort
 * signal, and an optional custom response body processor.
 *
 * Generated output:
 * ```typescript
 * export interface RestorePollerOptions<
 *   TResult,
 *   TResponse extends PathUncheckedResponse = PathUncheckedResponse
 * > extends OperationOptions {
 *   updateIntervalInMs?: number;
 *   abortSignal?: AbortSignalLike;
 *   processResponseBody?: (result: TResponse) => Promise<TResult>;
 * }
 * ```
 */
function RestorePollerOptionsInterface() {
  const runtimeLib = useRuntimeLib();
  return (
    <InterfaceDeclaration
      name="RestorePollerOptions"
      refkey={pollingHelperRefkey("RestorePollerOptions")}
      export
      typeParameters={[
        { name: "TResult" },
        {
          name: "TResponse",
          extends: code`${runtimeLib.PathUncheckedResponse}`,
          default: code`${runtimeLib.PathUncheckedResponse}`,
        },
      ]}
      extends={runtimeLib.OperationOptions}
    >
      {code`/** Delay to wait until next poll, in milliseconds. */`}
      {"\n"}
      <InterfaceMember name="updateIntervalInMs" type="number" optional />
      {"\n"}
      {code`/** The signal which can be used to abort requests. */`}
      {"\n"}
      <InterfaceMember
        name="abortSignal"
        type={code`${runtimeLib.AbortSignalLike}`}
        optional
      />
      {"\n"}
      {code`/** Deserialization function for raw response body */`}
      {"\n"}
      <InterfaceMember
        name="processResponseBody"
        type={code`(result: TResponse) => Promise<TResult>`}
        optional
      />
    </InterfaceDeclaration>
  );
}

/**
 * Props for the {@link RestorePollerFunction} component.
 */
interface RestorePollerFunctionProps {
  /** The TCGC client type (used for the `client` parameter type). */
  client: SdkClientType<SdkHttpOperation>;
  /** The collected LRO operations (not used directly but confirms LRO exists). */
  lroOps: LroOperationInfo[];
}

/**
 * Renders the `restorePoller` function declaration.
 *
 * This is the main exported function that creates a poller from serialized
 * state. It:
 * 1. Deserializes the state to extract the initial URL and HTTP method
 * 2. Matches the URL against the deserialize map to find the right handler
 * 3. Delegates to `getLongRunningPoller` with the restored state
 *
 * The function accepts the classical client class as its first parameter
 * and extracts the internal `_client` context for use with the polling helper.
 *
 * @param props - Component props with client type and LRO operation list.
 * @returns An Alloy JSX tree for the function declaration.
 */
function RestorePollerFunction(props: RestorePollerFunctionProps) {
  const runtimeLib = useRuntimeLib();
  const { client } = props;

  const returnType = code`${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<TResult>, TResult>`;

  return (
    <FunctionDeclaration
      name="restorePoller"
      refkey={pollingHelperRefkey("restorePoller")}
      export
      returnType={returnType}
      typeParameters={[
        {
          name: "TResponse",
          extends: code`${runtimeLib.PathUncheckedResponse}`,
        },
        { name: "TResult" },
      ]}
      parameters={[
        { name: "client", type: classicalClientRefkey(client) },
        { name: "serializedState", type: "string" },
        {
          name: "sourceOperation",
          type: code`(...args: any[]) => ${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<TResult>, TResult>`,
        },
        {
          name: "options",
          type: code`${pollingHelperRefkey("RestorePollerOptions")}<TResult>`,
          optional: true,
        },
      ]}
    >
      {code`const pollerConfig = ${azureCoreLroLib.deserializeState}(serializedState).config;
const { initialRequestUrl, requestMethod, metadata } = pollerConfig;
if (!initialRequestUrl || !requestMethod) {
  throw new Error(
    \`Invalid serialized state: \${serializedState} for sourceOperation \${sourceOperation?.name}\`
  );
}
const resourceLocationConfig = metadata?.["resourceLocationConfig"] as
  | ${azureCoreLroLib.ResourceLocationConfig}
  | undefined;
const { deserializer, expectedStatuses = [] } =
  getDeserializationHelper(initialRequestUrl, requestMethod) ?? {};
const deserializeHelper = options?.processResponseBody ?? deserializer;
if (!deserializeHelper) {
  throw new Error(
    \`Please ensure the operation is in this client! We can't find its deserializeHelper for \${sourceOperation?.name}.\`
  );
}
const apiVersion = getApiVersionFromUrl(initialRequestUrl);
return ${pollingHelperRefkey("getLongRunningPoller")}(
  (client as any)["_client"] ?? client,
  deserializeHelper as (result: TResponse) => Promise<TResult>,
  expectedStatuses,
  {
    updateIntervalInMs: options?.updateIntervalInMs,
    abortSignal: options?.abortSignal,
    resourceLocationConfig,
    restoreFrom: serializedState,
    initialRequestUrl,
    apiVersion,
  },
);`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the private `DeserializationHelper` interface.
 *
 * This interface defines the shape of each entry in the deserialize map:
 * a deserializer function and the expected HTTP status codes.
 */
function DeserializationHelperInterface() {
  const runtimeLib = useRuntimeLib();
  return (
    <InterfaceDeclaration name="DeserializationHelper">
      <InterfaceMember
        name="deserializer"
        type={code`(result: ${runtimeLib.PathUncheckedResponse}) => Promise<unknown>`}
      />
      {"\n"}
      <InterfaceMember name="expectedStatuses" type="string[]" />
    </InterfaceDeclaration>
  );
}

/**
 * Props for the {@link DeserializeMapDeclaration} component.
 */
interface DeserializeMapDeclarationProps {
  /** The LRO operations to include in the deserialize map. */
  lroOps: LroOperationInfo[];
}

/**
 * Renders the `deserializeMap` constant that maps HTTP verb + path
 * combinations to their deserializer functions and expected status codes.
 *
 * Each entry uses a refkey reference to the operation's deserialize function,
 * enabling Alloy to auto-generate the correct cross-file imports.
 *
 * Generated output example:
 * ```typescript
 * const deserializeMap: Record<string, DeserializationHelper> = {
 *   "PUT /resources/{id}": {
 *     deserializer: _createResourceDeserialize,
 *     expectedStatuses: ["200", "201"],
 *   },
 * };
 * ```
 *
 * @param props - Component props with the LRO operation list.
 * @returns Alloy Children representing the deserialize map declaration.
 */
function DeserializeMapDeclaration(props: DeserializeMapDeclarationProps) {
  const { lroOps } = props;

  // Build map entries with refkey references to deserializer functions
  const entries: Children[] = [];
  lroOps.forEach((op, i) => {
    if (i > 0) entries.push(",\n  ");
    entries.push(
      code`"${op.verb} ${op.path}": { deserializer: ${deserializeOperationRefkey(op.method)}, expectedStatuses: [${op.expectedStatuses}] }`,
    );
  });

  return code`const deserializeMap: Record<string, DeserializationHelper> = {\n  ${entries}\n};`;
}

/**
 * Renders the `getDeserializationHelper` function that matches a runtime URL
 * against the static deserialize map entries.
 *
 * The matching algorithm:
 * 1. Parses the URL to extract the pathname
 * 2. Iterates all map entries, filtering by HTTP method
 * 3. For each candidate, compares path segments from right to left
 * 4. Template segments (e.g., `{id}`) match any value; suffix patterns
 *    (e.g., `{guid}:export`) use regex matching
 * 5. Returns the longest matching path's deserializer
 *
 * This matches the legacy emitter's URL routing algorithm exactly.
 */
function GetDeserializationHelperFunction() {
  return (
    <FunctionDeclaration
      name="getDeserializationHelper"
      returnType="DeserializationHelper | undefined"
      parameters={[
        { name: "urlStr", type: "string" },
        { name: "method", type: "string" },
      ]}
    >
      {code`const path = new URL(urlStr).pathname;
const pathParts = path.split("/");

// Traverse list to match the longest candidate
// matchedLen: the length of candidate path
// matchedValue: the matched deserialization helper
let matchedLen = -1,
  matchedValue: DeserializationHelper | undefined;

// Iterate the deserializeMap to find a match
for (const [key, value] of Object.entries(deserializeMap)) {
  // Extracting the path from the map key which is in format
  // GET /path/foo
  if (!key.startsWith(method)) {
    continue;
  }
  const candidatePath = getPathFromMapKey(key);
  // Get each part of the url path
  const candidateParts = candidatePath.split("/");

  // track if we have found a match to return the values found.
  let found = true;
  for (
    let i = candidateParts.length - 1, j = pathParts.length - 1;
    i >= 1 && j >= 1;
    i--, j--
  ) {
    if (
      candidateParts[i]?.startsWith("{") &&
      candidateParts[i]?.indexOf("}") !== -1
    ) {
      const start = candidateParts[i]!.indexOf("}") + 1,
        end = candidateParts[i]?.length;
      // If the current part of the candidate is a "template" part
      // Try to use the suffix of pattern to match the path
      // {guid} ==> $
      // {guid}:export ==> :export$
      const isMatched = new RegExp(
        \`\${candidateParts[i]?.slice(start, end)}\`
      ).test(pathParts[j] || "");

      if (!isMatched) {
        found = false;
        break;
      }
      continue;
    }

    // If the candidate part is not a template and
    // the parts don't match mark the candidate as not found
    // to move on with the next candidate path.
    if (candidateParts[i] !== pathParts[j]) {
      found = false;
      break;
    }
  }

  // We finished evaluating the current candidate parts
  // Update the matched value if and only if we found the longer pattern
  if (found && candidatePath.length > matchedLen) {
    matchedLen = candidatePath.length;
    matchedValue = value;
  }
}

return matchedValue;`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `getPathFromMapKey` utility function that extracts
 * the URL path portion from a map key formatted as "VERB /path".
 */
function GetPathFromMapKeyFunction() {
  return (
    <FunctionDeclaration
      name="getPathFromMapKey"
      returnType="string"
      parameters={[{ name: "mapKey", type: "string" }]}
    >
      {code`const pathStart = mapKey.indexOf("/");
return mapKey.slice(pathStart);`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `getApiVersionFromUrl` utility function that extracts
 * the `api-version` query parameter from a URL string.
 *
 * This is used to preserve the API version when restoring a poller,
 * ensuring the restored poller uses the same API version as the original.
 */
function GetApiVersionFromUrlFunction() {
  return (
    <FunctionDeclaration
      name="getApiVersionFromUrl"
      returnType="string | undefined"
      parameters={[{ name: "urlStr", type: "string" }]}
    >
      {code`const url = new URL(urlStr);
return url.searchParams.get("api-version") ?? undefined;`}
    </FunctionDeclaration>
  );
}

// ────────────────────────────────────────────────────────────────────
// Shared helpers (not components)
// ────────────────────────────────────────────────────────────────────

/**
 * Collects all LRO operations from the client hierarchy using BFS traversal.
 *
 * Walks the client tree (root client + child clients representing operation
 * groups) and collects every method with `kind: "lro"` or `kind: "lropaging"`.
 * Each collected operation includes the HTTP verb, path, and expected status
 * codes needed for the deserialize map.
 *
 * @param client - The root TCGC client type.
 * @returns An array of LRO operation info objects. Empty if no LRO operations exist.
 */
function collectLroOperations(
  client: SdkClientType<SdkHttpOperation>,
): LroOperationInfo[] {
  const lroOps: LroOperationInfo[] = [];
  const queue: SdkClientType<SdkHttpOperation>[] = [client];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const method of current.methods) {
      if (method.kind === "lro" || method.kind === "lropaging") {
        const operation = method.operation;
        const verb = operation.verb.toUpperCase();
        const path = operation.path;
        const expectedStatuses = buildExpectedStatusArray(method);

        lroOps.push({ method, verb, path, expectedStatuses });
      }
    }

    if (current.children) {
      for (const child of current.children) {
        queue.push(child);
      }
    }
  }

  return lroOps;
}

/**
 * Builds the expected HTTP status codes as a quoted, comma-separated string
 * for inclusion in the deserialize map's `expectedStatuses` array.
 *
 * Collects status codes from the operation's HTTP responses. For LRO
 * operations with non-GET verbs, additional polling status codes (200, 201,
 * 202) are added to match the legacy emitter's behavior.
 *
 * @param method - The TCGC service method.
 * @returns A string of quoted, comma-separated status codes (e.g., `"200", "201"`).
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
      const range = codes as { start: number; end: number };
      for (let i = range.start; i <= range.end; i++) {
        statusCodes.add(`"${i}"`);
      }
    }
  }

  // LRO operations need additional polling status codes
  if (method.operation.verb !== "get") {
    statusCodes.add(`"200"`);
    statusCodes.add(`"202"`);
    if (method.operation.verb !== "delete") {
      statusCodes.add(`"201"`);
    }
  }

  return Array.from(statusCodes).join(", ");
}
