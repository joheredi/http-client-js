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
  createTesting,
  type TestingClientOptionalParams,
  type TestingContext,
} from "./testingClientContext.js";
import { Pipeline } from "@typespec/ts-http-runtime";

export class TestingClient {
  private _client: TestingContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(
    endpointParam: string,
    options: TestingClientOptionalParams = {},
  ) {
    const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
    const userAgentPrefix = prefixFromOptions
      ? `${prefixFromOptions} azsdk-js-client`
      : `azsdk-js-client`;
    this._client = createTesting(endpointParam, {
      ...options,
      userAgentOptions: { userAgentPrefix },
    });
    this.pipeline = this._client.pipeline;
  }

  continue(
    options: ContinueOptionalParams = { requestOptions: {} },
  ): Promise<void> {
    return $continue(this._client, options);
  }
}
```
