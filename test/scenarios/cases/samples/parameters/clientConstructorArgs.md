# Should handle client constructor argument mismatch

Tests that client constructor generates correct parameter expectations when using server template parameters.

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.Core;
@useAuth(
  OAuth2Auth<[
    {
      type: OAuth2FlowType.implicit,
      authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      scopes: ["https://ml.azure.com/.default"],
    }
  ]>
)
@service(#{ title: "Machine Learning Services" })
@server(
  "{endpoint}/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.MachineLearningServices/workspaces/{workspaceName}",
  "ML Services API",
  {
    endpoint: url,
    subscriptionId: string,
    resourceGroupName: string,
    workspaceName: string,
  }
)
namespace MachineLearningServices;
@route("/indexes")
interface Indexes {
  @route("/{name}/versions/{version}")
  @put
  createOrUpdate(
    @path name: string,
    @path version: string,
  ): void;
}
```

The config would be like:

```yaml
needTCGC: true
needAzureCore: true
withRawContent: true
```

## Client Constructor

The client constructor should expect all server template parameters:

```ts classicClient
import {
  _getIndexesOperations,
  IndexesOperations,
} from "./classic/indexes/index.js";
import {
  createMachineLearningServices,
  type MachineLearningServicesClientOptionalParams,
  type MachineLearningServicesContext,
} from "./machineLearningServicesClientContext.js";
import type { TokenCredential } from "@azure/core-auth";
import { Pipeline } from "@azure/core-rest-pipeline";

export class MachineLearningServicesClient {
  private _client: MachineLearningServicesContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  /** The operation group for Indexes */
  public readonly indexes: IndexesOperations;

  constructor(
    endpointParam: string,
    subscriptionId: string,
    resourceGroupName: string,
    workspaceName: string,
    credential: TokenCredential,
    options: MachineLearningServicesClientOptionalParams = {},
  ) {
    const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
    const userAgentPrefix = prefixFromOptions
      ? `${prefixFromOptions} azsdk-js-client`
      : `azsdk-js-client`;
    this._client = createMachineLearningServices(
      endpoint,
      subscriptionId,
      resourceGroupName,
      workspaceName,
      credential,
      {
        ...options,
        userAgentOptions: { userAgentPrefix },
      },
    );
    this.pipeline = this._client.pipeline;
    this.indexes = _getIndexesOperations(this._client);
  }
}
```

## Example

Raw json files for testing client constructor arguments.

```json for Indexes_CreateOrUpdate
{
  "title": "Indexes_CreateOrUpdate",
  "operationId": "Indexes_CreateOrUpdate",
  "parameters": {
    "name": "test-index",
    "version": "1",
    "body": {
      "stage": "Production",
      "description": "Test index for validation",
      "properties": {
        "indexType": "vector"
      }
    }
  },
  "responses": {
    "200": {
      "body": {
        "stage": "Production",
        "description": "Test index for validation",
        "properties": {
          "indexType": "vector"
        }
      }
    }
  }
}
```

## Samples

```ts samples
/** This file path is /samples-dev/indexesCreateOrUpdateSample.ts */
import { DefaultAzureCredential } from "@azure/identity";
import { MachineLearningServicesClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to indexes_CreateOrUpdate
 *
 * @summary indexes_CreateOrUpdate
 * x-ms-original-file: json_for_Indexes_CreateOrUpdate.json
 */
async function indexesCreateOrUpdate(): Promise<void> {
  const endpoint = process.env.MACHINE_LEARNING_SERVICES_ENDPOINT || "";
  const subscriptionId =
    process.env.MACHINE_LEARNING_SERVICES_SUBSCRIPTION_ID || "";
  const resourceGroupName =
    process.env.MACHINE_LEARNING_SERVICES_RESOURCE_GROUP_NAME || "";
  const workspaceName =
    process.env.MACHINE_LEARNING_SERVICES_WORKSPACE_NAME || "";
  const credential = new DefaultAzureCredential();
  const client = new MachineLearningServicesClient(
    endpoint,
    subscriptionId,
    resourceGroupName,
    workspaceName,
    credential,
  );
  const result = await client.indexes.createOrUpdate("test-index", "1");
  console.log(result);
}

async function main(): Promise<void> {
  await indexesCreateOrUpdate();
}

main().catch(console.error);
```

# Should generate client constructor with required parameters in samples

Sample generation should handle required parameters for client constructors correctly.

## TypeSpec

```tsp
@service(#{
  title: "Text Translation Service",
})
@server("{endpoint}", "Text Translation Service endpoint", {
    @doc("""
      Supported Text Translation endpoints (protocol and hostname, for example:
          https://api.cognitive.microsofttranslator.com).
      """)
  endpoint: url,
})
namespace TextTranslation;
model InputTextItem {
  @doc("The text to translate")
  text: string;
}
model BreakSentenceItem {
  @doc("The detected sentences")
  sentLen: int32[];
}
op findSentenceBoundaries(
  @body body: InputTextItem[],
  @header("X-ClientTraceId") clientTraceId?: string,
  @query language?: string,
  @query script?: string,
): BreakSentenceItem[];
```

## Example

```json
{
  "title": "findSentenceBoundaries",
  "operationId": "findSentenceBoundaries",
  "parameters": {
    "body": [
      {
        "text": "How are you? I am fine. What did you do today?"
      }
    ],
    "clientTraceId": "test-trace-id",
    "language": "en",
    "script": "Latn"
  },
  "responses": {
    "200": {
      "body": [
        {
          "sentLen": [12, 12, 25]
        }
      ]
    }
  }
}
```

## Samples

Should generate client constructor with required endpoint parameter:

```ts samples
/** This file path is /samples-dev/findSentenceBoundariesSample.ts */
import { TextTranslationClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to findSentenceBoundaries
 *
 * @summary findSentenceBoundaries
 * x-ms-original-file: json.json
 */
async function findSentenceBoundaries(): Promise<void> {
  const endpoint = process.env.TEXT_TRANSLATION_ENDPOINT || "";
  const client = new TextTranslationClient(endpoint);
  const result = await client.findSentenceBoundaries([{}], {
    language: "en",
    script: "Latn",
  });
  console.log(result);
}

async function main(): Promise<void> {
  await findSentenceBoundaries();
}

main().catch(console.error);
```
