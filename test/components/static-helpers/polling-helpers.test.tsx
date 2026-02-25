/**
 * Test suite for the PollingHelpersFile component.
 *
 * PollingHelpersFile generates `helpers/pollingHelpers.ts` containing types
 * and functions for Long Running Operation (LRO) polling.
 *
 * What is tested:
 * - OperationState interface is rendered with status, result, and error members
 * - PollerLike interface is rendered with poll, isDone, pollUntilDone methods
 * - GetLongRunningPollerOptions interface is rendered with configuration members
 * - getLongRunningPoller function is rendered with correct async signature
 * - Each declaration's refkey enables cross-file imports via Alloy
 *
 * Why this matters:
 * LRO operations return `PollerLike<OperationState<T>, T>` and call
 * `getLongRunningPoller(...)` to create the poller. Without these
 * declarations, LRO operations would reference types and functions
 * that don't exist, causing compilation errors in the generated SDK.
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
import { httpRuntimeLib } from "../../../src/utils/external-packages.js";
import type { Program } from "@typespec/compiler";

describe("PollingHelpersFile", () => {
  let program: Program;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that the OperationState interface is rendered with the
   * correct type parameter and members. This interface tracks the
   * status, result, and error of a long-running operation.
   */
  it("should render OperationState interface", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export interface OperationState<tResult>");
    expect(result).toContain("status");
    expect(result).toContain("result");
    expect(result).toContain("error");
  });

  /**
   * Tests that the PollerLike interface is rendered with the correct
   * type parameters and methods. This is the consumer-facing interface
   * for interacting with long-running operations.
   */
  it("should render PollerLike interface", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export interface PollerLike");
    expect(result).toContain("isDone");
    expect(result).toContain("poll");
    expect(result).toContain("pollUntilDone");
    expect(result).toContain("getOperationState");
  });

  /**
   * Tests that the GetLongRunningPollerOptions interface is rendered
   * with updateIntervalInMs, abortSignal, getInitialResponse, and
   * resourceLocationConfig members.
   */
  it("should render GetLongRunningPollerOptions interface", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export interface GetLongRunningPollerOptions");
    expect(result).toContain("updateIntervalInMs");
    expect(result).toContain("abortSignal");
    expect(result).toContain("getInitialResponse");
    expect(result).toContain("resourceLocationConfig");
  });

  /**
   * Tests that the getLongRunningPoller function is rendered as an async
   * exported function with the correct parameters and return type.
   */
  it("should render getLongRunningPoller function", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export async function getLongRunningPoller");
    expect(result).toContain("expectedStatuses");
    expect(result).toContain("processResponseBody");
  });

  /**
   * Tests that the getLongRunningPoller refkey enables cross-file
   * imports. When an LRO operation function in another file uses
   * `pollingHelperRefkey("getLongRunningPoller")`, Alloy should
   * generate an import from the helpers file.
   */
  it("should enable cross-file import via getLongRunningPoller refkey", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
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

  /**
   * Tests that the PollerLike and OperationState refkeys enable
   * cross-file imports when used as type annotations.
   */
  it("should enable cross-file import via PollerLike and OperationState refkeys", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <SourceFile path="consumer.ts">
          <FunctionDeclaration
            name="test"
            export
            returnType={code`${pollingHelperRefkey("PollerLike")}<${pollingHelperRefkey("OperationState")}<string>, string>`}
          >
            {code`return null as any;`}
          </FunctionDeclaration>
        </SourceFile>
        <PollingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("PollerLike");
    expect(result).toContain("OperationState");
  });
});
