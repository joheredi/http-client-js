# Basic file part

```tsp
model RequestBody {
  basicFile: HttpPart<File>;
}

op doThing(@header contentType: "multipart/form-data", @multipartBody bodyParam: RequestBody): void;
```

## Models

This basic case uses TypeSpec's `Http.File`, which specifies an optional `filename` and `contentType`. Since both are optional, the customer can pass the file's content directly to the `basicFile` property. If the customer wants to specify the filename or content type, they can use the wrapper object.

`````ts models
import { createFilePartDescriptor as createFilePartDescriptor_1 } from "../helpers/multipartHelpers.js";
import { uint8ArrayToString as uint8ArrayToString_1 } from "@typespec/ts-http-runtime";

export interface RequestBody {
  basicFile: File;
}

/**
 * A file in an HTTP request, response, or multipart payload.
 *
 * Files have a special meaning that the HTTP library understands. When the body of an HTTP request, response,
 * or multipart payload is _effectively_ an instance of `TypeSpec.Http.File` or any type that extends it, the
 * operation is treated as a file upload or download.
 *
 * When using file bodies, the fields of the file model are defined to come from particular locations by default:
 *
 * - `contentType`: The `Content-Type` header of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `contents`: The body of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `filename`: The `filename` parameter value of the `Content-Disposition` header of the response or multipart payload
 * (MAY be overridden or changed).
 *
 * A File may be used as a normal structured JSON object in a request or response, if the request specifies an explicit
 * `Content-Type` header. In this case, the entire File model is serialized as if it were any other model. In a JSON payload,
 * it will have a structure like:
 *
 * ```
 * {
 *   "contentType": <string?>,
 *   "filename": <string?>,
 *   "contents": <string, base64>
 * }
 * ```
 *
 * The `contentType` _within_ the file defines what media types the data inside the file can be, but if the specification
 * defines a `Content-Type` for the payload as HTTP metadata, that `Content-Type` metadata defines _how the file is
 * serialized_. See the examples below for more information.
 *
 * NOTE: The `filename` and `contentType` fields are optional. Furthermore, the default location of `filename`
 * (`Content-Disposition: <disposition>; filename=<filename>`) is only valid in HTTP responses and multipart payloads. If
 * you wish to send the `filename` in a request, you must use HTTP metadata decorators to describe the location of the
 * `filename` field. You can combine the metadata decorators with `@visibility` to control when the `filename` location
 * is overridden, as shown in the examples below.
 */
export interface File {
  /**
   * The allowed media (MIME) types of the file contents.
   *
   * In file bodies, this value comes from the `Content-Type` header of the request or response. In JSON bodies,
   * this value is serialized as a field in the response.
   *
   * NOTE: this is not _necessarily_ the same as the `Content-Type` header of the request or response, but
   * it will be for file bodies. It may be different if the file is serialized as a JSON object. It always refers to the
   * _contents_ of the file, and not necessarily the way the file itself is transmitted or serialized.
   */
  contentType?: string;
  /**
   * The name of the file, if any.
   *
   * In file bodies, this value comes from the `filename` parameter of the `Content-Disposition` header of the response
   * or multipart payload. In JSON bodies, this value is serialized as a field in the response.
   *
   * NOTE: By default, `filename` cannot be sent in request payloads and can only be sent in responses and multipart
   * payloads, as the `Content-Disposition` header is not valid in requests. If you want to send the `filename` in a request,
   * you must extend the `File` model and override the `filename` property with a different location defined by HTTP metadata
   * decorators.
   */
  filename?: string;
  /**
   * The contents of the file.
   *
   * In file bodies, this value comes from the body of the request, response, or multipart payload. In JSON bodies,
   * this value is serialized as a field in the response.
   */
  contents: Uint8Array;
}

export function fileSerializer(item: File): any {
  return {
    contentType: item["contentType"],
    filename: item["filename"],
    contents: uint8ArrayToString_1(item["contents"], "base64"),
  };
}

export function requestBodySerializer(item: RequestBody): any {
  return [createFilePartDescriptor_1("basicFile", item["basicFile"])];
}

```

## Operations

