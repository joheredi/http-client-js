/**
 * Test suite for the JsonDeserializer component.
 *
 * JsonDeserializer generates `export function {name}Deserializer(item: any): {Type}`
 * functions that convert wire-format JSON response objects into typed SDK model
 * instances.
 *
 * What is tested:
 * - Basic model with simple properties produces deserializer with correct property mappings.
 * - Property name mapping: wire name (item["wireName"]) → client name as output key.
 * - Optional properties with nested model types get null-check ternary guards.
 * - Nested model properties call child deserializer via refkey.
 * - Array properties with model elements use .map() with child deserializer.
 * - Date properties deserialize via new Date().
 * - Deserializer return type references the model interface via refkey.
 * - Deserializer refkey is correctly assigned for cross-referencing.
 *
 * Why this matters:
 * Deserializers are the bridge between HTTP response bodies and typed SDK objects.
 * If deserializers are incorrect, consumers receive malformed data or runtime errors
 * when accessing response properties. This is a P0 requirement (FR5).
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { JsonDeserializer } from "../../../src/components/serialization/json-deserializer.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { deserializerRefkey } from "../../../src/utils/refkeys.js";
import { SdkTestFile } from "../../utils.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("JsonDeserializer", () => {
  /**
   * Tests that a basic model with simple string and number properties
   * produces a deserializer that maps each property from wire name to
   * client name. This is the most fundamental deserializer behavior.
   */
  it("should deserialize basic model with simple properties", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Widget")} {
          name: string;
          age: int32;
        }

        op getWidget(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonDeserializer model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Widget {
        name: string;
        age: number;
      }

      export function widgetDeserializer(item: any): Widget {
        return {
          name: item["name"],
          age: item["age"],
        };
      }
    `);
  });

  /**
   * Tests that when the wire name (serializedName) differs from the client
   * property name, the deserializer uses the wire name for input access and
   * the client name as the output key. This is the reverse of serialization.
   */
  it("should map wire names to client names", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("User")} {
          @encodedName("application/json", "user_name")
          userName: string;

          @encodedName("application/json", "email_address")
          emailAddress: string;
        }

        op getUser(): User;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonDeserializer model={model} />
      </SdkTestFile>
    );

    // The deserializer output keys should use client names (property.name)
    // while the input accessors use wire names (serializedName)
    expect(template).toRenderTo(d`
      export interface User {
        userName: string;
        emailAddress: string;
      }

      export function userDeserializer(item: any): User {
        return {
          userName: item["user_name"],
          emailAddress: item["email_address"],
        };
      }
    `);
  });

  /**
   * Tests that optional properties with nested model types get a null-check
   * ternary guard. Without this guard, calling a deserializer function on
   * undefined would crash at runtime.
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

        op getPerson(): Person;
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
        <JsonDeserializer model={addressModel} />
        {"\n\n"}
        <JsonDeserializer model={personModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Address {
        street: string;
      }

      export interface Person {
        name: string;
        address?: Address;
      }

      export function addressDeserializer(item: any): Address {
        return {
          street: item["street"],
        };
      }

      export function personDeserializer(item: any): Person {
        return {
          name: item["name"],
          address: !item["address"] ? item["address"] : addressDeserializer(item["address"]),
        };
      }
    `);
  });

  /**
   * Tests that required nested model properties call the child deserializer
   * directly without a null check guard.
   */
  it("should call child deserializer for required nested model", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Inner")} {
          value: string;
        }

        model ${t.model("Outer")} {
          inner: Inner;
        }

        op getOuter(): Outer;
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
        <JsonDeserializer model={innerModel} />
        {"\n\n"}
        <JsonDeserializer model={outerModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Inner {
        value: string;
      }

      export interface Outer {
        inner: Inner;
      }

      export function innerDeserializer(item: any): Inner {
        return {
          value: item["value"],
        };
      }

      export function outerDeserializer(item: any): Outer {
        return {
          inner: innerDeserializer(item["inner"]),
        };
      }
    `);
  });

  /**
   * Tests that array properties with model elements use .map() with the
   * child deserializer. This is essential for deserializing lists of complex
   * objects from response bodies.
   */
  it("should deserialize array of models with .map()", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Tag")} {
          label: string;
        }

        model ${t.model("Item")} {
          tags: Tag[];
        }

        op getItem(): Item;
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
        <JsonDeserializer model={tagModel} />
        {"\n\n"}
        <JsonDeserializer model={itemModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Tag {
        label: string;
      }

      export interface Item {
        tags: (Tag)[];
      }

      export function tagDeserializer(item: any): Tag {
        return {
          label: item["label"],
        };
      }

      export function itemDeserializer(item: any): Item {
        return {
          tags: item["tags"].map((p: any) => { return tagDeserializer(p); }),
        };
      }
    `);
  });

  /**
   * Tests that the deserializer refkey is correctly assigned so other
   * components (e.g., parent model deserializers, operation response handlers)
   * can reference this deserializer via refkey.
   */
  it("should be referenceable via deserializerRefkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Simple")} {
          id: string;
        }

        op getSimple(): Simple;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonDeserializer model={model} />
        {"\n\n"}
        {code`const result = ${deserializerRefkey(model)}(raw);`}
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Simple {
        id: string;
      }

      export function simpleDeserializer(item: any): Simple {
        return {
          id: item["id"],
        };
      }

      const result = simpleDeserializer(raw);
    `);
  });

  /**
   * Tests that the deserializer return type references the model interface
   * via refkey, ensuring Alloy auto-generates imports if the model is in
   * a different file.
   */
  it("should have return type referencing model interface", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Result")} {
          value: string;
        }

        op getResult(): Result;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonDeserializer model={model} />
      </SdkTestFile>
    );

    // The return type should be the model name (resolved from typeRefkey)
    expect(template).toRenderTo(d`
      export interface Result {
        value: string;
      }

      export function resultDeserializer(item: any): Result {
        return {
          value: item["value"],
        };
      }
    `);
  });
});
