# Inherited properties should be correctly mapped in sample generation

## TypeSpec

```tsp
model DocumentBase {
  documentType: string;
  Properties?: string[];
}

model ExceptionDocument extends DocumentBase {
  ExceptionType: string;
  ExceptionMessage: string;
}

model RequestModel{
    Documents:ExceptionDocument[];
}
@route("/documents")
interface Documents {
  @post
  publish(@body body: RequestModel): void;
}

```

Should ignore the warning `@azure-tools/typespec-ts/property-name-normalized`:

```yaml
mustEmptyDiagnostic: false
```

## Example

```json
{
  "title": "Publish Documents",
  "operationId": "Documents_publish",
  "parameters": {
    "body": {
      "Documents": [
        {
          "documentType": "Exception",
          "ExceptionType": "System.ArgumentNullException",
          "ExceptionMessage": "Value cannot be null",
          "Properties": ["stream-1", "stream-2"]
        }
      ]
    }
  }
}
```

## Samples

```ts samples
/** This file path is /samples-dev/documentsPublishSample.ts */
import { TestServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to publish Documents
 *
 * @summary publish Documents
 * x-ms-original-file: json.json
 */
async function publishDocuments(): Promise<void> {
  const endpoint = process.env.TEST_SERVICE_ENDPOINT || "";
  const client = new TestServiceClient(endpoint);
  const result = await client.documents.publish({});
  console.log(result);
}

async function main(): Promise<void> {
  await publishDocuments();
}

main().catch(console.error);
```
