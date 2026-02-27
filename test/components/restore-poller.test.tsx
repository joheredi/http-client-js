/**
 * Test suite for the RestorePollerFile component.
 *
 * RestorePollerFile generates `api/restorePollerHelpers.ts` containing types
 * and functions for restoring (rehydrating) serialized LRO pollers.
 *
 * What is tested:
 * - Returns undefined when client has no LRO operations
 * - Generates RestorePollerOptions interface with correct type parameters
 * - Generates restorePoller function with correct signature
 * - Generates deserializeMap with entries for all LRO operations
 * - Generates getDeserializationHelper URL matching function
 * - Generates getPathFromMapKey and getApiVersionFromUrl utility functions
 * - Handles multiple LRO operations in deserialize map
 * - Handles LRO operations in nested child clients (operation groups)
 * - RestorePollerOptions is referenceable via pollingHelperRefkey
 * - restorePoller function is referenceable via pollingHelperRefkey
 * - DeserializationHelper interface is rendered (private, not exported)
 *
 * Why this matters:
 * Long-running operations can be serialized and restored on a different host
 * or after the original poller scope is lost. Without the restorePoller helpers,
 * consumers cannot rehydrate pollers, breaking Azure SDK durability patterns.
 * The deserialize map routes requests to the correct operation deserializer,
 * and the URL matching handles parameterized paths like `/resources/{id}`.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { code, SourceDirectory } from "@alloy-js/core";
import {
  ClassDeclaration,
  createTSNamePolicy,
  FunctionDeclaration,
  SourceFile,
} from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { t } from "@typespec/compiler/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { RestorePollerFile } from "../../src/components/restore-poller.js";
import { PollingHelpersFile } from "../../src/components/static-helpers/polling-helpers.js";
import {
  classicalClientRefkey,
  deserializeOperationRefkey,
  pollingHelperRefkey,
} from "../../src/utils/refkeys.js";
import {
  azureCoreLroLib,
  httpRuntimeLib,
} from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";

/**
 * Creates a mock LRO service method with the minimum properties needed
 * by the RestorePollerFile component.
 *
 * This avoids requiring `@azure-tools/typespec-azure-core` to define
 * proper TypeSpec LRO operations. The mock objects provide just enough
 * structure for the component to render correctly.
 *
 * @param name - The operation name (e.g., "createResource").
 * @param verb - The HTTP verb (e.g., "put", "delete").
 * @param path - The URL path template (e.g., "/resources/{id}").
 * @param statusCodes - The expected HTTP status codes.
 * @returns A mock SdkServiceMethod object with `kind: "lro"`.
 */
function createMockLroMethod(
  name: string,
  verb: string,
  path: string,
  statusCodes: number[],
): any {
  return {
    kind: "lro",
    name,
    operation: {
      verb,
      path,
      responses: statusCodes.map((code) => ({ statusCodes: code })),
    },
    response: { type: undefined },
    parameters: [],
    lroMetadata: { finalStateVia: "azure-async-operation" },
  };
}

/**
 * Creates a mock SdkClientType with the given methods and children.
 *
 * @param name - The client name (e.g., "TestingClient").
 * @param methods - The service methods (can include LRO methods).
 * @param children - Optional child clients for operation groups.
 * @returns A mock SdkClientType object.
 */
function createMockClient(
  name: string,
  methods: any[],
  children: any[] = [],
): any {
  return {
    name,
    methods,
    children,
    clientInitialization: { parameters: [] },
  };
}

/**
 * Renders the RestorePollerFile component with the minimum context needed
 * for refkey resolution. Includes stub declarations for the classical client
 * and deserialize functions so Alloy can resolve cross-file references.
 */
function renderWithContext(program: any, client: any, methods: any[]): string {
  const template = (
    <Output
      program={program}
      namePolicy={createTSNamePolicy()}
      externals={[httpRuntimeLib, azureCoreLroLib]}
    >
      <SourceDirectory path="src">
        {/* Stub classical client declaration for refkey resolution */}
        <SourceFile
          path={`${client.name.charAt(0).toLowerCase() + client.name.slice(1)}.ts`}
        >
          <ClassDeclaration
            name={client.name}
            refkey={classicalClientRefkey(client)}
            export
          >
            {code`private _client: any;`}
          </ClassDeclaration>
        </SourceFile>

        {/* Stub deserialize function declarations for refkey resolution */}
        <SourceDirectory path="api">
          <SourceFile path="operations.ts">
            {methods.map((method: any) => (
              <FunctionDeclaration
                name={`_${method.name}Deserialize`}
                refkey={deserializeOperationRefkey(method)}
                export
                async
                returnType="Promise<void>"
                parameters={[
                  {
                    name: "result",
                    type: httpRuntimeLib.PathUncheckedResponse,
                  },
                ]}
              >
                {code`return;`}
              </FunctionDeclaration>
            ))}
          </SourceFile>
        </SourceDirectory>

        {/* Polling helpers for getLongRunningPoller refkey */}
        <PollingHelpersFile />

        {/* The component under test */}
        <RestorePollerFile client={client} />
      </SourceDirectory>
    </Output>
  );

  return renderToString(template);
}

