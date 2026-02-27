# Should generate client context

```tsp
model Widget {
  id: string;
}

@get op getWidget(): Widget;
```

## TypeScript

Should generate the client context interface and factory function.

```ts src/testingClientContext.ts interface TestingContext
export interface TestingContext extends Client {}
```

```ts src/testingClientContext.ts function createTesting
export function createTesting(
  endpointParam: string,
  options: TestingClientOptionalParams = {},
): TestingContext {
  const endpointUrl = options.endpoint ?? endpoint;
  const prefixFromOptions = options?.userAgentOptions?.userAgentPrefix;
  const userAgentPrefix = prefixFromOptions ? `${prefixFromOptions} azsdk-js-api` : `azsdk-js-api`;
  const updatedOptions = {
  ...options,
  userAgentOptions: { userAgentPrefix },
  };
  return getClient(endpointUrl, updatedOptions); as TestingContext;
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

```ts src/testingClient.ts class TestingClient
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
    this._client = createTesting(endpoint, {
      ...options,
      userAgentOptions: { userAgentPrefix },
    });
    this.pipeline = this._client.pipeline;
  }

  getWidget(
    options: GetWidgetOptionalParams = { requestOptions: {} },
  ): Promise<Widget> {
    return getWidget(this._client, options);
  }
}
```
