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

```ts serialization
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Test
 */
export interface Test {
  prop: string;
}
```

```ts serialization
import type { Test } from "../models.js";

export function testDeserializer(item: any): Test {
  return {
    prop: item["prop"],
  };
}
```

```ts root index
export * from "./models/index.js";
export * from "./api/index.js";
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface InputOutputModel
 */
export interface InputOutputModel {
  prop: true;
}
```

```ts serialization
import type { InputOutputModel } from "../models.js";

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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface InputOutputModel
 */
export interface InputOutputModel {
  prop: 1;
}
```

```ts serialization
import type { InputOutputModel } from "../models.js";

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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface InputOutputModel
 */
export interface InputOutputModel {
  prop: "foo";
}
```

```ts serialization
import type { InputOutputModel } from "../models.js";

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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface InputOutputModel
 */
export interface InputOutputModel {
  prop: "English";
}

/**
 * Translation Language Values
 */
export type TranslationLanguageValues = "English" | "Chinese";
```

```ts serialization
import type { InputOutputModel } from "../models.js";

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
import type { CreateStreamingOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _createStreamingSend(
  context: TestingContext,
  options: CreateStreamingOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/createStreaming").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    body: { stream: true },
  });
}

export async function _createStreamingDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function createStreaming(
  context: TestingContext,
  options: CreateStreamingOptionalParams = { requestOptions: {} },
): Promise<void> {
  const result = await _createStreamingSend(context, options);
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

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"].toISOString().split("T")[0],
    prop2: item["prop2"],
    prop3: item["prop3"].toISOString(),
    prop4: item["prop4"],
  };
}
```

## Models function fooDeserializer

```ts serialization function fooDeserializer
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
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  prop: Date,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: { prop: prop.toUTCString(), ...options.requestOptions?.headers },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function read(
  context: TestingContext,
  prop: Date,
  options: ReadOptionalParams = { requestOptions: {} },
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

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"].toISOString(),
    prop2: item["prop2"],
  };
}
```

## Operations

```ts operations
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: item["prop1"].toUTCString(),
    prop2: item["prop2"],
  };
}
```

## Operations

```ts operations
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: (item["prop1"].getTime() / 1000) | 0,
  };
}
```

## Operations

```ts operations
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: uint8ArrayToString(item["prop1"], "base64"),
  };
}
```

## Models function fooDeserializer

```ts serialization function fooDeserializer
export function fooDeserializer(item: any): Foo {
  return {
    prop1:
      typeof item["prop1"] === "string"
        ? stringToUint8Array(item["prop1"], "base64")
        : item["prop1"],
  };
}
```

## Operations

```ts operations
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: uint8ArrayToString(item["prop1"], "base64"),
  };
}
```

## Models function fooDeserializer

```ts serialization function fooDeserializer
export function fooDeserializer(item: any): Foo {
  return {
    prop1:
      typeof item["prop1"] === "string"
        ? stringToUint8Array(item["prop1"], "base64")
        : item["prop1"],
  };
}
```

## Operations

