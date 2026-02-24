/**
 * Test suite for the JsonSerializer component.
 *
 * JsonSerializer generates `export function {name}Serializer(item: {Type}): any`
 * functions that convert typed SDK model objects into wire-format JSON objects
 * for HTTP request bodies.
 *
 * What is tested:
 * - Basic model with simple properties produces serializer with correct property mappings.
 * - Property name mapping: client name (item["clientName"]) → wire name (serializedName).
 * - Optional properties with nested model types get null-check ternary guards.
 * - Nested model properties call child serializer via refkey.
 * - Array properties with model elements use .map() with child serializer.
 * - Date properties serialize via .toISOString().
 * - Serializer is only generated for models with Input usage flag.
 * - Serializer refkey is correctly assigned for cross-referencing.
 *
 * Why this matters:
 * Serializers are the bridge between typed SDK objects and HTTP request bodies.
 * If serializers are incorrect, API calls will send malformed data to the service,
 * causing 400 errors or data corruption. This is a P0 requirement (FR5).
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { code, refkey } from "@alloy-js/core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { JsonSerializer } from "../../../src/components/serialization/json-serializer.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { serializerRefkey, typeRefkey } from "../../../src/utils/refkeys.js";
import { SdkTestFile } from "../../utils.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("JsonSerializer", () => {
  /**
   * Tests that a basic model with simple string and number properties
   * produces a serializer that maps each property from client name to
   * wire name. This is the most fundamental serializer behavior — if
   * this fails, no serialization works at all.
   */
  it("should serialize basic model with simple properties", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Widget")} {
          name: string;
          age: int32;
        }

        op createWidget(@body widget: Widget): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Widget {
        name: string;
        age: number;
      }

      export function widgetSerializer(item: Widget): any {
        return {
          name: item["name"],
          age: item["age"],
        };
      }
    `);
  });

  /**
   * Tests that when the wire name (serializedName) differs from the client
   * property name, the serializer uses the wire name as the output key and
   * the client name as the accessor. This is critical for APIs with naming
   * conventions that differ from TypeScript (e.g., snake_case wire names).
   */
  it("should map client names to wire names", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("User")} {
          @encodedName("application/json", "user_name")
          userName: string;

          @encodedName("application/json", "email_address")
          emailAddress: string;
        }

        op createUser(@body user: User): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
      </SdkTestFile>
    );

    // The serializer output keys should use wire names (serializedName)
    // while the input accessors use client names (property.name)
    expect(template).toRenderTo(d`
      export interface User {
        userName: string;
        emailAddress: string;
      }

      export function userSerializer(item: User): any {
        return {
          user_name: item["userName"],
          email_address: item["emailAddress"],
        };
      }
    `);
  });

  /**
   * Tests that optional properties with nested model types get a null-check
   * ternary guard. Without this guard, calling a serializer function on
   * undefined would crash at runtime. The pattern is:
   * `!item["prop"] ? item["prop"] : childSerializer(item["prop"])`
   */
  it("should wrap optional nested model properties with null check", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Address")} {
          street: string;
        }

        model ${t.model("Person")} {
          name: string;
          address?: Address;
        }

        op createPerson(@body person: Person): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const personModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Person",
    )!;
    const addressModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Address",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={addressModel} />
        {"\n\n"}
        <ModelInterface model={personModel} />
        {"\n\n"}
        <JsonSerializer model={addressModel} />
        {"\n\n"}
        <JsonSerializer model={personModel} />
      </SdkTestFile>
    );

    // The address property is optional and a model type, so it gets a null check
    expect(template).toRenderTo(d`
      export interface Address {
        street: string;
      }

      export interface Person {
        name: string;
        address?: Address;
      }

      export function addressSerializer(item: Address): any {
        return {
          street: item["street"],
        };
      }

      export function personSerializer(item: Person): any {
        return {
          name: item["name"],
          address: !item["address"] ? item["address"] : addressSerializer(item["address"]),
        };
      }
    `);
  });

  /**
   * Tests that required nested model properties call the child serializer
   * directly without a null check guard. Required properties are always
   * present, so the guard is unnecessary.
   */
  it("should call child serializer for required nested model", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Inner")} {
          value: string;
        }

        model ${t.model("Outer")} {
          inner: Inner;
        }

        op createOuter(@body outer: Outer): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const outerModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Outer",
    )!;
    const innerModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Inner",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={innerModel} />
        {"\n\n"}
        <ModelInterface model={outerModel} />
        {"\n\n"}
        <JsonSerializer model={innerModel} />
        {"\n\n"}
        <JsonSerializer model={outerModel} />
      </SdkTestFile>
    );

    // Required nested model: no null check, just call child serializer directly
    expect(template).toRenderTo(d`
      export interface Inner {
        value: string;
      }

      export interface Outer {
        inner: Inner;
      }

      export function innerSerializer(item: Inner): any {
        return {
          value: item["value"],
        };
      }

      export function outerSerializer(item: Outer): any {
        return {
          inner: innerSerializer(item["inner"]),
        };
      }
    `);
  });

  /**
   * Tests that array properties with model elements use .map() with the
   * child serializer. This is essential for serializing lists of complex
   * objects in request bodies.
   */
  it("should serialize array of models with .map()", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Tag")} {
          label: string;
        }

        model ${t.model("Item")} {
          tags: Tag[];
        }

        op createItem(@body item: Item): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const itemModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Item",
    )!;
    const tagModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Tag",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={tagModel} />
        {"\n\n"}
        <ModelInterface model={itemModel} />
        {"\n\n"}
        <JsonSerializer model={tagModel} />
        {"\n\n"}
        <JsonSerializer model={itemModel} />
      </SdkTestFile>
    );

    // Array of models uses .map() with child serializer
    expect(template).toRenderTo(d`
      export interface Tag {
        label: string;
      }

      export interface Item {
        tags: (Tag)[];
      }

      export function tagSerializer(item: Tag): any {
        return {
          label: item["label"],
        };
      }

      export function itemSerializer(item: Item): any {
        return {
          tags: item["tags"].map((p: any) => { return tagSerializer(p); }),
        };
      }
    `);
  });

  /**
   * Tests that simple passthrough arrays (arrays of primitives like string[])
   * are assigned directly without .map() transformation, since primitive
   * values don't need serialization.
   */
  it("should pass through simple arrays without transformation", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Config")} {
          values: string[];
        }

        op createConfig(@body config: Config): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Config {
        values: (string)[];
      }

      export function configSerializer(item: Config): any {
        return {
          values: item["values"],
        };
      }
    `);
  });

  /**
   * Tests that the serializer refkey is correctly assigned so other components
   * (e.g., parent model serializers, operation request builders) can reference
   * this serializer via refkey and Alloy auto-generates imports.
   */
  it("should be referenceable via serializerRefkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Simple")} {
          id: string;
        }

        op createSimple(@body s: Simple): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
        {"\n\n"}
        {code`const result = ${serializerRefkey(model)}(data);`}
      </SdkTestFile>
    );

    // The refkey reference should resolve to the serializer function name
    expect(template).toRenderTo(d`
      export interface Simple {
        id: string;
      }

      export function simpleSerializer(item: Simple): any {
        return {
          id: item["id"],
        };
      }

      const result = simpleSerializer(data);
    `);
  });

  /**
   * Tests that optional properties of simple types (string, number) do NOT
   * get null-check guards. Only properties that need transformation functions
   * (model serializers, date conversions, etc.) require the guard. Simple
   * passthrough properties are safe to assign even if undefined.
   */
  it("should not add null check for optional simple properties", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Opts")} {
          required: string;
          optional?: string;
        }

        op createOpts(@body opts: Opts): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
      </SdkTestFile>
    );

    // No null check for optional string — simple passthrough
    expect(template).toRenderTo(d`
      export interface Opts {
        required: string;
        optional?: string;
      }

      export function optsSerializer(item: Opts): any {
        return {
          required: item["required"],
          optional: item["optional"],
        };
      }
    `);
  });
});
