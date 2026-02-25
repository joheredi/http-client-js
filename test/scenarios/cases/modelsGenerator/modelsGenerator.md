# should not generate models without any `@usage` added for model-only case

## TypeSpec

```tsp
model Test {
  prop: string;
}
```

## Models

```ts models
// (file was not generated)
```

Shouldn't be included in root index file

```ts root index
// (file was not generated)
```

# should generate models with `@usage` added for model-only case

## TypeSpec

```tsp
@usage(Usage.output)
model Test {
  prop: string;
}

```

The config would be like:

```yaml
needTCGC: true
```

## Models

```ts models
export interface Test {
  prop: string;
}

export function testDeserializer(item: any): Test {
  return {
    prop: item["prop"],
  };
}
```

Should be included in root index file

```ts root index
export { Test } from "./models/index.js";
```

# should handle type_literals:boolean -> boolean_literals

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";

using TypeSpec.Rest;
using TypeSpec.Http;
using TypeSpec.Versioning;

#suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
@service(#{
  title: "Azure TypeScript Testing"
})
namespace Azure.TypeScript.Testing;

#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
model InputOutputModel {
  prop: true;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "for test"
#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
@route("/models")
@get
op getModel(@body input: InputOutputModel): InputOutputModel;
```

The config would be like:

```yaml
needOptions: false
withRawContent: true
```

## Models

```ts models
export interface InputOutputModel {
  prop: true;
}

export function inputOutputModelSerializer(item: InputOutputModel): any {
  return {
    prop: item["prop"],
  };
}

export function inputOutputModelDeserializer(item: any): InputOutputModel {
  return {
    prop: item["prop"],
  };
}
```

# should handle type_literals:number -> number_literals

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";

using TypeSpec.Rest;
using TypeSpec.Http;
using TypeSpec.Versioning;

#suppress "@azure-tools/typespec-azure-core/auth-required" "for test"

@service(#{
  title: "Azure TypeScript Testing"
})
namespace Azure.TypeScript.Testing;

#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
model InputOutputModel {
  prop: 1;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "for test"
#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
@route("/models")
@get
op getModel(@body input: InputOutputModel): InputOutputModel;
```

The config would be like:

```yaml
needOptions: false
withRawContent: true
```

## Models

```ts models
export interface InputOutputModel {
  prop: 1;
}

export function inputOutputModelSerializer(item: InputOutputModel): any {
  return {
    prop: item["prop"],
  };
}

export function inputOutputModelDeserializer(item: any): InputOutputModel {
  return {
    prop: item["prop"],
  };
}
```

# should handle type_literals:string -> string_literals

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";

using TypeSpec.Rest;
using TypeSpec.Http;
using TypeSpec.Versioning;

#suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
@service(#{
  title: "Azure TypeScript Testing"
})
namespace Azure.TypeScript.Testing;

