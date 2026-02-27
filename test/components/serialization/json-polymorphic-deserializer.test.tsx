/**
 * Test suite for the JsonPolymorphicDeserializer component.
 *
 * JsonPolymorphicDeserializer generates switch-based deserializer functions for
 * discriminated (polymorphic) model types. It switches on the wire-format
 * discriminator property value in raw JSON and routes to the appropriate
 * subtype deserializer.
 *
 * What is tested:
 * - Basic discriminated model produces switch with cases for each subtype.
 * - Switch uses wire property name (serializedName) for discriminator access.
 * - Each case calls the subtype deserializer via refkey with type narrowing cast.
 * - Default case calls the base model deserializer for unknown discriminator values.
 * - Return type is the polymorphic union type (not the base model type).
 * - Deserializer is referenceable via deserializerRefkey(model).
 * - Child deserializers include inherited parent properties.
 *
 * Why this matters:
 * Polymorphic deserialization is the mechanism that enables correct typed SDK
 * objects from discriminated JSON responses. Without it, a Cat response would
 * be deserialized as a generic Pet, losing subtype-specific properties like
 * `meow`. The base model fallback in the default case ensures unknown subtypes
 * are still properly deserialized with their base properties mapped. This is a
 * P0 requirement (FR6).
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { JsonPolymorphicDeserializer } from "../../../src/components/serialization/json-polymorphic-deserializer.js";
import { JsonDeserializer } from "../../../src/components/serialization/json-deserializer.js";
import { ModelInterface } from "../../../src/components/model-interface.js";
import { PolymorphicType } from "../../../src/components/polymorphic-type.js";
import { deserializerRefkey, baseDeserializerRefkey } from "../../../src/utils/refkeys.js";
import { SdkTestFile } from "../../utils.js";
import { TesterWithService, createSdkContextForTest } from "../../test-host.js";

describe("JsonPolymorphicDeserializer", () => {
  /**
   * Tests the core behavior: a discriminated model with two subtypes produces
   * a switch-based deserializer that routes to each subtype's deserializer.
   * The switch uses the wire-format property name since the item is raw JSON.
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

        op getPet(): Pet;
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
        <JsonDeserializer model={catModel} includeParentProperties />
        {"\n\n"}
        <JsonDeserializer model={dogModel} includeParentProperties />
        {"\n\n"}
        <JsonDeserializer model={petModel} refkeyOverride={baseDeserializerRefkey(petModel)} nameSuffix="Deserializer" />
        {"\n\n"}
        <JsonPolymorphicDeserializer model={petModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
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
       * Alias for PetUnion
       */
      export type PetUnion = Cat | Dog | Pet;

      export function catDeserializer(item: any): Cat {
        return {
          name: item["name"],
          kind: item["kind"],
          meow: item["meow"],
        };
      }

      export function dogDeserializer(item: any): Dog {
        return {
          name: item["name"],
          kind: item["kind"],
          bark: item["bark"],
        };
      }

      export function petDeserializer(item: any): Pet {
        return {
          kind: item["kind"],
          name: item["name"],
        };
      }

      export function petUnionDeserializer(item: any): PetUnion {
        switch (item["kind"]) {
          case "cat":
            return catDeserializer(item as Cat);
          case "dog":
            return dogDeserializer(item as Dog);
          default:
            return petDeserializer(item);
        }
      }
    `);
  });

  /**
   * Tests that the polymorphic deserializer uses the wire property name
   * (serializedName) for the discriminator switch. Since the deserializer
   * receives raw JSON from the service, it must match the wire-format
   * property name, not the client-side name.
   */
  it("should use wire property name for discriminator access", async () => {
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

        op getShape(): Shape;
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
        <JsonDeserializer model={circleModel} includeParentProperties />
        {"\n\n"}
        <JsonDeserializer model={shapeModel} refkeyOverride={baseDeserializerRefkey(shapeModel)} nameSuffix="Deserializer" />
        {"\n\n"}
        <JsonPolymorphicDeserializer model={shapeModel} />
      </SdkTestFile>
    );

    // Verify the switch uses the wire name "shape_type", not the client name "type"
    expect(template).toRenderTo(d`
      /**
       * model interface Shape
       */
      export interface Shape {
        type: string;
      }

      /**
       * model interface Circle
       */
      export interface Circle extends Shape {
        type: "circle";
        radius: number;
      }

      /**
       * Alias for ShapeUnion
       */
      export type ShapeUnion = Circle | Shape;

      export function circleDeserializer(item: any): Circle {
        return {
          type: item["shape_type"],
          radius: item["radius"],
        };
      }

      export function shapeDeserializer(item: any): Shape {
        return {
          type: item["shape_type"],
        };
      }

      export function shapeUnionDeserializer(item: any): ShapeUnion {
        switch (item["shape_type"]) {
          case "circle":
            return circleDeserializer(item as Circle);
          default:
            return shapeDeserializer(item);
        }
      }
    `);
  });

  /**
   * Tests that the return type of the polymorphic deserializer is the union type
   * (PetUnion), not the base model type (Pet). This ensures callers receive a
   * properly typed result that TypeScript can narrow via discriminator checks.
   * This matches the PRD: "Deserializer return type uses polymorphicTypeRefkey".
   */
  it("should use polymorphic union type as return type", async () => {
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

        op getVehicle(): Vehicle;
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
        <JsonDeserializer model={carModel} includeParentProperties />
        {"\n\n"}
        <JsonDeserializer model={vehicleModel} refkeyOverride={baseDeserializerRefkey(vehicleModel)} nameSuffix="Deserializer" />
        {"\n\n"}
        <JsonPolymorphicDeserializer model={vehicleModel} />
      </SdkTestFile>
    );

    // Verify the return type is VehicleUnion
    expect(template).toRenderTo(d`
      /**
       * model interface Vehicle
       */
      export interface Vehicle {
        kind: string;
      }

      /**
       * model interface Car
       */
      export interface Car extends Vehicle {
        kind: "car";
        doors: number;
      }

      /**
       * Alias for VehicleUnion
       */
      export type VehicleUnion = Car | Vehicle;

      export function carDeserializer(item: any): Car {
        return {
          kind: item["kind"],
          doors: item["doors"],
        };
      }

      export function vehicleDeserializer(item: any): Vehicle {
        return {
          kind: item["kind"],
        };
      }

      export function vehicleUnionDeserializer(item: any): VehicleUnion {
        switch (item["kind"]) {
          case "car":
            return carDeserializer(item as Car);
          default:
            return vehicleDeserializer(item);
        }
      }
    `);
  });

  /**
   * Tests that the polymorphic deserializer is referenceable via deserializerRefkey.
   * This verifies that when other components (e.g., operation response handlers)
   * reference the deserializer for a discriminated model, they get the polymorphic
   * switch deserializer.
   */
  it("should be referenceable via deserializerRefkey", async () => {
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

        op getAnimal(): Animal;
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
        <JsonDeserializer model={birdModel} includeParentProperties />
        {"\n\n"}
        <JsonDeserializer model={animalModel} refkeyOverride={baseDeserializerRefkey(animalModel)} nameSuffix="Deserializer" />
        {"\n\n"}
        <JsonPolymorphicDeserializer model={animalModel} />
        {"\n\n"}
        {code`const result = ${deserializerRefkey(animalModel)}(data);`}
      </SdkTestFile>
    );

    // The refkey reference should resolve to the polymorphic deserializer name
    expect(template).toRenderTo(d`
      /**
       * model interface Animal
       */
      export interface Animal {
        kind: string;
      }

      /**
       * model interface Bird
       */
      export interface Bird extends Animal {
        kind: "bird";
        canFly: boolean;
      }

      /**
       * Alias for AnimalUnion
       */
      export type AnimalUnion = Bird | Animal;

      export function birdDeserializer(item: any): Bird {
        return {
          kind: item["kind"],
          canFly: item["canFly"],
        };
      }

      export function animalDeserializer(item: any): Animal {
        return {
          kind: item["kind"],
        };
      }

      export function animalUnionDeserializer(item: any): AnimalUnion {
        switch (item["kind"]) {
          case "bird":
            return birdDeserializer(item as Bird);
          default:
            return animalDeserializer(item);
        }
      }

      const result = animalUnionDeserializer(data);
    `);
  });

  /**
   * Tests that the default case calls the base model deserializer to properly
   * map the base type's properties. When the service adds a new discriminated
   * subtype, the base deserializer provides a safe fallback that still maps
   * known base properties correctly.
   */
  it("should have default case that calls base model deserializer", async () => {
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

        op getBase(): Base;
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
        <JsonDeserializer model={subModel} includeParentProperties />
        {"\n\n"}
        <JsonDeserializer model={baseModel} refkeyOverride={baseDeserializerRefkey(baseModel)} nameSuffix="Deserializer" />
        {"\n\n"}
        <JsonPolymorphicDeserializer model={baseModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      /**
       * model interface Base
       */
      export interface Base {
        kind: string;
      }

      /**
       * model interface Sub
       */
      export interface Sub extends Base {
        kind: "sub";
        value: string;
      }

      /**
       * Alias for BaseUnion
       */
      export type BaseUnion = Sub | Base;

      export function subDeserializer(item: any): Sub {
        return {
          kind: item["kind"],
          value: item["value"],
        };
      }

      export function baseDeserializer(item: any): Base {
        return {
          kind: item["kind"],
        };
      }

      export function baseUnionDeserializer(item: any): BaseUnion {
        switch (item["kind"]) {
          case "sub":
            return subDeserializer(item as Sub);
          default:
            return baseDeserializer(item);
        }
      }
    `);
  });
});
