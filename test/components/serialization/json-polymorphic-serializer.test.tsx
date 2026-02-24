/**
 * Test suite for the JsonPolymorphicSerializer component.
 *
 * JsonPolymorphicSerializer generates switch-based serializer functions for
 * discriminated (polymorphic) model types. Instead of serializing individual
 * properties, it switches on the discriminator property value and routes to
 * the appropriate subtype serializer.
 *
 * What is tested:
 * - Basic discriminated model produces switch with cases for each subtype.
 * - Switch uses client property name for discriminator access.
 * - Each case calls the subtype serializer via refkey with type narrowing cast.
 * - Default case returns item as-is for unknown discriminator values.
 * - Parameter type is the polymorphic union type (not the base model type).
 * - Serializer is referenceable via serializerRefkey(model).
 * - Single subtype renders one case correctly.
 *
 * Why this matters:
 * Polymorphic serialization is the mechanism that enables correct JSON output
 * for discriminated models. Without it, attempting to serialize a Cat (subtype
 * of Pet) would call the base Pet serializer, losing subtype-specific properties.
 * This is a P0 requirement (FR6).
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { JsonPolymorphicSerializer } from "../../../src/components/serialization/json-polymorphic-serializer.js";
import { JsonSerializer } from "../../../src/components/serialization/json-serializer.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { PolymorphicType } from "../../../src/components/polymorphic-type.js";
import { serializerRefkey } from "../../../src/utils/refkeys.js";
import { SdkTestFile } from "../../utils.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("JsonPolymorphicSerializer", () => {
  /**
   * Tests the core behavior: a discriminated model with two subtypes produces
   * a switch-based serializer that routes to each subtype's serializer. This
   * is the fundamental polymorphic serialization pattern — if this fails,
   * no discriminated models can be serialized correctly.
   */
  it("should generate switch on discriminator with cases for each subtype", async () => {
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

        op createPet(@body pet: Pet): void;
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
        {"\n\n"}
        <JsonSerializer model={catModel} />
        {"\n\n"}
        <JsonSerializer model={dogModel} />
        {"\n\n"}
        <JsonPolymorphicSerializer model={petModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      export interface Pet {
        kind: string;
        name: string;
      }

      export interface Cat extends Pet {
        kind: "cat";
        meow: boolean;
      }

      export interface Dog extends Pet {
        kind: "dog";
        bark: boolean;
      }

      /**
       * Alias for ${"`"}Pet${"`"}
       */
      export type PetUnion = Cat | Dog | Pet;

      export function catSerializer(item: Cat): any {
        return {
          kind: item["kind"],
          meow: item["meow"],
        };
      }

      export function dogSerializer(item: Dog): any {
        return {
          kind: item["kind"],
          bark: item["bark"],
        };
      }

      export function petUnionSerializer(item: PetUnion): any {
        switch (item["kind"]) {
          case "cat":
            return catSerializer(item as Cat);
          case "dog":
            return dogSerializer(item as Dog);
          default:
            return item;
        }
      }
    `);
  });

  /**
   * Tests that the polymorphic serializer uses the client property name
   * (not the wire name) for the discriminator switch. Since the serializer
   * receives a typed SDK object, the discriminator is accessed via the
   * client-side property name.
   */
  it("should use client property name for discriminator access", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("type")
        model ${t.model("Shape")} {
          @encodedName("application/json", "shape_type")
          type: string;
        }

        model ${t.model("Circle")} extends Shape {
          @encodedName("application/json", "shape_type")
          type: "circle";
          radius: int32;
        }

        op createShape(@body shape: Shape): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const shapeModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Shape",
    )!;
    const circleModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Circle",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={shapeModel} />
        {"\n\n"}
        <ModelInterface model={circleModel} />
        {"\n\n"}
        <PolymorphicType model={shapeModel} />
        {"\n\n"}
        <JsonSerializer model={circleModel} />
        {"\n\n"}
        <JsonPolymorphicSerializer model={shapeModel} />
      </SdkTestFile>
    );

    const result = template;
    // Verify the switch uses the client name "type", not the wire name "shape_type"
    expect(result).toRenderTo(d`
      export interface Shape {
        type: string;
      }

      export interface Circle extends Shape {
        type: "circle";
        radius: number;
      }

      /**
       * Alias for ${"`"}Shape${"`"}
       */
      export type ShapeUnion = Circle | Shape;

      export function circleSerializer(item: Circle): any {
        return {
          shape_type: item["type"],
          radius: item["radius"],
        };
      }

      export function shapeUnionSerializer(item: ShapeUnion): any {
        switch (item["type"]) {
          case "circle":
            return circleSerializer(item as Circle);
          default:
            return item;
        }
      }
    `);
  });

  /**
   * Tests that the polymorphic serializer's parameter type is the union type
   * (PetUnion) not the base model type (Pet). This is critical because callers
   * pass any subtype, and the TypeScript type system needs to accept all of them.
   * This matches the PRD acceptance criteria: "Parameter type uses
   * polymorphicTypeRefkey (union type, not base)".
   */
  it("should use polymorphic union type as parameter type", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model ${t.model("Vehicle")} {
          kind: string;
        }

        model ${t.model("Car")} extends Vehicle {
          kind: "car";
          doors: int32;
        }

        op createVehicle(@body v: Vehicle): void;
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
        {"\n\n"}
        <JsonSerializer model={carModel} />
        {"\n\n"}
        <JsonPolymorphicSerializer model={vehicleModel} />
      </SdkTestFile>
    );

    // Verify the parameter type is VehicleUnion, not Vehicle
    expect(template).toRenderTo(d`
      export interface Vehicle {
        kind: string;
      }

      export interface Car extends Vehicle {
        kind: "car";
        doors: number;
      }

      /**
       * Alias for ${"`"}Vehicle${"`"}
       */
      export type VehicleUnion = Car | Vehicle;

      export function carSerializer(item: Car): any {
        return {
          kind: item["kind"],
          doors: item["doors"],
        };
      }

      export function vehicleUnionSerializer(item: VehicleUnion): any {
        switch (item["kind"]) {
          case "car":
            return carSerializer(item as Car);
          default:
            return item;
        }
      }
    `);
  });

  /**
   * Tests that the polymorphic serializer is referenceable via serializerRefkey.
   * This verifies that when other components (e.g., operation request builders)
   * reference the serializer for a discriminated model, they get the polymorphic
   * switch serializer, not a plain property serializer.
   */
  it("should be referenceable via serializerRefkey", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model ${t.model("Animal")} {
          kind: string;
        }

        model ${t.model("Bird")} extends Animal {
          kind: "bird";
          canFly: boolean;
        }

        op createAnimal(@body a: Animal): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const animalModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Animal",
    )!;
    const birdModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Bird",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={animalModel} />
        {"\n\n"}
        <ModelInterface model={birdModel} />
        {"\n\n"}
        <PolymorphicType model={animalModel} />
        {"\n\n"}
        <JsonSerializer model={birdModel} />
        {"\n\n"}
        <JsonPolymorphicSerializer model={animalModel} />
        {"\n\n"}
        {code`const result = ${serializerRefkey(animalModel)}(data);`}
      </SdkTestFile>
    );

    // The refkey reference should resolve to the polymorphic serializer name
    expect(template).toRenderTo(d`
      export interface Animal {
        kind: string;
      }

      export interface Bird extends Animal {
        kind: "bird";
        canFly: boolean;
      }

      /**
       * Alias for ${"`"}Animal${"`"}
       */
      export type AnimalUnion = Bird | Animal;

      export function birdSerializer(item: Bird): any {
        return {
          kind: item["kind"],
          canFly: item["canFly"],
        };
      }

      export function animalUnionSerializer(item: AnimalUnion): any {
        switch (item["kind"]) {
          case "bird":
            return birdSerializer(item as Bird);
          default:
            return item;
        }
      }

      const result = animalUnionSerializer(data);
    `);
  });

  /**
   * Tests that the default case returns the item unchanged. This provides
   * forward compatibility — when the service adds a new discriminated subtype,
   * existing client code doesn't crash, it just passes the unknown variant
   * through without transformation.
   */
  it("should have default case that returns item as-is", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @discriminator("kind")
        model ${t.model("Base")} {
          kind: string;
        }

        model ${t.model("Sub")} extends Base {
          kind: "sub";
          value: string;
        }

        op createBase(@body b: Base): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const baseModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Base",
    )!;
    const subModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Sub",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={baseModel} />
        {"\n\n"}
        <ModelInterface model={subModel} />
        {"\n\n"}
        <PolymorphicType model={baseModel} />
        {"\n\n"}
        <JsonSerializer model={subModel} />
        {"\n\n"}
        <JsonPolymorphicSerializer model={baseModel} />
      </SdkTestFile>
    );

    // Verify "default: return item;" is present
    expect(template).toRenderTo(d`
      export interface Base {
        kind: string;
      }

      export interface Sub extends Base {
        kind: "sub";
        value: string;
      }

      /**
       * Alias for ${"`"}Base${"`"}
       */
      export type BaseUnion = Sub | Base;

      export function subSerializer(item: Sub): any {
        return {
          kind: item["kind"],
          value: item["value"],
        };
      }

      export function baseUnionSerializer(item: BaseUnion): any {
        switch (item["kind"]) {
          case "sub":
            return subSerializer(item as Sub);
          default:
            return item;
        }
      }
    `);
  });
});
