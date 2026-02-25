# should generate reserved words operation with prefix $ for classicClient

## TypeSpec

```tsp
op continue(): void;
```

## classicClient

```ts classicClient
import { $continue } from "./api/operations.js";
import type { ContinueOptionalParams } from "./api/options.js";
import {
  createTestService,
  type TestServiceClientOptionalParams,
  type TestServiceContext,
} from "./testServiceClientContext.js";
import { Pipeline } from "@typespec/ts-http-runtime";

export class TestServiceClient {
  private _client: TestServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(
    endpointParam: string,
    options: TestServiceClientOptionalParams = {},
  ) {
    this._client = createTestService(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  continue(
    options: ContinueOptionalParams = { requestOptions: {} },
  ): Promise<void> {
    return $continue(this._client, options);
  }
}
```
