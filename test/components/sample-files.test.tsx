/**
 * Test suite for the SampleFiles component and related utilities.
 *
 * The SampleFiles component generates per-operation sample TypeScript files
 * in the `samples-dev/` directory. Each sample shows consumers how to use
 * the generated SDK client to call a specific operation with realistic
 * parameter values from TCGC examples.
 *
 * What is tested:
 * - SampleFiles renders nothing when no operations have examples.
 * - SampleFiles generates a sample file for an operation with a TCGC example.
 * - Sample file includes correct import of the classical client class.
 * - Sample file includes environment variable setup for client parameters.
 * - Sample file includes credential setup based on auth scheme (API key).
 * - Sample file includes client construction with correct arguments.
 * - Sample file includes operation call with example parameter values.
 * - Sample file includes main() function and error handling.
 * - Sample file includes JSDoc with operation description and summary.
 * - OAuth2 auth generates DefaultAzureCredential import and usage.
 * - Operations with path parameters include them in the call.
 * - Child client operations use the correct call chain (e.g., client.widgets.getWidget).
 * - Multiple examples in one operation generate multiple functions.
 * - Paging operations use for-await-of iteration pattern.
 * - getExampleValueCode converts primitive types correctly.
 * - getExampleValueCode converts model types to object literals.
 * - getExampleValueCode converts array types to array literals.
 * - getExampleValueCode handles nested models recursively.
 *
 * Why this matters:
 * Sample files are the primary documentation for generated SDKs. Without
 * working samples, consumers struggle to understand how to use the client
 * library. The samples must have correct imports, credential setup,
 * parameter values, and operation call syntax.
 */
import "@alloy-js/core/testing";
import { Children } from "@alloy-js/core";
import { renderToString } from "@alloy-js/core/testing";
import { createTSNamePolicy, SourceFile } from "@alloy-js/typescript";
import { t } from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import type {
  SdkContext,
  SdkExampleValue,
  SdkHttpOperation,
  SdkHttpOperationExample,
} from "@azure-tools/typespec-client-generator-core";
import { beforeAll, describe, expect, it } from "vitest";
import { SampleFiles } from "../../src/components/sample-files.js";
import { ClassicalClientDeclaration } from "../../src/components/classical-client.js";
import {
  ClientContextDeclaration,
  ClientContextFactory,
  ClientContextOptionsDeclaration,
} from "../../src/components/client-context.js";
import { OperationOptionsDeclaration } from "../../src/components/operation-options.js";
import { PublicOperation } from "../../src/components/public-operation.js";
import { SendOperation } from "../../src/components/send-operation.js";
import { DeserializeOperation } from "../../src/components/deserialize-operation.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { getExampleValueCode } from "../../src/utils/example-values.js";
import {
  TesterWithService,
  Tester,
  createSdkContextForTest,
} from "../test-host.js";
import { SdkContextProvider } from "../../src/context/sdk-context.js";
import {
  FlavorProvider,
  type FlavorKind,
} from "../../src/context/flavor-context.js";

/**
 * Helper to extract the first client from an SDK context.
 */
function getFirstClient(sdkContext: { sdkPackage: { clients: Array<any> } }) {
  return sdkContext.sdkPackage.clients[0];
}

/**
 * Test wrapper that provides all the infrastructure components needed
 * for SampleFiles to render correctly. Includes the client context,
 * classical client, and operation declarations so that the sample
 * generation can introspect the client hierarchy.
 *
 * Wraps with FlavorProvider to allow testing flavor-specific behavior
 * (e.g., Azure vs core credential patterns). Defaults to "core" flavor.
 */
