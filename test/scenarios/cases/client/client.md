# Should generate client context

```tsp
model Widget {
  id: string;
}

@get op getWidget(): Widget;
```

## TypeScript

Should generate the client context interface and factory function.

```ts src/testServiceClientContext.ts interface TestServiceContext
export interface TestServiceContext extends Client {}
```

```ts src/testServiceClientContext.ts function createTestService
export function createTestService(
  endpoint: string,
  options: TestServiceClientOptionalParams = {},
): TestServiceContext {
  const endpointUrl = options.endpoint ?? endpoint;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions ? `${prefixFromOptions} azsdk-js-api` : `azsdk-js-api`;
  const updatedOptions = {
  ...options,
  userAgentOptions: { userAgentPrefix },
  };
  return getClient(endpointUrl, updatedOptions); as TestServiceContext;
}
```

# Should generate classical client class

```tsp
model Widget {
  id: string;
}

@get op getWidget(): Widget;
```

## TypeScript

```ts src/testServiceClient.ts class TestServiceClient
export class TestServiceClient {
  private _client: TestServiceContext;
  /** The pipeline used by this client to make requests */
  public readonly pipeline: Pipeline;

  constructor(endpoint: string, options: TestServiceClientOptionalParams = {}) {
    this._client = createTestService(endpoint, options);
    this.pipeline = this._client.pipeline;
  }

  getWidget(
    options: GetWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return getWidget(this._client, options);
  }
}
```
