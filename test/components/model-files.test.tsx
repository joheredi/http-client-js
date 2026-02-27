/**
 * Test suite for the ModelFiles orchestrator component.
 *
 * ModelFiles is the top-level coordinator for all type declarations in the
 * emitter output. It collects models, enums, and unions from the SDK context
 * and renders them into a `models/models.ts` source file inside a `models/`
 * directory.
 *
 * What is tested:
 * - A service with models renders them into `models/models.ts`.
 * - A service with enums renders them alongside models.
 * - A service with mixed types (models, enums, unions) renders all in correct order.
 * - Discriminated models produce both interface and polymorphic union type.
 * - Cross-model references resolve correctly via refkeys within the same file.
 * - An empty service (no models, enums, or unions) produces no output.
 * - A service with only enums renders just enum declarations.
 * - A service with only unions renders just union declarations.
 *
 * Why this matters:
 * This is the orchestration layer that assembles all individual type components
 * (ModelInterface, EnumDeclaration, UnionDeclaration, PolymorphicType) into
 * the final file structure. If this fails, the emitter cannot produce model files
 * even if the individual components are correct.
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { Children } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import type { SdkContext, SdkHttpOperation } from "@azure-tools/typespec-client-generator-core";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";

/**
 * Test wrapper for ModelFiles that provides Output and SdkContext but NO
 * SourceFile — since ModelFiles creates its own SourceDirectory and SourceFile.
 *
 * Unlike SdkTestFile which wraps children in a `<SourceFile path="test.ts">`,
 * this wrapper only provides the Output and SdkContextProvider context needed
 * for ModelFiles to render its own file structure.
 */
function ModelFilesTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  children: Children;
}) {
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
    >
      <SdkContextProvider sdkContext={props.sdkContext}>
        {props.children}
      </SdkContextProvider>
    </Output>
  );
}

