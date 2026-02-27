/**
 * Test suite for the StaticHelpers orchestrator component.
 *
 * StaticHelpers renders all static helper source files: serialization helpers,
 * paging helpers, polling helpers, multipart helpers, and XML helpers.
 *
 * What is tested:
 * - Azure flavor: StaticHelpers produces all five helper files (including polling)
 * - Core flavor: StaticHelpers produces four helper files (polling excluded)
 * - Helper files are placed in the static-helpers/ directory
 *
 * Why this matters:
 * The orchestrator ensures all helper files are rendered as part of the emitter
 * output. Polling helpers are gated behind Azure flavor because they depend on
 * Azure-specific LRO patterns (PollerLike, getLongRunningPoller). Core flavor
 * must not emit polling helpers to avoid referencing unavailable Azure packages.
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
import { TesterWithService } from "../../test-host.js";
import type { Program } from "@typespec/compiler";

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

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that the StaticHelpers orchestrator renders all five helper
   * files when Azure flavor is active. Polling helpers are Azure-only
   * because they depend on LRO patterns that use Azure SDK packages.
   */
  it("should render all helper files including polling for Azure flavor", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={azureExternals}>
        <FlavorProvider flavor="azure">
          <StaticHelpers />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);

    // Serialization helpers
    expect(result).toContain("serializeRecord");
    expect(result).toContain("deserializeRecord");
    expect(result).toContain("buildCsvCollection");

    // Paging helpers
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
   * Tests that core flavor renders static helpers WITHOUT polling helpers.
   * Core flavor does not support LRO polling patterns, so pollingHelpers.ts
   * must not be emitted — its types reference Azure-specific packages that
   * aren't available in core externals.
   */
  it("should render helpers WITHOUT polling for core flavor", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <StaticHelpers />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);

    // Serialization helpers — present for both flavors
    expect(result).toContain("serializeRecord");
    expect(result).toContain("deserializeRecord");
    expect(result).toContain("buildCsvCollection");

    // Paging helpers — present for both flavors
    expect(result).toContain("PagedAsyncIterableIterator");
    expect(result).toContain("buildPagedAsyncIterator");

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
   * the static-helpers/ directory for Azure flavor (includes pollingHelpers.ts).
   */
  it("should produce files at correct paths for Azure flavor", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={azureExternals}>
        <FlavorProvider flavor="azure">
          <StaticHelpers />
        </FlavorProvider>
      </Output>
    );

    expect(template).toRenderTo({
      "static-helpers/serializationHelpers.ts": expect.stringContaining("serializeRecord"),
      "static-helpers/pagingHelpers.ts": expect.stringContaining("buildPagedAsyncIterator"),
      "static-helpers/pollingHelpers.ts": expect.stringContaining("getLongRunningPoller"),
      "static-helpers/multipartHelpers.ts": expect.stringContaining("createFilePartDescriptor"),
      "static-helpers/xmlHelpers.ts": expect.stringContaining("serializeToXml"),
    });
  });

  /**
   * Tests that core flavor produces files at correct paths WITHOUT
   * pollingHelpers.ts. This confirms the orchestrator omits the file
   * entirely rather than emitting an empty file.
   */
  it("should produce files at correct paths for core flavor (no pollingHelpers.ts)", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <FlavorProvider flavor="core">
          <StaticHelpers />
        </FlavorProvider>
      </Output>
    );

    const result = renderToString(template);

    // Files that should be present
    expect(result).toContain("serializeRecord");
    expect(result).toContain("buildPagedAsyncIterator");
    expect(result).toContain("createFilePartDescriptor");
    expect(result).toContain("serializeToXml");

    // pollingHelpers.ts should NOT be present
    expect(result).not.toContain("getLongRunningPoller");
    expect(result).not.toContain("PollerLike");
  });
});
