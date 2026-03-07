# Should not generate null for optional nullable properties in Azure services by default

## TypeSpec

```tsp
model TestModel {
  optionalNullableBoolean?: boolean | null;
  requiredNullableBoolean: boolean | null;
  optionalBoolean?: boolean;
  requiredBoolean: boolean;
}
op test(): { @body body: TestModel };
```

## config

```yaml
flavor: azure
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface TestModel
 */
export interface TestModel {
  optionalNullableBoolean?: boolean;
  requiredNullableBoolean: boolean | null;
  optionalBoolean?: boolean;
  requiredBoolean: boolean;
}
```

```ts serialization
import type { TestModel } from "../models.js";

export function testModelDeserializer(item: any): TestModel {
  return {
    optionalNullableBoolean: item["optionalNullableBoolean"],
    requiredNullableBoolean: item["requiredNullableBoolean"],
    optionalBoolean: item["optionalBoolean"],
    requiredBoolean: item["requiredBoolean"],
  };
}
```

---

# Should generate null for optional nullable properties when ignore-nullable-on-optional is false

## TypeSpec

```tsp
model TestModel {
  optionalNullableBoolean?: boolean | null;
  requiredNullableBoolean: boolean | null;
}
op test(): { @body body: TestModel };
```

## config

```yaml
ignore-nullable-on-optional: false
```

## Models

```ts models
/**
 * This file contains only generated model types and their (de)serializers.
 * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
 */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

/**
 * model interface TestModel
 */
export interface TestModel {
  optionalNullableBoolean?: boolean | null;
  requiredNullableBoolean: boolean | null;
}
```

```ts serialization
import type { TestModel } from "../models.js";

export function testModelDeserializer(item: any): TestModel {
  return {
    optionalNullableBoolean: item["optionalNullableBoolean"],
    requiredNullableBoolean: item["requiredNullableBoolean"],
  };
}
```

---

# Should not generate null for optional nullable query/header/body parameters in Azure services by default

## TypeSpec

```tsp
model Widget {
  name: string;
  color?: string;
}

@route("/test")
interface TestOperations {
  @post
  create(
    @query optionalNullableQuery?: string | null;
    @header optionalNullableHeader?: string | null;
    @body optionalNullableBody?: Widget | null;
  ): void;
}
```

## config

```yaml
flavor: azure
```

## Models with Options

```ts models:withOptions
import type { Widget } from "../../../models/models.js";
import type { OperationOptions } from "@azure-rest/core-client";

/**
 * Optional parameters for the create operation.
 */
export interface TestOperationsCreateOptionalParams extends OperationOptions {
  optionalNullableQuery?: string;
  optionalNullableHeader?: string;
  optionalNullableBody?: Widget;
}
```

---

# Should generate null for optional nullable query/header/body parameters when ignore-nullable-on-optional is false

## TypeSpec

```tsp
model Widget {
  name: string;
  color?: string;
}

@route("/test")
interface TestOperations {
  @post
  create(
    @query optionalNullableQuery?: string | null;
    @header optionalNullableHeader?: string | null;
    @body optionalNullableBody?: Widget | null;
  ): void;
}
```

## config

```yaml
ignore-nullable-on-optional: false
```

## Models with Options

```ts models:withOptions
import type { Widget } from "../../../models/models.js";
import type { OperationOptions } from "@typespec/ts-http-runtime";

/**
 * Optional parameters for the create operation.
 */
export interface TestOperationsCreateOptionalParams extends OperationOptions {
  optionalNullableQuery?: string | null;
  optionalNullableHeader?: string | null;
  optionalNullableBody?: Widget | null;
}
```
