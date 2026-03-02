/**
 * Test suite for the ModelInterface component.
 *
 * ModelInterface is the primary component for generating TypeScript interface
 * declarations from TCGC SdkModelType. Every model in the generated SDK
 * flows through this component, so correctness here is critical for the
 * entire emitter output.
 *
 * What is tested:
 * - Basic model with properties renders a TypeScript interface with correct
 *   member names and types.
 * - Optional properties render with the `?` modifier.
 * - Readonly properties (visibility = [Read]) render with `readonly`.
 * - Base model inheritance produces an `extends` clause via refkey.
 * - Discriminator properties on subtypes render with the literal
 *   discriminatorValue instead of the general type.
 * - Models with additionalProperties render an index signature member.
 * - JSDoc documentation from model.doc/summary appears on the interface.
 * - JSDoc documentation from property.doc appears on interface members.
 * - Flattened properties are expanded inline from the nested model.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { code, refkey } from "@alloy-js/core";
import { InterfaceDeclaration } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import type { SdkModelType } from "@azure-tools/typespec-client-generator-core";
import { ModelInterface } from "../../src/components/model-interface.js";
import { typeRefkey } from "../../src/utils/refkeys.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

describe("Model Interface", () => {
  let runner: Awaited<ReturnType<typeof TesterWithService.createInstance>>;

  beforeAll(async () => {
    runner = await TesterWithService.createInstance();
  });

  /**
   * Tests basic property rendering including required, optional, and readonly
   * properties. These are the baseline tests — if these fail, nothing else
   * can work.
   */
  describe("basic property rendering", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;

    beforeAll(async () => {
      const { program } = await runner.compile(
        t.code`
          model ${t.model("Widget")} {
            name: string;
            age: int32;
            active: boolean;
          }

          model ${t.model("Config")} {
            name: string;
            description?: string;
            count?: int32;
          }

          model ${t.model("Resource")} {
            @visibility(Lifecycle.Read)
            id: string;
            name: string;
          }

          op ${t.op("getWidget")}(): Widget;
          @route("/configs")
          op ${t.op("getConfig")}(): Config;
          @route("/resources")
          op ${t.op("getResource")}(): Resource;
        `,
      );
      sdkContext = await createSdkContextForTest(program);
    });

    /**
     * Tests the most fundamental case: a model with required properties of
     * various scalar types renders as a TypeScript interface with correct
     * member names and types. This is the baseline test — if this fails,
     * nothing else can work.
     */
    it("should render a basic model with properties", () => {
      const model = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Widget",
      )!;

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={model} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * model interface Widget
         */
        export interface Widget {
          name: string;
          age: number;
          active: boolean;
        }
      `);
    });

    /**
     * Tests that optional properties are rendered with the `?` modifier.
     * Optional properties are extremely common in REST APIs — request bodies
     * often have many optional fields. The emitter must correctly distinguish
     * required from optional members.
     */
    it("should render optional properties with question mark", () => {
      const model = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Config",
      )!;

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={model} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * model interface Config
         */
        export interface Config {
          name: string;
          description?: string;
          count?: number;
        }
      `);
    });

    /**
     * Tests that properties with `@visibility(Lifecycle.Read)` are rendered
     * as `readonly`. This is important for response-only properties like
     * server-generated IDs and timestamps that consumers should not set.
     */
    it("should render readonly properties", () => {
      const model = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Resource",
      )!;

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={model} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * model interface Resource
         */
        export interface Resource {
          readonly id: string;
          name: string;
        }
      `);
    });
  });

  /**
   * Tests that a model with a baseModel renders an `extends` clause.
   * Inheritance is used heavily in service definitions — e.g., a Resource
   * base model with common fields like id and name, extended by specific
   * resource types. The extends clause must reference the base model via
   * refkey so Alloy generates cross-file imports when needed.
   */
  it("should render extends clause for base model", async () => {
    const { program } = await runner.compile(
      t.code`
        model ${t.model("BaseEntity")} {
          id: string;
        }

        model ${t.model("User")} extends BaseEntity {
          email: string;
        }

        op ${t.op("getUser")}(): User;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const baseModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "BaseEntity",
    )!;
    const userModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "User",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={baseModel} />
        {"\n\n"}
        <ModelInterface model={userModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface BaseEntity
       */
      export interface BaseEntity {
        id: string;
      }

      /**
       * model interface User
       */
      export interface User extends BaseEntity {
        email: string;
      }
    `);
  });

  /**
   * Tests that discriminator properties on subtypes render with the
   * literal discriminatorValue as the type. In a discriminated union
   * like `Animal { kind: "cat" | "dog" }`, the Cat subtype must have
   * `kind: "cat"` (literal type), not `kind: string`.
   *
   * This is essential for TypeScript's discriminated union narrowing to
   * work correctly in generated client code.
   */
  it("should render discriminator property with literal type on subtype", async () => {
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
    const catModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Cat",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        {/* Provide base declaration for refkey resolution */}
        <InterfaceDeclaration
          name="Pet"
          refkey={typeRefkey(
            sdkContext.sdkPackage.models.find((m) => m.name === "Pet")!,
          )}
        >
          kind: string; name: string
        </InterfaceDeclaration>
        {"\n\n"}
        <ModelInterface model={catModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      interface Pet {
        kind: string; name: string
      }

      /**
       * model interface Cat
       */
      export interface Cat extends Pet {
        kind: "cat";
        purrs: boolean;
      }
    `);
  });

  /**
   * Tests that models with additionalProperties render an explicit
   * `additionalProperties` field instead of an index signature.
   * The explicit field approach matches the legacy emitter's output and avoids
   * type conflicts between index signatures and named properties.
   */
  /**
   * Tests that when a model has `...Record<T>` (additional properties), the
   * interface uses `extends Record<string, T>` instead of an explicit
   * `additionalProperties` bag property. This matches the legacy emitter's
   * compatibility-mode behavior where additional properties are expressed
   * via the extends clause.
   *
   * When all named property types are compatible with the Record value type,
   * the specific type is used (here: `string` since all props are string).
   */
  it("should extend Record<string, T> for models with additional properties in compat mode", async () => {
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Metadata")} {
          name: string;
          ...Record<string>;
        }

        op ${t.op("getMetadata")}(): Metadata;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        emitterOptions={{ compatibilityMode: true }}
      >
        <ModelInterface model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Metadata
       */
      export interface Metadata extends Record<string, string> {
        name: string;
      }
    `);
  });

  it("should generate additionalProperties bag for models with additional properties in non-compat mode", async () => {
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Metadata")} {
          name: string;
          ...Record<string>;
        }

        op ${t.op("getMetadata")}(): Metadata;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        emitterOptions={{ compatibilityMode: false }}
      >
        <ModelInterface model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Metadata
       */
      export interface Metadata {
        name: string;
        /**
         * Additional properties
         */
        additionalProperties?: Record<string, string>;
      }
    `);
  });

  /**
   * Tests that when a model has BOTH `...Record<T>` (additional properties)
   * and an explicitly declared property named `additionalProperties`, the
   * interface uses `extends Record<string, any>` (since the named property type
   * Record<string, number> is not compatible with the additional properties
   * type string) and the `additionalProperties` property is kept as a regular
   * member. No renaming to `additionalPropertiesBag` is needed with the
   * extends Record approach.
   */
  it("should use extends Record<string, any> when name conflict exists in compat mode", async () => {
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Metadata")} {
          additionalProperties: Record<int32>;
          name: string;
          ...Record<string>;
        }

        op ${t.op("getMetadata")}(): Metadata;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        emitterOptions={{ compatibilityMode: true }}
      >
        <ModelInterface model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Metadata
       */
      export interface Metadata extends Record<string, any> {
        additionalProperties: Record<string, number>;
        name: string;
      }
    `);
  });

  it("should use additionalPropertiesBag when name conflict exists in non-compat mode", async () => {
    const { program } = await runner.compile(
      t.code`
        model ${t.model("Metadata")} {
          additionalProperties: Record<int32>;
          name: string;
          ...Record<string>;
        }

        op ${t.op("getMetadata")}(): Metadata;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        emitterOptions={{ compatibilityMode: false }}
      >
        <ModelInterface model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Metadata
       */
      export interface Metadata {
        additionalProperties: Record<string, number>;
        name: string;
        /**
         * Additional properties
         */
        additionalPropertiesBag?: Record<string, string>;
      }
    `);
  });

  /**
   * Tests that JSDoc documentation from model and property `doc` fields
   * appears correctly on the interface and its members.
   */
  describe("JSDoc documentation", () => {
    let sdkContext: Awaited<ReturnType<typeof createSdkContextForTest>>;

    beforeAll(async () => {
      const { program } = await runner.compile(
        t.code`
          @doc("A widget resource that represents a physical device.")
          model ${t.model("Widget")} {
            name: string;
          }

          model ${t.model("Item")} {
            @doc("The unique identifier of the item.")
            id: string;
            @doc("Human-readable display name.")
            name: string;
          }

          op ${t.op("getWidget")}(): Widget;
          @route("/items")
          op ${t.op("getItem")}(): Item;
        `,
      );
      sdkContext = await createSdkContextForTest(program);
    });

    /**
     * Tests that JSDoc documentation from the model's `doc` field appears
     * on the interface declaration. Documentation is critical for SDK
     * usability — consumers rely on IntelliSense tooltips to understand
     * the purpose of each model.
     */
    it("should render JSDoc on interface from model doc", () => {
      const model = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Widget",
      )!;

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={model} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * A widget resource that represents a physical device.
         */
        export interface Widget {
          name: string;
        }
      `);
    });

    /**
     * Tests that JSDoc documentation from property `doc` fields appears
     * on interface members. Property-level documentation helps consumers
     * understand the purpose and constraints of individual fields.
     */
    it("should render JSDoc on members from property doc", () => {
      const model = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Item",
      )!;

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={model} />
        </SdkTestFile>
      );

      expect(template).toRenderTo(`
        /**
         * model interface Item
         */
        export interface Item {
          /**
           * The unique identifier of the item.
           */
          id: string;
          /**
           * Human-readable display name.
           */
          name: string;
        }
      `);
    });

    /**
     * Tests that models without explicit `@doc` or `summary` documentation
     * receive a default JSDoc comment of `"model interface <Name>"`.
     *
     * This is important because the legacy emitter always produces a JSDoc
     * comment on every model interface — when no explicit documentation is
     * provided, it falls back to `"model interface <Name>"` for consistency.
     * Consumers expect every interface to have at least a minimal JSDoc
     * tooltip in their IDE.
     */
    it("should render fallback JSDoc 'model interface <Name>' when no doc exists", () => {
      const model = sdkContext.sdkPackage.models.find(
        (m) => m.name === "Item",
      )!;
      // Item has no @doc on the model itself, only on its properties
      expect(model.doc).toBeUndefined();
      expect(model.summary).toBeUndefined();

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <ModelInterface model={model} />
        </SdkTestFile>
      );

      // The interface should have the fallback "model interface Item" JSDoc
      const result = renderToString(template);
      expect(result).toContain("model interface Item");
    });
  });

  /**
   * Tests that a model referencing another model as a property type
   * correctly uses the refkey system for cross-references. When Model A
   * has a property of type Model B, the property type should be the name
   * of Model B (resolved via refkey), enabling Alloy to auto-generate
   * imports when the models are in different files.
   */
  it("should reference model types via refkey in properties", async () => {
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
    const addressModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Address",
    )!;
    const personModel = sdkContext.sdkPackage.models.find(
      (m) => m.name === "Person",
    )!;

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={addressModel} />
        {"\n\n"}
        <ModelInterface model={personModel} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface Address
       */
      export interface Address {
        street: string;
        city: string;
      }

      /**
       * model interface Person
       */
      export interface Person {
        name: string;
        address: Address;
      }
    `);
  });

  /**
   * Tests that models with `isGeneratedName: true` (anonymous/internal types)
   * get an underscore prefix in their interface name. This is critical for
   * multipart request body wrappers and other TCGC-generated types that
   * are not part of the public API surface. The legacy emitter uses the
   * underscore prefix to signal internal types.
   */
  it("should prefix underscore for models with isGeneratedName", async () => {
    const { program } = await runner.compile(
      t.code`
        @post op uploadFile(
          @header contentType: "multipart/form-data",
          @multipartBody body: {
            name: HttpPart<string>;
            file: HttpPart<bytes>;
          },
        ): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    // The anonymous body type should have isGeneratedName = true
    const model = sdkContext.sdkPackage.models.find((m) => m.isGeneratedName);
    expect(model).toBeDefined();

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model!} />
      </SdkTestFile>
    );

    // Render to string and verify the interface name starts with underscore
    const result = renderToString(template);
    expect(result).toContain("export interface _");
  });

  /**
   * Tests that optional+nullable model properties have `| null` stripped
   * by default (ignoreNullableOnOptional defaults to true). This is the
   * Azure SDK convention where optional implies nullable.
   *
   * Required nullable properties must keep `| null` because they cannot
   * be omitted and need explicit null indication.
   */
  it("should strip | null from optional nullable properties by default", async () => {
    const { program } = await runner.compile(
      t.code`
        model ${t.model("TestModel")} {
          optNullable?: string | null;
          reqNullable: string | null;
          optPlain?: string;
        }

        op ${t.op("getModel")}(): TestModel;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface TestModel
       */
      export interface TestModel {
        optNullable?: string;
        reqNullable: string | null;
        optPlain?: string;
      }
    `);
  });

  /**
   * Tests that optional+nullable model properties preserve `| null` when
   * ignoreNullableOnOptional is explicitly set to false. This is the
   * opt-out behavior for services that need strict null typing.
   */
  it("should preserve | null on optional nullable properties when config disables stripping", async () => {
    const { program } = await runner.compile(
      t.code`
        model ${t.model("TestModel")} {
          optNullable?: string | null;
          reqNullable: string | null;
        }

        op ${t.op("getModel")}(): TestModel;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const model = sdkContext.sdkPackage.models[0];

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        emitterOptions={{ ignoreNullableOnOptional: false }}
      >
        <ModelInterface model={model} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(`
      /**
       * model interface TestModel
       */
      export interface TestModel {
        optNullable?: string | null;
        reqNullable: string | null;
      }
    `);
  });
});
