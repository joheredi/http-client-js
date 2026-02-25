# Should generate collection format serializers for basic model properties

## TypeSpec

```tsp
model Widget {
  colors: string[];

  optionalColors?: string[];

  @encode(ArrayEncoding.commaDelimited)
  requiredCsvColors: string[];

  @encode(ArrayEncoding.pipeDelimited)
  requiredPipeColors: string[];

  @encode(ArrayEncoding.spaceDelimited)
  optionalSsvColors?: string[];

  @encode(ArrayEncoding.newlineDelimited)
  optionalNewlineColors?: string[];
}

@route("/widgets")
interface WidgetOperations {
  @post
  createWidget(@body widget: Widget): Widget;
}
```

## Models

```ts models
import {
  buildCsvCollection as buildCsvCollection_1,
  buildNewlineCollection as buildNewlineCollection_1,
  buildPipeCollection as buildPipeCollection_1,
  buildSsvCollection as buildSsvCollection_1,
  parseCsvCollection as parseCsvCollection_1,
  parseNewlineCollection as parseNewlineCollection_1,
  parsePipeCollection as parsePipeCollection_1,
  parseSsvCollection as parseSsvCollection_1,
} from "../helpers/serializationHelpers.js";

export interface Widget {
  colors: string[];
  optionalColors?: string[];
  requiredCsvColors: string[];
  requiredPipeColors: string[];
  optionalSsvColors?: string[];
  optionalNewlineColors?: string[];
}

export function widgetSerializer(item: Widget): any {
  return {
    colors: item["colors"],
    optionalColors: item["optionalColors"],
    requiredCsvColors: buildCsvCollection_1(item["requiredCsvColors"]),
    requiredPipeColors: buildPipeCollection_1(item["requiredPipeColors"]),
    optionalSsvColors: buildSsvCollection_1(item["optionalSsvColors"]),
    optionalNewlineColors: buildNewlineCollection_1(
      item["optionalNewlineColors"],
    ),
  };
}

export function widgetDeserializer(item: any): Widget {
  return {
    colors: item["colors"],
    optionalColors: item["optionalColors"],
    requiredCsvColors: parseCsvCollection_1(item["requiredCsvColors"]),
    requiredPipeColors: parsePipeCollection_1(item["requiredPipeColors"]),
    optionalSsvColors: parseSsvCollection_1(item["optionalSsvColors"]),
    optionalNewlineColors: parseNewlineCollection_1(
      item["optionalNewlineColors"],
    ),
  };
}
```

# Should generate collection format serializers for nested model properties

## TypeSpec

```tsp
model NestedWidget {
  @encode(ArrayEncoding.commaDelimited)
  tags: string[];

  @encode(ArrayEncoding.pipeDelimited)
  categories?: string[];
}

model ContainerWidget {
  name: string;
  nested: NestedWidget;
  optionalNested?: NestedWidget;
}

@route("/container")
interface ContainerOperations {
  @post
  createContainer(@body container: ContainerWidget): ContainerWidget;
}
```

## Models

```ts models
import {
  buildCsvCollection as buildCsvCollection_1,
  buildPipeCollection as buildPipeCollection_1,
  parseCsvCollection as parseCsvCollection_1,
  parsePipeCollection as parsePipeCollection_1,
} from "../helpers/serializationHelpers.js";

export interface ContainerWidget {
  name: string;
  nested: NestedWidget;
  optionalNested?: NestedWidget;
}

export interface NestedWidget {
  tags: string[];
  categories?: string[];
}

export function containerWidgetSerializer(item: ContainerWidget): any {
  return {
    name: item["name"],
    nested: nestedWidgetSerializer(item["nested"]),
    optionalNested: !item["optionalNested"]
      ? item["optionalNested"]
      : nestedWidgetSerializer(item["optionalNested"]),
  };
}

export function nestedWidgetSerializer(item: NestedWidget): any {
  return {
    tags: buildCsvCollection_1(item["tags"]),
    categories: buildPipeCollection_1(item["categories"]),
  };
}

export function containerWidgetDeserializer(item: any): ContainerWidget {
  return {
    name: item["name"],
    nested: nestedWidgetDeserializer(item["nested"]),
    optionalNested: !item["optionalNested"]
      ? item["optionalNested"]
      : nestedWidgetDeserializer(item["optionalNested"]),
  };
}

export function nestedWidgetDeserializer(item: any): NestedWidget {
  return {
    tags: parseCsvCollection_1(item["tags"]),
    categories: parsePipeCollection_1(item["categories"]),
  };
}
```

