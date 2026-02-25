# With default values parameters should not appear as standalone parameters in sample code

## TypeSpec

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.Core;

@service(#{
  title: "Sample Service",
})
@server(
  "{endpoint}/{storage}",
  "Sample endpoint",
  {
    @doc("The endpoint URL")
    endpoint: string = "https://example.com",
    storage: string,
  }
)
namespace SampleService;

model Person {
  id: string;
  name: string;
}

@route("/persons")
interface Persons {
  @get
  list(
    @query start?: string,
    @query top?: int32,
  ): Person[];
}
```

## Example

```json
{
  "title": "List persons",
  "operationId": "Persons_List",
  "parameters": {
    "start": "00000000-0000-0000-0000-000000000000",
    "top": 20
  },
  "responses": {
    "200": {
      "body": [
        {
          "id": "person1",
          "name": "John Doe"
        }
      ]
    }
  }
}
```

## Generated Sample

```ts samples
/** This file path is /samples-dev/personsListSample.ts */
import { SampleServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to list persons
 *
 * @summary list persons
 * x-ms-original-file: json.json
 */
async function listPersons(): Promise<void> {
  const storage = process.env.SAMPLE_SERVICE_STORAGE || "";
  const client = new SampleServiceClient(storage);
  const result = await client.persons.list({
    start: "00000000-0000-0000-0000-000000000000",
    top: 20,
  });
  console.log(result);
}

async function main(): Promise<void> {
  await listPersons();
}

main().catch(console.error);
```
