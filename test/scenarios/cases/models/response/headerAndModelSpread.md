# Intersection of model and header in response

This scenario tests that metadata properties like headers are included in the generated TypeScript model interface by default.

## TypeSpec

```yaml
include-headers-in-response: true
```

```tsp
model User {
  name: string;
  email: string;
}

op getUser(): {@header requestId: string, ...User};
```

## Models

```ts models interface User
export interface User {
  name: string;
  email: string;
}
```

```ts operations function getUser
export async function getUser(
  context: Client_1,
  options: GetUserOptionalParams_1 = { requestOptions: {} },
): Promise<User_1> {
  const result = await _getUserSend(context, options);
  return _getUserDeserialize(result);
}
```

```ts operations function _getUserDeserializeHeaders
export function _getUserDeserializeHeaders(result: PathUncheckedResponse_1): {
  requestId: string;
} {
  return { requestId: result.headers["request-id"] };
}
```