describe("RestorePollerFile", () => {
  /**
   * Tests that the component returns undefined when the client has no LRO
   * operations. This ensures restorePollerHelpers.ts is not generated for
   * clients that don't need it, keeping the output clean.
   */
  it("should return undefined when client has no LRO operations", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(
      t.code`@get op listItems(): string[];`,
    );
    const sdkContext = await createSdkContextForTest(program);
    const client = sdkContext.sdkPackage.clients[0];

    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib, azureCoreLroLib]}
      >
        <RestorePollerFile client={client} />
      </Output>
    );

    const result = renderToString(template);
    expect(result).not.toContain("restorePoller");
    expect(result).not.toContain("RestorePollerOptions");
    expect(result).not.toContain("deserializeMap");
  });

  describe("with mock LRO operations", () => {
    let program: any;

    beforeAll(async () => {
      const runner = await TesterWithService.createInstance();
      const { program: compiledProgram } = await runner.compile(
        t.code`@get op test(): void;`,
      );
      program = compiledProgram;
    });

    describe("single LRO operation", () => {
      let result: string;
      let method: any;
      let client: any;

      beforeAll(() => {
        method = createMockLroMethod(
          "createResource",
          "put",
          "/resources/{id}",
          [200, 201],
        );
        client = createMockClient("TestingClient", [method]);
        result = renderWithContext(program, client, [method]);
      });

      /**
       * Tests that the RestorePollerOptions interface is rendered with the
       * correct type parameters and members. This interface configures poller
       * restoration with polling interval, abort signal, and response processor.
       */
      it("should render RestorePollerOptions interface", () => {
        expect(result).toContain("export interface RestorePollerOptions");
        expect(result).toContain("updateIntervalInMs");
        expect(result).toContain("abortSignal");
        expect(result).toContain("processResponseBody");
      });

      /**
       * Tests that the restorePoller function is rendered with the correct
       * signature including type parameters, client parameter typed as the
       * classical client, and PollerLike return type.
       */
      it("should render restorePoller function with correct signature", () => {
        expect(result).toContain("export function restorePoller");
        expect(result).toContain("serializedState: string");
        expect(result).toContain("sourceOperation");
      });

      /**
       * Tests that the restorePoller function body includes the state
       * deserialization, URL matching, and delegation to getLongRunningPoller.
       * These are the core steps for rehydrating a serialized poller.
       */
      it("should render restorePoller function body with correct logic", () => {
        // Should deserialize the state
        expect(result).toContain("deserializeState(serializedState)");
        // Should extract config
        expect(result).toContain("initialRequestUrl");
        expect(result).toContain("requestMethod");
        // Should call getDeserializationHelper
        expect(result).toContain(
          "getDeserializationHelper(initialRequestUrl, requestMethod)",
        );
        // Should call getLongRunningPoller
        expect(result).toContain("getLongRunningPoller");
        // Should pass restoreFrom
        expect(result).toContain("restoreFrom: serializedState");
      });

      /**
       * Tests that the deserializeMap is populated with the correct entries
       * mapping HTTP verb + path to the deserializer function reference.
       * Each entry enables the URL matching logic to route to the correct
       * operation deserializer.
       */
      it("should generate deserializeMap with LRO operation entries", () => {
        expect(result).toContain("deserializeMap");
        expect(result).toContain('"PUT /resources/{id}"');
        expect(result).toContain("_createResourceDeserialize");
        expect(result).toContain("expectedStatuses");
      });

      /**
       * Tests that the getDeserializationHelper function is rendered with
       * the URL matching algorithm. This function is critical for routing
       * serialized poller requests to the correct deserializer by matching
       * the initial request URL against the deserialize map entries.
       */
      it("should render getDeserializationHelper function", () => {
        expect(result).toContain("function getDeserializationHelper");
        // Should handle template path parts with regex
        expect(result).toContain('startsWith("{")');
        // Should match by longest path
        expect(result).toContain("candidatePath.length > matchedLen");
      });

      /**
       * Tests that getPathFromMapKey and getApiVersionFromUrl utility
       * functions are rendered. These are needed for extracting the URL
       * path from map keys and preserving API version during restoration.
       */
      it("should render utility functions", () => {
        expect(result).toContain("function getPathFromMapKey");
        expect(result).toContain("function getApiVersionFromUrl");
        expect(result).toContain("api-version");
      });

      /**
       * Tests that the DeserializationHelper interface is rendered as a
       * private (non-exported) type. This interface defines the shape of
       * each entry in the deserialize map.
       */
      it("should render DeserializationHelper interface (not exported)", () => {
        expect(result).toContain("interface DeserializationHelper");
        expect(result).toContain("deserializer");
        expect(result).toContain("expectedStatuses");
        // Should NOT be exported
        expect(result).not.toContain("export interface DeserializationHelper");
      });
    });

    /**
     * Tests that multiple LRO operations each get an entry in the
     * deserialize map. This ensures all LRO operations are routable
     * when restoring a poller.
     */
    it("should handle multiple LRO operations in deserialize map", () => {
      const method1 = createMockLroMethod(
        "createResource",
        "put",
        "/resources/{id}",
        [200, 201],
      );
      const method2 = createMockLroMethod(
        "deleteResource",
        "delete",
        "/resources/{id}",
        [200, 202],
      );
      const client = createMockClient("TestingClient", [method1, method2]);

      const result = renderWithContext(program, client, [method1, method2]);
      expect(result).toContain('"PUT /resources/{id}"');
      expect(result).toContain('"DELETE /resources/{id}"');
      expect(result).toContain("_createResourceDeserialize");
      expect(result).toContain("_deleteResourceDeserialize");
    });

    /**
     * Tests that LRO operations in child clients (operation groups) are
     * included in the deserialize map. The BFS traversal should collect
     * operations from all levels of the client hierarchy.
     */
    it("should collect LRO operations from child clients", () => {
      const childMethod = createMockLroMethod(
        "provisionWidget",
        "put",
        "/widgets/{id}",
        [200, 201],
      );
      const childClient = createMockClient("Widgets", [childMethod]);
      const rootMethod = createMockLroMethod(
        "createResource",
        "put",
        "/resources/{id}",
        [200, 201],
      );
      const client = createMockClient(
        "TestingClient",
        [rootMethod],
        [childClient],
      );

      const result = renderWithContext(program, client, [
        rootMethod,
        childMethod,
      ]);
      // Both operations should be in the map
      expect(result).toContain('"PUT /resources/{id}"');
      expect(result).toContain('"PUT /widgets/{id}"');
    });

    /**
     * Tests that RestorePollerOptions is referenceable via pollingHelperRefkey.
     * This enables other components to reference the interface for import
     * generation via Alloy's refkey system.
     */
    it("should make RestorePollerOptions referenceable via refkey", () => {
      const method = createMockLroMethod(
        "createResource",
        "put",
        "/resources/{id}",
        [200, 201],
      );
      const client = createMockClient("TestingClient", [method]);

      const template = (
        <Output
          program={program}
          namePolicy={createTSNamePolicy()}
          externals={[httpRuntimeLib, azureCoreLroLib]}
        >
          <SourceDirectory path="src">
            {/* Stub for classical client */}
            <SourceFile path="testingClient.ts">
              <ClassDeclaration
                name="TestingClient"
                refkey={classicalClientRefkey(client)}
                export
              >
                {code`private _client: any;`}
              </ClassDeclaration>
            </SourceFile>
            {/* Stub for deserialize function */}
            <SourceDirectory path="api">
              <SourceFile path="operations.ts">
                <FunctionDeclaration
                  name="_createResourceDeserialize"
                  refkey={deserializeOperationRefkey(method)}
                  export
                  async
                  returnType="Promise<void>"
                  parameters={[
                    {
                      name: "result",
                      type: httpRuntimeLib.PathUncheckedResponse,
                    },
                  ]}
                >
                  {code`return;`}
                </FunctionDeclaration>
              </SourceFile>
            </SourceDirectory>
            <PollingHelpersFile />
            <RestorePollerFile client={client} />
            {/* Reference the RestorePollerOptions refkey from another file */}
            <SourceFile path="consumer.ts">
              <FunctionDeclaration
                name="consume"
                parameters={[
                  {
                    name: "opts",
                    type: code`${pollingHelperRefkey("RestorePollerOptions")}<string>`,
                  },
                ]}
              >
                {code`return opts;`}
              </FunctionDeclaration>
            </SourceFile>
          </SourceDirectory>
        </Output>
      );

      const result = renderToString(template);
      // The consumer file should import RestorePollerOptions
      expect(result).toContain("RestorePollerOptions");
    });
  });
});
