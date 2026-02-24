# Should generate model with enum property

```tsp
enum Color {
  Red: "red",
  Blue: "blue",
  Green: "green",
}

model Widget {
  id: string;
  color: Color;
}

op getWidget(): Widget;
```

## TypeScript

Should generate both the enum and the model interface.

```ts src/models/models.ts interface Widget
export interface Widget {
  id: string;
  color: Color;
}
```

```ts src/models/models.ts enum KnownColor
export enum KnownColor {
  /**
   * red
   */
  Red = "red",
  /**
   * blue
   */
  Blue = "blue",
  /**
   * green
   */
  Green = "green",
}
```

# Should generate model with array property

```tsp
model Container {
  items: string[];
  count: int32;
}

op getContainer(): Container;
```

## TypeScript

```ts src/models/models.ts interface Container
export interface Container {
  items: string[];
  count: number;
}
```

# Should generate model with inheritance

```tsp
model Pet {
  name: string;
  age: int32;
}

model Dog extends Pet {
  breed: string;
}

op getDog(): Dog;
```

## TypeScript

```ts src/models/models.ts interface Pet
export interface Pet {
  name: string;
  age: number;
}
```

```ts src/models/models.ts interface Dog
export interface Dog extends Pet {
  breed: string;
}
```
