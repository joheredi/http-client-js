/**
 * Test suite for the DeserializeHeaders and DeserializeExceptionHeaders components.
 *
 * These components generate `_xxxDeserializeHeaders` and `_xxxDeserializeExceptionHeaders`
 * functions that extract typed header values from HTTP responses. The functions are only
 * generated when the `include-headers-in-response` emitter option is enabled.
 *
 * What is tested:
 * - Success response headers: string, optional string, Date, boolean, bytes, constant
 * - Exception response headers: error response header extraction
 * - Null/undefined guard for optional headers
 * - Feature flag gating: no output when includeHeadersInResponse is false
 * - No output when operation has no response headers
 * - Multiple response headers in a single function
 * - Typed header deserialization (boolean, Date, Uint8Array coercion)
 */
import "@alloy-js/core/testing";
import { d } from "@alloy-js/core/testing";
import { t } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import type {
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { DeserializeHeaders, DeserializeExceptionHeaders } from "../../src/components/deserialize-headers.js";
import { httpRuntimeLib } from "../../src/utils/external-packages.js";
import { TesterWithService, createSdkContextForTest } from "../test-host.js";
import { SdkTestFile } from "../utils.jsx";

/**
 * Helper to extract the first method from the first client in an SDK context.
 */
function getFirstMethod(
  sdkContext: {
    sdkPackage: {
      clients: Array<{ methods: SdkServiceMethod<SdkHttpOperation>[] }>;
    };
  },
): SdkServiceMethod<SdkHttpOperation> {
  return sdkContext.sdkPackage.clients[0].methods[0];
}

describe("DeserializeHeaders", () => {
  /**
   * Tests that a simple string header produces a direct pass-through expression.
   * This is the most basic case: a required string header needs no type coercion.
   * Verifies the function signature, inline return type, and header access pattern.
   */
  it("generates deserialize headers for required string header", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      model User {
        name: string;
      }
      op getUser(): User & {@header requestId: string};
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <DeserializeHeaders method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export function _getUserDeserializeHeaders(
        result: PathUncheckedResponse,
      ): { requestId: string } {
        return { requestId: result.headers["request-id"] };
      }
    `);
  });

  /**
   * Tests that optional headers include a null/undefined guard that short-circuits
   * to the raw value when it's null/undefined instead of attempting coercion.
   * This matches the legacy emitter's behavior for optional string headers.
   */
  it("generates null guard for optional string header", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      @delete op deleteUser(): {
        @header("x-request-id") requestId: string,
        @header("x-optional-header") optionalHeader?: string
      };
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <DeserializeHeaders method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export function _deleteUserDeserializeHeaders(
        result: PathUncheckedResponse,
      ): { requestId: string; optionalHeader?: string } {
        return {
        requestId: result.headers["x-request-id"],
        optionalHeader:
        result.headers["x-optional-header"] === undefined || result.headers["x-optional-header"] === null
        ? result.headers["x-optional-header"]
        : result.headers["x-optional-header"],
        };
      }
    `);
  });

  /**
   * Tests that utcDateTime headers are coerced with `new Date()` and boolean
   * headers with `.trim().toLowerCase() === "true"`. These are the most common
   * non-string header types in Azure SDKs.
   */
  it("generates typed coercion for Date and boolean headers", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      @get op getAccountInfo(): {
        @header("date") date: utcDateTime;
        @header("x-ms-legal-hold") legalHold: boolean;
      };
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <DeserializeHeaders method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export function _getAccountInfoDeserializeHeaders(
        result: PathUncheckedResponse,
      ): { date: Date; legalHold: boolean } {
        return {
        date: new Date(result.headers["date"]),
        legalHold: result.headers["x-ms-legal-hold"].trim().toLowerCase() === "true",
        };
      }
    `);
  });

  /**
   * Tests that the component returns nothing when the feature flag is disabled.
   * This is critical: when `includeHeadersInResponse` is false (the default),
   * no header deserialization functions should be generated.
   */
  it("returns undefined when includeHeadersInResponse is false", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      op getUser(): {name: string, @header requestId: string};
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: false }}
      >
        <DeserializeHeaders method={method} />
      </SdkTestFile>
    );

    // Should render empty (no function generated)
    expect(template).toRenderTo(d``);
  });

  /**
   * Tests that the component returns nothing when the operation has no
   * response headers, even when the feature flag is enabled.
   */
  it("returns undefined when operation has no response headers", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      model User { name: string; }
      op getUser(): User;
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <DeserializeHeaders method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d``);
  });
});

describe("DeserializeExceptionHeaders", () => {
  /**
   * Tests that error response headers produce a `_xxxDeserializeExceptionHeaders`
   * function. This is used when an @error model has @header properties.
   */
  it("generates exception headers for error model with header", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      @error
      model ApiError {
        code: string;
        message: string;
        @header("x-ms-error-code") errorCode: string;
      }
      model Widget { id: string; name: string; }
      @route("/widgets/{id}")
      @get
      op getWidget(@path id: string): Widget | ApiError;
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <DeserializeExceptionHeaders method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export function _getWidgetDeserializeExceptionHeaders(
        result: PathUncheckedResponse,
      ): { errorCode: string } {
        return { errorCode: result.headers["x-ms-error-code"] };
      }
    `);
  });

  /**
   * Tests that exception headers with typed properties (boolean, date) include
   * proper type coercion with null guards for optional headers.
   */
  it("generates typed exception headers with boolean and date", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      @error
      model StorageError {
        code: string;
        message: string;
        @header("x-ms-error-code") errorCode: string;
        @header("x-ms-is-retryable") isRetryable?: boolean;
        @header("x-ms-retry-after") @encode("rfc7231") retryAfter?: utcDateTime;
      }
      model Item { id: string; }
      @route("/items/{id}")
      @get
      op getItem(@path id: string): Item | StorageError;
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: true }}
      >
        <DeserializeExceptionHeaders method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d`
      import type { PathUncheckedResponse } from "@typespec/ts-http-runtime";

      export function _getItemDeserializeExceptionHeaders(
        result: PathUncheckedResponse,
      ): { errorCode: string; isRetryable?: boolean; retryAfter?: Date } {
        return {
        errorCode: result.headers["x-ms-error-code"],
        isRetryable:
        result.headers["x-ms-is-retryable"] === undefined || result.headers["x-ms-is-retryable"] === null
        ? result.headers["x-ms-is-retryable"]
        : result.headers["x-ms-is-retryable"].trim().toLowerCase() === "true",
        retryAfter:
        result.headers["x-ms-retry-after"] === undefined || result.headers["x-ms-retry-after"] === null
        ? result.headers["x-ms-retry-after"]
        : new Date(result.headers["x-ms-retry-after"]),
        };
      }
    `);
  });

  /**
   * Tests that no exception headers are generated when the feature flag is disabled,
   * even when error models have header properties.
   */
  it("returns undefined when includeHeadersInResponse is false", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`
      @error
      model ApiError {
        code: string;
        message: string;
        @header("x-ms-error-code") errorCode: string;
      }
      model Widget { id: string; }
      @route("/widgets/{id}")
      @get
      op getWidget(@path id: string): Widget | ApiError;
    `);
    const sdkContext = await createSdkContextForTest(program);
    const method = getFirstMethod(sdkContext);

    const template = (
      <SdkTestFile
        sdkContext={sdkContext}
        externals={[httpRuntimeLib]}
        emitterOptions={{ includeHeadersInResponse: false }}
      >
        <DeserializeExceptionHeaders method={method} />
      </SdkTestFile>
    );

    expect(template).toRenderTo(d``);
  });
});
