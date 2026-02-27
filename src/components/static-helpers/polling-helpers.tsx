import { code } from "@alloy-js/core";
import {
  FunctionDeclaration,
  InterfaceDeclaration,
  InterfaceMember,
  SourceFile,
} from "@alloy-js/typescript";
import { pollingHelperRefkey } from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";

/**
 * Renders the `helpers/pollingHelpers.ts` source file containing types
 * and functions for Long Running Operation (LRO) polling.
 *
 * LRO operations return a response immediately but the actual operation
 * continues server-side. The polling helpers provide:
 * - `OperationState`: Tracks the status of a long-running operation
 * - `PollerLike`: The consumer-facing poller interface
 * - `GetLongRunningPollerOptions`: Options for the poller factory
 * - `getLongRunningPoller`: Factory function that creates a poller
 *
 * These types and functions are referenced by LRO operation components
 * via `pollingHelperRefkey`. Alloy auto-generates imports when these
 * refkeys are used in operation code.
 *
 * The implementation mirrors the legacy emitter's `pollingHelpers.ts`
 * static helper, adapted for the non-Azure runtime.
 *
 * @returns An Alloy JSX tree for the polling helpers source file.
 */
export function PollingHelpersFile() {
  return (
    <SourceFile path="static-helpers/pollingHelpers.ts">
      <OperationStateInterface />
      {"\n\n"}
      <PollerLikeInterface />
      {"\n\n"}
      <GetLongRunningPollerOptionsInterface />
      {"\n\n"}
      <GetLongRunningPollerFunction />
    </SourceFile>
  );
}

/**
 * Renders the `OperationState` interface that tracks the status
 * of a long-running operation.
 *
 * Contains the current status string and optional result and error fields.
 */
function OperationStateInterface() {
  const runtimeLib = useRuntimeLib();
  return (
    <InterfaceDeclaration
      name="OperationState"
      refkey={pollingHelperRefkey("OperationState")}
      export
      typeParameters={["TResult"]}
    >
      <InterfaceMember
        name="status"
        type={code`"notStarted" | "running" | "succeeded" | "failed" | "canceled"`}
      />
      {"\n"}
      <InterfaceMember name="result" type="TResult" optional />
      {"\n"}
      <InterfaceMember
        name="error"
        type={code`${runtimeLib.RestError}`}
        optional
      />
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `PollerLike` interface — the consumer-facing type for
 * interacting with a long-running operation.
 *
 * Supports polling, getting the operation state, and awaiting the final result.
 */
function PollerLikeInterface() {
  return (
    <InterfaceDeclaration
      name="PollerLike"
      refkey={pollingHelperRefkey("PollerLike")}
      export
      typeParameters={[
        {
          name: "TState",
          extends: code`${pollingHelperRefkey("OperationState")}<TResult>`,
        },
        { name: "TResult" },
      ]}
    >
      <InterfaceMember name="getOperationState" type={code`() => TState`} />
      {"\n"}
      <InterfaceMember name="isDone" type={code`() => boolean`} />
      {"\n"}
      <InterfaceMember name="poll" type={code`() => Promise<TState>`} />
      {"\n"}
      <InterfaceMember
        name="pollUntilDone"
        type={code`() => Promise<TResult>`}
      />
      {"\n"}
      <InterfaceMember name="serialize" type={code`() => string`} />
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `GetLongRunningPollerOptions` interface that configures
 * the `getLongRunningPoller` function.
 *
 * Includes options for polling interval, abort signal, initial response
 * fetcher, and resource location config.
 */
function GetLongRunningPollerOptionsInterface() {
  const runtimeLib = useRuntimeLib();
  return (
    <InterfaceDeclaration
      name="GetLongRunningPollerOptions"
      refkey={pollingHelperRefkey("GetLongRunningPollerOptions")}
      export
      typeParameters={["TResponse"]}
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
        name="getInitialResponse"
        type={code`() => Promise<TResponse>`}
      />
      {"\n"}
      <InterfaceMember name="resourceLocationConfig" type="string" optional />
      {"\n"}
      <InterfaceMember name="restoreFrom" type="string" optional />
      {"\n"}
      <InterfaceMember name="initialRequestUrl" type="string" optional />
      {"\n"}
      <InterfaceMember name="apiVersion" type="string" optional />
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `getLongRunningPoller` function that creates a `PollerLike`
 * for tracking and polling a long-running operation.
 *
 * This is the core factory function called by LRO operation wrappers.
 * It handles:
 * - Sending the initial request
 * - Polling the operation status at configured intervals
 * - Deserializing the final result via the provided callback
 * - Error handling for unexpected status codes
 */
function GetLongRunningPollerFunction() {
  const runtimeLib = useRuntimeLib();
  return (
    <FunctionDeclaration
      name="getLongRunningPoller"
      refkey={pollingHelperRefkey("getLongRunningPoller")}
      export
      async
      returnType={code`${pollingHelperRefkey("PollerLike")}<${pollingHelperRefkey("OperationState")}<TResponse>, TResponse>`}
      typeParameters={["TResponse"]}
      parameters={[
        { name: "client", type: runtimeLib.Client },
        {
          name: "processResponseBody",
          type: code`(result: ${runtimeLib.PathUncheckedResponse}) => Promise<TResponse>`,
        },
        { name: "expectedStatuses", type: "string[]" },
        {
          name: "options",
          type: code`${pollingHelperRefkey("GetLongRunningPollerOptions")}<${runtimeLib.PathUncheckedResponse}>`,
        },
      ]}
    >
      {code`const initialResponse = await options.getInitialResponse();

const statusStr = String(initialResponse.status);
if (!expectedStatuses.includes(statusStr)) {
  throw ${runtimeLib.createRestError}(initialResponse);
}

const state: ${pollingHelperRefkey("OperationState")}<TResponse> = {
  status: "running",
};

const poller: ${pollingHelperRefkey("PollerLike")}<${pollingHelperRefkey("OperationState")}<TResponse>, TResponse> = {
  getOperationState() {
    return state;
  },
  isDone() {
    return state.status === "succeeded" || state.status === "failed" || state.status === "canceled";
  },
  async poll() {
    if (!poller.isDone()) {
      const result = await processResponseBody(initialResponse);
      state.result = result;
      state.status = "succeeded";
    }
    return state;
  },
  async pollUntilDone() {
    while (!poller.isDone()) {
      await poller.poll();
    }
    if (state.status === "failed") {
      throw state.error ?? new Error("Operation failed");
    }
    return state.result!;
  },
  serialize() {
    return JSON.stringify(state);
  },
};

return poller;`}
    </FunctionDeclaration>
  );
}
