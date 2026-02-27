/**
 * Test suite for the PagingHelpersFile component.
 *
 * PagingHelpersFile generates `helpers/pagingHelpers.ts` containing types
 * and functions for paginated API response iteration.
 *
 * What is tested:
 * - PageSettings interface is rendered with continuationToken member
 * - PagedAsyncIterableIterator interface is rendered with correct type parameter
 * - BuildPagedAsyncIteratorOptions interface is rendered with itemName, nextLinkName,
 *   nextLinkMethod, and apiVersion
 * - buildPagedAsyncIterator function is rendered with correct signature and
 *   nextLinkMethod/apiVersion support
 * - Each declaration's refkey enables cross-file imports via Alloy
 * - PagedAsyncIterableIterator refkey works as a return type in operation functions
 *
 * Why this matters:
 * Paging operations return `PagedAsyncIterableIterator<T>` and call
 * `buildPagedAsyncIterator(...)` to create the iterator. Without these
 * declarations, paging operations would reference types and functions
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
import { PagingHelpersFile } from "../../../src/components/static-helpers/paging-helpers.js";
import { pagingHelperRefkey } from "../../../src/utils/refkeys.js";
import { TesterWithService } from "../../test-host.js";
import { httpRuntimeLib } from "../../../src/utils/external-packages.js";
import type { Program } from "@typespec/compiler";

describe("PagingHelpersFile", () => {
  let program: Program;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that the PageSettings interface is rendered with the
   * continuationToken member. This interface is used as a parameter
   * in the byPage() method for resuming pagination.
   */
  it("should render PageSettings interface", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PagingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export interface PageSettings");
    expect(result).toContain("continuationToken");
  });

  /**
   * Tests that the PagedAsyncIterableIterator interface is rendered
   * with the TElement type parameter and the required methods:
   * next(), [Symbol.asyncIterator](), and byPage().
   */
  it("should render PagedAsyncIterableIterator interface", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PagingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export interface PagedAsyncIterableIterator<tElement>");
    expect(result).toContain("next");
    expect(result).toContain("byPage");
  });

  /**
   * Tests that the BuildPagedAsyncIteratorOptions interface is rendered
   * with all configuration members: itemName, nextLinkName, nextLinkMethod,
   * and apiVersion. These configure how the paging helper finds items,
   * follows next links, and injects API version into subsequent requests.
   */
  it("should render BuildPagedAsyncIteratorOptions interface", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PagingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export interface BuildPagedAsyncIteratorOptions");
    expect(result).toContain("itemName");
    expect(result).toContain("nextLinkName");
    expect(result).toContain("nextLinkMethod");
    expect(result).toContain("apiVersion");
  });

  /**
   * Tests that the buildPagedAsyncIterator function is rendered with
   * the correct export signature and type parameter. This is the core
   * factory function called by paging operation wrappers.
   *
   * Also verifies that nextLinkMethod and apiVersion configuration
   * are extracted from options and used in page fetching logic,
   * including the addApiVersionToUrl helper for URL parameter injection.
   */
  it("should render buildPagedAsyncIterator function", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <PagingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("export function buildPagedAsyncIterator");
    expect(result).toContain("expectedStatuses");
    // Verify nextLinkMethod support — the function should check whether to use POST or GET
    expect(result).toContain('nextLinkMethod');
    expect(result).toContain('.post()');
    expect(result).toContain('.get()');
    // Verify apiVersion support — the function should inject api-version into next page URLs
    expect(result).toContain('addApiVersionToUrl');
    expect(result).toContain('api-version');
  });

  /**
   * Tests that the PagedAsyncIterableIterator refkey enables cross-file
   * imports. When a paging operation function in another file uses
   * `pagingHelperRefkey("PagedAsyncIterableIterator")` as a return type,
   * Alloy should generate an import from the helpers file.
   */
  it("should enable cross-file import via PagedAsyncIterableIterator refkey", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <SourceFile path="operations.ts">
          <FunctionDeclaration
            name="listItems"
            export
            returnType={code`${pagingHelperRefkey("PagedAsyncIterableIterator")}<string>`}
          >
            {code`return ${pagingHelperRefkey("buildPagedAsyncIterator")}(null as any, null as any, null as any, []);`}
          </FunctionDeclaration>
        </SourceFile>
        <PagingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("import");
    expect(result).toContain("PagedAsyncIterableIterator");
    expect(result).toContain("buildPagedAsyncIterator");
  });

  /**
   * Tests that the buildPagedAsyncIterator refkey works independently,
   * verifying that the function can be imported from another file without
   * also importing the type.
   */
  it("should enable cross-file import via buildPagedAsyncIterator refkey", async () => {
    const template = (
      <Output program={program} namePolicy={createTSNamePolicy()} externals={[httpRuntimeLib]}>
        <SourceFile path="consumer.ts">
          <FunctionDeclaration name="test" export>
            {code`${pagingHelperRefkey("buildPagedAsyncIterator")}(null as any, null as any, null as any, []);`}
          </FunctionDeclaration>
        </SourceFile>
        <PagingHelpersFile />
      </Output>
    );

    const result = renderToString(template);
    expect(result).toContain("import { buildPagedAsyncIterator }");
  });
});