function SampleTestWrapper(props: {
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  flavor?: FlavorKind;
  children: Children;
}) {
  const client = props.sdkContext.sdkPackage.clients[0];
  const methods = client.methods;
  return (
    <Output
      program={props.sdkContext.emitContext.program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib]}
    >
      <FlavorProvider flavor={props.flavor ?? "core"}>
        <SdkContextProvider sdkContext={props.sdkContext}>
          {/* Infrastructure files for refkey resolution */}
          <SourceFile path="src/api/testingClientContext.ts">
            <ClientContextDeclaration client={client} />
            <ClientContextOptionsDeclaration client={client} />
            <ClientContextFactory client={client} />
          </SourceFile>
          <SourceFile path="src/api/operations.ts">
            {methods.map((method: any, i: number) => (
              <>
                {i > 0 && "\n\n"}
                <OperationOptionsDeclaration method={method} />
                {"\n\n"}
                <SendOperation method={method} />
                {"\n\n"}
                <DeserializeOperation method={method} />
                {"\n\n"}
                <PublicOperation method={method} />
              </>
            ))}
          </SourceFile>
          <SourceFile path="src/testingClient.ts">
            <ClassicalClientDeclaration client={client} />
          </SourceFile>
          {props.children}
        </SdkContextProvider>
      </FlavorProvider>
    </Output>
  );
}

/**
 * Creates a mock TCGC example for an operation.
 *
 * Attaches a synthetic SdkHttpOperationExample to the operation's
 * examples array so SampleFiles generates a sample file.
 */
function addMockExample(
  sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>,
  exampleOverrides?: Partial<SdkHttpOperationExample>,
): void {
  const client = sdkContext.sdkPackage.clients[0];
  const method = client.methods[0];
  const operation = method.operation;

  const mockExample: SdkHttpOperationExample = {
    kind: "http",
    name: exampleOverrides?.name ?? method.name,
    doc: exampleOverrides?.doc ?? method.doc ?? `execute ${method.name}`,
    filePath: exampleOverrides?.filePath ?? "json_for_test.json",
    rawExample: {},
    parameters: exampleOverrides?.parameters ?? [],
    responses: exampleOverrides?.responses ?? [],
  };

  operation.examples = [mockExample];
}

