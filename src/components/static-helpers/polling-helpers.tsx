import { code, namekey } from "@alloy-js/core";
import {
  FunctionDeclaration,
  InterfaceDeclaration,
  InterfaceMember,
  SourceFile,
} from "@alloy-js/typescript";
import { pollingHelperRefkey } from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";
import { azureCoreLroLib } from "../../utils/external-packages.js";

/**
 * Renders the `static-helpers/pollingHelpers.ts` source file containing
 * types and functions for Long Running Operation (LRO) polling.
 *
 * Uses `@azure/core-lro`'s `createHttpPoller` to perform actual HTTP
 * polling against the operation-location or azure-async-operation URLs.
 * This matches the legacy emitter's pollingHelpers.ts output.
 *
 * The file provides:
 * - `GetLongRunningPollerOptions`: Options for the poller factory
 * - `getLongRunningPoller`: Factory function that creates a poller using core-lro
 * - `getLroResponse`: Converts REST responses to the core-lro response format
 * - `addApiVersionToUrl`: Ensures polling URLs carry the api-version param
 *
 * @returns An Alloy JSX tree for the polling helpers source file.
 */
export function PollingHelpersFile() {
  return (
    <SourceFile path="pollingHelpers.ts">
      <GetLongRunningPollerOptionsInterface />
      {"\n\n"}
      <GetLongRunningPollerFunction />
      {"\n\n"}
      <GetLroResponseFunction />
      {"\n\n"}
      <AddApiVersionToUrlFunction />
    </SourceFile>
  );
}

/**
 * Renders the `GetLongRunningPollerOptions` interface that configures
 * the `getLongRunningPoller` function.
 *
 * Includes options for polling interval, abort signal, resource location
 * config (from core-lro), initial response fetcher, and restore state.
 */
