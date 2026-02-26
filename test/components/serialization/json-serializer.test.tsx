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
 * - plainDate properties serialize via .toISOString().split("T")[0] for date-only format.
 * - utcDateTime with unixTimestamp encoding serializes as integer seconds ((getTime() / 1000) | 0).
 * - Models with additionalProperties spread the explicit field into the serialized output.
 * - Name conflict on additionalProperties uses additionalPropertiesBag in the serializer.
 * - Serializer is only generated for models with Input usage flag.
 * - Serializer refkey is correctly assigned for cross-referencing.
 *
 * Why this matters:
 * Serializers are the bridge between typed SDK objects and HTTP request bodies.
 * If serializers are incorrect, API calls will send malformed data to the service,
 * causing 400 errors or data corruption. This is a P0 requirement (FR5).
 */
import "@alloy-js/core/testing";
import { d, renderToString } from "@alloy-js/core/testing";
import { Children, code, refkey } from "@alloy-js/core";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import type { SdkContext, SdkHttpOperation, SdkModelType } from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { JsonSerializer } from "../../../src/components/serialization/json-serializer.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { SerializationHelpersFile } from "../../../src/components/static-helpers/serialization-helpers.js";
import { serializerRefkey, typeRefkey } from "../../../src/utils/refkeys.js";
import { SdkContextProvider } from "../../../src/context/sdk-context.js";
import { SdkTestFile } from "../../utils.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

/**
 * Multi-file test wrapper for serializer tests that need collection helper
 * declarations available for refkey resolution.
 */
