/**
 * Test suite for unresolved symbol prevention in the emitter output.
 *
 * Unresolved symbols (`<Unresolved Symbol: refkey[...]>`) appear in generated code
 * when a refkey is referenced but no corresponding declaration exists. This is a
 * critical bug — the output is broken TypeScript that cannot compile.
 *
 * These tests verify three specific cases where unresolved symbols previously occurred:
 *
 * 1. **Nullable enum types** — When TCGC wraps a string literal union (`"A" | "B" | null`)
 *    in a nullable type, the inner enum is a different object from the non-nullable version
 *    in `sdkPackage.enums`. Without rendering an `EnumDeclaration` for the inner enum,
 *    its refkey is never declared and appears as an unresolved symbol.
 *
 * 2. **XML model deserializers** — When TCGC adds XML serialization options to a model
 *    (because its response content type includes XML), the model was classified as
 *    XML-only and excluded from JSON deserializer generation. But `deserialize-operation.tsx`
 *    always references JSON deserializer refkeys, causing unresolved symbols.
 *
 * 3. **Output-only model serializers** — When a model like `SystemData` only has Output usage
 *    (read-only system property), no serializer is generated. But a parent model with Input
 *    usage (like `Resource`) still tries to reference its serializer via refkey.
 *
 * Why this matters:
 * Unresolved symbols produce syntactically invalid TypeScript. Any occurrence is a P0-CRITICAL
 * bug that prevents consumers from compiling the generated SDK. These tests serve as
 * regression guards per PRD task SA20.
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { Children } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import type {
  SdkContext,
  SdkHttpOperation,
  SdkModelType,
} from "@azure-tools/typespec-client-generator-core";
import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import { ModelFiles } from "../../src/components/model-files.js";
import { ModelInterface } from "../../src/components/model-interface.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.js";

/**
 * Test wrapper for ModelFiles — provides Output and SdkContext without
 * a SourceFile since ModelFiles creates its own file structure.
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

describe("Unresolved Symbol Prevention", () => {
  /**
   * Tests that nullable string literal unions (e.g., `"A" | "B" | null`) produce
   * resolved type names in model interfaces instead of `<Unresolved Symbol>`.
   *
   * TCGC stores nullable unions in `sdkPackage.unions` as `SdkNullableType` wrappers
   * whose inner type is a `SdkEnumType`. The inner enum has a different identity
   * from the non-nullable version in `sdkPackage.enums`, so it must get its own
   * `EnumDeclaration` to register its refkey.
   *
   * Previously, these inner enums were filtered out by `kind === "union"` check,
   * causing their type references to appear as unresolved symbols in the output.
   */
  it("should resolve nullable enum types in model interfaces", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("TestModel")} {
          normalUnion: "A" | "B";
          nullableUnion: "A" | "B" | null;
        }

        op ${t.op("getTest")}(): TestModel;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    // Verify the model renders with proper type names for both variants.
    // Generated enums (isGeneratedName === true) are inlined in model properties
    // to match legacy emitter behavior. The nullable variant must still resolve
    // its declared enum type for the type alias, not produce an unresolved symbol.
    expect(template).toRenderTo({
      "models/index.ts": 'export * from "./models.js";',
      "models/models.ts": d`
        /**
         * This file contains only generated model types and their (de)serializers.
         * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
         */
        /* eslint-disable @typescript-eslint/naming-convention */
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */


        /**
         * model interface TestModel
         */
        export interface TestModel {
          normalUnion: "A" | "B";
          nullableUnion: "A" | "B" | null;
        }

        /**
         * Type of TestModelNormalUnion
         */
        export type TestModelNormalUnion = "A" | "B";

        /**
         * Type of TestModelNullableUnion
         */
        export type TestModelNullableUnion = "A" | "B";
      ` + "\n\n\n",
      "models/serialization/serialization.ts": d`
        import type { TestModel, TestModelNullableUnion } from "../models.js";

        export function testModelNullableUnionSerializer(
          item: TestModelNullableUnion,
        ): any {
          return item;
        }

        export function testModelDeserializer(item: any): TestModel {
          return {
            normalUnion: item["normalUnion"],
            nullableUnion: item["nullableUnion"],
          };
        }
      `,
    });
  });

  /**
   * Tests that models with XML serialization options also get JSON deserializers.
   *
   * When a response content type includes `application/xml`, TCGC adds
   * `serializationOptions.xml` to model properties. The model was previously classified
   * as XML-only and excluded from JSON deserializer generation. But the operation
   * deserialize function always references JSON deserializer refkeys (via
   * `deserializerRefkey()`), causing unresolved symbols for XML-classified models.
   *
   * The fix ensures XML models also get JSON deserializers, since the HTTP runtime
   * parses both JSON and XML response bodies into plain objects before deserialization.
   */
  it("should generate JSON deserializers for XML-classified output models", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        model ${t.model("User")} {
          name: string;
          email: string;
        }

        op ${t.op("getUser")}(): {
          ...User,
          @header("content-type") contentType: "application/xml";
        };
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    // Find the User model — it should have XML serialization options due to
    // the XML content type header, but we want to verify it ALSO gets a
    // JSON deserializer function alongside its XML deserializer.
    const user = sdkContext.sdkPackage.models.find((m) => m.name === "User")!;
    expect(user).toBeDefined();

    // Render just the JSON deserializer component to verify it works
    // without producing unresolved symbols.
    const { JsonDeserializer } =
      await import("../../src/components/serialization/json-deserializer.js");
    const template = (
      <SdkTestFile sdkContext={sdkContext}>
        <ModelInterface model={user} />
        <JsonDeserializer model={user} />
      </SdkTestFile>
    );

    // Verify the User model gets a JSON deserializer with proper function signature
    expect(template).toRenderTo(d`
      /**
       * model interface User
       */
      export interface User {
        name: string;
        email: string;
      }export function userDeserializer(item: any): User {
        return {
          name: item["name"],
          email: item["email"],
        };
      }
    `);
  });

  /**
   * Tests that serializer expressions for Output-only model types produce
   * passthrough accessors instead of unresolved serializer refkeys.
   *
   * When a parent model has Input usage and contains a property whose type only
   * has Output usage, the parent's serializer must not try to call a serializer
   * function for the child type (since none is generated). Instead, it should
   * pass through the value as-is.
   *
   * This prevents unresolved symbols like `<Unresolved Symbol: refkey[...serializer]>`
   * from appearing in serializer output for read-only nested types.
   *
   * We test this by directly calling `getSerializationExpression` with a mock
   * SdkModelType that only has Output usage, simulating an Azure Resource Manager
   * `SystemData` type that is read-only.
   */
  it("should passthrough output-only model properties in serializers", async () => {
    const { getSerializationExpression } =
      await import("../../src/components/serialization/json-serializer.js");

    // Create a mock model type with only Output usage (no Input).
    // This simulates types like Azure.ResourceManager.SystemData.
    const outputOnlyModel = {
      kind: "model" as const,
      usage: UsageFlags.Output,
      name: "SystemData",
      properties: [],
    } as unknown as SdkModelType;

    // getSerializationExpression should return the accessor as-is
    // (passthrough) since there's no serializer for Output-only models.
    const result = getSerializationExpression(
      outputOnlyModel,
      'item["systemData"]',
    );
    expect(result).toBe('item["systemData"]');
  });

  /**
   * Tests that serializer expressions for Input models produce serializer
   * function calls (not passthroughs). This is the complement of the
   * Output-only test — verifying that Input models still get proper
   * serializer references.
   */
  it("should call serializer for input model properties", async () => {
    const { getSerializationExpression, needsTransformation } =
      await import("../../src/components/serialization/json-serializer.js");

    const inputModel = {
      kind: "model" as const,
      usage: UsageFlags.Input | UsageFlags.Output,
      name: "FooData",
      properties: [],
    } as unknown as SdkModelType;

    // Input models should trigger a serializer call (Children, not string)
    const result = getSerializationExpression(inputModel, 'item["foo"]');
    expect(typeof result).not.toBe("string");
    expect(needsTransformation(inputModel)).toBe(true);
  });

  /**
   * Regression test for BUG-1: Array deserialization of models without
   * deserializer declarations must not produce unresolved refkeys.
   *
   * When a model has only Input usage (no Output/Exception), it has no
   * JsonDeserializer declaration. If such a model appears as an array element
   * type, `getDeserializationExpression` must return a passthrough for the
   * element — NOT a deserializerRefkey reference that would be unresolved.
   *
   * The fix uses the unified `typeHasDeserializerDeclaration` predicate in
   * all code paths (getDeserializationExpression, valueTypeHasNamedDeserializerFn,
   * collectArrayTypes) so they agree on which types have declarations.
   */
  it("should passthrough input-only model properties in deserializers (BUG-1)", async () => {
    const { getDeserializationExpression } =
      await import("../../src/components/serialization/json-deserializer.js");

    // Create a mock model type with only Input usage (no Output/Exception).
    // This model would NOT get a JsonDeserializer declaration.
    const inputOnlyModel = {
      kind: "model" as const,
      usage: UsageFlags.Input,
      name: "InputOnlyModel",
      properties: [],
    } as unknown as SdkModelType;

    // Deserialization of an input-only model should return the accessor as-is
    // (passthrough) since there's no deserializer for Input-only models.
    const result = getDeserializationExpression(inputOnlyModel, 'item["data"]');
    expect(result).toBe('item["data"]');
  });

  /**
   * Regression test for BUG-1: Verifies that the unified predicate
   * `typeHasDeserializerDeclaration` correctly identifies which types
   * have deserializer declarations, preventing unresolved refkeys in
   * array/dict deserialization.
   */
  it("should agree on deserializer declaration presence across predicates (BUG-1)", async () => {
    const { typeHasDeserializerDeclaration } =
      await import("../../src/utils/serialization-predicates.js");

    const inputOnly = {
      kind: "model" as const,
      usage: UsageFlags.Input,
      name: "InputModel",
      properties: [],
    } as unknown as SdkModelType;

    const outputModel = {
      kind: "model" as const,
      usage: UsageFlags.Output,
      name: "OutputModel",
      properties: [],
    } as unknown as SdkModelType;

    const bothModel = {
      kind: "model" as const,
      usage: UsageFlags.Input | UsageFlags.Output,
      name: "BothModel",
      properties: [],
    } as unknown as SdkModelType;

    // Input-only models have no deserializer
    expect(typeHasDeserializerDeclaration(inputOnly)).toBe(false);
    // Output models have a deserializer
    expect(typeHasDeserializerDeclaration(outputModel)).toBe(true);
    // Input+Output models have a deserializer
    expect(typeHasDeserializerDeclaration(bothModel)).toBe(true);
  });

  /**
   * Regression test for extensible enum array serialization producing
   * unresolved symbols. When a model has a property of type `Array<UnionAsEnum>`,
   * the model serializer previously generated `arraySerializerRefkey(enumType)`,
   * but no corresponding `JsonArraySerializer` was rendered because
   * `collectArrayTypes` didn't recognize enum types. This caused the output to
   * contain `<Unresolved Symbol: refkey[sarraySerializer...senum]>`, breaking
   * the generated TypeScript.
   *
   * The fix removes the `enum` case from `valueTypeHasNamedSerializerFn` so that
   * array elements of enum type use inline `.map()` with the element serializer
   * reference instead of referencing a non-existent named array helper function.
   *
   * This was the root cause of 12 skipped e2e tests in Encode.Array — the entire
   * client was unusable because models.ts contained unresolved symbol text that
   * caused esbuild parse failures.
   */
  it("should resolve extensible enum array types in model serializers", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        union ${t.union("Colors")} {
          "blue",
          "red",
          "green",
          string,
        }

        model ${t.model("TestModel")} {
          colors: Colors[];
        }

        op ${t.op("createTest")}(@body body: TestModel): void;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);

    const template = (
      <ModelFilesTestWrapper sdkContext={sdkContext}>
        <ModelFiles />
      </ModelFilesTestWrapper>
    );

    // Verify the model renders without unresolved symbol references.
    // Before the fix, arrays of extensible enum types produced
    // `<Unresolved Symbol: refkey[sarraySerializer⁣senum]>` in the serializer.
    expect(template).toRenderTo({
      "models/index.ts": 'export * from "./models.js";',
      "models/models.ts": d`
        /**
         * This file contains only generated model types and their (de)serializers.
         * Disable the following rules for internal models with '_' prefix and deserializers which require 'any' for raw JSON input.
         */
        /* eslint-disable @typescript-eslint/naming-convention */
        /* eslint-disable @typescript-eslint/explicit-module-boundary-types */


        /**
         * model interface TestModel
         */
        export interface TestModel {
          colors: Colors[];
        }

        /**
         * Type of Colors
         */
        export type Colors = "blue" | "red" | "green";
      ` + "\n\n\n",
      "models/serialization/serialization.ts": d`
        import type { Colors, TestModel } from "../models.js";

        export function testModelSerializer(item: TestModel): any {
          return {
            colors: item["colors"].map((p: any) => { return colorsSerializer(p); }),
          };
        }

        export function colorsSerializer(item: Colors): any {
          return item;
        }
      `,
    });
  });
});
