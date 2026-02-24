# Should generate a model from the global namespace

```tsp
model Widget {
  id: string;
  weight: int32;
}
op getWidget(): Widget;
```

## TypeScript

```ts src/models/models.ts interface Widget
export interface Widget {
  id: string;
  weight: number;
}
```

# Should generate a model with optional properties

```tsp
model Config {
  name: string;
  value?: int32;
}
op getConfig(): Config;
```

## TypeScript

```ts src/models/models.ts interface Config
export interface Config {
  name: string;
  value?: number;
}
```
