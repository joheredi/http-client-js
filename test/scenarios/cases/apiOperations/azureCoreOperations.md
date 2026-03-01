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
  type ResourceOperationStatusWidgetSuiteWidgetSuiteError,
  resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer,
} from "../../models/models.js";
import { GetWidgetOperationStatusOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@azure-rest/core-client";
import { expandUrlTemplate } from "../../static-helpers/urlTemplate.js";
import { TestingContext } from "../../testingClientContext.js";

export function _getWidgetOperationStatusSend(
  context: TestingContext,
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
    throw createRestError(result);
  }

  return resourceOperationStatusWidgetSuiteWidgetSuiteErrorDeserializer(
    result.body,
  );
}

/**
 * Get the status of a long-running operation on widgets.
 *
 * @param {TestingContext} context
 * @param {string} apiVersion
 * @param {string} name
 * @param {string} operationId
 * @param {GetWidgetOperationStatusOptionalParams} options
 */
export async function getWidgetOperationStatus(
  context: TestingContext,
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
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { ErrorModel } from "@azure-rest/core-client";

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
    error: !item["error"] ? item["error"] : item["error"],
    result: !item["result"]
      ? item["result"]
      : widgetSuiteDeserializer(item["result"]),
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
```