function GetLongRunningPollerOptionsInterface() {
  const runtimeLib = useRuntimeLib();
  return (
    <InterfaceDeclaration
      name="GetLongRunningPollerOptions"
      refkey={pollingHelperRefkey("GetLongRunningPollerOptions")}
      export
      typeParameters={[
        { name: namekey("TResponse", { ignoreNamePolicy: true }) },
      ]}
    >
      <InterfaceMember name="updateIntervalInMs" type="number" optional />
      {"\n"}
      <InterfaceMember
        name="abortSignal"
        type={code`${runtimeLib.AbortSignalLike}`}
        optional
      />
      {"\n"}
      <InterfaceMember
        name="resourceLocationConfig"
        type={code`${azureCoreLroLib.ResourceLocationConfig}`}
        optional
      />
      {"\n"}
      <InterfaceMember name="initialRequestUrl" type="string" optional />
      {"\n"}
      <InterfaceMember name="restoreFrom" type="string" optional />
      {"\n"}
      <InterfaceMember
        name="getInitialResponse"
        type={code`() => PromiseLike<TResponse>`}
        optional
      />
      {"\n"}
      <InterfaceMember name="apiVersion" type="string" optional />
      {"\n"}
      <InterfaceMember name="finalResultPath" type="string" optional />
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `getLongRunningPoller` function that creates a `PollerLike`
 * for tracking and polling a long-running operation.
 *
 * This is the core factory function called by LRO operation wrappers.
 * It delegates to `@azure/core-lro`'s `createHttpPoller` which handles:
 * - Sending the initial request via `sendInitialRequest`
 * - Polling the operation status via `sendPollRequest` (actual HTTP GETs)
 * - Deserializing the final result via `processResult`
 * - Managing the LRO lifecycle (operation-location, azure-async-operation, etc.)
 */
function GetLongRunningPollerFunction() {
  const runtimeLib = useRuntimeLib();
  return (
    <FunctionDeclaration
      name="getLongRunningPoller"
      refkey={pollingHelperRefkey("getLongRunningPoller")}
      export
      returnType={code`${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<TResult>, TResult>`}
      typeParameters={[
        {
          name: namekey("TResponse", { ignoreNamePolicy: true }),
          extends: runtimeLib.PathUncheckedResponse,
        },
        {
          name: namekey("TResult", { ignoreNamePolicy: true }),
          default: "void",
        },
      ]}
      parameters={[
        {
          name: namekey("client", { ignoreNamePolicy: true }),
          type: runtimeLib.Client,
        },
        {
          name: "processResponseBody",
          type: code`(result: TResponse) => Promise<TResult>`,
        },
        { name: "expectedStatuses", type: "string[]" },
        {
          name: "options",
          type: code`${pollingHelperRefkey("GetLongRunningPollerOptions")}<TResponse>`,
        },
      ]}
    >
      {code`const { restoreFrom, getInitialResponse, apiVersion, finalResultPath } = options;
if (!restoreFrom && !getInitialResponse) {
  throw new Error(
    "Either restoreFrom or getInitialResponse must be specified"
  );
}
let initialResponse: TResponse | undefined = undefined;
const pollAbortController = new AbortController();
const poller: ${azureCoreLroLib.RunningOperation}<TResponse> = {
  sendInitialRequest: async () => {
    if (!getInitialResponse) {
      throw new Error(
        "getInitialResponse is required when initializing a new poller"
      );
    }
    initialResponse = await getInitialResponse();
    return getLroResponse(initialResponse, expectedStatuses);
  },
  sendPollRequest: async (
    path: string,
    pollOptions?: {
      abortSignal?: ${runtimeLib.AbortSignalLike};
    }
  ) => {
    // The poll request would both listen to the user provided abort signal and the poller's own abort signal
    function abortListener(): void {
      pollAbortController.abort();
    }
    const abortSignal = pollAbortController.signal;
    if (options.abortSignal?.aborted) {
      pollAbortController.abort();
    } else if (pollOptions?.abortSignal?.aborted) {
      pollAbortController.abort();
    } else if (!abortSignal.aborted) {
      options.abortSignal?.addEventListener("abort", abortListener, {
        once: true
      });
      pollOptions?.abortSignal?.addEventListener("abort", abortListener, {
        once: true
      });
    }
    let response;
    try {
      const pollingPath = apiVersion
        ? addApiVersionToUrl(path, apiVersion)
        : path;
      response = await client.pathUnchecked(pollingPath).get({ abortSignal });
    } finally {
      options.abortSignal?.removeEventListener("abort", abortListener);
      pollOptions?.abortSignal?.removeEventListener("abort", abortListener);
    }

    return getLroResponse(response as TResponse, expectedStatuses);
  }
};
return ${azureCoreLroLib.createHttpPoller}(poller, {
  intervalInMs: options?.updateIntervalInMs,
  resourceLocationConfig: options?.resourceLocationConfig,
  restoreFrom: options?.restoreFrom,
  processResult: (result: unknown) => {
    const response = result as TResponse;
    if (finalResultPath && (response.body as Record<string, unknown>)?.[finalResultPath] !== undefined) {
      return processResponseBody({ ...response, body: (response.body as Record<string, unknown>)[finalResultPath] } as TResponse);
    }
    return processResponseBody(response);
  }
});`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `getLroResponse` helper that converts a REST client
 * response to the `OperationResponse` format expected by `@azure/core-lro`.
 *
 * Validates the response status against expected statuses and throws
 * a REST error if the status is unexpected.
 */
function GetLroResponseFunction() {
  const runtimeLib = useRuntimeLib();
  return (
    <FunctionDeclaration
      name="getLroResponse"
      returnType={code`${azureCoreLroLib.OperationResponse}<TResponse>`}
      typeParameters={[
        {
          name: namekey("TResponse", { ignoreNamePolicy: true }),
          extends: runtimeLib.PathUncheckedResponse,
        },
      ]}
      parameters={[
        { name: "response", type: "TResponse" },
        { name: "expectedStatuses", type: "string[]" },
      ]}
    >
      {code`if (!expectedStatuses.includes(response.status)) {
  throw ${runtimeLib.createRestError}(response);
}

return {
  flatResponse: response,
  rawResponse: {
    ...response,
    statusCode: Number.parseInt(response.status),
    body: response.body
  }
};`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `addApiVersionToUrl` helper that appends an `api-version`
 * query parameter to a URL if one is not already present.
 *
 * This ensures polling requests carry the correct api-version,
 * matching the initial request's version.
 */
function AddApiVersionToUrlFunction() {
  return (
    <FunctionDeclaration
      name="addApiVersionToUrl"
      returnType="string"
      parameters={[
        { name: "url", type: "string" },
        { name: "apiVersion", type: "string" },
      ]}
    >
      {code`// The base URL is only used for parsing and won't appear in the returned URL
const urlObj = new URL(url, "https://microsoft.com");
if (!urlObj.searchParams.get("api-version")) {
  // Append one if there is no apiVersion
  return \`\${url}\${
    Array.from(urlObj.searchParams.keys()).length > 0 ? "&" : "?"
  }api-version=\${apiVersion}\`;
}
return url;`}
    </FunctionDeclaration>
  );
}
