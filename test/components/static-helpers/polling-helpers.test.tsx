/**
 * Test suite for the PollingHelpersFile component.
 *
 * PollingHelpersFile generates `static-helpers/pollingHelpers.ts` containing types
 * and functions for Long Running Operation (LRO) polling using `@azure/core-lro`.
 *
 * What is tested:
 * - GetLongRunningPollerOptions interface is rendered with configuration members
 * - getLongRunningPoller function is rendered using createHttpPoller from core-lro
 * - getLroResponse helper is rendered for converting REST responses to LRO format
 * - addApiVersionToUrl helper is rendered for polling URL construction
 * - Each declaration's refkey enables cross-file imports via Alloy
 *
 * Why this matters:
 * LRO operations call `getLongRunningPoller(...)` to create a poller that uses
 * `@azure/core-lro`'s `createHttpPoller` for actual HTTP polling. Without these
 * declarations, LRO operations would fail to poll the server for final results,
 * causing pollUntilDone() to return undefined properties.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { code } from "@alloy-js/core";
import {
  createTSNamePolicy,
  FunctionDeclaration,
  SourceFile,
} from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { beforeAll, describe, expect, it } from "vitest";
import { t } from "@typespec/compiler/testing";
import { PollingHelpersFile } from "../../../src/components/static-helpers/polling-helpers.js";
import { pollingHelperRefkey } from "../../../src/utils/refkeys.js";
import { TesterWithService } from "../../test-host.js";
import {
  httpRuntimeLib,
  azureCoreLroLib,
} from "../../../src/utils/external-packages.js";
import type { Program } from "@typespec/compiler";

describe("PollingHelpersFile", () => {
  let program: Program;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that the GetLongRunningPollerOptions interface is rendered
   * with updateIntervalInMs, abortSignal, getInitialResponse,
   * resourceLocationConfig, restoreFrom, initialRequestUrl, and apiVersion members.
   */
  it("should render GetLongRunningPollerOptions interface", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib, azureCoreLroLib]}
      >
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export interface GetLongRunningPollerOptions");
    expect(result).toContain("updateIntervalInMs");
    expect(result).toContain("abortSignal");
    expect(result).toContain("getInitialResponse");
    expect(result).toContain("resourceLocationConfig");
    expect(result).toContain("restoreFrom");
    expect(result).toContain("initialRequestUrl");
    expect(result).toContain("apiVersion");
  });

  /**
   * Tests that the getLongRunningPoller function is rendered as an
   * exported function that delegates to createHttpPoller from @azure/core-lro.
   * This ensures actual HTTP polling occurs instead of just deserializing
   * the initial response.
   */
  it("should render getLongRunningPoller function using createHttpPoller", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib, azureCoreLroLib]}
      >
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export function getLongRunningPoller");
    expect(result).toContain("expectedStatuses");
    expect(result).toContain("processResponseBody");
    expect(result).toContain("createHttpPoller");
    expect(result).toContain("sendInitialRequest");
    expect(result).toContain("sendPollRequest");
  });

  /**
   * Tests that the getLroResponse helper function is rendered.
   * This function converts PathUncheckedResponse to the OperationResponse
   * format expected by @azure/core-lro, validating status codes.
   */
  it("should render getLroResponse helper function", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib, azureCoreLroLib]}
      >
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("function getLroResponse");
    expect(result).toContain("flatResponse");
    expect(result).toContain("rawResponse");
    expect(result).toContain("statusCode");
  });

  /**
   * Tests that the addApiVersionToUrl helper function is rendered.
   * This ensures polling requests carry the correct api-version parameter.
   */
  it("should render addApiVersionToUrl helper function", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib, azureCoreLroLib]}
      >
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("function addApiVersionToUrl");
    expect(result).toContain("api-version");
  });

  /**
   * Tests that the getLongRunningPoller refkey enables cross-file
   * imports. When an LRO operation function in another file uses
   * `pollingHelperRefkey("getLongRunningPoller")`, Alloy should
   * generate an import from the helpers file.
   */
  it("should enable cross-file import via getLongRunningPoller refkey", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib, azureCoreLroLib]}
      >
        <SourceFile path="consumer.ts">
          <FunctionDeclaration name="test" export>
            {code`return ${pollingHelperRefkey("getLongRunningPoller")}(null as any, null as any, [], null as any);`}
          </FunctionDeclaration>
        </SourceFile>
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("import { getLongRunningPoller }");
  });
});