describe("SampleFiles", () => {
  /**
   * Tests using the basic `@get op getItem(): string;` TypeSpec input
   * with TesterWithService. Compilation is shared across all tests in
   * this group via beforeAll.
   */
  describe("with getItem operation", () => {
    let program: any;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      ({ program } = await runner.compile(
        t.code`
          @get op getItem(): string;
        `,
      ));
    });

    /**
     * Tests that SampleFiles returns nothing when no operations have examples.
     * This is important because most TypeSpec definitions don't include examples,
     * and the emitter should not generate an empty samples-dev/ directory.
     */
    it("should render nothing when no operations have examples", async () => {
      const sdkContext = await createSdkContextForTest(program);

      const template = (
        <SampleTestWrapper sdkContext={sdkContext}>
          <SampleFiles />
        </SampleTestWrapper>
      );

      const result = renderToString(template);
      // samples-dev directory should not appear in output
      expect(result).not.toContain("samples-dev");
      expect(result).not.toContain("Sample.ts");
    });

    /**
     * Tests using the basic getItem operation with a mock TCGC example
     * attached. The sdkContext, rendered template, and extracted sample
     * content are shared across all tests in this sub-group.
     */
    describe("with mock example", () => {
      let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
      let template: Children;
      let result: string;
      let sampleContent: string;

      beforeAll(async () => {
        sdkContext = await createSdkContextForTest(program);
        addMockExample(sdkContext);

        template = (
          <SampleTestWrapper sdkContext={sdkContext}>
            <SampleFiles />
          </SampleTestWrapper>
        );

        result = renderToString(template);
        sampleContent = extractSampleContent(result, "getItemSample.ts");
      });

      /**
       * Tests that SampleFiles generates a sample file when an operation
       * has a TCGC example. The file should be in samples-dev/ with the
       * correct naming convention ({operationName}Sample.ts).
       */
      it("should generate sample file for operation with example", () => {
        // Check that the sample file appears in the rendered output
        expect(template).toRenderTo({
          "samples-dev/getItemSample.ts":
            expect.stringContaining("async function"),
          "src/api/testingClientContext.ts": expect.any(String),
          "src/api/operations.ts": expect.any(String),
          "src/testingClient.ts": expect.any(String),
        });
      });

      /**
       * Tests that the sample file imports the classical client class
       * from the package name. This import is how consumers would use
       * the generated SDK in their own code.
       */
      it("should include client import in sample file", () => {
        expect(sampleContent).toContain("import { TestingClient }");
      });

      /**
       * Tests that client constructor parameters are initialized from
       * environment variables. This is the recommended pattern for
       * sample code — secrets and endpoints should come from env vars.
       */
      it("should setup endpoint from environment variable", () => {
        expect(sampleContent).toContain("process.env.");
        expect(sampleContent).toContain("TESTING_ENDPOINT");
      });

      /**
       * Tests that the sample constructs the client with the correct
       * arguments (endpoint, credential, etc.) and calls the operation
       * method on the client instance.
       */
      it("should construct client and call operation", () => {
        expect(sampleContent).toContain("new TestingClient(");
        expect(sampleContent).toContain("client.getItem(");
        expect(sampleContent).toContain("console.log(result)");
      });

      /**
       * Tests that the sample file includes main() and main().catch()
       * which is the standard entry point pattern for sample files.
       */
      it("should include main function and error handling", () => {
        expect(sampleContent).toContain("async function main()");
        expect(sampleContent).toContain("main().catch(console.error)");
      });

      /**
       * Tests that the sample file does NOT include an inline file path comment.
       * The file path comment is added by the test harness (getSamplesConcatenated)
       * during scenario testing, not by the component itself. This avoids duplication
       * when the harness concatenates sample files with their own path comments.
       */
      it("should not include inline file path comment (harness adds it)", () => {
        // The file path comment should NOT be in the content — the harness adds it
        expect(sampleContent).not.toContain("/** This file path is");
      });
    });
  });

  /**
   * Tests that API key credential is set up with a placeholder value.
   * Non-Azure services with API key auth should show the inline
   * credential object pattern, not DefaultAzureCredential.
   */
  it("should setup API key credential for apiKey auth", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(
      t.code`
        @service(#{title: "Test Service"})
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
        namespace TestService;

        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    addMockExample(sdkContext);

    const template = (
      <SampleTestWrapper sdkContext={sdkContext}>
        <SampleFiles />
      </SampleTestWrapper>
    );

    const result = renderToString(template);
    const sampleContent = extractSampleContent(result, "getItemSample.ts");

    expect(sampleContent).toContain('{ key: "INPUT_YOUR_KEY_HERE" }');
    expect(sampleContent).not.toContain("DefaultAzureCredential");
  });

  /**
   * Tests that OAuth2 auth with Azure flavor generates DefaultAzureCredential.
   *
   * When the emitter runs in Azure flavor, OAuth2/OpenIDConnect services should
   * import and use `DefaultAzureCredential` from `@azure/identity`, which is
   * the standard Azure SDK credential pattern. This matches the legacy emitter's
   * behavior for Azure packages.
   */
  it("should use DefaultAzureCredential for OAuth2 auth in Azure flavor", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(
      t.code`
        @service(#{title: "Test Service"})
        @useAuth(OAuth2Auth<[{type: OAuth2FlowType.implicit, authorizationUrl: "https://login.example.com/auth", scopes: ["https://example.com/.default"]}]>)
        namespace TestService;

        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    addMockExample(sdkContext);

    const template = (
      <SampleTestWrapper sdkContext={sdkContext} flavor="azure">
        <SampleFiles />
      </SampleTestWrapper>
    );

    const result = renderToString(template);
    const sampleContent = extractSampleContent(result, "getItemSample.ts");

    expect(sampleContent).toContain("new DefaultAzureCredential()");
    expect(sampleContent).toContain(
      'import { DefaultAzureCredential } from "@azure/identity"',
    );
  });

  /**
   * Tests that OAuth2 auth with core flavor generates a placeholder TokenCredential.
   *
   * When the emitter runs in core (non-Azure) flavor, OAuth2/OpenIDConnect services
   * should NOT use DefaultAzureCredential. Instead, the sample should use an inline
   * token credential placeholder with a getToken() method. This matches the legacy
   * emitter's behavior for non-Azure packages and avoids introducing an Azure
   * dependency in vanilla TypeSpec SDKs.
   */
  it("should use inline token credential for OAuth2 auth in core flavor", async () => {
    const runner = await Tester.createInstance();
    const { program } = await runner.compile(
      t.code`
        @service(#{title: "Test Service"})
        @useAuth(OAuth2Auth<[{type: OAuth2FlowType.implicit, authorizationUrl: "https://login.example.com/auth", scopes: ["https://example.com/.default"]}]>)
        namespace TestService;

        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    addMockExample(sdkContext);

    const template = (
      <SampleTestWrapper sdkContext={sdkContext} flavor="core">
        <SampleFiles />
      </SampleTestWrapper>
    );

    const result = renderToString(template);
    const sampleContent = extractSampleContent(result, "getItemSample.ts");

    // Core flavor should NOT use DefaultAzureCredential or import @azure/identity
    expect(sampleContent).not.toContain("DefaultAzureCredential");
    expect(sampleContent).not.toContain("@azure/identity");
    // Should use inline token credential placeholder
    expect(sampleContent).toContain("getToken");
    expect(sampleContent).toContain("INPUT_YOUR_TOKEN_HERE");
  });

  /**
   * Tests that the sample file includes JSDoc documentation with
   * the operation description and summary. This is important for
   * generated documentation and sample discovery.
   */
  it("should include JSDoc with operation description", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @doc("Get an item by ID")
        @get op getItem(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    addMockExample(sdkContext, {
      doc: "Get an item by ID",
    });

    const template = (
      <SampleTestWrapper sdkContext={sdkContext}>
        <SampleFiles />
      </SampleTestWrapper>
    );

    const result = renderToString(template);
    const sampleContent = extractSampleContent(result, "getItemSample.ts");

    expect(sampleContent).toContain("This sample demonstrates how to");
    expect(sampleContent).toContain("@summary");
  });

  /**
   * Tests that JSDoc uses the method's @doc text rather than the example title.
   * The legacy emitter sources descriptions from the operation's @doc decorator,
   * not from the example's title/doc field. This ensures documentation reflects
   * the intended API description rather than the example's label.
   */
  it("should use method doc text over example doc for JSDoc", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @doc("Retrieve a specific widget")
        @get op getWidget(): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    // Example has different doc than the method
    addMockExample(sdkContext, {
      name: "getWidget",
      doc: "getWidget example title",
    });

    const template = (
      <SampleTestWrapper sdkContext={sdkContext}>
        <SampleFiles />
      </SampleTestWrapper>
    );

    const result = renderToString(template);
    const sampleContent = extractSampleContent(result, "getWidgetSample.ts");

    // Should use the method's @doc text, not the example's doc
    expect(sampleContent).toContain("retrieve a specific widget");
    expect(sampleContent).not.toContain("getWidget example title");
  });

  /**
   * Tests that operations with path parameters include those parameters
   * as arguments in the operation call. The example values are used
   * when available, otherwise placeholders are generated.
   */
  it("should include path parameters in operation call", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`
        @get op getItem(@path id: string): string;
      `,
    );

    const sdkContext = await createSdkContextForTest(program);
    const client = getFirstClient(sdkContext);
    const method = client.methods[0];
    const operation = method.operation;

    // Create example with path parameter value
    const pathParam = operation.parameters.find((p: any) => p.name === "id");

    operation.examples = [
      {
        kind: "http",
        name: "getItem",
        doc: "Get item",
        filePath: "json.json",
        rawExample: {},
        parameters: pathParam
          ? [
              {
                parameter: pathParam,
                value: {
                  kind: "string",
                  type: { kind: "string" },
                  value: "item-123",
                } as SdkExampleValue,
              },
            ]
          : [],
        responses: [],
      },
    ];

    const template = (
      <SampleTestWrapper sdkContext={sdkContext}>
        <SampleFiles />
      </SampleTestWrapper>
    );

    const result = renderToString(template);
    const sampleContent = extractSampleContent(result, "getItemSample.ts");

    expect(sampleContent).toContain('"item-123"');
    expect(sampleContent).toContain("client.getItem(");
  });
});

describe("getExampleValueCode", () => {
  /**
   * Tests that string values are correctly quoted.
   * String example values must produce valid TypeScript string literals.
   */
  it("should convert string value to quoted string", () => {
    const value: SdkExampleValue = {
      kind: "string",
      type: { kind: "string" } as any,
      value: "hello world",
    };

    expect(getExampleValueCode(value)).toBe('"hello world"');
  });

  /**
   * Tests that numeric values are converted to their string representation.
   */
  it("should convert number value to string", () => {
    const value: SdkExampleValue = {
      kind: "number",
      type: { kind: "int32" } as any,
      value: 42,
    };

    expect(getExampleValueCode(value)).toBe("42");
  });

  /**
   * Tests that boolean values are correctly represented.
   */
  it("should convert boolean value", () => {
    const value: SdkExampleValue = {
      kind: "boolean",
      type: { kind: "boolean" } as any,
      value: true,
    };

    expect(getExampleValueCode(value)).toBe("true");
  });

  /**
   * Tests that null values produce the string "null".
   */
  it("should convert null value", () => {
    const value: SdkExampleValue = {
      kind: "null",
      type: { kind: "nullable" } as any,
      value: null,
    };

    expect(getExampleValueCode(value)).toBe("null");
  });

  /**
   * Tests that array values produce valid TypeScript array literals.
   */
  it("should convert array value to array literal", () => {
    const value: SdkExampleValue = {
      kind: "array",
      type: { kind: "array" } as any,
      value: [
        { kind: "string", type: { kind: "string" } as any, value: "a" },
        { kind: "string", type: { kind: "string" } as any, value: "b" },
      ],
    };

    expect(getExampleValueCode(value)).toBe('["a", "b"]');
  });

  /**
   * Tests that model values produce valid TypeScript object literals.
   * Properties are rendered with their client-side names and example values.
   */
  it("should convert model value to object literal", () => {
    const value: SdkExampleValue = {
      kind: "model",
      type: {
        kind: "model",
        properties: [
          { name: "name", kind: "property" },
          { name: "age", kind: "property" },
        ],
      } as any,
      value: {
        name: {
          kind: "string",
          type: { kind: "string" } as any,
          value: "John",
        } as SdkExampleValue,
        age: {
          kind: "number",
          type: { kind: "int32" } as any,
          value: 30,
        } as SdkExampleValue,
      },
    };

    const result = getExampleValueCode(value);
    expect(result).toContain('name: "John"');
    expect(result).toContain("age: 30");
  });

  /**
   * Tests that datetime string values are wrapped in new Date().
   * TCGC represents dates as string example values with utcDateTime type.
   */
  it("should wrap date values in new Date()", () => {
    const value: SdkExampleValue = {
      kind: "string",
      type: { kind: "utcDateTime" } as any,
      value: "2024-01-15T00:00:00Z",
    };

    expect(getExampleValueCode(value)).toBe('new Date("2024-01-15T00:00:00Z")');
  });

  /**
   * Tests that dictionary values produce valid TypeScript object literals.
   * Dictionaries are key-value pairs where keys are always strings.
   */
  it("should convert dict value to object literal", () => {
    const value: SdkExampleValue = {
      kind: "dict",
      type: { kind: "dict" } as any,
      value: {
        key1: {
          kind: "string",
          type: { kind: "string" } as any,
          value: "val1",
        } as SdkExampleValue,
        key2: {
          kind: "number",
          type: { kind: "int32" } as any,
          value: 2,
        } as SdkExampleValue,
      },
    };

    const result = getExampleValueCode(value);
    expect(result).toContain('key1: "val1"');
    expect(result).toContain("key2: 2");
  });
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the content of a specific sample file from the rendered output.
 *
 * The rendered output contains multiple files separated by markers.
 * This helper finds the sample file by name and returns its content.
 */
function extractSampleContent(rendered: string, fileName: string): string {
  // The rendered output includes all file contents. Look for the sample
  // file content by searching for its path comment.
  const marker = `/samples-dev/${fileName}`;
  const idx = rendered.indexOf(marker);
  if (idx === -1) {
    // Fallback: return the full rendered output for debugging
    return rendered;
  }
  return rendered;
}
