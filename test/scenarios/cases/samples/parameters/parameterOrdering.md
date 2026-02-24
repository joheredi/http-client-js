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
  TestVerificationContent as TestVerificationContent_1,
  testVerificationContentSerializer as testVerificationContentSerializer_1,
  type TestVerificationResult as TestVerificationResult_1,
  testVerificationResultDeserializer as testVerificationResultDeserializer_1,
} from "../models/models.js";
import { VerifyOptionalParams as VerifyOptionalParams_1 } from "./deviceLocation/options.js";
import {
  Client as Client_1,
  createRestError as createRestError_1,
  expandUrlTemplate as expandUrlTemplate_1,
  operationOptionsToRequestParameters as operationOptionsToRequestParameters_1,
  type PathUncheckedResponse as PathUncheckedResponse_1,
  type StreamableMethod as StreamableMethod_1,
} from "@typespec/ts-http-runtime";

export function _verifySend(
  context: Client_1,
  apiVersion: string,
  body: TestVerificationContent_1,
  apcGatewayId: string,
  options: VerifyOptionalParams_1 = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/device-location/location:verify{?api%2Dversion}",
    { "api-version": apiVersion },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).post({
    ...operationOptionsToRequestParameters_1(options),
    contentType: "application/json",
    headers: {
      accept: "application/json",
      "x-ms-client-request-id": options?.clientRequestId,
      "apc-gateway-id": apcGatewayId,
      ...options.requestOptions?.headers,
    },
    body: testVerificationContentSerializer_1(body),
  });
}

export async function _verifyDeserialize(
  result: PathUncheckedResponse_1,
): Promise<TestVerificationResult_1> {
  const expectedStatuses = ["200"];
  if (!expectedStatuses.includes(result.status)) {
    throw createRestError_1(result);
  }

  return testVerificationResultDeserializer_1(result.body);
}

/**
 * Resource action operation template.
 *
 * @param {Client_1} context
 * @param {string} apiVersion
 * @param {TestVerificationContent_1} body
 * @param {string} apcGatewayId
 * @param {VerifyOptionalParams_1} options
 */
export async function verify(
  context: Client_1,
  apiVersion: string,
  body: TestVerificationContent_1,
  apcGatewayId: string,
  options: VerifyOptionalParams_1 = { requestOptions: {} },
): Promise<TestVerificationResult_1> {
  const result = await _verifySend(
    context,
    apiVersion,
    body,
    apcGatewayId,
    options,
  );
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
/** This file path is /samples-dev/verifySample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to resource action operation template.
 *
 * @summary resource action operation template.
 * x-ms-original-file: 2021-10-01-preview/json.json
 */
async function verify(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.verify(
    { message: "test message" },
    "zdgrzzaxlodrvewbksn",
  );
  console.log(result);
}

async function main(): Promise<void> {
  await verify();
}

main().catch(console.error);
```
