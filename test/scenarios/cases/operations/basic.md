# Should generate a GET operation

```tsp
model Widget {
  id: string;
  weight: int32;
}

@get op getWidget(): Widget;
```

## TypeScript

Should generate the public operation function.

```ts src/api/operations.ts function getWidget
export async function getWidget(
  context: Client_1,
  options: GetWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget_1> {
  const result = await _getWidgetSend(context, options);
  return _getWidgetDeserialize(result);
}
```

# Should generate a POST operation with body

```tsp
model Widget {
  id: string;
  weight: int32;
}

@post op createWidget(@body body: Widget): Widget;
```

## TypeScript

```ts src/api/operations.ts function createWidget
export async function createWidget(
  context: Client_1,
  body: Widget_1,
  options: CreateWidgetOptionalParams = { requestOptions: {} },
): Promise<Widget_1> {
  const result = await _createWidgetSend(context, body, options);
  return _createWidgetDeserialize(result);
}
```
