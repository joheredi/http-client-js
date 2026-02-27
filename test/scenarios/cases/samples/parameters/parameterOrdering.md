# Parameter ordering with Azure Core ResourceAction and RequestHeadersTrait

## TypeSpec

```tsp
using Azure.Core.Traits;

model ApcGatewayIdHeader {
  @header("apc-gateway-id")
  apcGatewayId: string;
}

alias ServiceTraits = NoRepeatableRequests &
  NoConditionalRequests &
  SupportsClientRequestId &
  RequestHeadersTrait<ApcGatewayIdHeader>;

alias Operations = Azure.Core.ResourceOperations<
  ServiceTraits,
  Azure.Core.Foundations.ErrorResponse
>;

alias BodyParameter<
  T,
  TName extends valueof string = "body",
  TDoc extends valueof string = "Body parameter."
> = {
  @doc(TDoc)
  @friendlyName(TName)
  @bodyRoot
  body: T;
};

model TestVerificationContent {
  message: string;
}

model TestVerificationResult {
  result: string;
}

@resource("device-location")
model DeviceLocationEndpoint {
  @key
  @visibility(Lifecycle.Read)
  location: "location";
}

interface DeviceLocation {
  verify is Operations.ResourceAction<
    DeviceLocationEndpoint,
    BodyParameter<TestVerificationContent>,
    TestVerificationResult
  >;
}
```

The config would be like:

```yaml
needAzureCore: true
withVersionedApiVersion: true
```

## Operations

```ts operations
import {
  errorResponseDeserializer,
  TestVerificationContent,
  testVerificationContentSerializer,
  type TestVerificationResult,
  testVerificationResultDeserializer,
} from "../models/models.js";
import { VerifyOptionalParams } from "./deviceLocation/options.js";
import {
  Client,
  createRestError,
  operationOptionsToRequestParameters,
  type PathUncheckedResponse,
  type StreamableMethod,
} from "@azure-rest/core-client";
import { expandUrlTemplate } from "@typespec/ts-http-runtime";

export function _verifySend(
  context: Client,
  body: TestVerificationContent,
  apcGatewayId: string,
  options: VerifyOptionalParams = { requestOptions: {} },
): StreamableMethod {
  const path = expandUrlTemplate(
    "/device-location/location:verify{?api%2Dversion}",
    { "api%2Dversion": context.apiVersion ?? "2022-05-15-preview" },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      ...(options?.clientRequestId !== undefined
        ? { "x-ms-client-request-id": options?.clientRequestId }
        : {}),
      "apc-gateway-id": apcGatewayId,
      ...options.requestOptions?.headers,
    },
    body: testVerificationContentSerializer(body),
  });
}

export async function _verifyDeserialize(
  result: PathUncheckedResponse,
): Promise<TestVerificationResult> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    const error = createRestError(result);
    error.details = errorResponseDeserializer(result.body);
    throw error;
  }

  return testVerificationResultDeserializer(result.body);
}

/**
 * Resource action operation template.
 *
 * @param {Client} context
 * @param {TestVerificationContent} body
 * @param {string} apcGatewayId
 * @param {VerifyOptionalParams} options
 */
export async function verify(
  context: Client,
  body: TestVerificationContent,
  apcGatewayId: string,
  options: VerifyOptionalParams = { requestOptions: {} },
): Promise<TestVerificationResult> {
  const result = await _verifySend(context, body, apcGatewayId, options);
  return _verifyDeserialize(result);
}
```

## Example

Raw json files.

```json
{
  "title": "verify",
  "operationId": "DeviceLocation_Verify",
  "parameters": {
    "body": {
      "message": "test message"
    },
    "apc-gateway-id": "zdgrzzaxlodrvewbksn"
  },
  "responses": {
    "200": {
      "body": {
        "result": "success"
      }
    }
  }
}
```

## Samples

```ts samples
/** This file path is /samples-dev/deviceLocationVerifySample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to resource action operation template.
 *
 * @summary resource action operation template.
 * x-ms-original-file: 2022-05-15-preview/json.json
 */
async function verify(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.deviceLocation.verify({}, "zdgrzzaxlodrvewbksn");
  console.log(result);
}

async function main(): Promise<void> {
  await verify();
}

main().catch(console.error);
```
