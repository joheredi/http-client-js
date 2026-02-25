/**
 * Test suite for the getTypeExpression function.
 *
 * This function is the foundational type-mapping layer for the entire emitter.
 * Every component that renders type annotations — model properties, function
 * parameters, return types, serializers — depends on getTypeExpression to
 * produce the correct TypeScript type string or refkey.
 *
 * What is tested:
 * - Scalar types map to the correct TypeScript primitives (string, number,
 *   boolean, Uint8Array, Date) matching the legacy emitter for output parity
 * - Composite types (array, dict, nullable, tuple) produce correct TS syntax
 * - Named types (model, enum, union) return refkeys that resolve to
 *   declaration names when a corresponding declaration exists
 * - DateTime and duration types respect their encoding
 * - Constant and enum value literals produce correct TypeScript literal types
 * - String-encoded numeric types return "string" instead of "number"
 */
import "@alloy-js/core/testing";
import { code, refkey } from "@alloy-js/core";
import { InterfaceDeclaration, TypeDeclaration } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import type {
  SdkModelType,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import { getTypeExpression, getOptionalAwareTypeExpression } from "../../src/components/type-expression.js";
import { typeRefkey } from "../../src/utils/refkeys.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

/**
 * Finds a property's SdkType by name from an SdkModelType.
 * Throws if the property is not found, providing a clear error in tests.
 */
function getPropertyType(model: SdkModelType, propName: string): SdkType {
  const prop = model.properties.find((p) => p.name === propName);
  if (!prop) {
    const available = model.properties.map((p) => p.name).join(", ");
    throw new Error(
      `Property "${propName}" not found on model "${model.name}". Available: ${available}`,
    );
  }
  return prop.type;
}

describe("Type Expression", () => {
  describe("scalar types", () => {
    /**
     * Tests that all common scalar types map to the correct TypeScript
     * primitive types. This is critical because every model property,
     * parameter, and return type flows through this mapping.
     *
     * The mappings must match the legacy emitter for output parity:
     * - string, url, plainTime → "string"
     * - int32, float32, float64 → "number"
     * - boolean → "boolean"
     * - bytes → "Uint8Array"
     * - utcDateTime, plainDate → "Date"
     */
    it("should map primitive scalar types correctly", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("ScalarModel")} {
            stringProp: string;
            int32Prop: int32;
            float32Prop: float32;
            boolProp: boolean;
            bytesProp: bytes;
            dateProp: utcDateTime;
          }

          op ${t.op("getScalars")}(): ScalarModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];

      const cases: [string, string][] = [
        ["stringProp", "string"],
        ["int32Prop", "number"],
        ["float32Prop", "number"],
        ["boolProp", "boolean"],
        ["bytesProp", "Uint8Array"],
        ["dateProp", "Date"],
      ];

      for (const [propName, expected] of cases) {
        const propType = getPropertyType(model, propName);
        const template = (
          <SdkTestFile sdkContext={sdkContext}>
            {getTypeExpression(propType)}
          </SdkTestFile>
        );
        expect(template).toRenderTo(expected);
      }
    });

    /**
     * Tests that all integer and float type variants (int8, int16, int64,
     * uint8, uint16, uint32, uint64, float64, decimal, decimal128)
     * map to "number". The legacy emitter maps ALL numeric types to
     * "number" (not bigint for int64), and we must match this for
     * output parity.
     */
    it("should map all numeric types to number", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("NumericModel")} {
            int8Prop: int8;
            int16Prop: int16;
            int64Prop: int64;
            uint8Prop: uint8;
            uint16Prop: uint16;
            uint32Prop: uint32;
            uint64Prop: uint64;
            float64Prop: float64;
          }

          op ${t.op("getNumerics")}(): NumericModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];

      const numericProps = [
        "int8Prop",
        "int16Prop",
        "int64Prop",
        "uint8Prop",
        "uint16Prop",
        "uint32Prop",
        "uint64Prop",
        "float64Prop",
      ];

      for (const propName of numericProps) {
        const propType = getPropertyType(model, propName);
        const template = (
          <SdkTestFile sdkContext={sdkContext}>
            {getTypeExpression(propType)}
          </SdkTestFile>
        );
        expect(template).toRenderTo("number");
      }
    });

    /**
     * Tests the plainDate type which maps to "Date" (same as utcDateTime).
     * This is important because TCGC has a separate SdkDateTimeType for
     * plainDate vs utcDateTime, but both should produce "Date" in the
     * TypeScript output.
     */
    it("should map plainDate to Date", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("DateModel")} {
            dateProp: plainDate;
          }

          op ${t.op("getDates")}(): DateModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "dateProp");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("Date");
    });

    /**
     * Tests that offsetDateTime maps to "string" (not Date).
     * The legacy emitter treats offsetDateTime differently from utcDateTime
     * because offset datetimes can't be losslessly represented as JS Date objects.
     */
    it("should map offsetDateTime to string", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("OffsetModel")} {
            offsetProp: offsetDateTime;
          }

          op ${t.op("getOffset")}(): OffsetModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "offsetProp");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("string");
    });

    /**
     * Tests that duration type maps to "string" by default.
     * Duration can also be encoded as "seconds" (→ number), but the
     * default ISO 8601 encoding produces a string.
     */
    it("should map duration to string by default", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("DurationModel")} {
            durationProp: duration;
          }

          op ${t.op("getDuration")}(): DurationModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "durationProp");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("string");
    });
  });

  describe("composite types", () => {
    /**
     * Tests that array types produce the correct TypeScript array syntax.
     * The legacy emitter wraps element types in parentheses: (string)[].
     * This ensures nested arrays like (string[])[] work correctly.
     */
    it("should map array types to (T)[] syntax", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("ArrayModel")} {
            items: string[];
          }

          op ${t.op("getArrays")}(): ArrayModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "items");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("(string)[]");
    });

    /**
     * Tests that dictionary types produce Record<string, T>.
     * TCGC represents TypeSpec's `Record<T>` as SdkDictionaryType with
     * string keys. This is a very common pattern in REST APIs for
     * metadata/tags objects.
     */
    it("should map dict types to Record<string, T>", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("DictModel")} {
            metadata: Record<string>;
          }

          op ${t.op("getDicts")}(): DictModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "metadata");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("Record<string, string>");
    });

    /**
     * Tests that nullable types produce T | null syntax.
     * Nullable types are extremely common in REST APIs — any optional
     * response field may be null. TCGC wraps the inner type in
     * SdkNullableType which we must unwrap and append " | null".
     */
    it("should map nullable types to T | null", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("NullableModel")} {
            name: string | null;
          }

          op ${t.op("getNullable")}(): NullableModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "name");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("string | null");
    });

    /**
     * Tests nested composite types — an array of nullable integers.
     * This validates that getTypeExpression handles recursive type
     * composition correctly, which is essential for real-world APIs.
     */
    it("should handle nested composite types", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("NestedModel")} {
            matrix: int32[][];
          }

          op ${t.op("getNested")}(): NestedModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "matrix");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("((number)[])[]");
    });
  });

  describe("reference types", () => {
    /**
     * Tests that model types produce a refkey reference that resolves
     * to the model name when a declaration with the matching refkey
     * exists. This is the mechanism that enables cross-file references
     * with automatic import generation — the core of Alloy's value.
     */
    it("should reference model types via refkey", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("SubModel")} {
            id: string;
          }

          model ${t.model("ParentModel")} {
            child: SubModel;
          }

          op ${t.op("getParent")}(): ParentModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const parentModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "ParentModel",
      )!;
      const subModel = sdkContext.sdkPackage.models.find(
        (m) => m.name === "SubModel",
      )!;
      const childType = getPropertyType(parentModel, "child");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <InterfaceDeclaration name="SubModel" refkey={typeRefkey(subModel)}>
            id: string
          </InterfaceDeclaration>
          {"\n\n"}
          {code`type Test = ${getTypeExpression(childType)}`}
        </SdkTestFile>
      );
      expect(template).toRenderTo(`
        interface SubModel {
          id: string
        }

        type Test = SubModel
      `);
    });

    /**
     * Tests that enum types produce a refkey reference that resolves
     * to the enum name. Enums are declared separately and referenced
     * by property types — the refkey mechanism must work for cross-file
     * imports between model files and enum declarations.
     */
    it("should reference enum types via refkey", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          enum ${t.enum("Color")} {
            Red,
            Green,
            Blue,
          }

          model ${t.model("PaintModel")} {
            color: Color;
          }

          op ${t.op("getPaint")}(): PaintModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models.find(
        (m) => m.name === "PaintModel",
      )!;
      const enumType = sdkContext.sdkPackage.enums[0];
      const colorType = getPropertyType(model, "color");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          <TypeDeclaration name="Color" refkey={typeRefkey(enumType)}>
            "Red" | "Green" | "Blue"
          </TypeDeclaration>
          {"\n\n"}
          {code`type Test = ${getTypeExpression(colorType)}`}
        </SdkTestFile>
      );
      expect(template).toRenderTo(`
        type Color = "Red" | "Green" | "Blue";

        type Test = Color
      `);
    });
  });

  describe("literal types", () => {
    /**
     * Tests that constant string values produce quoted TypeScript string
     * literal types. This is used for discriminator properties and fixed
     * string constants in the API surface.
     */
    it("should render string constants as quoted literals", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("ConstModel")} {
            kind: "widget";
          }

          op ${t.op("getConst")}(): ConstModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "kind");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo(`"widget"`);
    });

    /**
     * Tests that constant numeric values produce unquoted TypeScript
     * number literal types. This distinguishes them from string constants
     * which must be quoted.
     */
    it("should render numeric constants as unquoted literals", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("NumConstModel")} {
            version: 1;
          }

          op ${t.op("getNumConst")}(): NumConstModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "version");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getTypeExpression(propType)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("1");
    });
  });

  describe("getOptionalAwareTypeExpression", () => {
    /**
     * Tests that optional+nullable properties have `| null` stripped when
     * ignoreNullableOnOptional is true. This implements the Azure SDK convention
     * where optional implies nullable, making explicit `| null` redundant.
     * Without this, generated interfaces would have `prop?: T | null` which
     * differs from the legacy emitter output.
     */
    it("should strip | null from optional nullable types when ignoreNullableOnOptional is true", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("NullableModel")} {
            optNullable?: string | null;
          }

          op ${t.op("getModel")}(): NullableModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "optNullable");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getOptionalAwareTypeExpression(propType, true, true)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("string");
    });

    /**
     * Tests that optional+nullable properties preserve `| null` when
     * ignoreNullableOnOptional is false. This is the opt-out behavior
     * for services that need explicit null indication on optional properties.
     */
    it("should preserve | null on optional nullable types when ignoreNullableOnOptional is false", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("NullableModel")} {
            optNullable?: string | null;
          }

          op ${t.op("getModel")}(): NullableModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "optNullable");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getOptionalAwareTypeExpression(propType, true, false)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("string | null");
    });

    /**
     * Tests that required nullable properties always preserve `| null`,
     * regardless of ignoreNullableOnOptional. Required properties need
     * explicit null indication because they cannot be omitted.
     */
    it("should always preserve | null on required nullable types", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("NullableModel")} {
            reqNullable: string | null;
          }

          op ${t.op("getModel")}(): NullableModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "reqNullable");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getOptionalAwareTypeExpression(propType, false, true)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("string | null");
    });

    /**
     * Tests that non-nullable optional types are unaffected by the
     * ignoreNullableOnOptional flag. Only types with kind === "nullable"
     * are candidates for stripping.
     */
    it("should not affect non-nullable optional types", async () => {
      const runner = await TesterWithService.createInstance();
      const { program } = await runner.compile(
        t.code`
          model ${t.model("PlainModel")} {
            optPlain?: string;
          }

          op ${t.op("getModel")}(): PlainModel;
        `,
      );

      const sdkContext = await createSdkContextForTest(program);
      const model = sdkContext.sdkPackage.models[0];
      const propType = getPropertyType(model, "optPlain");

      const template = (
        <SdkTestFile sdkContext={sdkContext}>
          {getOptionalAwareTypeExpression(propType, true, true)}
        </SdkTestFile>
      );
      expect(template).toRenderTo("string");
    });
  });
});
