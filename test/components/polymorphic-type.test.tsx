/**
 * Test suite for the PolymorphicType component.
 *
 * PolymorphicType generates TypeScript union type aliases for discriminated
 * (polymorphic) models. When a model has a `@discriminator` decorator with
 * subtypes, the component produces:
 *
 *   `export type PetUnion = Cat | Dog | Pet;`
 *
 * The union includes all direct subtypes (referenced via refkeys for cross-file
 * imports) plus the base model at the end as a fallback.
 *
 * What is tested:
 * - Basic discriminated model produces union of subtypes + base model.
 * - Only direct subtypes are included (multi-level hierarchy filtering).
 * - JSDoc documentation from model.doc appears on the type alias.
 * - Fallback "Alias for `{Name}`" documentation when no doc decorator.
 * - Returns undefined when model has no discriminated subtypes.
 * - Polymorphic type is referenceable from other expressions via refkey.
 * - Single subtype renders correctly without extra pipe separator.
 */
import "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import {
  PolymorphicType,
  getDirectSubtypes,
} from "../../src/components/polymorphic-type.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { polymorphicTypeRefkey } from "../../src/utils/refkeys.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

describe("Polymorphic Type", () => {
  /**
   * Tests the core behavior: a discriminated model with two subtypes produces
   * a union type alias that includes both subtypes and the base model. This is
   * the primary use case for polymorphic types — callers get a single type
   * representing "any valid subtype or the base".
   *
   * The `@discriminator("kind")` decorator on the base model triggers TCGC
   * to populate `discriminatedSubtypes`. Each subtype specifies its discriminator
   * value via a string literal property.
   */
  it("should render union of direct subtypes and base model", async () => {
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
          meow: boolean;
        }

        model ${t.model("Dog")} extends Pet {
          kind: "dog";
          bark: boolean;
        }

        op ${t.op("getPet")}(): Pet;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const petModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Pet",
    )!;
    const catModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Cat",
    )!;
    const dogModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Dog",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={petModel} />
        {"\n\n"}
        <ModelInterface model={catModel} />
        {"\n\n"}
        <ModelInterface model={dogModel} />
        {"\n\n"}
        <PolymorphicType model={petModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Pet
       */
      export interface Pet {
        kind: string;
        name: string;
      }

      /**
       * model interface Cat
       */
      export interface Cat extends Pet {
        kind: "cat";
        meow: boolean;
      }

      /**
       * model interface Dog
       */
      export interface Dog extends Pet {
        kind: "dog";
        bark: boolean;
      }

      /**
       * Alias for \`Pet\`
       */
      export type PetUnion = Cat | Dog | Pet;
    `);
  });

  /**
   * Tests that getDirectSubtypes correctly filters in a multi-level hierarchy.
   * Only subtypes whose `baseModel` points directly to the given model should
   * be included. In a hierarchy like `Animal → Bird → Eagle`, `Animal`'s
   * polymorphic type should include `Bird` but NOT `Eagle` (Eagle is Bird's
   * direct subtype, not Animal's).
   *
   * This is important because TCGC's `discriminatedSubtypes` map may contain
   * all transitive subtypes, but each level's union should only list its own
   * direct children.
   */
  it("should include only direct subtypes in multi-level hierarchy", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model ${t.model("Animal")} {
          kind: string;
        }

        @discriminator("subKind")
        model ${t.model("Bird")} extends Animal {
          kind: "bird";
          subKind: string;
        }

        model ${t.model("Fish")} extends Animal {
          kind: "fish";
          canSwim: boolean;
        }

        model ${t.model("Eagle")} extends Bird {
          subKind: "eagle";
          wingspan: int32;
        }

        op ${t.op("getAnimal")}(): Animal;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const animalModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Animal",
    )!;

    // Verify only direct subtypes are returned
    const directSubtypes = getDirectSubtypes(animalModel);
    const directSubtypeNames = directSubtypes.map((s) => s.name).sort();
    expect(directSubtypeNames).toEqual(["Bird", "Fish"]);

    // Eagle should NOT be a direct subtype of Animal
    expect(directSubtypeNames).not.toContain("Eagle");
  });

  /**
   * Tests that JSDoc documentation from the TypeSpec `@doc` decorator
   * on the base model propagates to the polymorphic union type alias.
   * Documentation is essential for SDK consumers navigating with IntelliSense.
   */
  it("should render JSDoc from model doc", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @doc("Represents any kind of vehicle.")
        @discriminator("type")
        model ${t.model("Vehicle")} {
          type: string;
        }

        model ${t.model("Car")} extends Vehicle {
          type: "car";
          doors: int32;
        }

        op ${t.op("getVehicle")}(): Vehicle;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const vehicleModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Vehicle",
    )!;
    const carModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Car",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={vehicleModel} />
        {"\n\n"}
        <ModelInterface model={carModel} />
        {"\n\n"}
        <PolymorphicType model={vehicleModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * Represents any kind of vehicle.
       */
      export interface Vehicle {
        type: string;
      }

      /**
       * model interface Car
       */
      export interface Car extends Vehicle {
        type: "car";
        doors: number;
      }

      /**
       * Represents any kind of vehicle.
       */
      export type VehicleUnion = Car | Vehicle;
    `);
  });

  /**
   * Tests that when a model has no `discriminatedSubtypes` (i.e., it's not
   * a polymorphic base model), the component returns undefined and nothing
   * is rendered. This ensures no empty or malformed type aliases are emitted
   * for regular models.
   */
  it("should return undefined when model has no discriminated subtypes", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Simple")} {
          name: string;
        }

        op ${t.op("getSimple")}(): Simple;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const simpleModel = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <PolymorphicType model={simpleModel} />
      </SdkTestFile>
    );

    // Should render nothing (undefined from PolymorphicType)
    expect(template).toRenderTo(``);
  });

  /**
   * Tests that the polymorphic type can be referenced from other code via
   * `polymorphicTypeRefkey`. This is critical for serializers that need to
   * accept the polymorphic union type as input/output, and for model files
   * that export all types from a namespace.
   */
  it("should be referenceable via polymorphicTypeRefkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model ${t.model("Shape")} {
          kind: string;
        }

        model ${t.model("Circle")} extends Shape {
          kind: "circle";
          radius: int32;
        }

        model ${t.model("Square")} extends Shape {
          kind: "square";
          side: int32;
        }

        op ${t.op("getShape")}(): Shape;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const shapeModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Shape",
    )!;
    const circleModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Circle",
    )!;
    const squareModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Square",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={shapeModel} />
        {"\n\n"}
        <ModelInterface model={circleModel} />
        {"\n\n"}
        <ModelInterface model={squareModel} />
        {"\n\n"}
        <PolymorphicType model={shapeModel} />
        {"\n\n"}
        {code`type TestRef = ${polymorphicTypeRefkey(shapeModel)}`}
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Shape
       */
      export interface Shape {
        kind: string;
      }

      /**
       * model interface Circle
       */
      export interface Circle extends Shape {
        kind: "circle";
        radius: number;
      }

      /**
       * model interface Square
       */
      export interface Square extends Shape {
        kind: "square";
        side: number;
      }

      /**
       * Alias for \`Shape\`
       */
      export type ShapeUnion = Circle | Square | Shape;

      type TestRef = ShapeUnion
    `);
  });

  /**
   * Tests the edge case where a discriminated model has only one direct
   * subtype. The union should still render correctly with the single
   * subtype and the base model separated by a pipe, without any
   * extraneous pipe characters.
   */
  it("should handle single subtype correctly", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model ${t.model("Base")} {
          kind: string;
        }

        model ${t.model("OnlyChild")} extends Base {
          kind: "only";
          value: string;
        }

        op ${t.op("getBase")}(): Base;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const baseModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Base",
    )!;
    const childModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "OnlyChild",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={baseModel} />
        {"\n\n"}
        <ModelInterface model={childModel} />
        {"\n\n"}
        <PolymorphicType model={baseModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Base
       */
      export interface Base {
        kind: string;
      }

      /**
       * model interface OnlyChild
       */
      export interface OnlyChild extends Base {
        kind: "only";
        value: string;
      }

      /**
       * Alias for \`Base\`
       */
      export type BaseUnion = OnlyChild | Base;
    `);
  });

  /**
   * Tests the getDirectSubtypes utility function directly to verify its
   * filtering logic without rendering. This is important because the
   * function is exported for use by other components (e.g., the Model
   * Files Orchestrator needs to know which models require polymorphic types).
   */
  it("getDirectSubtypes should return empty array for non-discriminated model", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Plain")} {
          name: string;
        }

        op ${t.op("getPlain")}(): Plain;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const plainModel = sdkContext.sdkPackage.models[0];

    const result = getDirectSubtypes(plainModel);
    expect(result).toEqual([]);
  });
});
