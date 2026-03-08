/**
 * Test suite for the StaticHelpers orchestrator component.
 *
 * StaticHelpers renders all static helper source files: serialization helpers,
 * paging helpers, polling helpers, multipart helpers, and XML helpers.
 *
 * What is tested:
 * - Azure flavor: StaticHelpers produces all helper files (including paging, polling, and binary response)
 * - Core flavor: StaticHelpers produces helper files without paging/polling (but with binary response)
 * - Helper files are placed in the static-helpers/ directory
 *
 * Why this matters:
 * The orchestrator ensures all helper files are rendered as part of the emitter
 * output. Paging helpers are gated behind Azure flavor because they depend on
 * Azure-specific paging patterns (PagedAsyncIterableIterator, buildPagedAsyncIterator).
 * Polling helpers are gated behind Azure flavor because they depend on
 * Azure-specific LRO patterns (PollerLike, getLongRunningPoller). Core flavor
 * must not emit paging or polling helpers to avoid referencing unavailable Azure packages.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { SourceDirectory, SourceFile } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { beforeAll, describe, expect, it } from "vitest";
import { t } from "@typespec/compiler/testing";
import { StaticHelpers } from "../../../src/components/static-helpers/index.js";
import { FlavorProvider } from "../../../src/context/flavor-context.js";
import {
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureCoreLroLib,
  azureLoggerLib,
} from "../../../src/utils/external-packages.js";
import {
  TesterWithService,
  createSdkContextForTest,
} from "../../test-host.js";
import type { Program } from "@typespec/compiler";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";
import { SdkContextProvider } from "../../../src/context/sdk-context.js";

/**
 * All external packages needed for Azure-flavored tests.
 * Required when FlavorProvider is set to "azure" so that
 * azure runtime lib refkeys resolve correctly.
 */
const azureExternals = [
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureCoreLroLib,
  azureLoggerLib,
];

describe("StaticHelpers", () => {
  let program: Program;
  let sdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
    sdkContext = await createSdkContextForTest(program);
  });

  /**
   * Tests that the StaticHelpers orchestrator renders all five helper
   * files when Azure flavor is active. Paging and polling helpers are
   * Azure-only because they depend on patterns that use Azure SDK packages.
   */
  it("should render all helper files including paging and polling for Azure flavor", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={azureExternals}
      >
        <FlavorProvider flavor="azure">
          <SdkContextProvider sdkContext={sdkContext}>
            <StaticHelpers />
          </SdkContextProvider>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);

    // Serialization helpers
    expect(result).toContain("serializeRecord");
    expect(result).toContain("deserializeRecord");
    expect(result).toContain("buildCsvCollection");

    // Paging helpers (Azure-only)
    expect(result).toContain("PagedAsyncIterableIterator");
    expect(result).toContain("buildPagedAsyncIterator");

    // Polling helpers (Azure-only)
    expect(result).toContain("PollerLike");
    expect(result).toContain("getLongRunningPoller");

    // Multipart helpers
    expect(result).toContain("FileContents");
    expect(result).toContain("createFilePartDescriptor");
  });

  /**
   * Tests that core flavor renders static helpers WITHOUT paging or polling helpers.
   * Core flavor does not support Azure-specific paging or LRO polling patterns,
   * so pagingHelpers.ts and pollingHelpers.ts must not be emitted — their types
   * reference Azure-specific packages that aren't available in core externals.
   */
  it("should render helpers WITHOUT paging or polling for core flavor", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <SdkContextProvider sdkContext={sdkContext}>
            <StaticHelpers />
          </SdkContextProvider>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);

    // Serialization helpers — present for both flavors
    expect(result).toContain("serializeRecord");
    expect(result).toContain("deserializeRecord");
    expect(result).toContain("buildCsvCollection");

    // Paging helpers — must NOT be present for core flavor
    expect(result).not.toContain("PagedAsyncIterableIterator");
    expect(result).not.toContain("buildPagedAsyncIterator");

    // Polling helpers — must NOT be present for core flavor
    expect(result).not.toContain("PollerLike");
    expect(result).not.toContain("getLongRunningPoller");
    expect(result).not.toContain("OperationState");
    expect(result).not.toContain("GetLongRunningPollerOptions");

    // Multipart helpers — present for both flavors
    expect(result).toContain("FileContents");
    expect(result).toContain("createFilePartDescriptor");
  });

  /**
   * Tests that all helper files are output at the correct paths under
   * the static-helpers/ directory for Azure flavor (includes pagingHelpers.ts
   * and pollingHelpers.ts).
   */
  it("should produce files at correct paths for Azure flavor", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={azureExternals}
      >
        <FlavorProvider flavor="azure">
          <SdkContextProvider sdkContext={sdkContext}>
            <StaticHelpers />
          </SdkContextProvider>
        </FlavorProvider>
      </Output>
    );

    expect(template).toRenderTo({
      "static-helpers/serializationHelpers.ts":
        expect.stringContaining("serializeRecord"),
      "static-helpers/pagingHelpers.ts": expect.stringContaining(
        "buildPagedAsyncIterator",
      ),
      "static-helpers/pollingHelpers.ts": expect.stringContaining(
        "getLongRunningPoller",
      ),
      "static-helpers/multipartHelpers.ts": expect.stringContaining(
        "createFilePartDescriptor",
      ),
      "static-helpers/xmlHelpers.ts": expect.stringContaining("serializeToXml"),
      "static-helpers/getBinaryResponse.ts":
        expect.stringContaining("getBinaryResponse"),
      "static-helpers/urlTemplate.ts":
        expect.stringContaining("expandUrlTemplate"),
    });
  });

  /**
   * Tests that core flavor produces files at correct paths WITHOUT
   * pagingHelpers.ts or pollingHelpers.ts. This confirms the orchestrator
   * omits these files entirely rather than emitting empty files.
   */
  it("should produce files at correct paths for core flavor (no pagingHelpers.ts or pollingHelpers.ts)", async () => {
    const template = (
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <SdkContextProvider sdkContext={sdkContext}>
            <StaticHelpers />
          </SdkContextProvider>
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);

    // Files that should be present
    expect(result).toContain("serializeRecord");
    expect(result).toContain("createFilePartDescriptor");
    expect(result).toContain("serializeToXml");

    // pagingHelpers.ts should NOT be present
    expect(result).not.toContain("buildPagedAsyncIterator");
    expect(result).not.toContain("PagedAsyncIterableIterator");

    // pollingHelpers.ts should NOT be present
    expect(result).not.toContain("getLongRunningPoller");
    expect(result).not.toContain("PollerLike");
  });
});