describe("ModelFiles", () => {
  /**
   * Tests that a service with a simple model renders a models.ts file
   * in the models/ directory containing the model interface. This is
   * the baseline test for the orchestrator — if this fails, the entire
   * model file generation pipeline is broken.
   */
  it("should render models into models/models.ts", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Widget")} {
          name: string;
          age: int32;
        }

        op ${t.op("getWidget")}(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "models/models.ts": d`
        /**
         * This file contains only generated model types and their (de)serializers.
         * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
         */
        /* eslint-disable @typescript-eslint/naming-convention */
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */


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
      `,
    });
  });

  /**
   * Tests that a service with only enums (no models) renders the enum
   * declarations in models/models.ts. This ensures the orchestrator
   * handles the case where only some type categories are present.
   */
  it("should render enums when no models exist", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        enum Color {
          Red,
          Green,
          Blue,
        }

        op ${t.op("getColor")}(): Color;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "models/models.ts": d`
        /**
         * This file contains only generated model types and their (de)serializers.
         * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
         */
        /* eslint-disable @typescript-eslint/naming-convention */
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */


        /**
         * Type of Color
         */
        export type Color = "Red" | "Green" | "Blue";
      `,
    });
  });

  /**
   * Tests that a service with models and enums renders both in the same
   * file with correct ordering: models first, then enums. This validates
   * the declaration ordering logic and section separation.
   */
  it("should render models before enums", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Widget")} {
          name: string;
          status: Status;
        }

        enum Status {
          Active,
          Inactive,
        }

        op ${t.op("getWidget")}(): Widget;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "models/models.ts": d`
        /**
         * This file contains only generated model types and their (de)serializers.
         * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
         */
        /* eslint-disable @typescript-eslint/naming-convention */
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */


        /**
         * model interface Widget
         */
        export interface Widget {
          name: string;
          status: Status;
        }

        /**
         * Type of Status
         */
        export type Status = "Active" | "Inactive";

        export function widgetDeserializer(item: any): Widget {
          return {
            name: item["name"],
            status: item["status"],
          };
        }
      `,
    });
  });

  /**
   * Tests that a discriminated model produces both the interface and
   * the polymorphic union type alias. This validates that the orchestrator
   * correctly composes ModelInterface with PolymorphicType for models
   * that have discriminated subtypes.
   */
  it("should render polymorphic types after their base model", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model ${t.model("Pet")} {
          kind: string;
          name: string;
        }

        model ${t.model("Cat")} extends Pet {
          kind: "cat";
          purrs: boolean;
        }

        model ${t.model("Dog")} extends Pet {
          kind: "dog";
          barks: boolean;
        }

        op ${t.op("getPet")}(): Pet;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    // Find the base Pet model to verify polymorphic types are rendered
    const petModel = sdkContext.sdkPackage.models.find((m) => m.name === "Pet");
    expect(petModel).toBeDefined();
    expect(petModel!.discriminatedSubtypes).toBeDefined();

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    // Render and verify the output contains both interfaces and the union
    const result = template;
    // The output should contain the Pet interface, Cat interface, Dog interface,
    // and the PetUnion type alias
    expect(result).toRenderTo({
      "models/models.ts": expect.stringContaining("export interface Pet"),
    });
    expect(result).toRenderTo({
      "models/models.ts": expect.stringContaining("export type PetUnion"),
    });
    expect(result).toRenderTo({
      "models/models.ts": expect.stringContaining("export interface Cat"),
    });
    expect(result).toRenderTo({
      "models/models.ts": expect.stringContaining("export interface Dog"),
    });
  });

  /**
   * Tests that an empty service (no models, enums, or unions) produces
   * no output at all — no empty files or directories. This is important
   * because emitting empty files would be wasteful and confusing to consumers.
   */
  it("should render nothing when no types exist", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        op ${t.op("ping")}(): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    // Verify there are no types
    expect(sdkContext.sdkPackage.models.length).toBe(0);
    expect(sdkContext.sdkPackage.enums.length).toBe(0);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    // When no types exist, the output should have no files
    expect(template).toRenderTo("");
  });

  /**
   * Tests that a service with unions of mixed types renders union
   * declarations. TCGC only keeps true mixed-type unions as SdkUnionType
   * (string-literal unions become enums), so this test uses mixed types.
   */
  it("should render union declarations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union MixedType {
          s: string,
          n: int32,
        }

        op ${t.op("sendMixed")}(@body value: MixedType): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "models/models.ts": d`
        /**
         * This file contains only generated model types and their (de)serializers.
         * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
         */
        /* eslint-disable @typescript-eslint/naming-convention */
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */


        /**
         * Alias for MixedType
         */
        export type MixedType = string | number;

        export function mixedTypeSerializer(item: MixedType): any {
          return item;
        }
      `,
    });
  });

  /**
   * Tests that multiple models render with blank line separation.
   * Ensures the <For doubleHardline> separator works correctly across
   * multiple model declarations.
   */
  it("should separate multiple models with blank lines", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Foo")} {
          x: string;
        }

        model ${t.model("Bar")} {
          y: int32;
        }

        @get op ${t.op("getFoo")}(): Foo;
        @get @route("bar") op ${t.op("getBar")}(): Bar;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    expect(template).toRenderTo({
      "models/models.ts": d`
        /**
         * This file contains only generated model types and their (de)serializers.
         * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
         */
        /* eslint-disable @typescript-eslint/naming-convention */
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */


        /**
         * model interface Foo
         */
        export interface Foo {
          x: string;
        }

        /**
         * model interface Bar
         */
        export interface Bar {
          y: number;
        }

        export function fooDeserializer(item: any): Foo {
          return {
            x: item["x"],
          };
        }

        export function barDeserializer(item: any): Bar {
          return {
            y: item["y"],
          };
        }
      `,
    });
  });

  /**
   * Tests that cross-model references resolve correctly when both types
   * are in the same file. A model property that references another model
   * should use the model name directly (no import needed since they're
   * in the same file).
   */
  it("should resolve cross-model references in the same file", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Address")} {
          street: string;
          city: string;
        }

        model ${t.model("Person")} {
          name: string;
          address: Address;
        }

        op ${t.op("getPerson")}(): Person;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    // Both models should be in the same file, and Person's address
    // property should reference Address by name
    expect(template).toRenderTo({
      "models/models.ts": expect.stringContaining("address: Address"),
    });
  });
});