#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
model InputOutputModel {
  prop: "foo";
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "for test"
#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
@route("/models")
@get
op getModel(@body input: InputOutputModel): InputOutputModel;
```

The config would be like:

```yaml
needOptions: false
withRawContent: true
```

## Models

```ts models
export interface InputOutputModel {
  prop: "foo";
}

export function inputOutputModelSerializer(item: InputOutputModel): any {
  return {
    prop: item["prop"],
  };
}

export function inputOutputModelDeserializer(item: any): InputOutputModel {
  return {
    prop: item["prop"],
  };
}
```

# should handle enum member

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";

using TypeSpec.Rest;
using TypeSpec.Http;
using TypeSpec.Versioning;

#suppress "@azure-tools/typespec-azure-core/auth-required" "for test"
@service(#{
  title: "Azure TypeScript Testing"
})
namespace Azure.TypeScript.Testing;

  @doc("Translation Language Values")
  enum TranslationLanguageValues {
    @doc("English descriptions")
    English: "English",
    @doc("Chinese descriptions")
    Chinese: "Chinese",
  }
#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
model InputOutputModel {
  prop: TranslationLanguageValues.English;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "for test"
#suppress "@azure-tools/typespec-azure-core/documentation-required" "for test"
@route("/models")
@get
op getModel(@body input: InputOutputModel): InputOutputModel;
```

The config would be like:

```yaml
needOptions: false
withRawContent: true
```

## Models

```ts models
export interface InputOutputModel {
  prop: "English";
}

/**
 * Translation Language Values
 */
export type TranslationLanguageValues = "English" | "Chinese";

/**
 * Translation Language Values
 */
export enum KnownTranslationLanguageValues {
  /**
   * English descriptions
   */
  English = "English",
  /**
   * Chinese descriptions
   */
  Chinese = "Chinese",
}

export function inputOutputModelSerializer(item: InputOutputModel): any {
  return {
    prop: item["prop"],
  };
}

export function inputOutputModelDeserializer(item: any): InputOutputModel {
  return {
    prop: item["prop"],
  };
}
```

# should handle boolean literal type

## TypeSpec

```tsp
@doc("The configuration for a streaming chat completion request.")
model StreamingChatCompletionOptions {
    @doc("Indicates whether the completion is a streaming or non-streaming completion.")
    stream: true;
}
@route("/createStreaming")
@post op createStreaming(
    ...StreamingChatCompletionOptions
): void;
```

## Operations

```ts operations
import type { CreateStreamingOptionalParams as CreateStreamingOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _createStreamingSend(
  context: Client_1,
  stream: true,
  options: CreateStreamingOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/createStreaming").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    body: { stream: stream },
  });
}

export async function _createStreamingDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function createStreaming(
  context: Client_1,
  stream: true,
  options: CreateStreamingOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _createStreamingSend(context, stream, options);
  return _createStreamingDeserialize(result);
}
```

# should handle property type plainDate, plainTime, utcDateTime, offsetDatetime with default encoding

## TypeSpec

```tsp
model Foo {
    prop1: plainDate;
    prop2: plainTime;
    prop3: utcDateTime;
    prop4: offsetDateTime;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models interface Foo

```ts models interface Foo
export interface Foo {
  prop1: Date;
  prop2: string;
  prop3: Date;
  prop4: string;
}
```

## Models function fooSerializer

```ts models function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"].toISOString(),
    prop2: item["prop2"],
    prop3: item["prop3"].toISOString(),
    prop4: item["prop4"],
  };
}
```

## Models function fooDeserializer

```ts models function fooDeserializer
export function fooDeserializer(item: any): Foo {
  return {
    prop1: new Date(item["prop1"]),
    prop2: item["prop2"],
    prop3: new Date(item["prop3"]),
    prop4: item["prop4"],
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle header parameter type utcDateTime with default encoding

## TypeSpec

```tsp
op read(@header prop: utcDateTime): OkResponse;
```

## Operations

```ts operations
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  prop: Date,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: { prop: prop, ...options.requestOptions?.headers },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function read(
  context: Client_1,
  prop: Date,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _readSend(context, prop, options);
  return _readDeserialize(result);
}
```

# should handle property type utcDateTime, offsetDateTime with rfc3339 encoding

## TypeSpec

```tsp
model Foo {
    @encode(DateTimeKnownEncoding.rfc3339)
    prop1: utcDateTime;
    @encode(DateTimeKnownEncoding.rfc3339)
    prop2: offsetDateTime;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: Date;
  prop2: string;
}
```

## Models function fooSerializer

```ts models function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"].toISOString(),
    prop2: item["prop2"],
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type utcDateTime, offsetDateTime with rfc7231 encoding

## TypeSpec

```tsp
model Foo {
    @encode(DateTimeKnownEncoding.rfc7231)
    prop1: utcDateTime;
    @encode(DateTimeKnownEncoding.rfc7231)
    prop2: offsetDateTime;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: Date;
  prop2: string;
}
```

## Models function fooSerializer

```ts models function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"].toISOString(),
    prop2: item["prop2"],
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type utcDateTime with unixTimestamp encoding

## TypeSpec

```tsp
model Foo {
    @encode(DateTimeKnownEncoding.unixTimestamp, int64)
    prop1: utcDateTime;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: Date;
}
```

## Models function fooSerializer

```ts models function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"].getTime(),
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type duration with default encoding

## TypeSpec

```tsp
model Foo {
    prop1: duration;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: string;
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type duration with ISO8601 encoding

## TypeSpec

```tsp
model Foo {
    @encode(DurationKnownEncoding.ISO8601)
    prop1: duration;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: string;
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type duration with seconds encoding

## TypeSpec

```tsp
model Foo {
    @encode(DurationKnownEncoding.seconds, float32)
    prop1: duration;
    @encode(DurationKnownEncoding.seconds, int64)
    prop2: duration;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: number;
  prop2: number;
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type bytes with default encoding

## TypeSpec

```tsp
model Foo {
    prop1: bytes;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: Uint8Array;
}
```

## Models function fooSerializer

```ts models function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: uint8ArrayToString_1(item["prop1"], "base64"),
  };
}
```

## Models function fooDeserializer

```ts models function fooDeserializer
export function fooDeserializer(item: any): Foo {
  return {
    prop1: stringToUint8Array_1(item["prop1"], "base64"),
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type bytes with base64 encoding

## TypeSpec

```tsp
model Foo {
    @encode(BytesKnownEncoding.base64)
    prop1: bytes;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: Uint8Array;
}
```

## Models function fooSerializer

```ts models function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: uint8ArrayToString_1(item["prop1"], "base64"),
  };
}
```

## Models function fooDeserializer

```ts models function fooDeserializer
export function fooDeserializer(item: any): Foo {
  return {
    prop1: stringToUint8Array_1(item["prop1"], "base64"),
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle property type bytes with base64url encoding

## TypeSpec

```tsp
model Foo {
    @encode(BytesKnownEncoding.base64url)
    prop1: bytes;
}
op read(@body body: Foo): { @body body: Foo };
```

## Models Foo

```ts models interface Foo
export interface Foo {
  prop1: Uint8Array;
}
```

## Models function fooSerializer

```ts models function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: uint8ArrayToString_1(item["prop1"], "base64"),
  };
}
```

## Models function fooDeserializer

```ts models function fooDeserializer
export function fooDeserializer(item: any): Foo {
  return {
    prop1: stringToUint8Array_1(item["prop1"], "base64"),
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
  fooSerializer as fooSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Foo_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle inheritance model

## TypeSpec

```tsp
model Pet {
    name: string;
    weight?: float32;
}
model Cat extends Pet {
    kind: "cat";
    meow: int32;
}
model Dog extends Pet {
    kind: "dog";
    bark: string;
}
op read(): { @body body: Cat | Dog };
```

## Models

```ts models
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

export interface Pet {
  name: string;
  weight?: number;
}

export interface Dog extends Pet {
  kind: "dog";
  bark: string;
}

/**
 * Alias for ReadResponse
 */
export type ReadResponse = Cat | Dog;

export function catDeserializer(item: any): Cat {
  return {
    kind: item["kind"],
    meow: item["meow"],
  };
}

export function petDeserializer(item: any): Pet {
  return {
    name: item["name"],
    weight: item["weight"],
  };
}

export function dogDeserializer(item: any): Dog {
  return {
    kind: item["kind"],
    bark: item["bark"],
  };
}
```

# should handle inheritance model in operations

## TypeSpec

```tsp
model Pet {
    name: string;
    weight?: float32;
}
model Cat extends Pet {
    kind: "cat";
    meow: int32;
}
model Dog extends Pet {
    kind: "dog";
    bark: string;
}
op read(): { @body body: Cat };
```

## Models

```ts models
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

export interface Pet {
  name: string;
  weight?: number;
}

export function catDeserializer(item: any): Cat {
  return {
    kind: item["kind"],
    meow: item["meow"],
  };
}

export function petDeserializer(item: any): Pet {
  return {
    name: item["name"],
    weight: item["weight"],
  };
}
```

## Operations

```ts operations
import {
  type Cat as Cat_1,
  catDeserializer as catDeserializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Cat_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return catDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Cat_1> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should handle multi level inheritance model in operations

## TypeSpec

```tsp
model Animal {
    name: string;
}
model Pet extends Animal {
    weight?: float32;
}
model Cat extends Pet {
    kind: "cat";
    meow: int32;
}
op read(): { @body body: Cat };
```

## Models

```ts models
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

export interface Pet extends Animal {
  weight?: number;
}

export interface Animal {
  name: string;
}

export function catDeserializer(item: any): Cat {
  return {
    kind: item["kind"],
    meow: item["meow"],
  };
}

export function petDeserializer(item: any): Pet {
  return {
    weight: item["weight"],
  };
}

export function animalDeserializer(item: any): Animal {
  return {
    name: item["name"],
  };
}
```

## Operations

```ts operations
import {
  type Cat as Cat_1,
  catDeserializer as catDeserializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Cat_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return catDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Cat_1> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should handle inheritance model with discriminator in operations

## TypeSpec

```tsp
@discriminator("kind")
model Pet {
    kind: string;
    name: string;
    weight?: float32;
}
model Cat extends Pet {
    kind: "cat";
    meow: int32;
}
model PSDog extends Pet {
    kind: "dog";
    bark: string;
}
op read(@body body: PSDog): { @body body: PSDog };
```

## Models

```ts models
export interface PsDog extends Pet {
  kind: "dog";
  bark: string;
}

export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = PsDog | Pet;

export function psDogSerializer(item: PsDog): any {
  return {
    kind: item["kind"],
    bark: item["bark"],
  };
}

export function petUnionSerializer(item: PetUnion): any {
  switch (item["kind"]) {
    case "dog":
      return psDogSerializer(item as PsDog);
    default:
      return item;
  }
}

export function psDogDeserializer(item: any): PsDog {
  return {
    kind: item["kind"],
    bark: item["bark"],
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "dog":
      return psDogDeserializer(item as PsDog);
    default:
      return item;
  }
}
```

## Operations

```ts operations
import {
  type PsDog as PsDog_1,
  psDogDeserializer as psDogDeserializer_1,
  psDogSerializer as psDogSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: PsDog_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: psDogSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<PsDog_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return psDogDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: PsDog_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<PsDog_1> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```

# should handle base model with discriminator in operations

## TypeSpec

```tsp
@discriminator("kind")
model Pet {
    kind: string;
    name: string;
    weight?: float32;
}
model Cat extends Pet {
    kind: "cat";
    meow: int32;
}
model Dog extends Pet {
    kind: "dog";
    bark: string;
}
op read(): { @body body: Pet };
```

## Models

```ts models
export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = Cat | Dog | Pet;

export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

export interface Dog extends Pet {
  kind: "dog";
  bark: string;
}

export function catDeserializer(item: any): Cat {
  return {
    kind: item["kind"],
    meow: item["meow"],
  };
}

export function dogDeserializer(item: any): Dog {
  return {
    kind: item["kind"],
    bark: item["bark"],
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "cat":
      return catDeserializer(item as Cat);
    case "dog":
      return dogDeserializer(item as Dog);
    default:
      return item;
  }
}
```

## Operations

```ts operations
import {
  type Pet as Pet_1,
  petUnionDeserializer as petUnionDeserializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Pet_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return petUnionDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Pet_1> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should handle circular in model properties with inheritance

## TypeSpec

```tsp
@discriminator("kind")
model Pet {
    kind: string;
    name: string;
    weight?: float32;
}
model Cat extends Pet {
    kind: "cat";
    meow: int32;
}
@discriminator("type")
model Dog extends Pet {
    kind: "dog";
    type: string;
    bark: string;
}
model Gold extends Dog {
    type: "gold";
    friends: Pet[];
}
op read(): { @body body: Pet };
```

## Models

```ts models
export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = Cat | Dog | Pet;

export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

export interface Dog extends Pet {
  kind: "dog";
  type: "dog";
  bark: string;
}

/**
 * Alias for `Dog`
 */
export type DogUnion = Gold | Dog;

export interface Gold extends Dog {
  type: "gold";
  friends: Pet[];
}

export function catDeserializer(item: any): Cat {
  return {
    kind: item["kind"],
    meow: item["meow"],
  };
}

export function goldDeserializer(item: any): Gold {
  return {
    type: item["type"],
    friends: item["friends"].map((p: any) => {
      return petUnionDeserializer(p);
    }),
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "cat":
      return catDeserializer(item as Cat);
    case "dog":
      return dogUnionDeserializer(item as Dog);
    default:
      return item;
  }
}

export function dogUnionDeserializer(item: any): DogUnion {
  switch (item["type"]) {
    case "gold":
      return goldDeserializer(item as Gold);
    default:
      return item;
  }
}
```

## Operations

```ts operations
import {
  type Pet as Pet_1,
  petUnionDeserializer as petUnionDeserializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Pet_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return petUnionDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Pet_1> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# should handle circular in model properties with combination

## TypeSpec

```tsp
model Foo {
  name: string;
  weight?: float32;
  bar: Bar;
}
model Bar {
  foo: Foo;
}
op read(): { @body body: Foo };
```

## Models

```ts models
export interface Foo {
  name: string;
  weight?: number;
  bar: Bar;
}

export interface Bar {
  foo: Foo;
}

export function fooDeserializer(item: any): Foo {
  return {
    name: item["name"],
    weight: item["weight"],
    bar: barDeserializer(item["bar"]),
  };
}

export function barDeserializer(item: any): Bar {
  return {
    foo: fooDeserializer(item["foo"]),
  };
}
```

## Operations

```ts operations
import {
  type Foo as Foo_1,
  fooDeserializer as fooDeserializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").get({
    ...operationOptionsToRequestParameters_1(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Foo_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return fooDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Foo_1> {
  const result = await _readSend(context, options);
  return _readDeserialize(result);
}
```

# union variants with string literals being used in contentType headers

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";

@service(#{
  title: "Widget Service",
})
namespace DemoService;

using TypeSpec.Http;
using TypeSpec.Rest;

union SchemaContentTypeValues {
  avro: "application/json; serialization=Avro",
  json: "application/json; serialization=json",
  custom: "text/plain; charset=utf-8",
  protobuf: "text/vnd.ms.protobuf",
}

op get(
  @header("Content-Type") contentType: SchemaContentTypeValues,
  @body body: string,
): NoContentResponse;
```

```yaml
needOptions: false
withRawContent: true
mustEmptyDiagnostic: false
needNamespaces: false
needAzureCore: false
```

## Models

```ts models
/**
 * Type of SchemaContentTypeValues
 */
export type SchemaContentTypeValues =
  | "application/json; serialization=Avro"
  | "application/json; serialization=json"
  | "text/plain; charset=utf-8"
  | "text/vnd.ms.protobuf";

/**
 * Known values of {@link SchemaContentTypeValues} that the service accepts.
 */
export enum KnownSchemaContentTypeValues {
  /**
   * application/json; serialization=Avro
   */
  Avro = "application/json; serialization=Avro",
  /**
   * application/json; serialization=json
   */
  Json = "application/json; serialization=json",
  /**
   * text/plain; charset=utf-8
   */
  Custom = "text/plain; charset=utf-8",
  /**
   * text/vnd.ms.protobuf
   */
  Protobuf = "text/vnd.ms.protobuf",
}
```

## Operations

```ts operations
import type { SchemaContentTypeValues as SchemaContentTypeValues_1 } from "../models/models.js";
import type { GetOptionalParams as GetOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client_1,
  contentType: SchemaContentTypeValues_1,
  body: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json; serialization=Avro",
    body: body,
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function get(
  context: Client_1,
  contentType: SchemaContentTypeValues_1,
  body: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _getSend(context, contentType, body, options);
  return _getDeserialize(result);
}
```

# named union with string literals being used in regular headers

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";

@service(#{
  title: "Widget Service",
})
namespace DemoService;

using TypeSpec.Http;
using TypeSpec.Rest;

union SchemaContentTypeValues {
  avro: "application/json; serialization=Avro",
  json: "application/json; serialization=json",
  custom: "text/plain; charset=utf-8",
  protobuf: "text/vnd.ms.protobuf",
}

op get(
  @header("test-header") testHeader: SchemaContentTypeValues,
  @body body: string,
): { @header("test-header") testHeader: SchemaContentTypeValues; @statusCode _: 204; };
```

The config would be like:

```yaml
needOptions: false
withRawContent: true
```

## Models

```ts models
/**
 * Type of SchemaContentTypeValues
 */
export type SchemaContentTypeValues =
  | "application/json; serialization=Avro"
  | "application/json; serialization=json"
  | "text/plain; charset=utf-8"
  | "text/vnd.ms.protobuf";

/**
 * Known values of {@link SchemaContentTypeValues} that the service accepts.
 */
export enum KnownSchemaContentTypeValues {
  /**
   * application/json; serialization=Avro
   */
  Avro = "application/json; serialization=Avro",
  /**
   * application/json; serialization=json
   */
  Json = "application/json; serialization=json",
  /**
   * text/plain; charset=utf-8
   */
  Custom = "text/plain; charset=utf-8",
  /**
   * text/vnd.ms.protobuf
   */
  Protobuf = "text/vnd.ms.protobuf",
}
```

# anonymous union with string literals being used in regular headers

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";

@service(#{
  title: "Widget Service",
})
namespace DemoService;

using TypeSpec.Http;
using TypeSpec.Rest;

op get(
  @header("test-header") testHeader: "A" | "B",
  @body body: string,
): { @header("test-header") testHeader: "A" | "B"; @statusCode _: 204; };
```

The config would be like:

```yaml
needOptions: false
withRawContent: true
mustEmptyDiagnostic: true
needNamespaces: false
needAzureCore: false
```

## Models

```ts models
/**
 * Type of GetRequestTestHeader
 */
export type GetRequestTestHeader = "A" | "B";

/**
 * Known values of {@link GetRequestTestHeader} that the service accepts.
 */
export enum KnownGetRequestTestHeader {
  /**
   * A
   */
  A = "A",
  /**
   * B
   */
  B = "B",
}

/**
 * Type of GetResponseTestHeader
 */
export type GetResponseTestHeader = "A" | "B";

/**
 * Known values of {@link GetResponseTestHeader} that the service accepts.
 */
export enum KnownGetResponseTestHeader {
  /**
   * A
   */
  A = "A",
  /**
   * B
   */
  B = "B",
}
```

## Operations

```ts operations
import type { GetRequestTestHeader as GetRequestTestHeader_1 } from "../models/models.js";
import type { GetOptionalParams as GetOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: Client_1,
  testHeader: GetRequestTestHeader_1,
  body: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "text/plain",
    headers: {
      "test-header": testHeader,
      ...options.requestOptions?.headers,
    },
    body: body,
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function get(
  context: Client_1,
  testHeader: GetRequestTestHeader_1,
  body: string,
  options: GetOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _getSend(context, testHeader, body, options);
  return _getDeserialize(result);
}
```

# should generate correct name and properties if A is B<Template>

## TypeSpec

```tsp
model B<Parameter> {
    prop1: string;
    prop2: Parameter;
}
model A is B<string> {
    @query
    name: string;
};
op read(@bodyRoot body: A): void;
```

## Model interface A

```ts models interface A
export interface A {
  prop1: string;
  prop2: string;
  name: string;
}
```

## Model function aSerializer

```ts models function aSerializer
export function aSerializer(item: A): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
    name: item["name"],
  };
}
```

# should generate correct name and properties if A extends B

## TypeSpec

```tsp
model B {
  prop1: string;
  prop2: string;
}
model A extends B {
  @query
  name: string;
};
op read(@bodyRoot body: A): void;
```

## Model interface B

```ts models interface B
export interface B {
  prop1: string;
  prop2: string;
}
```

## Model function bSerializer

```ts models function bSerializer
export function bSerializer(item: B): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
  };
}
```

## Model interface A

```ts models interface A
export interface A extends B {
  name: string;
}
```

## Model function aSerializer

```ts models function aSerializer
export function aSerializer(item: A): any {
  return {
    name: item["name"],
  };
}
```

# should generate readonly for @visibility(Lifecycle.Read)

## TypeSpec

```tsp
model A  {
  @visibility(Lifecycle.Read)
  exactVersion?: string;
};
op read(@body body: A): void;
```

## Models

```ts models
export interface A {
  readonly exactVersion?: string;
}

export function aSerializer(item: A): any {
  return {
    exactVersion: item["exactVersion"],
  };
}
```

# should not generate readonly for @visibility(Lifecycle.Read, Lifecycle.Create)

## TypeSpec

```tsp
model A  {
  @visibility(Lifecycle.Read, Lifecycle.Create)
  exactVersion?: string;
};
op read(@body body: A): void;
```

## Model interface A

```ts models interface A
export interface A {
  exactVersion?: string;
}
```

## Model function aSerializer

```ts models function aSerializer
export function aSerializer(item: A): any {
  return {
    exactVersion: item["exactVersion"],
  };
}
```

# should handle model additional properties from spread record of int64 | string in compatibleMode

## TypeSpec

```tsp
model Vegetables {
    ...Record<int64 | string>;
    carrots: int64;
    beans: int64;
}
op post(@body body: Vegetables): { @body body: Vegetables };
```

The config would be like:

```yaml
compatibility-mode: true
```

## Model interface Vegetables

```ts models interface Vegetables
export interface Vegetables {
  carrots: number;
  beans: number;
  [key: string]: VegetablesAdditionalProperty;
}
```

## Model function vegetablesSerializer

```ts models function vegetablesSerializer
export function vegetablesSerializer(item: Vegetables): any {
  return {
    carrots: item["carrots"],
    beans: item["beans"],
    ...(item["additionalProperties"] ?? {}),
  };
}
```

# should fail to handle model additional properties from spread record of int64 | string in non compatible mode

## TypeSpec

```tsp
model Vegetables {
  ...Record<int64 | string>;
  carrots: int64;
  beans: int64;
}
op post(@body body: Vegetables): { @body body: Vegetables };
```

Should ingore the warning `@azure-tools/typespec-ts/compatible-additional-properties`:

```yaml
mustEmptyDiagnostic: true
```

## Models

```ts models
export interface Vegetables {
  carrots: number;
  beans: number;
  [key: string]: VegetablesAdditionalProperty;
}

/**
 * Alias for VegetablesAdditionalProperty
 */
export type VegetablesAdditionalProperty = number | string;

export function vegetablesSerializer(item: Vegetables): any {
  return {
    carrots: item["carrots"],
    beans: item["beans"],
    ...(item["additionalProperties"] ?? {}),
  };
}

export function vegetablesDeserializer(item: any): Vegetables {
  return {
    carrots: item["carrots"],
    beans: item["beans"],
  };
}
```

# should handle model extends with additional properties

## TypeSpec

```tsp
model Base {
  foo: int32;
}
model A extends Base{
  ...Record<int32>;
  prop: int32
}
op post(@body body: A): { @body body: A };
```

The config would be like:

```yaml
compatibility-mode: true
```

## Model interface A

```ts models interface A
export interface A extends Base {
  prop: number;
  [key: string]: number;
}
```

## Model function aSerializer

```ts models function aSerializer
export function aSerializer(item: A): any {
  return {
    prop: item["prop"],
    ...(item["additionalProperties"] ?? {}),
  };
}
```

## Model interface Base

```ts models interface Base
export interface Base {
  foo: number;
}
```

## Model function baseSerializer

```ts models function baseSerializer
export function baseSerializer(item: Base): any {
  return {
    foo: item["foo"],
  };
}
```

# should handle discriminator base model without subtypes

## TypeSpec

```tsp
@discriminator("kind")
model Pet {
    kind: string;
    name: string;
    weight?: float32;
}

@discriminator("type")
model ServicePlacementPolicyDescription extends Pet {
  kind: "dog";
  type: string;
}

model ServiceResourceProperties {
  servicePlacementPolicies?: ServicePlacementPolicyDescription[];
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "for test"
@route("/services")
@post
op createService(@body body: ServiceResourceProperties): ServiceResourceProperties;
```

## Models

```ts models
export interface ServiceResourceProperties {
  servicePlacementPolicies?: ServicePlacementPolicyDescription[];
}

export interface ServicePlacementPolicyDescription extends Pet {
  kind: "dog";
  type: "dog";
}

export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = ServicePlacementPolicyDescription | Pet;

export function serviceResourcePropertiesSerializer(
  item: ServiceResourceProperties,
): any {
  return {
    servicePlacementPolicies: !item["servicePlacementPolicies"]
      ? item["servicePlacementPolicies"]
      : item["servicePlacementPolicies"].map((p: any) => {
          return servicePlacementPolicyDescriptionSerializer(p);
        }),
  };
}

export function servicePlacementPolicyDescriptionSerializer(
  item: ServicePlacementPolicyDescription,
): any {
  return {
    kind: item["kind"],
    type: item["type"],
  };
}

export function petUnionSerializer(item: PetUnion): any {
  switch (item["kind"]) {
    case "dog":
      return servicePlacementPolicyDescriptionSerializer(
        item as ServicePlacementPolicyDescription,
      );
    default:
      return item;
  }
}

export function serviceResourcePropertiesDeserializer(
  item: any,
): ServiceResourceProperties {
  return {
    servicePlacementPolicies: !item["servicePlacementPolicies"]
      ? item["servicePlacementPolicies"]
      : item["servicePlacementPolicies"].map((p: any) => {
          return servicePlacementPolicyDescriptionDeserializer(p);
        }),
  };
}

export function servicePlacementPolicyDescriptionDeserializer(
  item: any,
): ServicePlacementPolicyDescription {
  return {
    kind: item["kind"],
    type: item["type"],
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "dog":
      return servicePlacementPolicyDescriptionDeserializer(
        item as ServicePlacementPolicyDescription,
      );
    default:
      return item;
  }
}
```

# should handle duplicate model name import between hardcode import and binder import

## TypeSpec

```tsp
model Client {
  id: string;
  email: string;
}

op read(@body body: Client): Client;
```

## Models

```ts models
export interface Client {
  id: string;
  email: string;
}

export function clientSerializer(item: Client): any {
  return {
    id: item["id"],
    email: item["email"],
  };
}

export function clientDeserializer(item: any): Client {
  return {
    id: item["id"],
    email: item["email"],
  };
}
```

## Operations

```ts operations
import {
  type Client as Client_2,
  clientDeserializer as clientDeserializer_1,
  clientSerializer as clientSerializer_1,
} from "../models/models.js";
import type { ReadOptionalParams as ReadOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: Client_1,
  body: Client_2,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: clientSerializer_1(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse_1,
): Promise<Client_2> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return clientDeserializer_1(result.body);
}

export async function read(
  context: Client_1,
  body: Client_2,
  options: ReadOptionalParams_1 = { requestOptions: {} },
): Promise<Client_2> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```