```ts operations
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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

```ts serialization function fooSerializer
export function fooSerializer(item: Foo): any {
  return {
    prop1: uint8ArrayToString(item["prop1"], "base64url"),
  };
}
```

## Models function fooDeserializer

```ts serialization function fooDeserializer
export function fooDeserializer(item: any): Foo {
  return {
    prop1:
      typeof item["prop1"] === "string"
        ? stringToUint8Array(item["prop1"], "base64url")
        : item["prop1"],
  };
}
```

## Operations

```ts operations
import type { Foo } from "../models/models.js";
import {
  fooDeserializer,
  fooSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: fooSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Foo,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Cat
 */
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

/**
 * model interface Pet
 */
export interface Pet {
  name: string;
  weight?: number;
}

/**
 * model interface Dog
 */
export interface Dog extends Pet {
  kind: "dog";
  bark: string;
}
```

```ts serialization
import type { Cat, Dog, Pet } from "../models.js";

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    weight: item["weight"],
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
    name: item["name"],
    weight: item["weight"],
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Cat
 */
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

/**
 * model interface Pet
 */
export interface Pet {
  name: string;
  weight?: number;
}
```

```ts serialization
import type { Cat, Pet } from "../models.js";

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    weight: item["weight"],
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
import type { Cat } from "../models/models.js";
import { catDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Cat> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return catDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Cat> {
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Cat
 */
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

/**
 * model interface Pet
 */
export interface Pet extends Animal {
  weight?: number;
}

/**
 * model interface Animal
 */
export interface Animal {
  name: string;
}
```

```ts serialization
import type { Animal, Cat, Pet } from "../models.js";

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    weight: item["weight"],
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

export function animalDeserializer(item: any): Animal {
  return {
    name: item["name"],
  };
}
```

## Operations

```ts operations
import type { Cat } from "../models/models.js";
import { catDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Cat> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return catDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Cat> {
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface PSDog
 */
export interface PSDog extends Pet {
  kind: "dog";
  bark: string;
}

/**
 * model interface Pet
 */
export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = PSDog | Pet;
```

```ts serialization
import { type Pet, type PetUnion, PSDog } from "../models.js";

export function psDogSerializer(item: PSDog): any {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    bark: item["bark"],
  };
}

export function petSerializer(item: Pet): any {
  return {
    kind: item["kind"],
    name: item["name"],
    weight: item["weight"],
  };
}

export function petUnionSerializer(item: PetUnion): any {
  switch (item["kind"]) {
    case "dog":
      return psDogSerializer(item as PSDog);
    default:
      return petSerializer(item);
  }
}

export function psDogDeserializer(item: any): PSDog {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    bark: item["bark"],
  };
}

export function petDeserializer(item: any): Pet {
  return {
    kind: item["kind"],
    name: item["name"],
    weight: item["weight"],
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "dog":
      return psDogDeserializer(item as PSDog);
    default:
      return petDeserializer(item);
  }
}
```

## Operations

```ts operations
import type { PSDog } from "../models/models.js";
import {
  psDogDeserializer,
  psDogSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: PSDog,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: psDogSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<PSDog> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return psDogDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: PSDog,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<PSDog> {
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Pet
 */
export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = Cat | Dog | Pet;

/**
 * model interface Cat
 */
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

/**
 * model interface Dog
 */
export interface Dog extends Pet {
  kind: "dog";
  bark: string;
}
```

```ts serialization
import { Cat, Dog, type Pet, type PetUnion } from "../models.js";

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    meow: item["meow"],
  };
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    bark: item["bark"],
  };
}

export function petDeserializer(item: any): Pet {
  return {
    kind: item["kind"],
    name: item["name"],
    weight: item["weight"],
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "cat":
      return catDeserializer(item as Cat);
    case "dog":
      return dogDeserializer(item as Dog);
    default:
      return petDeserializer(item);
  }
}
```

## Operations

```ts operations
import type { PetUnion } from "../models/models.js";
import { petUnionDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<PetUnion> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petUnionDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<PetUnion> {
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Pet
 */
export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = Cat | DogUnion | Pet;

/**
 * model interface Cat
 */
export interface Cat extends Pet {
  kind: "cat";
  meow: number;
}

/**
 * model interface Dog
 */
export interface Dog extends Pet {
  kind: "dog";
  type: string;
  bark: string;
}

/**
 * Alias for `Dog`
 */
export type DogUnion = Gold | Dog;

/**
 * model interface Gold
 */
export interface Gold extends Dog {
  type: "gold";
  friends: PetUnion[];
}
```

```ts serialization
import {
  Cat,
  Dog,
  type DogUnion,
  Gold,
  type Pet,
  type PetUnion,
} from "../models.js";

export function catDeserializer(item: any): Cat {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    meow: item["meow"],
  };
}

export function goldDeserializer(item: any): Gold {
  return {
    kind: item["kind"],
    name: item["name"],
    weight: item["weight"],
    bark: item["bark"],
    type: item["type"],
    friends: petArrayDeserializer(item["friends"]),
  };
}

export function petDeserializer(item: any): Pet {
  return {
    kind: item["kind"],
    name: item["name"],
    weight: item["weight"],
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "cat":
      return catDeserializer(item as Cat);
    case "dog":
      return dogUnionDeserializer(item as Dog);
    default:
      return petDeserializer(item);
  }
}

export function dogDeserializer(item: any): Dog {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    type: item["type"],
    bark: item["bark"],
  };
}

export function dogUnionDeserializer(item: any): DogUnion {
  switch (item["type"]) {
    case "gold":
      return goldDeserializer(item as Gold);
    default:
      return dogDeserializer(item);
  }
}

export function petArrayDeserializer(result: Array<Pet>): any[] {
  return result.map((item) => {
    return petUnionDeserializer(item);
  });
}
```

## Operations

```ts operations
import type { PetUnion } from "../models/models.js";
import { petUnionDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<PetUnion> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return petUnionDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<PetUnion> {
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Foo
 */
export interface Foo {
  name: string;
  weight?: number;
  bar: Bar;
}

/**
 * model interface Bar
 */
export interface Bar {
  foo: Foo;
}
```

```ts serialization
import type { Bar, Foo } from "../models.js";

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
import type { Foo } from "../models/models.js";
import { fooDeserializer } from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").get({
    ...operationOptionsToRequestParameters(options),
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Foo> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return fooDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Foo> {
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
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * Type of SchemaContentTypeValues
 */
export type SchemaContentTypeValues =
  | "application/json; serialization=Avro"
  | "application/json; serialization=json"
  | "text/plain; charset=utf-8"
  | "text/vnd.ms.protobuf";
```

```ts serialization
import type { SchemaContentTypeValues } from "../models.js";

export function schemaContentTypeValuesSerializer(
  item: SchemaContentTypeValues,
): any {
  return item;
}
```

## Operations

```ts operations
import type { SchemaContentTypeValues } from "../models/models.js";
import type { DemoServiceContext } from "./demoServiceClientContext.js";
import type { GetOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: DemoServiceContext,
  contentType: SchemaContentTypeValues,
  body: string,
  options: GetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: contentType,
    body: body,
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function get(
  context: DemoServiceContext,
  contentType: SchemaContentTypeValues,
  body: string,
  options: GetOptionalParams = { requestOptions: {} },
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
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * Type of SchemaContentTypeValues
 */
export type SchemaContentTypeValues =
  | "application/json; serialization=Avro"
  | "application/json; serialization=json"
  | "text/plain; charset=utf-8"
  | "text/vnd.ms.protobuf";
```

```ts serialization
import type { SchemaContentTypeValues } from "../models.js";

export function schemaContentTypeValuesSerializer(
  item: SchemaContentTypeValues,
): any {
  return item;
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
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * Type of GetRequestTestHeader
 */
export type GetRequestTestHeader = "A" | "B";

/**
 * Type of GetResponseTestHeader
 */
export type GetResponseTestHeader = "A" | "B";
```

```ts serialization
import type { GetRequestTestHeader } from "../models.js";

export function getRequestTestHeaderSerializer(
  item: GetRequestTestHeader,
): any {
  return item;
}
```

## Operations

```ts operations
import type { GetRequestTestHeader } from "../models/models.js";
import type { DemoServiceContext } from "./demoServiceClientContext.js";
import type { GetOptionalParams } from "./options.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _getSend(
  context: DemoServiceContext,
  testHeader: GetRequestTestHeader,
  body: string,
  options: GetOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "text/plain",
    headers: {
      "test-header": testHeader,
      ...options.requestOptions?.headers,
    },
    body: body,
  });
}

export async function _getDeserialize(
  result: PathUncheckedResponse,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return;
}

export async function get(
  context: DemoServiceContext,
  testHeader: GetRequestTestHeader,
  body: string,
  options: GetOptionalParams = { requestOptions: {} },
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

```ts serialization function aSerializer
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

```ts serialization function bSerializer
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

```ts serialization function aSerializer
export function aSerializer(item: A): any {
  return {
    prop1: item["prop1"],
    prop2: item["prop2"],
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface A
 */
export interface A {
  readonly exactVersion?: string;
}
```

```ts serialization
import type { A } from "../models.js";

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

```ts serialization function aSerializer
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
export interface Vegetables extends Record<string, number | string> {
  carrots: number;
  beans: number;
}
```

## Model function vegetablesSerializer

```ts serialization function vegetablesSerializer
export function vegetablesSerializer(item: Vegetables): any {
  return {
    ...item,
    carrots: item["carrots"],
    beans: item["beans"],
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Vegetables
 */
export interface Vegetables {
  carrots: number;
  beans: number;
  /**
   * Additional properties
   */
  additionalProperties?: Record<string, number | string>;
}
```

```ts serialization
import {
  deserializeRecord,
  serializeRecord,
} from "../../static-helpers/serializationHelpers.js";
import type { Vegetables } from "../models.js";

export function vegetablesSerializer(item: Vegetables): any {
  return {
    ...serializeRecord(item["additionalProperties"] ?? {}),
    carrots: item["carrots"],
    beans: item["beans"],
  };
}

export function vegetablesDeserializer(item: any): Vegetables {
  return {
    additionalProperties: deserializeRecord(item, undefined, [
      "carrots",
      "beans",
    ]),
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
export interface A extends Base, Record<string, number> {
  prop: number;
}
```

## Model function aSerializer

```ts serialization function aSerializer
export function aSerializer(item: A): any {
  return {
    ...item,
    foo: item["foo"],
    prop: item["prop"],
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

```ts serialization function baseSerializer
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface ServiceResourceProperties
 */
export interface ServiceResourceProperties {
  servicePlacementPolicies?: ServicePlacementPolicyDescription[];
}

/**
 * model interface ServicePlacementPolicyDescription
 */
export interface ServicePlacementPolicyDescription extends Pet {
  kind: "dog";
  type: string;
}

/**
 * model interface Pet
 */
export interface Pet {
  kind: string;
  name: string;
  weight?: number;
}

/**
 * Alias for `Pet`
 */
export type PetUnion = ServicePlacementPolicyDescription | Pet;
```

```ts serialization
import {
  type Pet,
  type PetUnion,
  ServicePlacementPolicyDescription,
  type ServiceResourceProperties,
} from "../models.js";

export function serviceResourcePropertiesSerializer(
  item: ServiceResourceProperties,
): any {
  return {
    servicePlacementPolicies: !item["servicePlacementPolicies"]
      ? item["servicePlacementPolicies"]
      : servicePlacementPolicyDescriptionArraySerializer(
          item["servicePlacementPolicies"],
        ),
  };
}

export function servicePlacementPolicyDescriptionSerializer(
  item: ServicePlacementPolicyDescription,
): any {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    type: item["type"],
  };
}

export function petSerializer(item: Pet): any {
  return {
    kind: item["kind"],
    name: item["name"],
    weight: item["weight"],
  };
}

export function petUnionSerializer(item: PetUnion): any {
  switch (item["kind"]) {
    case "dog":
      return servicePlacementPolicyDescriptionSerializer(
        item as ServicePlacementPolicyDescription,
      );
    default:
      return petSerializer(item);
  }
}

export function servicePlacementPolicyDescriptionArraySerializer(
  result: Array<ServicePlacementPolicyDescription>,
): any[] {
  return result.map((item) => {
    return servicePlacementPolicyDescriptionSerializer(item);
  });
}

export function serviceResourcePropertiesDeserializer(
  item: any,
): ServiceResourceProperties {
  return {
    servicePlacementPolicies: !item["servicePlacementPolicies"]
      ? item["servicePlacementPolicies"]
      : servicePlacementPolicyDescriptionArrayDeserializer(
          item["servicePlacementPolicies"],
        ),
  };
}

export function servicePlacementPolicyDescriptionDeserializer(
  item: any,
): ServicePlacementPolicyDescription {
  return {
    name: item["name"],
    weight: item["weight"],
    kind: item["kind"],
    type: item["type"],
  };
}

export function petDeserializer(item: any): Pet {
  return {
    kind: item["kind"],
    name: item["name"],
    weight: item["weight"],
  };
}

export function petUnionDeserializer(item: any): PetUnion {
  switch (item["kind"]) {
    case "dog":
      return servicePlacementPolicyDescriptionDeserializer(
        item as ServicePlacementPolicyDescription,
      );
    default:
      return petDeserializer(item);
  }
}

export function servicePlacementPolicyDescriptionArrayDeserializer(
  result: Array<ServicePlacementPolicyDescription>,
): any[] {
  return result.map((item) => {
    return servicePlacementPolicyDescriptionDeserializer(item);
  });
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface Client
 */
export interface Client {
  id: string;
  email: string;
}
```

```ts serialization
import type { Client } from "../models.js";

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
import type { Client } from "../models/models.js";
import {
  clientDeserializer,
  clientSerializer,
} from "../models/serialization/serialization.js";
import type { ReadOptionalParams } from "./options.js";
import type { TestingContext } from "./testingClientContext.js";
import {
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@typespec/ts-http-runtime";

export function _readSend(
  context: TestingContext,
  body: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): StreamableMethod {
  return context.path("/").post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...options.requestOptions?.headers,
    },
    body: clientSerializer(body),
  });
}

export async function _readDeserialize(
  result: PathUncheckedResponse,
): Promise<Client> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError(result);
  }

  return clientDeserializer(result.body);
}

export async function read(
  context: TestingContext,
  body: Client,
  options: ReadOptionalParams = { requestOptions: {} },
): Promise<Client> {
  const result = await _readSend(context, body, options);
  return _readDeserialize(result);
}
```