```ts operations
import {
  type RequestBody as RequestBody_1,
  requestBodySerializer as requestBodySerializer_1,
} from "../models/models.js";
import type { DoThingOptionalParams as DoThingOptionalParams_1 } from "./options.js";
import {
  type Client as Client_1,
  createRestError as createRestError_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _doThingSend(
  context: Client_1,
  contentType: "multipart/form-data",
  bodyParam: RequestBody_1,
  options: DoThingOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  return context.path("/").post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "multipart/form-data",
    body: requestBodySerializer_1(bodyParam),
  });
}

export async function _doThingDeserialize(
  result: PathUncheckedResponse_1,
): Promise<void> {
  const expectedStatuses = ["204"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return;
}

export async function doThing(
  context: Client_1,
  contentType: "multipart/form-data",
  bodyParam: RequestBody_1,
  options: DoThingOptionalParams_1 = { requestOptions: {} },
): Promise<void> {
  const result = await _doThingSend(context, contentType, bodyParam, options);
  return _doThingDeserialize(result);
}

```

# File part, filename required

```tsp
model FileRequiredName extends File {
  filename: string;
}

model RequestBody {
  nameRequired: HttpPart<FileRequiredName>;
}

op doThing(@header contentType: "multipart/form-data", @multipartBody bodyParam: RequestBody): void;
```

## Models

The filename must be provided _somehow_. This can either be done by passing a `File` object, which has a required filename property, or by using the wrapper object to pass a `filename` alongside the `contents`.

````ts models
import { createFilePartDescriptor as createFilePartDescriptor_1 } from "../helpers/multipartHelpers.js";
import { uint8ArrayToString as uint8ArrayToString_1 } from "@typespec/ts-http-runtime";

export interface RequestBody {
  nameRequired: FileRequiredName;
}

export interface FileRequiredName extends File {
  filename: string;
}

/**
 * A file in an HTTP request, response, or multipart payload.
 *
 * Files have a special meaning that the HTTP library understands. When the body of an HTTP request, response,
 * or multipart payload is _effectively_ an instance of `TypeSpec.Http.File` or any type that extends it, the
 * operation is treated as a file upload or download.
 *
 * When using file bodies, the fields of the file model are defined to come from particular locations by default:
 *
 * - `contentType`: The `Content-Type` header of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `contents`: The body of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `filename`: The `filename` parameter value of the `Content-Disposition` header of the response or multipart payload
 * (MAY be overridden or changed).
 *
 * A File may be used as a normal structured JSON object in a request or response, if the request specifies an explicit
 * `Content-Type` header. In this case, the entire File model is serialized as if it were any other model. In a JSON payload,
 * it will have a structure like:
 *
 * ```
 * {
 *   "contentType": <string?>,
 *   "filename": <string?>,
 *   "contents": <string, base64>
 * }
 * ```
 *
 * The `contentType` _within_ the file defines what media types the data inside the file can be, but if the specification
 * defines a `Content-Type` for the payload as HTTP metadata, that `Content-Type` metadata defines _how the file is
 * serialized_. See the examples below for more information.
 *
 * NOTE: The `filename` and `contentType` fields are optional. Furthermore, the default location of `filename`
 * (`Content-Disposition: <disposition>; filename=<filename>`) is only valid in HTTP responses and multipart payloads. If
 * you wish to send the `filename` in a request, you must use HTTP metadata decorators to describe the location of the
 * `filename` field. You can combine the metadata decorators with `@visibility` to control when the `filename` location
 * is overridden, as shown in the examples below.
 */
export interface File {
  /**
   * The allowed media (MIME) types of the file contents.
   *
   * In file bodies, this value comes from the `Content-Type` header of the request or response. In JSON bodies,
   * this value is serialized as a field in the response.
   *
   * NOTE: this is not _necessarily_ the same as the `Content-Type` header of the request or response, but
   * it will be for file bodies. It may be different if the file is serialized as a JSON object. It always refers to the
   * _contents_ of the file, and not necessarily the way the file itself is transmitted or serialized.
   */
  contentType?: string;
  /**
   * The name of the file, if any.
   *
   * In file bodies, this value comes from the `filename` parameter of the `Content-Disposition` header of the response
   * or multipart payload. In JSON bodies, this value is serialized as a field in the response.
   *
   * NOTE: By default, `filename` cannot be sent in request payloads and can only be sent in responses and multipart
   * payloads, as the `Content-Disposition` header is not valid in requests. If you want to send the `filename` in a request,
   * you must extend the `File` model and override the `filename` property with a different location defined by HTTP metadata
   * decorators.
   */
  filename?: string;
  /**
   * The contents of the file.
   *
   * In file bodies, this value comes from the body of the request, response, or multipart payload. In JSON bodies,
   * this value is serialized as a field in the response.
   */
  contents: Uint8Array;
}

