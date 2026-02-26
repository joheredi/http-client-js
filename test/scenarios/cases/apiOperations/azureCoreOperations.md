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
  errorResponseDeserializer,
  type ResourceOperationStatusWidgetSuiteWidgetSuiteError,
  resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer,
} from "../models/models.js";
import { GetWidgetOperationStatusOptionalParams } from "./widgets/options.js";
import {
  Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@azure-rest/core-client";
import { expandUrlTemplate } from "@typespec/ts-http-runtime";

export function _getWidgetOperationStatusSend(
  context: Client,
  apiVersion: string,
  name: string,
  operationId: string,
  options: GetWidgetOperationStatusOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/widgets/{name}/operations/{operationId}{?api%2Dversion}",
    { "api%2Dversion": apiVersion, name: name, operationId: operationId },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getWidgetOperationStatusDeserialize(
  result: PathUncheckedResponse,
): Promise<ResourceOperationStatusWidgetSuiteWidgetSuiteError> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    error.details = errorResponseDeserializer(result.body);
    throw error;
  }

  return resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer(
    result.body,
  );
}

/**
 * Get the status of a long-running operation on widgets.
 *
 * @param {Client} context
 * @param {string} apiVersion
 * @param {string} name
 * @param {string} operationId
 * @param {GetWidgetOperationStatusOptionalParams} options
 */
export async function getWidgetOperationStatus(
  context: Client,
  apiVersion: string,
  name: string,
  operationId: string,
  options: GetWidgetOperationStatusOptionalParams = { requestOptions: {} },
): Promise<ResourceOperationStatusWidgetSuiteWidgetSuiteError> {
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
  error?: ErrorModel;
  /**
   * The result of the operation.
   */
  result?: WidgetSuite;
}

/**
 * The error object.
 */
export interface ErrorModel {
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
  details?: ErrorModel[];
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
  error: ErrorModel;
  /**
   * String error code indicating what went wrong.
   */
  errorCode?: string;
}

/**
 * Enum describing allowed operation states.
 */
export type OperationState =
  | "NotStarted"
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Canceled";

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

export function errorDeserializer(item: any): ErrorModel {
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
