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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  buildCsvCollection,
  buildNewlineCollection,
  buildPipeCollection,
  buildSsvCollection,
  parseCsvCollection,
  parseNewlineCollection,
  parsePipeCollection,
  parseSsvCollection,
} from "../static-helpers/serializationHelpers.js";

/**
 * model interface Widget
 */
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
    requiredCsvColors: buildCsvCollection(item["requiredCsvColors"]),
    requiredPipeColors: buildPipeCollection(item["requiredPipeColors"]),
    optionalSsvColors: buildSsvCollection(item["optionalSsvColors"]),
    optionalNewlineColors: buildNewlineCollection(
      item["optionalNewlineColors"],
    ),
  };
}

export function widgetDeserializer(item: any): Widget {
  return {
    colors: item["colors"],
    optionalColors: item["optionalColors"],
    requiredCsvColors: parseCsvCollection(item["requiredCsvColors"]),
    requiredPipeColors: parsePipeCollection(item["requiredPipeColors"]),
    optionalSsvColors: parseSsvCollection(item["optionalSsvColors"]),
    optionalNewlineColors: parseNewlineCollection(
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  buildCsvCollection,
  buildPipeCollection,
  parseCsvCollection,
  parsePipeCollection,
} from "../static-helpers/serializationHelpers.js";

/**
 * model interface ContainerWidget
 */
export interface ContainerWidget {
  name: string;
  nested: NestedWidget;
  optionalNested?: NestedWidget;
}

/**
 * model interface NestedWidget
 */
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
    tags: buildCsvCollection(item["tags"]),
    categories: buildPipeCollection(item["categories"]),
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
    tags: parseCsvCollection(item["tags"]),
    categories: parsePipeCollection(item["categories"]),
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
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import {
  buildCsvCollection,
  buildNewlineCollection,
  buildPipeCollection,
  buildSsvCollection,
  parseCsvCollection,
  parseNewlineCollection,
  parsePipeCollection,
  parseSsvCollection,
} from "../static-helpers/serializationHelpers.js";

/**
 * model interface Widget
 */
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
    requiredCsvColors: buildCsvCollection(item["requiredCsvColors"]),
    optionalPipeColors: buildPipeCollection(item["optionalPipeColors"]),
    requiredSpaceTypes: buildSsvCollection(item["requiredSpaceTypes"]),
    optionalSpaceTypes: buildNewlineCollection(item["optionalSpaceTypes"]),
  };
}

export function widgetDeserializer(item: any): Widget {
  return {
    requiredCsvColors: parseCsvCollection(item["requiredCsvColors"]),
    optionalPipeColors: parsePipeCollection(item["optionalPipeColors"]),
    requiredSpaceTypes: parseSsvCollection(item["requiredSpaceTypes"]),
    optionalSpaceTypes: parseNewlineCollection(item["optionalSpaceTypes"]),
  };
}
```
