# should generate reserved words operation with prefix $ for classicClient

## TypeSpec

```tsp
op continue(): void;
```

## classicClient

```ts classicClient
import { continue_ as continue__1 } from "./api/operations.js";
import type { ContinueOptionalParams as ContinueOptionalParams_1 } from "./api/options.js";
import {
  createTestService as createTestService_1,
  type TestServiceClientOptionalParams as TestServiceClientOptionalParams_1,
  type TestServiceContext as TestServiceContext_1,
} from "./testServiceClientContext.js";
import { Pipeline as Pipeline_1 } from "@typespec/ts-http-runtime";

export class TestServiceClient {
  private _client: TestServiceContext_1;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline_1;

  constructor(
    endpoint: string,
    options: TestServiceClientOptionalParams_1 = {},
  ) {
    this._client = createTestService_1(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  continue_(
    options: ContinueOptionalParams_1 = { requestOptions: {} },
  ): Promise<void> {
    return continue__1(this._client, options);
  }
}
```
