# generate constant type model

## TypeSpec

```tsp
model StreamingChatCompletionOptions {
  stream: true;
  messages: "aaaaa";
  index: 123;
}
op read(@path id: string; @body body: StreamingChatCompletionOptions): {
  @bodyRoot result: StreamingChatCompletionOptions
};
```

## Models

```ts models
export interface StreamingChatCompletionOptions {
  stream: true;
  messages: "aaaaa";
  index: 123;
}

export function streamingChatCompletionOptionsSerializer(
  item: StreamingChatCompletionOptions,
): any {
  return {
    stream: item["stream"],
    messages: item["messages"],
    index: item["index"],
  };
}

export function streamingChatCompletionOptionsDeserializer(
  item: any,
): StreamingChatCompletionOptions {
  return {
    stream: item["stream"],
    messages: item["messages"],
    index: item["index"],
  };
}
```

## Operations

```ts operations
import {
  type StreamingChatCompletionOptions as StreamingChatCompletionOptions_1,
  streamingChatCompletionOptionsDeserializer as streamingChatCompletionOptionsDeserializer_1,
  streamingChatCompletionOptionsSerializer as streamingChatCompletionOptionsSerializer_1,
} from "../models/models.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  type OperationOptions as OperationOptions_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions_1 {}

export function _readSend(
  context: Client_1,
  id: string,
  body: StreamingChatCompletionOptions_1,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/{id}",
    { id: id },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: streamingChatCompletionOptionsSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<StreamingChatCompletionOptions_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return streamingChatCompletionOptionsDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  id: string,
  body: StreamingChatCompletionOptions_1,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<StreamingChatCompletionOptions_1> {
  const result = await _readSend(context, id, body, options);
  return _readDeserialize(result);
}
```

# generate only constant type model

## TypeSpec

```tsp
model StreamingChatCompletionOptions {
  stream: true;
  messages: "aaaaa";
  index: 123;
}
op read(...StreamingChatCompletionOptions): {
  @bodyRoot stream: true;
};
```

## Models

```ts models
export interface StreamingChatCompletionOptions {
  stream: true;
  messages: "aaaaa";
  index: 123;
}
```

## Operations

```ts operations
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  type OperationOptions as OperationOptions_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the read operation.
 */
export interface ReadOptionalParams extends OperationOptions_1 {}

export function _readSend(
  context: Client_1,
  stream: true,
  messages: "aaaaa",
  index: 123,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
    body: { stream: stream, messages: messages, index: index },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<true> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return result.body;
}

export async function read(
  context: Client_1,
  stream: true,
  messages: "aaaaa",
  index: 123,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<true> {
  const result = await _readSend(context, stream, messages, index, options);
  return _readDeserialize(result);
}
```

// We need to skip this case due to tcgc issue: https://github.com/Azure/typespec-azure/issues/3088

# skip: Should get the effective model name

## TypeSpec

```tsp
model TodoItem {
  /** The item's unique id */
  @visibility(Lifecycle.Read) @key id: safeint;

  /** The item's title */
  @maxLength(255)
  title: string;

  /** User that created the todo */
  @visibility(Lifecycle.Read) createdBy: string;

  /** User that the todo is assigned to */
  assignedTo?: string;

  /** A longer description of the todo item in markdown format */
  description?: string;

  /** The status of the todo item */
  status: "NotStarted" | "InProgress" | "Completed";

  /** When the todo item was created. */
  @visibility(Lifecycle.Read) createdAt: utcDateTime;

  /** When the todo item was last updated */
  @visibility(Lifecycle.Read) updatedAt: utcDateTime;

  /** When the todo item was makred as completed */
  @visibility(Lifecycle.Read) completedAt?: utcDateTime;

  // Want the read form to be normalized to TodoLabelRecord[], but can't
  // https://github.com/microsoft/typespec/issues/2926
  labels?: string[];

  // hack to get a different schema for create
  // (fastify glue doesn't support readonly)
  @visibility(Lifecycle.Create) dummy?: string;
}

op try(@header contentType: "multipart/form-data",
    @multipartBody body: {
  item: HttpPart<TodoItem>;
}): void;
```

## Models

```ts models
/** model interface _TryRequest */
export interface _TryRequest {
  item: {
    title: string;
    assignedTo?: string;
    description?: string;
    status: "NotStarted" | "InProgress" | "Completed";
    labels?: string[];
    dummy?: string;
  };
}

export function _tryRequestSerializer(item: _TryRequest): any {
  return [
    {
      name: "item",
      body: {
        title: title,
        assignedTo: options?.assignedTo,
        description: options?.description,
        status: status,
        labels: !options?.labels
          ? options?.labels
          : options?.labels.map((p: any) => {
              return p;
            }),
        dummy: options?.dummy,
      },
    },
  ];
}
```