# Should generate collection format serializers for string-based enum array properties

## TypeSpec

```tsp
enum Color {
  Red: "red",
  Blue: "blue",
  Green: "green"
}

union ColorsUnion {
  string,
  red: "red";
  blue: "blue";
  green: "green";
}

alias Type = "x" | "y" | "z";

model Widget {
  @encode(ArrayEncoding.commaDelimited)
  requiredCsvColors: Color[];

  @encode(ArrayEncoding.pipeDelimited)
  optionalPipeColors?: ColorsUnion[];

  @encode(ArrayEncoding.spaceDelimited)
  requiredSpaceTypes: ("a" | "b")[];

  @encode(ArrayEncoding.newlineDelimited)
  optionalSpaceTypes?: Type[];
}

@route("/widgets")
interface WidgetOperations {
  @post
  createWidget(@body widget: Widget): Widget;
}
```

This is the tspconfig.yaml.

```yaml
experimental-extensible-enums: true
```

## Models

```ts models
import {
  buildCsvCollection as buildCsvCollection_1,
  buildNewlineCollection as buildNewlineCollection_1,
  buildPipeCollection as buildPipeCollection_1,
  buildSsvCollection as buildSsvCollection_1,
  parseCsvCollection as parseCsvCollection_1,
  parseNewlineCollection as parseNewlineCollection_1,
  parsePipeCollection as parsePipeCollection_1,
  parseSsvCollection as parseSsvCollection_1,
} from "../helpers/serializationHelpers.js";

export interface Widget {
  requiredCsvColors: Color[];
  optionalPipeColors?: ColorsUnion[];
  requiredSpaceTypes: WidgetRequiredSpaceType[];
  optionalSpaceTypes?: WidgetOptionalSpaceType[];
}

/**
 * Type of Color
 */
export type Color = "red" | "blue" | "green";

/**
 * Type of ColorsUnion
 */
export type ColorsUnion = string;

/**
 * Known values of {@link ColorsUnion} that the service accepts.
 */
export enum KnownColorsUnion {
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

/**
 * Type of WidgetRequiredSpaceType
 */
export type WidgetRequiredSpaceType = "a" | "b";

/**
 * Type of WidgetOptionalSpaceType
 */
export type WidgetOptionalSpaceType = "x" | "y" | "z";

export function widgetSerializer(item: Widget): any {
  return {
    requiredCsvColors: buildCsvCollection_1(item["requiredCsvColors"]),
    optionalPipeColors: buildPipeCollection_1(item["optionalPipeColors"]),
    requiredSpaceTypes: buildSsvCollection_1(item["requiredSpaceTypes"]),
    optionalSpaceTypes: buildNewlineCollection_1(item["optionalSpaceTypes"]),
  };
}

export function widgetDeserializer(item: any): Widget {
  return {
    requiredCsvColors: parseCsvCollection_1(item["requiredCsvColors"]),
    optionalPipeColors: parsePipeCollection_1(item["optionalPipeColors"]),
    requiredSpaceTypes: parseSsvCollection_1(item["requiredSpaceTypes"]),
    optionalSpaceTypes: parseNewlineCollection_1(item["optionalSpaceTypes"]),
  };
}
```