export function fileRequiredNameSerializer(item: FileRequiredName): any {
  return {
    filename: item["filename"],
  };
}

export function fileSerializer(item: File): any {
  return {
    contentType: item["contentType"],
    filename: item["filename"],
    contents: uint8ArrayToString_1(item["contents"], "base64"),
  };
}

export function requestBodySerializer(item: RequestBody): any {
  return [createFilePartDescriptor_1("nameRequired", item["nameRequired"])];
}

```

# Default content type

```tsp
model PngFile extends File {
  contentType: "image/png";
}

model RequestBody {
  image: HttpPart<PngFile>;
}

op doThing(@header contentType: "multipart/form-data", @multipartBody bodyParam: RequestBody): void;
```

## Models

````ts models
import { createFilePartDescriptor as createFilePartDescriptor_1 } from "../helpers/multipartHelpers.js";
import { uint8ArrayToString as uint8ArrayToString_1 } from "@typespec/ts-http-runtime";

export interface RequestBody {
  image: PngFile;
}

export interface PngFile extends File {
  contentType: "image/png";
}

/**
 * A file in an HTTP request, response, or multipart payload.
 *
 * Files have a special meaning that the HTTP library understands. When the body of an HTTP request, response,
 * or multipart payload is _effectively_ an instance of `TypeSpec.Http.File` or any type that extends it, the
 * operation is treated as a file upload or download.
 *
 * When using file bodies, the fields of the file model are defined to come from particular locations by default:
 *
 * - `contentType`: The `Content-Type` header of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `contents`: The body of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `filename`: The `filename` parameter value of the `Content-Disposition` header of the response or multipart payload
 * (MAY be overridden or changed).
 *
 * A File may be used as a normal structured JSON object in a request or response, if the request specifies an explicit
 * `Content-Type` header. In this case, the entire File model is serialized as if it were any other model. In a JSON payload,
 * it will have a structure like:
 *
 * ```
 * {
 *   "contentType": <string?>,
 *   "filename": <string?>,
 *   "contents": <string, base64>
 * }
 * ```
 *
 * The `contentType` _within_ the file defines what media types the data inside the file can be, but if the specification
 * defines a `Content-Type` for the payload as HTTP metadata, that `Content-Type` metadata defines _how the file is
 * serialized_. See the examples below for more information.
 *
 * NOTE: The `filename` and `contentType` fields are optional. Furthermore, the default location of `filename`
 * (`Content-Disposition: <disposition>; filename=<filename>`) is only valid in HTTP responses and multipart payloads. If
 * you wish to send the `filename` in a request, you must use HTTP metadata decorators to describe the location of the
 * `filename` field. You can combine the metadata decorators with `@visibility` to control when the `filename` location
 * is overridden, as shown in the examples below.
 */
export interface File {
  /**
   * The allowed media (MIME) types of the file contents.
   *
   * In file bodies, this value comes from the `Content-Type` header of the request or response. In JSON bodies,
   * this value is serialized as a field in the response.
   *
   * NOTE: this is not _necessarily_ the same as the `Content-Type` header of the request or response, but
   * it will be for file bodies. It may be different if the file is serialized as a JSON object. It always refers to the
   * _contents_ of the file, and not necessarily the way the file itself is transmitted or serialized.
   */
  contentType?: string;
  /**
   * The name of the file, if any.
   *
   * In file bodies, this value comes from the `filename` parameter of the `Content-Disposition` header of the response
   * or multipart payload. In JSON bodies, this value is serialized as a field in the response.
   *
   * NOTE: By default, `filename` cannot be sent in request payloads and can only be sent in responses and multipart
   * payloads, as the `Content-Disposition` header is not valid in requests. If you want to send the `filename` in a request,
   * you must extend the `File` model and override the `filename` property with a different location defined by HTTP metadata
   * decorators.
   */
  filename?: string;
  /**
   * The contents of the file.
   *
   * In file bodies, this value comes from the body of the request, response, or multipart payload. In JSON bodies,
   * this value is serialized as a field in the response.
   */
  contents: Uint8Array;
}

export function pngFileSerializer(item: PngFile): any {
  return {
    contentType: item["contentType"],
  };
}

export function fileSerializer(item: File): any {
  return {
    contentType: item["contentType"],
    filename: item["filename"],
    contents: uint8ArrayToString_1(item["contents"], "base64"),
  };
}

export function requestBodySerializer(item: RequestBody): any {
  return [createFilePartDescriptor_1("image", item["image"], "image/png")];
}

```