function SerializerMultiFileWrapper(props: {
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

describe("JsonSerializer", () => {
  describe("basic model serialization", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let widgetModel: SdkModelType;
    let simpleModel: SdkModelType;
    let optsModel: SdkModelType;

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

          model ${t.model("Opts")} {
            required: string;
            optional?: string;
          }

          @route("/widgets") op createWidget(@body widget: Widget): void;
          @route("/simples") op createSimple(@body s: Simple): void;
          @route("/opts") op createOpts(@body opts: Opts): void;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      widgetModel = sdkContext.sdkPackage.models.find((m) => m.name === "Widget")!;
      simpleModel = sdkContext.sdkPackage.models.find((m) => m.name === "Simple")!;
      optsModel = sdkContext.sdkPackage.models.find((m) => m.name === "Opts")!;
    });

    /**
     * Tests that a basic model with simple string and number properties
     * produces a serializer that maps each property from client name to
     * wire name. This is the most fundamental serializer behavior — if
     * this fails, no serialization works at all.
     */
    it("should serialize basic model with simple properties", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={widgetModel} />
          {"\n\n"}
          <JsonSerializer model={widgetModel} />
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

        export function widgetSerializer(item: Widget): any {
          return {
            name: item["name"],
            age: item["age"],
          };
        }
      `);
    });

    /**
     * Tests that the serializer refkey is correctly assigned so other components
     * (e.g., parent model serializers, operation request builders) can reference
     * this serializer via refkey and Alloy auto-generates imports.
     */
    it("should be referenceable via serializerRefkey", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={simpleModel} />
          {"\n\n"}
          <JsonSerializer model={simpleModel} />
          {"\n\n"}
          {code`const result = ${serializerRefkey(simpleModel)}(data);`}
        </SdkTestFile>
      );

      // The refkey reference should resolve to the serializer function name
      expect(template).toRenderTo(d`
        /**
         * model interface Simple
         */
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
    it("should not add null check for optional simple properties", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={optsModel} />
          {"\n\n"}
          <JsonSerializer model={optsModel} />
        </SdkTestFile>
      );

      // No null check for optional string — simple passthrough
      expect(template).toRenderTo(d`
        /**
         * model interface Opts
         */
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
      /**
       * model interface User
       */
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

  describe("nested model serialization", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let addressModel: SdkModelType;
    let personModel: SdkModelType;
    let innerModel: SdkModelType;
    let outerModel: SdkModelType;

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

          @route("/persons") op createPerson(@body person: Person): void;
          @route("/outers") op createOuter(@body outer: Outer): void;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      addressModel = sdkContext.sdkPackage.models.find((m) => m.name === "Address")!;
      personModel = sdkContext.sdkPackage.models.find((m) => m.name === "Person")!;
      innerModel = sdkContext.sdkPackage.models.find((m) => m.name === "Inner")!;
      outerModel = sdkContext.sdkPackage.models.find((m) => m.name === "Outer")!;
    });

    /**
     * Tests that optional properties with nested model types get a null-check
     * ternary guard. Without this guard, calling a serializer function on
     * undefined would crash at runtime. The pattern is:
     * `!item["prop"] ? item["prop"] : childSerializer(item["prop"])`
     */
    it("should wrap optional nested model properties with null check", () => {
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
    it("should call child serializer for required nested model", () => {
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
  });

  describe("array serialization", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let tagModel: SdkModelType;
    let itemModel: SdkModelType;
    let configModel: SdkModelType;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("Tag")} {
            label: string;
          }

          model ${t.model("Item")} {
            tags: Tag[];
          }

          model ${t.model("Config")} {
            values: string[];
          }

          @route("/items") op createItem(@body item: Item): void;
          @route("/configs") op createConfig(@body config: Config): void;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      tagModel = sdkContext.sdkPackage.models.find((m) => m.name === "Tag")!;
      itemModel = sdkContext.sdkPackage.models.find((m) => m.name === "Item")!;
      configModel = sdkContext.sdkPackage.models.find((m) => m.name === "Config")!;
    });

    /**
     * Tests that array properties with model elements use .map() with the
     * child serializer. This is essential for serializing lists of complex
     * objects in request bodies.
     */
    it("should serialize array of models with .map()", () => {
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
    it("should pass through simple arrays without transformation", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={configModel} />
          {"\n\n"}
          <JsonSerializer model={configModel} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(d`
        /**
         * model interface Config
         */
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
  });

  /**
   * Tests that model properties with @encode(ArrayEncoding.commaDelimited) are
   * wrapped with buildCsvCollection() in the serializer. This converts arrays
   * to comma-delimited strings for the wire format (e.g., ["a","b"] → "a,b").
   * Without this, the property would be sent as a JSON array instead of a string.
   */
  it("should wrap array properties with collection builders when encode is set", async () => {
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
      <SerializerMultiFileWrapper sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
      </SerializerMultiFileWrapper>
    );

    const result = renderToString(template);
    // CSV-encoded property should use buildCsvCollection
    expect(result).toContain("buildCsvCollection(item[\"csvColors\"])");
    // Pipe-encoded property should use buildPipeCollection
    expect(result).toContain("buildPipeCollection(item[\"pipeColors\"])");
    // Non-encoded array property should pass through as-is
    expect(result).toContain("normalColors: item[\"normalColors\"]");
    expect(result).not.toContain("buildCsvCollection(item[\"normalColors\"])");
  });

  describe("date serialization", () => {
    let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
    let eventModel: SdkModelType;
    let logModel: SdkModelType;
    let taskModel: SdkModelType;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("Event")} {
            name: string;
            eventDate: plainDate;
          }

          model ${t.model("Log")} {
            message: string;
            timestamp: utcDateTime;
          }

          model ${t.model("Task")} {
            title: string;
            dueDate?: plainDate;
          }

          @route("/events") op createEvent(@body event: Event): void;
          @route("/logs") op createLog(@body log: Log): void;
          @route("/tasks") op createTask(@body task: Task): void;
        `,
      );

      sdkContext = await createSdkContextForTest(program);
      eventModel = sdkContext.sdkPackage.models.find((m) => m.name === "Event")!;
      logModel = sdkContext.sdkPackage.models.find((m) => m.name === "Log")!;
      taskModel = sdkContext.sdkPackage.models.find((m) => m.name === "Task")!;
    });

    /**
     * Tests that plainDate properties serialize to date-only format (YYYY-MM-DD)
     * using `.toISOString().split("T")[0]` instead of the full ISO datetime string.
     *
     * This is critical because APIs using TypeSpec's `plainDate` scalar expect
     * wire values like "2024-01-15", not "2024-01-15T00:00:00.000Z". Sending a
     * full ISO datetime string causes 400 errors or data misinterpretation on
     * services that validate date-only format.
     *
     * The legacy emitter uses the same `.toISOString().split("T")[0]` pattern.
     */
    it("should serialize plainDate as date-only YYYY-MM-DD format", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={eventModel} />
          {"\n\n"}
          <JsonSerializer model={eventModel} />
        </SdkTestFile>
      );

      // plainDate must use .toISOString().split("T")[0] for YYYY-MM-DD format
      expect(template).toRenderTo(d`
        /**
         * model interface Event
         */
        export interface Event {
          name: string;
          eventDate: Date;
        }

        export function eventSerializer(item: Event): any {
          return {
            name: item["name"],
            eventDate: (item["eventDate"]).toISOString().split("T")[0],
          };
        }
      `);
    });

    /**
     * Tests that utcDateTime properties still serialize with full `.toISOString()`
     * after the plainDate fix, ensuring the two date types are correctly distinguished.
     *
     * utcDateTime values must produce full ISO 8601 datetime strings (RFC 3339),
     * e.g., "2024-01-15T12:30:00.000Z". Using date-only format would lose time
     * information, breaking APIs that need precise timestamps.
     */
    it("should serialize utcDateTime as full ISO string", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={logModel} />
          {"\n\n"}
          <JsonSerializer model={logModel} />
        </SdkTestFile>
      );

      // utcDateTime must use full .toISOString() (not truncated)
      expect(template).toRenderTo(d`
        /**
         * model interface Log
         */
        export interface Log {
          message: string;
          timestamp: Date;
        }

        export function logSerializer(item: Log): any {
          return {
            message: item["message"],
            timestamp: (item["timestamp"]).toISOString(),
          };
        }
      `);
    });

    /**
     * Tests that an optional plainDate property gets both the null-check guard
     * AND the date-only serialization format. This validates that wrapWithNullCheck
     * correctly wraps the plainDate-specific expression.
     *
     * Optional date properties that need transformation require:
     * `!item["prop"] ? item["prop"] : (item["prop"]).toISOString().split("T")[0]`
     */
    it("should serialize optional plainDate with null check and date-only format", () => {
      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={taskModel} />
          {"\n\n"}
          <JsonSerializer model={taskModel} />
        </SdkTestFile>
      );

      // Optional plainDate gets null check + date-only format
      expect(template).toRenderTo(d`
        /**
         * model interface Task
         */
        export interface Task {
          title: string;
          dueDate?: Date;
        }

        export function taskSerializer(item: Task): any {
          return {
            title: item["title"],
            dueDate: !item["dueDate"] ? item["dueDate"] : (item["dueDate"]).toISOString().split("T")[0],
          };
        }
      `);
    });
  });

  /**
   * Tests that utcDateTime with unixTimestamp encoding serializes to integer seconds,
   * not milliseconds. JavaScript's Date.getTime() returns milliseconds since epoch,
   * but the wire format for unix timestamps is integer seconds.
   *
   * The expression `(getTime() / 1000) | 0` divides by 1000 to convert ms→s, and
   * uses bitwise OR to truncate to integer (equivalent to Math.floor for positive values).
   * This matches the legacy emitter's pattern exactly.
   *
   * Without this fix, timestamps would be 1000x too large, causing API errors or
   * incorrect date interpretation on the service side.
   */
  it("should serialize utcDateTime with unixTimestamp encoding as integer seconds", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Event")} {
          name: string;
          @encode("unixTimestamp", int32)
          createdAt: utcDateTime;
        }

        op createEvent(@body event: Event): void;
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

    // unixTimestamp must divide by 1000 and truncate to integer seconds
    expect(template).toRenderTo(d`
      /**
       * model interface Event
       */
      export interface Event {
        name: string;
        createdAt: Date;
      }

      export function eventSerializer(item: Event): any {
        return {
          name: item["name"],
          createdAt: ((item["createdAt"]).getTime() / 1000) | 0,
        };
      }
    `);
  });

  /**
   * Tests that optional utcDateTime with unixTimestamp encoding gets the null-check
   * guard AND the seconds-conversion expression. This ensures both the optionality
   * handling and the encoding fix work together correctly.
   */
  it("should serialize optional utcDateTime with unixTimestamp encoding", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Event")} {
          name: string;
          @encode("unixTimestamp", int32)
          deletedAt?: utcDateTime;
        }

        op createEvent(@body event: Event): void;
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

    // Optional unixTimestamp gets null check + seconds conversion
    expect(template).toRenderTo(d`
      /**
       * model interface Event
       */
      export interface Event {
        name: string;
        deletedAt?: Date;
      }

      export function eventSerializer(item: Event): any {
        return {
          name: item["name"],
          deletedAt: !item["deletedAt"] ? item["deletedAt"] : ((item["deletedAt"]).getTime() / 1000) | 0,
        };
      }
    `);
  });

  /**
   * Tests that utcDateTime with rfc7231 encoding serializes to HTTP-date format
   * using `.toUTCString()` instead of `.toISOString()`.
   *
   * HTTP headers use RFC 7231 date format (e.g., "Mon, 15 Jan 2024 12:30:00 GMT")
   * per RFC 7231 §7.1.1.1. When TCGC sets `encode: "rfc7231"` on a utcDateTime
   * (typically for header parameters), the serializer must use `.toUTCString()`.
   *
   * Without this fix, Date objects sent as HTTP headers would use ISO 8601 format
   * or be passed as raw Date objects, causing runtime errors or API rejections.
   */
  it("should serialize utcDateTime with rfc7231 encoding as toUTCString", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Request")} {
          name: string;
          @encode("rfc7231")
          retryAfter: utcDateTime;
        }

        op createRequest(@body request: Request): void;
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

    // rfc7231 encoding must use .toUTCString() for HTTP-date format
    expect(template).toRenderTo(d`
      /**
       * model interface Request
       */
      export interface Request {
        name: string;
        retryAfter: Date;
      }

      export function requestSerializer(item: Request): any {
        return {
          name: item["name"],
          retryAfter: (item["retryAfter"]).toUTCString(),
        };
      }
    `);
  });

  /**
   * Tests that optional utcDateTime with rfc7231 encoding gets both the null-check
   * guard AND the `.toUTCString()` encoding. This ensures optionality handling and
   * rfc7231 encoding work together correctly.
   */
  it("should serialize optional utcDateTime with rfc7231 encoding and null check", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Request")} {
          name: string;
          @encode("rfc7231")
          retryAfter?: utcDateTime;
        }

        op createRequest(@body request: Request): void;
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

    // Optional rfc7231 gets null check + toUTCString
    expect(template).toRenderTo(d`
      /**
       * model interface Request
       */
      export interface Request {
        name: string;
        retryAfter?: Date;
      }

      export function requestSerializer(item: Request): any {
        return {
          name: item["name"],
          retryAfter: !item["retryAfter"] ? item["retryAfter"] : (item["retryAfter"]).toUTCString(),
        };
      }
    `);
  });

  /**
   * Tests that models with `...Record<T>` additional properties produce
   * a serializer that spreads `...item` FIRST in the return object to capture
   * all additional properties, then overrides known properties with their
   * serialized versions. This matches the legacy compatibility-mode pattern
   * where `extends Record<string, T>` is used on the interface.
   */
  it("should spread item in serializer for models with additional properties", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Metadata")} {
          name: string;
          ...Record<string>;
        }

        @route("/test")
        interface D {
          op ${t.op("bar")}(@body body: Metadata): void;
        }
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SerializerMultiFileWrapper sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
      </SerializerMultiFileWrapper>
    );

    const result = renderToString(template);
    expect(result).toContain(`...item`);
    expect(result).toContain(`item: Metadata`);
  });

  /**
   * Tests that models with a name conflict on `additionalProperties` still
   * use `...item` spread in the serializer (the extends Record<string, any>
   * pattern). The named `additionalProperties` property is serialized as a
   * normal property, while additional properties are captured by the spread.
   */
  it("should spread item in serializer when name conflict on additionalProperties exists", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Metadata")} {
          additionalProperties: Record<int32>;
          name: string;
          ...Record<string>;
        }

        @route("/test")
        interface D {
          op ${t.op("bar")}(@body body: Metadata): void;
        }
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SerializerMultiFileWrapper sdkContext={sdkContext}>
        <ModelInterface model={model} />
        {"\n\n"}
        <JsonSerializer model={model} />
      </SerializerMultiFileWrapper>
    );

    const result = renderToString(template);
    expect(result).toContain(`...item`);
    expect(result).toContain(`additionalProperties: item["additionalProperties"]`);
  });

  /**
   * Tests that child model serializers include inherited parent properties.
   *
   * When `Cat extends Pet`, the `catSerializer` must include ALL properties —
   * both inherited (`name`, `weight` from Pet) and own (`kind`, `meow` from Cat).
   * Without this, the serialized request body would be missing inherited fields,
   * causing the service to reject the request or lose data.
   *
   * This test validates the fix for SA32 (P0): previously, child serializers
   * in non-discriminated inheritance hierarchies only included their own
   * properties, causing data loss during serialization.
   */
  it("should include parent properties in child model serializer", async () => {
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
        @route("/cats") op create(@body body: Cat): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const petModel = sdkContext.sdkPackage.models.find((m) => m.name === "Pet")!;
    const catModel = sdkContext.sdkPackage.models.find((m) => m.name === "Cat")!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={petModel} />
        {"\n\n"}
        <ModelInterface model={catModel} />
        {"\n\n"}
        <JsonSerializer model={catModel} includeParentProperties />
      </SdkTestFile>
    );

    // catSerializer must include name and weight from Pet parent
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

      export function catSerializer(item: Cat): any {
        return {
          name: item["name"],
          weight: item["weight"],
          kind: item["kind"],
          meow: item["meow"],
        };
      }
    `);
  });
});
