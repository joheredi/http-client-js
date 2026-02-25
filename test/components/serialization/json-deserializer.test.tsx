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
import { d, renderToString } from "@alloy-js/core/testing";
import { Children, code } from "@alloy-js/core";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import type { SdkContext, SdkHttpOperation } from "@azure-tools/typespec-client-generator-core";
import { JsonDeserializer } from "../../../src/components/serialization/json-deserializer.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { SerializationHelpersFile } from "../../../src/components/static-helpers/serialization-helpers.js";
import { deserializerRefkey } from "../../../src/utils/refkeys.js";
import { SdkContextProvider } from "../../../src/context/sdk-context.js";
import { SdkTestFile } from "../../utils.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

/**
 * Multi-file test wrapper for deserializer tests that need collection parser
 * declarations available for refkey resolution.
 */
function DeserializerMultiFileWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        <SerializationHelpersFile />
        <SourceFile path="test.ts">{props.children}</SourceFile>
      </SdkContextProvider>
    </Output>
  );
}

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

  /**
   * Tests that model properties with @encode(ArrayEncoding.commaDelimited) are
   * wrapped with parseCsvCollection() in the deserializer. This parses
   * comma-delimited strings from the wire back into arrays (e.g., "a,b" → ["a","b"]).
   * Without this, the property would contain a raw string instead of an array.
   */
  it("should wrap array properties with collection parsers when encode is set", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Widget")} {
          @encode(ArrayEncoding.commaDelimited)
          csvColors: string[];
          @encode(ArrayEncoding.pipeDelimited)
          pipeColors: string[];
          normalColors: string[];
        }
        @route("/widgets") @post op create(@body widget: Widget): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <DeserializerMultiFileWrapper sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonDeserializer model={model} />
      </DeserializerMultiFileWrapper>
    );

    const result = renderToString(template);
    // CSV-encoded property should use parseCsvCollection
    expect(result).toContain("parseCsvCollection(item[\"csvColors\"])");
    // Pipe-encoded property should use parsePipeCollection
    expect(result).toContain("parsePipeCollection(item[\"pipeColors\"])");
    // Non-encoded array property should pass through as-is
    expect(result).toContain("normalColors: item[\"normalColors\"]");
    expect(result).not.toContain("parseCsvCollection(item[\"normalColors\"])");
  });

  /**
   * Tests that plainDate properties deserialize from wire strings using `new Date()`.
   *
   * The wire format for plainDate is a YYYY-MM-DD string. JavaScript's Date
   * constructor correctly parses this format, so `new Date("2024-01-15")`
   * produces a valid Date object. This matches the legacy emitter pattern.
   *
   * This test ensures plainDate deserialization wasn't accidentally broken
   * when fixing RC19 (plainDate serialization). Deserialization uses
   * `new Date()` for both utcDateTime and plainDate — only serialization
   * differs (`.toISOString()` vs `.toISOString().split("T")[0]`).
   */
  it("should deserialize plainDate with new Date()", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Event")} {
          name: string;
          eventDate: plainDate;
        }

        op getEvent(): Event;
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

    // plainDate deserializes with new Date() — same as utcDateTime
    expect(template).toRenderTo(d`
      export interface Event {
        name: string;
        eventDate: Date;
      }

      export function eventDeserializer(item: any): Event {
        return {
          name: item["name"],
          eventDate: new Date(item["eventDate"]),
        };
      }
    `);
  });
});
