# should handle Azure Core LRO operations without placeholder issues

Azure Core LRO operations should generate proper TypeScript code without unresolved placeholders.

## TypeSpec

```tsp
using Azure.Core.Traits;

/** A widget. */
@resource("widgets")
model WidgetSuite {
  /** The widget name. */
  @key
  name: string;

  /** The ID of the widget's manufacturer. */
  manufacturerId: string;

  /** The faked shared model. */
  sharedModel?: FakedSharedModel;
}

/** Faked shared model */
model FakedSharedModel {
  /** The tag. */
  tag: string;

  /** The created date. */
  createdAt: offsetDateTime;
}

alias ServiceTraits = Azure.Core.Traits.SupportsRepeatableRequests &
  Azure.Core.Traits.SupportsConditionalRequests &
  Azure.Core.Traits.SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

interface Widgets {
  @doc("Get the status of a long-running operation on widgets.")
  getWidgetOperationStatus is Operations.GetResourceOperationStatus<WidgetSuite>;
}
```

The config would be like:

```yaml
needAzureCore: true
```

## Operations

```ts operations
import {
  type ResourceOperationStatusWidgetSuiteWidgetSuiteError as ResourceOperationStatusWidgetSuiteWidgetSuiteError_1,
  resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer as resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer_1,
} from "../models/models.js";
import { GetWidgetOperationStatusOptionalParams as GetWidgetOperationStatusOptionalParams_1 } from "./widgets/options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getWidgetOperationStatusSend(
  context: Client_1,
  apiVersion: string,
  name: string,
  operationId: string,
  options: GetWidgetOperationStatusOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/widgets/{name}/operations/{operationId}{?api%2Dversion}",
    { "api-version": apiVersion, name: name, operationId: operationId },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getWidgetOperationStatusDeserialize(
  result: PathUncheckedResponse_1,
): Promise<ResourceOperationStatusWidgetSuiteWidgetSuiteError_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer_1(
    result.body,
  );
}

/**
 * Get the status of a long-running operation on widgets.
 *
 * @param {Client_1} context
 * @param {string} apiVersion
 * @param {string} name
 * @param {string} operationId
 * @param {GetWidgetOperationStatusOptionalParams_1} options
 */
export async function getWidgetOperationStatus(
  context: Client_1,
  apiVersion: string,
  name: string,
  operationId: string,
  options: GetWidgetOperationStatusOptionalParams_1 = { requestOptions: {} },
): Promise<ResourceOperationStatusWidgetSuiteWidgetSuiteError_1> {
  const result = await _getWidgetOperationStatusSend(
    context,
    apiVersion,
    name,
    operationId,
    options,
  );
  return _getWidgetOperationStatusDeserialize(result);
}
```

Generate the models

```ts models
/**
 * Provides status details for long running operations.
 */
export interface ResourceOperationStatusWidgetSuiteWidgetSuiteError {
  /**
   * The unique ID of the operation.
   */
  id: string;
  /**
   * The status of the operation
   */
  status: OperationState;
  /**
   * Error object that describes the error when status is "Failed".
   */
  error?: Error;
  /**
   * The result of the operation.
   */
  result?: WidgetSuite;
}

/**
 * The error object.
 */
export interface Error {
  /**
   * One of a server-defined set of error codes.
   */
  code: string;
  /**
   * A human-readable representation of the error.
   */
  message: string;
  /**
   * The target of the error.
   */
  target?: string;
  /**
   * An array of details about specific errors that led to this reported error.
   */
  details?: Error[];
  /**
   * An object containing more specific information than the current object about the error.
   */
  innererror?: InnerError;
}

/**
 * An object containing more specific information about the error. As per Azure REST API guidelines - https://aka.ms/AzureRestApiGuidelines#handling-errors.
 */
export interface InnerError {
  /**
   * One of a server-defined set of error codes.
   */
  code?: string;
  /**
   * Inner error.
   */
  innererror?: InnerError;
}

/**
 * A widget.
 */
export interface WidgetSuite {
  /**
   * The widget name.
   */
  name: string;
  /**
   * The ID of the widget's manufacturer.
   */
  manufacturerId: string;
  /**
   * The faked shared model.
   */
  sharedModel?: FakedSharedModel;
}

/**
 * Faked shared model
 */
export interface FakedSharedModel {
  /**
   * The tag.
   */
  tag: string;
  /**
   * The created date.
   */
  createdAt: string;
}

/**
 * A response containing error details.
 */
export interface ErrorResponse {
  /**
   * The error object.
   */
  error: Error;
  /**
   * String error code indicating what went wrong.
   */
  errorCode?: string;
}

/**
 * Enum describing allowed operation states.
 */
export type OperationState = string;

/**
 * Enum describing allowed operation states.
 */
export enum KnownOperationState {
  /**
   * The operation has not started.
   */
  NotStarted = "NotStarted",
  /**
   * The operation is in progress.
   */
  Running = "Running",
  /**
   * The operation has completed successfully.
   */
  Succeeded = "Succeeded",
  /**
   * The operation has failed.
   */
  Failed = "Failed",
  /**
   * The operation has been canceled by the user.
   */
  Canceled = "Canceled",
}

export function resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer(
  item: any,
): ResourceOperationStatusWidgetSuiteWidgetSuiteError {
  return {
    id: item["id"],
    status: item["status"],
    error: !item["error"] ? item["error"] : errorDeserializer(item["error"]),
    result: !item["result"]
      ? item["result"]
      : widgetSuiteDeserializer(item["result"]),
  };
}

export function errorDeserializer(item: any): Error {
  return {
    code: item["code"],
    message: item["message"],
    target: item["target"],
    details: !item["details"]
      ? item["details"]
      : item["details"].map((p: any) => {
          return errorDeserializer(p);
        }),
    innererror: !item["innererror"]
      ? item["innererror"]
      : innerErrorDeserializer(item["innererror"]),
  };
}

export function innerErrorDeserializer(item: any): InnerError {
  return {
    code: item["code"],
    innererror: !item["innererror"]
      ? item["innererror"]
      : innerErrorDeserializer(item["innererror"]),
  };
}

export function widgetSuiteDeserializer(item: any): WidgetSuite {
  return {
    name: item["name"],
    manufacturerId: item["manufacturerId"],
    sharedModel: !item["sharedModel"]
      ? item["sharedModel"]
      : fakedSharedModelDeserializer(item["sharedModel"]),
  };
}

export function fakedSharedModelDeserializer(item: any): FakedSharedModel {
  return {
    tag: item["tag"],
    createdAt: item["createdAt"],
  };
}

export function errorResponseDeserializer(item: any): ErrorResponse {
  return {
    error: errorDeserializer(item["error"]),
    errorCode: item["errorCode"],
  };
}
```
