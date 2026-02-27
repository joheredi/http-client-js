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
    // The nullable variant must have a declared enum type, not an unresolved symbol.
    expect(template).toRenderTo({
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
          normalUnion: TestModelNormalUnion;
          nullableUnion: TestModelNullableUnion | null;
        }

        /**
         * Type of TestModelNormalUnion
         */
        export type TestModelNormalUnion = "A" | "B";

        /**
         * Type of TestModelNullableUnion
         */
        export type TestModelNullableUnion = "A" | "B";

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
});
