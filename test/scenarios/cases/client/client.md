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
export interface TestServiceContext extends Client_1 {}
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
  return getClient_1(endpointUrl, updatedOptions); as TestServiceContext;
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

  getWidget(
    options: GetWidgetOptionalParams_1 = { requestOptions: {} },
  ): Promise<Widget_1> {
    return getWidget_1(this._client, options);
  }
}
```
