# XML-only error deserialization

Tests that when an error model uses XML serialization and the error response content type is XML-only,
the generated deserialize function uses the XML deserializer directly.

## TypeSpec

```tsp
@error
@mediaTypeHint("application/xml")
model StorageError {
  @Xml.name("Code") code?: string;
  @Xml.name("Message") message?: string;
}

model Widget {
  id: string;
  name: string;
}

@route("/widgets/{id}")
@get
op getWidget(@path id: string): Widget | StorageError;
```

## Operations

```ts operations
import { type Widget, widgetDeserializer } from "../models/models.js";
import type { GetWidgetOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getWidgetSend(
  context: Client,
  id: string,
  options: GetWidgetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/widgets/{id}",
    { id: id },
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

export async function _getWidgetDeserialize(
  result: PathUncheckedResponse,
): Promise<Widget> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return widgetDeserializer(result.body);
}

export async function getWidget(
  context: Client,
  id: string,
  options: GetWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget> {
  const result = await _getWidgetSend(context, id, options);
  return _getWidgetDeserialize(result);
}
```

# Dual-format error deserialization

Tests that when an error model uses XML serialization and the error response supports both XML and JSON,
the generated deserialize function uses runtime content-type detection to choose the correct deserializer.

## TypeSpec

```tsp
@error
model ApiError {
  @Xml.name("Code") code?: string;
  @Xml.name("Message") message?: string;
}

model Document {
  id: string;
  content: string;
}

@route("/documents/{id}")
@get
op getDocument(@path id: string): {
  @header contentType: "application/json" | "application/xml";
  @body body: Document;
} | {
  @header contentType: "application/json" | "application/xml";
  @body body: ApiError;
  @statusCode statusCode: 400 | 404 | 500;
};
```

## Operations

```ts operations
import { type Document, documentDeserializer } from "../models/models.js";
import type { GetDocumentOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getDocumentSend(
  context: Client,
  id: string,
  options: GetDocumentOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/documents/{id}",
    { id: id },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json, application/xml",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDocumentDeserialize(
  result: PathUncheckedResponse,
): Promise<Document> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return documentDeserializer(result.body);
}

export async function getDocument(
  context: Client,
  id: string,
  options: GetDocumentOptionalParams = { requestOptions: {} },
): Promise<Document> {
  const result = await _getDocumentSend(context, id, options);
  return _getDocumentDeserialize(result);
}
```

# JSON-only error deserialization

Tests that when an error model has no XML serialization, the generated deserialize function
uses the JSON deserializer as before.

## TypeSpec

```tsp
@error
model SimpleError {
  code: string;
  message: string;
}

model Item {
  id: string;
  value: int32;
}

@route("/items/{id}")
@get
op getItem(@path id: string): Item | SimpleError;
```

## Operations

```ts operations
import { type Item, itemDeserializer } from "../models/models.js";
import type { GetItemOptionalParams } from "./options.js";
import {
  type Client,
  createRestError,
  expandUrlTemplate,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getItemSend(
  context: Client,
  id: string,
  options: GetItemOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/items/{id}",
    { id: id },
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

export async function _getItemDeserialize(
  result: PathUncheckedResponse,
): Promise<Item> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return itemDeserializer(result.body);
}

export async function getItem(
  context: Client,
  id: string,
  options: GetItemOptionalParams = { requestOptions: {} },
): Promise<Item> {
  const result = await _getItemSend(context, id, options);
  return _getItemDeserialize(result);
}
```
