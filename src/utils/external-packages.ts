import { createPackage } from "@alloy-js/typescript";

/**
 * External package definition for `@typespec/ts-http-runtime`.
 *
 * This is the core HTTP runtime library used by generated TypeSpec clients.
 * It provides the fundamental client creation, request/response handling,
 * error management, authentication, and utility functions. When generating
 * non-Azure (vanilla TypeSpec) clients, all runtime symbols come from this
 * single package.
 *
 * Each named export becomes a typed refkey accessible as a property
 * (e.g., `httpRuntimeLib.Client`). Alloy auto-generates import statements
 * when these refkeys are used in `code` templates or component props.
 */
export const httpRuntimeLib = createPackage({
  name: "@typespec/ts-http-runtime",
  version: "0.2.1",
  descriptor: {
    ".": {
      named: [
        // Core client types and factory
        "Client",
        "ClientOptions",
        "getClient",

        // Request pipeline
        "Pipeline",

        // Operation handling
        "OperationOptions",
        "operationOptionsToRequestParameters",

        // Response types
        "StreamableMethod",
        "PathUncheckedResponse",

        // Error handling
        "RestError",
        "createRestError",
        "ErrorModel",

        // Cancellation
        "AbortSignalLike",

        // Binary/string conversions
        "uint8ArrayToString",
        "stringToUint8Array",

        // Authentication
        "KeyCredential",
        "isKeyCredential",
        "TokenCredential",
      ],
    },
  },
});

/**
 * External package definition for `@azure-rest/core-client`.
 *
 * In Azure-flavored SDKs, the core client types and functions come from
 * this package instead of `@typespec/ts-http-runtime`. It provides the
 * same logical symbols (Client, getClient, etc.) but from the Azure SDK
 * ecosystem. The emitter switches between `httpRuntimeLib` and this
 * package based on whether Azure flavor is enabled.
 */
export const azureCoreClientLib = createPackage({
  name: "@azure-rest/core-client",
  version: "^2.3.1",
  descriptor: {
    ".": {
      named: [
        "Client",
        "ClientOptions",
        "getClient",
        "RestError",
        "createRestError",
        "OperationOptions",
        "StreamableMethod",
        "PathUncheckedResponse",
        "operationOptionsToRequestParameters",
        "ErrorModel",
        // ErrorResponse is the Azure-specific error response shape
        "ErrorResponse",
      ],
    },
  },
});

/**
 * External package definition for `@azure/core-rest-pipeline`.
 *
 * Provides the HTTP pipeline abstraction for Azure SDKs. In Azure-flavored
 * clients, the `Pipeline` type comes from this package rather than the
 * core runtime.
 */
export const azureCorePipelineLib = createPackage({
  name: "@azure/core-rest-pipeline",
  version: "^1.19.0",
  descriptor: {
    ".": {
      named: ["Pipeline"],
    },
  },
});

/**
 * External package definition for `@azure/abort-controller`.
 *
 * Provides the `AbortSignalLike` type for Azure SDKs, enabling
 * cancellation of in-flight HTTP requests.
 */
export const azureAbortControllerLib = createPackage({
  name: "@azure/abort-controller",
  version: "^2.1.2",
  descriptor: {
    ".": {
      named: ["AbortSignalLike"],
    },
  },
});

/**
 * External package definition for `@azure/core-util`.
 *
 * Provides utility functions for binary/string conversions in Azure SDKs.
 * These are the Azure equivalents of the `uint8ArrayToString` and
 * `stringToUint8Array` functions from `@typespec/ts-http-runtime`.
 */
export const azureCoreUtilLib = createPackage({
  name: "@azure/core-util",
  version: "^1.11.0",
  descriptor: {
    ".": {
      named: ["uint8ArrayToString", "stringToUint8Array"],
    },
  },
});

/**
 * External package definition for `@azure/core-auth`.
 *
 * Provides authentication credential types for Azure SDKs. These types
 * are used in client factory function signatures to accept credential
 * objects for authenticating API requests.
 */
export const azureCoreAuthLib = createPackage({
  name: "@azure/core-auth",
  version: "^1.9.0",
  descriptor: {
    ".": {
      named: ["KeyCredential", "isKeyCredential", "TokenCredential"],
    },
  },
});

/**
 * External package definition for `@azure/core-lro`.
 *
 * Provides Long Running Operation (LRO) support for Azure SDKs. These
 * types and functions enable polling-based async operations that track
 * the state of operations that take extended time to complete (e.g.,
 * resource provisioning, bulk data processing).
 */
export const azureCoreLroLib = createPackage({
  name: "@azure/core-lro",
  version: "^3.1.0",
  descriptor: {
    ".": {
      named: [
        "PollerLike",
        "OperationState",
        "deserializeState",
        "ResourceLocationConfig",
      ],
    },
  },
});

/**
 * External package definition for `@azure/identity`.
 *
 * Provides the `DefaultAzureCredential` class for Azure SDKs. This is
 * typically used in sample code and documentation to show the simplest
 * way to authenticate with Azure services.
 */
export const azureIdentityLib = createPackage({
  name: "@azure/identity",
  version: "^4.6.0",
  descriptor: {
    ".": {
      named: ["DefaultAzureCredential"],
    },
  },
});
