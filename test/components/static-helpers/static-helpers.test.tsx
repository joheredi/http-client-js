/**
 * Test suite for the StaticHelpers orchestrator component.
 *
 * StaticHelpers renders all static helper source files: serialization helpers,
 * paging helpers, polling helpers, and multipart helpers.
 *
 * What is tested:
 * - StaticHelpers produces all four helper files in the output
 * - Helper files are placed in the helpers/ directory
 * - Integration with the emitter: static helpers are included in emitter output
 *
 * Why this matters:
 * The orchestrator ensures all helper files are rendered as part of the emitter
 * output. Without this integration, generated SDK code would reference helper
 * functions and types that don't exist in the output directory.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { SourceDirectory, SourceFile } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, it } from "vitest";
import { t } from "@typespec/compiler/testing";
import { StaticHelpers } from "../../../src/components/static-helpers/index.js";
import { TesterWithService } from "../../test-host.js";

describe("StaticHelpers", () => {
  /**
   * Tests that the StaticHelpers orchestrator renders all four helper
   * files. This verifies the integration point — if any file component
   * is missing from the orchestrator, its helpers won't be in the output.
   */
  it("should render all helper files", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <StaticHelpers />
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

    // Polling helpers
    expect(result).toContain("PollerLike");
    expect(result).toContain("getLongRunningPoller");

    // Multipart helpers
    expect(result).toContain("FileContents");
    expect(result).toContain("createFilePartDescriptor");
  });

  /**
   * Tests that all helper files are output at the correct paths under
   * the helpers/ directory.
   */
  it("should produce files at correct paths", async () => {
    const runner = await TesterWithService.createInstance();
    const { program } = await runner.compile(t.code`op test(): void;`);

    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()}>
        <StaticHelpers />
      </Output>
    );

    expect(template).toRenderTo({
      "helpers/serializationHelpers.ts": expect.stringContaining("serializeRecord"),
      "helpers/pagingHelpers.ts": expect.stringContaining("buildPagedAsyncIterator"),
      "helpers/pollingHelpers.ts": expect.stringContaining("getLongRunningPoller"),
      "helpers/multipartHelpers.ts": expect.stringContaining("createFilePartDescriptor"),
    });
  });
});
