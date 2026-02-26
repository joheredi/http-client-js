# Should support complex cases with multiple conflicts and multiple properties' flattening

Should support complex cases with multiple conflicts and multiple properties' flattening

## TypeSpec

This is tsp definition.

```tsp
model A {
  x: string;
}

model ChildFlattenModel {
  description: string;
  baz: int32;
}

model FooProperties {
  bar?: A[];
  baz: A[];

  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties?: ChildFlattenModel;
}

@doc("This is a simple model.")
model BodyParameter {
  baz: string;

  @Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: FooProperties;

  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties2?: ChildFlattenModel;

  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  emptyFlatten?: ChildFlattenModel;
}

@doc("show example demo")
op read(@body widget?: BodyParameter): void;
```

Enable the raw content with TCGC dependency.

```yaml
needArmTemplate: true
withVersionedApiVersion: true
needTCGC: true
mustEmptyDiagnostic: false
```

## Example

Raw json files.

```json
{
  "title": "read",
  "operationId": "read",
  "parameters": {
    "widget": {
      "baz": "body name",
      "properties": {
        "baz": [
          {
            "x": "bbb"
          }
        ],
        "bar": [
          {
            "x": "xx"
          }
        ],
        "properties": {
          "baz": 222
        }
      },
      "properties2": {
        "baz": 111
      }
    }
  },
  "responses": {
    "200": {}
  }
}
```

## Models

Model generated.

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * This is a simple model.
 */
export interface BodyParameter {
  baz: string;
  bar?: A[];
  baz: A[];
  properties?: ChildFlattenModel;
  description?: string;
  baz?: number;
  description?: string;
  baz?: number;
}

/**
 * model interface FooProperties
 */
export interface FooProperties {
  bar?: A[];
  baz: A[];
  description?: string;
  baz?: number;
}

/**
 * model interface A
 */
export interface A {
  x: string;
}

/**
 * model interface ChildFlattenModel
 */
export interface ChildFlattenModel {
  description: string;
  baz: number;
}

/**
 * The available API versions.
 */
export enum KnownVersions {
  /**
   * 2022-05-15-preview
   */
  V20220515Preview = "2022-05-15-preview",
}

export function bodyParameterSerializer(item: BodyParameter): any {
  return {
    baz: item["baz"],
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aSerializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aSerializer(p);
    }),
    properties: !item["properties"]
      ? item["properties"]
      : childFlattenModelSerializer(item["properties"]),
    description: item["description"],
    baz: item["baz"],
    description: item["description"],
    baz: item["baz"],
  };
}

export function fooPropertiesSerializer(item: FooProperties): any {
  return {
    bar: !item["bar"]
      ? item["bar"]
      : item["bar"].map((p: any) => {
          return aSerializer(p);
        }),
    baz: item["baz"].map((p: any) => {
      return aSerializer(p);
    }),
    description: item["description"],
    baz: item["baz"],
  };
}

export function aSerializer(item: A): any {
  return {
    x: item["x"],
  };
}

export function childFlattenModelSerializer(item: ChildFlattenModel): any {
  return {
    description: item["description"],
    baz: item["baz"],
  };
}
```

## Samples

Generate optional body in option parameter:

```ts samples
/** This file path is /samples-dev/readSample.ts */
import { TestServiceClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to show example demo
 *
 * @summary show example demo
 * x-ms-original-file: 2022-05-15-preview/json.json
 */
async function read(): Promise<void> {
  const endpoint = process.env.TEST_SERVICE_ENDPOINT || "";
  const client = new TestServiceClient(endpoint);
  const result = await client.read({ widget: {} });
  console.log(result);
}

async function main(): Promise<void> {
  await read();
}

main().catch(console.error);
```
