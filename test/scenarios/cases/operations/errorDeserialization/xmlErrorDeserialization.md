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
import {
  type Widget as Widget_1,
  widgetDeserializer as widgetDeserializer_1,
} from "../models/models.js";
import type { GetWidgetOptionalParams as GetWidgetOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getWidgetSend(
  context: Client_1,
  id: string,
  options: GetWidgetOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/widgets/{id}",
    { id: id },
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

export async function _getWidgetDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Widget_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return widgetDeserializer_1(result.body);
}

export async function getWidget(
  context: Client_1,
  id: string,
  options: GetWidgetOptionalParams_1 = { requestOptions: {} },
): Promise<Widget_1> {
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
import {
  type Document as Document_1,
  documentDeserializer as documentDeserializer_1,
} from "../models/models.js";
import type { GetDocumentOptionalParams as GetDocumentOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getDocumentSend(
  context: Client_1,
  id: string,
  options: GetDocumentOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/documents/{id}",
    { id: id },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json, application/xml",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _getDocumentDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Document_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return documentDeserializer_1(result.body);
}

export async function getDocument(
  context: Client_1,
  id: string,
  options: GetDocumentOptionalParams_1 = { requestOptions: {} },
): Promise<Document_1> {
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
import {
  type Item as Item_1,
  itemDeserializer as itemDeserializer_1,
} from "../models/models.js";
import type { GetItemOptionalParams as GetItemOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getItemSend(
  context: Client_1,
  id: string,
  options: GetItemOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/items/{id}",
    { id: id },
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

export async function _getItemDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Item_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return itemDeserializer_1(result.body);
}

export async function getItem(
  context: Client_1,
  id: string,
  options: GetItemOptionalParams_1 = { requestOptions: {} },
): Promise<Item_1> {
  const result = await _getItemSend(context, id, options);
  return _getItemDeserialize(result);
}
```