# Multiple files

```tsp
model RequestBody {
  files: HttpPart<File>[];
}

op doThing(@header contentType: "multipart/form-data", @multipartBody bodyParam: RequestBody): void;
```

## Models

Each provided file in the input corresponds to one part in the multipart request.

````ts models
import { createFilePartDescriptor as createFilePartDescriptor_1 } from "../helpers/multipartHelpers.js";
import { uint8ArrayToString as uint8ArrayToString_1 } from "@typespec/ts-http-runtime";

export interface RequestBody {
  files: File[];
}

/**
 * A file in an HTTP request, response, or multipart payload.
 *
 * Files have a special meaning that the HTTP library understands. When the body of an HTTP request, response,
 * or multipart payload is _effectively_ an instance of `TypeSpec.Http.File` or any type that extends it, the
 * operation is treated as a file upload or download.
 *
 * When using file bodies, the fields of the file model are defined to come from particular locations by default:
 *
 * - `contentType`: The `Content-Type` header of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `contents`: The body of the request, response, or multipart payload (CANNOT be overridden or changed).
 * - `filename`: The `filename` parameter value of the `Content-Disposition` header of the response or multipart payload
 * (MAY be overridden or changed).
 *
 * A File may be used as a normal structured JSON object in a request or response, if the request specifies an explicit
 * `Content-Type` header. In this case, the entire File model is serialized as if it were any other model. In a JSON payload,
 * it will have a structure like:
 *
 * ```
 * {
 *   "contentType": <string?>,
 *   "filename": <string?>,
 *   "contents": <string, base64>
 * }
 * ```
 *
 * The `contentType` _within_ the file defines what media types the data inside the file can be, but if the specification
 * defines a `Content-Type` for the payload as HTTP metadata, that `Content-Type` metadata defines _how the file is
 * serialized_. See the examples below for more information.
 *
 * NOTE: The `filename` and `contentType` fields are optional. Furthermore, the default location of `filename`
 * (`Content-Disposition: <disposition>; filename=<filename>`) is only valid in HTTP responses and multipart payloads. If
 * you wish to send the `filename` in a request, you must use HTTP metadata decorators to describe the location of the
 * `filename` field. You can combine the metadata decorators with `@visibility` to control when the `filename` location
 * is overridden, as shown in the examples below.
 */
export interface File {
  /**
   * The allowed media (MIME) types of the file contents.
   *
   * In file bodies, this value comes from the `Content-Type` header of the request or response. In JSON bodies,
   * this value is serialized as a field in the response.
   *
   * NOTE: this is not _necessarily_ the same as the `Content-Type` header of the request or response, but
   * it will be for file bodies. It may be different if the file is serialized as a JSON object. It always refers to the
   * _contents_ of the file, and not necessarily the way the file itself is transmitted or serialized.
   */
  contentType?: string;
  /**
   * The name of the file, if any.
   *
   * In file bodies, this value comes from the `filename` parameter of the `Content-Disposition` header of the response
   * or multipart payload. In JSON bodies, this value is serialized as a field in the response.
   *
   * NOTE: By default, `filename` cannot be sent in request payloads and can only be sent in responses and multipart
   * payloads, as the `Content-Disposition` header is not valid in requests. If you want to send the `filename` in a request,
   * you must extend the `File` model and override the `filename` property with a different location defined by HTTP metadata
   * decorators.
   */
  filename?: string;
  /**
   * The contents of the file.
   *
   * In file bodies, this value comes from the body of the request, response, or multipart payload. In JSON bodies,
   * this value is serialized as a field in the response.
   */
  contents: Uint8Array;
}

export function fileSerializer(item: File): any {
  return {
    contentType: item["contentType"],
    filename: item["filename"],
    contents: uint8ArrayToString_1(item["contents"], "base64"),
  };
}

export function requestBodySerializer(item: RequestBody): any {
  return [
    ...item["files"].map((x: unknown) =>
      createFilePartDescriptor_1("files", x),
    ),
  ];
}

```
`````
