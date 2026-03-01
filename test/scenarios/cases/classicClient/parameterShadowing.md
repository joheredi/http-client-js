# should rename parameter that shadows imported operation function

When a body parameter has the same name as the operation (e.g., `input` operation
with `@body input: InputRecord`), the classical client method parameter must be
renamed to avoid shadowing the imported operation function. The legacy emitter
renames to `inputParameter` (appending "Parameter" suffix).

Without this fix, the generated code calls the parameter instead of the function:
`return input(this._client, input, options)` → TypeError at runtime.

## TypeSpec

```tsp
model InputRecord {
  requiredProp: string;
}

model OutputRecord {
  requiredProp: string;
}

model InputOutputRecord {
  requiredProp: string;
}

@route("/input")
@post op input(@body input: InputRecord): void;
@route("/output")
@get op output(): OutputRecord;
@route("/input-output")
@post op inputAndOutput(@body body: InputOutputRecord): InputOutputRecord;
```

## classicClient

```ts classicClient
import { input, inputAndOutput, output } from "./api/operations.js";
import type {
  InputAndOutputOptionalParams,
  InputOptionalParams,
  OutputOptionalParams,
} from "./api/options.js";
import {
  createTesting,
  type TestingClientOptionalParams,
  type TestingContext,
} from "./testingClientContext.js";
import type {
  InputOutputRecord,
  InputRecord,
  OutputRecord,
} from "./models/models.js";
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

  input(
    inputParameter: InputRecord,
    options: InputOptionalParams = { requestOptions: {} },
  ): Promise<void> {
    return input(this._client, inputParameter, options);
  }

  output(
    options: OutputOptionalParams = { requestOptions: {} },
  ): Promise<OutputRecord> {
    return output(this._client, options);
  }

  inputAndOutput(
    body: InputOutputRecord,
    options: InputAndOutputOptionalParams = { requestOptions: {} },
  ): Promise<InputOutputRecord> {
    return inputAndOutput(this._client, body, options);
  }
}
```
