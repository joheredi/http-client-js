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
 * - utcDateTime with unixTimestamp encoding deserializes via new Date(value * 1000).
 * - Bytes properties deserialize with typeof guard to handle already-decoded Uint8Array.
 * - Bytes with base64url encoding use correct encoding string.
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
import { beforeAll, describe, expect, it } from "vitest";
import type {
  SdkArrayType,
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { JsonDeserializer } from "../../../src/components/serialization/json-deserializer.js";
import { JsonArrayDeserializer } from "../../../src/components/serialization/json-array-record-helpers.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { SerializationHelpersFile } from "../../../src/components/static-helpers/serialization-helpers.js";
import { deserializerRefkey } from "../../../src/utils/refkeys.js";
import { SdkContextProvider } from "../../../src/context/sdk-context.js";
import { httpRuntimeLib } from "../../../src/utils/external-packages.js";
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
  describe("basic primitive models", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;
    let widgetModel: (typeof sdkContext.sdkPackage.models)[number];
    let simpleModel: (typeof sdkContext.sdkPackage.models)[number];
    let resultModel: (typeof sdkContext.sdkPackage.models)[number];

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("Widget")} {
            name: string;
            age: int32;
          }

          model ${t.model("Simple")} {
            id: string;
          }

          model ${t.model("Result")} {
            value: string;
          }

          @route("/widgets") op getWidget(): Widget;
          @route("/simples") op getSimple(): Simple;
          @route("/results") op getResult(): Result;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      widgetModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Widget",
      )!;
      simpleModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Simple",
      )!;
      resultModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Result",
      )!;
    });

    /**
     * Tests that a basic model with simple string and number properties
     * produces a deserializer that maps each property from wire name to
     * client name. This is the most fundamental deserializer behavior.
     */
    it("should deserialize basic model with simple properties", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={widgetModel} />
          {"\n\n"}
          <JsonDeserializer model={widgetModel} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        /**
         * model interface Widget
         */
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
     * Tests that the deserializer refkey is correctly assigned so other
     * components (e.g., parent model deserializers, operation response handlers)
     * can reference this deserializer via refkey.
     */
    it("should be referenceable via deserializerRefkey", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={simpleModel} />
          {"\n\n"}
          <JsonDeserializer model={simpleModel} />
          {"\n\n"}
          {code`const result = ${deserializerRefkey(simpleModel)}(raw);`}
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        /**
         * model interface Simple
         */
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
    it("should have return type referencing model interface", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={resultModel} />
          {"\n\n"}
          <JsonDeserializer model={resultModel} />
        </SdkTestFile>
      );

      // The return type should be the model name (resolved from typeRefkey)
      expect(template).toRenderTo(d`
        /**
         * model interface Result
         */
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
      /**
       * model interface User
       */
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

  describe("nested model deserialization", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;
    let addressModel: (typeof sdkContext.sdkPackage.models)[number];
    let personModel: (typeof sdkContext.sdkPackage.models)[number];
    let innerModel: (typeof sdkContext.sdkPackage.models)[number];
    let outerModel: (typeof sdkContext.sdkPackage.models)[number];
    let tagModel: (typeof sdkContext.sdkPackage.models)[number];
    let itemModel: (typeof sdkContext.sdkPackage.models)[number];

    beforeAll(async () => {
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

          model ${t.model("Inner")} {
            value: string;
          }

          model ${t.model("Outer")} {
            inner: Inner;
          }

          model ${t.model("Tag")} {
            label: string;
          }

          model ${t.model("Item")} {
            tags: Tag[];
          }

          @route("/persons") op getPerson(): Person;
          @route("/outers") op getOuter(): Outer;
          @route("/items") op getItem(): Item;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      addressModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Address",
      )!;
      personModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Person",
      )!;
      innerModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Inner",
      )!;
      outerModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Outer",
      )!;
      tagModel = sdkContext.sdkPackage.models.find((m) => m.name === "Tag")!;
      itemModel = sdkContext.sdkPackage.models.find((m) => m.name === "Item")!;
    });

    /**
     * Tests that optional properties with nested model types get a null-check
     * ternary guard. Without this guard, calling a deserializer function on
     * undefined would crash at runtime.
     */
    it("should wrap optional nested model properties with null check", () => {
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
        /**
         * model interface Address
         */
        export interface Address {
          street: string;
        }

        /**
         * model interface Person
         */
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
    it("should call child deserializer for required nested model", () => {
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
        /**
         * model interface Inner
         */
        export interface Inner {
          value: string;
        }

        /**
         * model interface Outer
         */
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
     * Tests that array properties with model elements use a named array
     * deserializer helper function instead of inline .map(). This matches
     * the legacy emitter's pattern of generating dedicated array deserializer
     * functions like `tagArrayDeserializer(items)`.
     */
    it("should deserialize array of models with .map()", () => {
      const tagsArrayType = itemModel.properties.find((p) => p.name === "tags")!
        .type as SdkArrayType;
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={tagModel} />
          {"\n\n"}
          <ModelInterface model={itemModel} />
          {"\n\n"}
          <JsonDeserializer model={tagModel} />
          {"\n\n"}
          <JsonDeserializer model={itemModel} />
          {"\n\n"}
          <JsonArrayDeserializer type={tagsArrayType} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        /**
         * model interface Tag
         */
        export interface Tag {
          label: string;
        }

        /**
         * model interface Item
         */
        export interface Item {
          tags: Tag[];
        }

        export function tagDeserializer(item: any): Tag {
          return {
            label: item["label"],
          };
        }

        export function itemDeserializer(item: any): Item {
          return {
            tags: tagArrayDeserializer(item["tags"]),
          };
        }

        export function tagArrayDeserializer(result: Array<Tag>): any[] {
          return result.map((item) => { return tagDeserializer(item); });
        }
      `);
    });
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
    expect(result).toContain('parseCsvCollection(item["csvColors"])');
    // Pipe-encoded property should use parsePipeCollection
    expect(result).toContain('parsePipeCollection(item["pipeColors"])');
    // Non-encoded array property should pass through as-is
    expect(result).toContain('normalColors: item["normalColors"]');
    expect(result).not.toContain('parseCsvCollection(item["normalColors"])');
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
      /**
       * model interface Event
       */
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

  /**
   * Tests that utcDateTime with unixTimestamp encoding deserializes by multiplying
   * the wire value (integer seconds) by 1000 before passing to the Date constructor.
   * JavaScript's Date constructor expects milliseconds, so `new Date(seconds * 1000)`
   * is required for correct conversion. This is the inverse of the serialization
   * expression `(getTime() / 1000) | 0`.
   */
  it("should deserialize utcDateTime with unixTimestamp encoding using * 1000", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Event")} {
          name: string;
          @encode("unixTimestamp", int32)
          createdAt: utcDateTime;
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

    // unixTimestamp deserialization must multiply by 1000 to convert seconds to ms
    expect(template).toRenderTo(d`
      /**
       * model interface Event
       */
      export interface Event {
        name: string;
        createdAt: Date;
      }

      export function eventDeserializer(item: any): Event {
        return {
          name: item["name"],
          createdAt: new Date(item["createdAt"] * 1000),
        };
      }
    `);
  });

  /**
   * Tests that child model deserializers include inherited parent properties.
   *
   * When `Cat extends Pet`, the `catDeserializer` must produce an object with
   * ALL properties — both inherited (`name`, `weight` from Pet) and own
   * (`kind`, `meow` from Cat). Without this, the deserialized Cat object would
   * be missing critical data that the TypeScript interface declares.
   *
   * This test validates the fix for SA32 (P0): previously, child deserializers
   * in non-discriminated inheritance hierarchies only included their own
   * properties, causing data loss during deserialization.
   */
  it("should include parent properties in child model deserializer", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Pet")} {
          name: string;
          weight?: float32;
        }
        model ${t.model("Cat")} extends Pet {
          kind: "cat";
          meow: int32;
        }
        op read(): Cat;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const petModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Pet",
    )!;
    const catModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Cat",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={petModel} />
        {"\n\n"}
        <ModelInterface model={catModel} />
        {"\n\n"}
        <JsonDeserializer model={catModel} includeParentProperties />
      </SdkTestFile>
    );

    // catDeserializer must include name and weight from Pet parent
    expect(template).toRenderTo(d`
      /**
       * model interface Pet
       */
      export interface Pet {
        name: string;
        weight?: number;
      }

      /**
       * model interface Cat
       */
      export interface Cat extends Pet {
        kind: "cat";
        meow: number;
      }

      export function catDeserializer(item: any): Cat {
        return {
          name: item["name"],
          weight: item["weight"],
          kind: item["kind"],
          meow: item["meow"],
        };
      }
    `);
  });

  describe("bytes deserialization", () => {
    /**
     * Tests that bytes properties with default encoding (base64) are deserialized
     * with a typeof guard that checks if the value is a string before calling
     * stringToUint8Array. This guard is essential for robustness — in round-trip
     * scenarios the value may already be a Uint8Array, and calling stringToUint8Array
     * on a non-string would produce incorrect results or crash.
     *
     * Expected pattern:
     *   typeof item["prop"] === "string"
     *     ? stringToUint8Array(item["prop"], "base64")
     *     : item["prop"]
     */
    it("should deserialize bytes with typeof guard and base64 encoding", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("Document")} {
            content: bytes;
          }

          op getDocument(): Document;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];

      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ModelInterface model={model} />
          {"\n\n"}
          <JsonDeserializer model={model} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import { stringToUint8Array } from "@typespec/ts-http-runtime";

        /**
         * model interface Document
         */
        export interface Document {
          content: Uint8Array;
        }

        export function documentDeserializer(item: any): Document {
          return {
            content: typeof item["content"] === "string"
            ? stringToUint8Array(item["content"], "base64")
            : item["content"],
          };
        }
      `);
    });

    /**
     * Tests that bytes properties with explicit base64url encoding use "base64url"
     * in the stringToUint8Array call instead of the default "base64". The typeof
     * guard must still be present. This validates that the type's encode field
     * is respected for non-default encodings.
     */
    it("should deserialize bytes with base64url encoding", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("Token")} {
            @encode(BytesKnownEncoding.base64url)
            data: bytes;
          }

          op getToken(): Token;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];

      const template = (
        <SdkTestFile sdkContext={sdkContext} externals={[httpRuntimeLib]}>
          <ModelInterface model={model} />
          {"\n\n"}
          <JsonDeserializer model={model} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        import { stringToUint8Array } from "@typespec/ts-http-runtime";

        /**
         * model interface Token
         */
        export interface Token {
          data: Uint8Array;
        }

        export function tokenDeserializer(item: any): Token {
          return {
            data: typeof item["data"] === "string"
            ? stringToUint8Array(item["data"], "base64url")
            : item["data"],
          };
        }
      `);
    });
  });

  describe("empty models", () => {
    /**
     * Tests that an empty model (no properties, no additionalProperties) produces
     * a pass-through deserializer that returns `item` directly instead of `{}`.
     *
     * Why this matters:
     * The legacy emitter returns `item` for empty models, preserving any extra
     * properties on the object. Returning `{}` would discard all data, which is
     * a breaking change for consumers who rely on the pass-through behavior.
     * This is regression SA-C14.
     */
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;
    let emptyModel: (typeof sdkContext.sdkPackage.models)[number];

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("EmptyResult")} {}

          @route("/empty") op getEmpty(): {@body _: EmptyResult};
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      emptyModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "EmptyResult",
      )!;
    });

    it("should return item for empty model deserializer", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={emptyModel} />
          {"\n\n"}
          <JsonDeserializer model={emptyModel} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        /**
         * model interface EmptyResult
         */
        export interface EmptyResult {}

        export function emptyResultDeserializer(item: any): EmptyResult {
          return item;
        }
      `);
    });
  });
});
