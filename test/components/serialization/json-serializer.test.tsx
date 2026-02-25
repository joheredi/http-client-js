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
import { describe, expect, it } from "vitest";
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
  it("should serialize plainDate as date-only YYYY-MM-DD format", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Event")} {
          name: string;
          eventDate: plainDate;
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

    // plainDate must use .toISOString().split("T")[0] for YYYY-MM-DD format
    expect(template).toRenderTo(d`
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
  it("should serialize utcDateTime as full ISO string", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Log")} {
          message: string;
          timestamp: utcDateTime;
        }

        op createLog(@body log: Log): void;
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

    // utcDateTime must use full .toISOString() (not truncated)
    expect(template).toRenderTo(d`
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
  it("should serialize optional plainDate with null check and date-only format", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Task")} {
          title: string;
          dueDate?: plainDate;
        }

        op createTask(@body task: Task): void;
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

    // Optional plainDate gets null check + date-only format
    expect(template).toRenderTo(d`
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
});
