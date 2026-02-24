# should handle path parameter named 'path' without variable shadowing

When an operation has a path parameter named 'path', the generated code should use a unique local variable name to avoid shadowing the function parameter.

## TypeSpec

```tsp
@doc("Get result file.")
@route("/analyzerResults/{operationId}/files/{+path}")
@get
op getResultFile(
  @doc("Operation identifier.")
  @path
  operationId: string,

  @doc("File path.")
  @path
  path: string
): string;
```

## Operations

```ts operations function _getResultFileSend
export function _getResultFileSend(
  context: Client_1,
  operationId: string,
  path: string,
  options: GetResultFileOptionalParams = { requestOptions: {} },
): StreamableMethod_1 {
  const path = expandUrlTemplate_1(
    "/analyzerResults/{operationId}/files/{+path}",
    { operationId: operationId, path: path },
    { allowReserved: options?.requestOptions?.skipUrlEncoding },
  );
  return context.path(path).get({
    ...operationOptionsToRequestParameters_1(options),
    headers: { accept: "text/plain", ...options.requestOptions?.headers },
  });
}
```
