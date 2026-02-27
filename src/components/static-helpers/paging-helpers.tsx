import { code } from "@alloy-js/core";
import {
  FunctionDeclaration,
  InterfaceDeclaration,
  InterfaceMember,
  SourceFile,
} from "@alloy-js/typescript";
import { pagingHelperRefkey } from "../../utils/refkeys.js";
import { useRuntimeLib } from "../../context/flavor-context.js";

/**
 * Renders the `helpers/pagingHelpers.ts` source file containing types
 * and functions for paginated API response iteration.
 *
 * The paging helpers provide:
 * - `PageSettings`: Configuration for page-by-page iteration
 * - `ContinuablePage`: A single page of results with optional continuation
 * - `PagedAsyncIterableIterator`: The consumer-facing async iterator type
 * - `PagedResult`: Internal paging state descriptor
 * - `BuildPagedAsyncIteratorOptions`: Options for the iterator builder
 * - `buildPagedAsyncIterator`: Factory function that creates the iterator
 *
 * These types and functions are referenced by paging operation components
 * via `pagingHelperRefkey`. Alloy auto-generates imports when these refkeys
 * are used in operation code.
 *
 * The implementation mirrors the legacy emitter's `pagingHelpers.ts` static
 * helper, adapted for the non-Azure runtime (`@typespec/ts-http-runtime`).
 *
 * @returns An Alloy JSX tree for the paging helpers source file.
 */
export function PagingHelpersFile() {
  return (
    <SourceFile path="static-helpers/pagingHelpers.ts">
      <PageSettingsInterface />
      {"\n\n"}
      <BuildPagedAsyncIteratorOptionsInterface />
      {"\n\n"}
      <PagedAsyncIterableIteratorInterface />
      {"\n\n"}
      <BuildPagedAsyncIteratorFunction />
    </SourceFile>
  );
}

/**
 * Renders the `PageSettings` interface that controls page-by-page iteration.
 *
 * Contains a `continuationToken` for resuming pagination from a specific page.
 */
function PageSettingsInterface() {
  return (
    <InterfaceDeclaration
      name="PageSettings"
      refkey={pagingHelperRefkey("PageSettings")}
      export
    >
      <InterfaceMember name="continuationToken" type="string" optional />
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `PagedAsyncIterableIterator` interface — the primary consumer-
 * facing type for iterating paginated results.
 *
 * Supports both element-by-element iteration (via Symbol.asyncIterator)
 * and page-by-page iteration (via `byPage()`).
 *
 * Uses a single type parameter `TElement` for simplicity. The full generic
 * interface from the legacy emitter is simplified here while maintaining
 * API compatibility.
 */
function PagedAsyncIterableIteratorInterface() {
  return (
    <InterfaceDeclaration
      name="PagedAsyncIterableIterator"
      refkey={pagingHelperRefkey("PagedAsyncIterableIterator")}
      export
      typeParameters={["TElement"]}
    >
      <InterfaceMember
        name="next"
        type={code`() => Promise<IteratorResult<TElement>>`}
      />
      {"\n"}
      <InterfaceMember
        name="[Symbol.asyncIterator]"
        type={code`() => PagedAsyncIterableIterator<TElement>`}
      />
      {"\n"}
      <InterfaceMember
        name="byPage"
        type={code`(settings?: ${pagingHelperRefkey("PageSettings")}) => AsyncIterableIterator<TElement[]>`}
      />
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `BuildPagedAsyncIteratorOptions` interface that configures
 * the `buildPagedAsyncIterator` function.
 *
 * Specifies:
 * - `itemName`: path to items array in the response body
 * - `nextLinkName`: path to continuation token in the response body
 * - `nextLinkMethod`: HTTP verb for next-page requests ("GET" or "POST")
 * - `apiVersion`: API version string to inject into next-page URLs
 */
function BuildPagedAsyncIteratorOptionsInterface() {
  return (
    <InterfaceDeclaration
      name="BuildPagedAsyncIteratorOptions"
      refkey={pagingHelperRefkey("BuildPagedAsyncIteratorOptions")}
      export
    >
      <InterfaceMember name="itemName" type="string" optional />
      {"\n"}
      <InterfaceMember name="nextLinkName" type="string" optional />
      {"\n"}
      <InterfaceMember
        name="nextLinkMethod"
        type={code`"GET" | "POST"`}
        optional
      />
      {"\n"}
      <InterfaceMember name="apiVersion" type="string" optional />
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `buildPagedAsyncIterator` function that creates a
 * `PagedAsyncIterableIterator` from an initial response function,
 * a deserializer, and paging configuration.
 *
 * This is the core factory function called by paging operation wrappers.
 * It handles:
 * - Fetching the initial page
 * - Extracting items from the response using the configured item path
 * - Following next-link continuation tokens
 * - Providing both element-by-element and page-by-page iteration
 */
function BuildPagedAsyncIteratorFunction() {
  const runtimeLib = useRuntimeLib();
  return (
    <FunctionDeclaration
      name="buildPagedAsyncIterator"
      refkey={pagingHelperRefkey("buildPagedAsyncIterator")}
      export
      returnType={code`${pagingHelperRefkey("PagedAsyncIterableIterator")}<TElement>`}
      typeParameters={["TElement"]}
      parameters={[
        { name: "client", type: runtimeLib.Client },
        {
          name: "getInitialResponse",
          type: code`() => Promise<${runtimeLib.PathUncheckedResponse}>`,
        },
        {
          name: "processResponseBody",
          type: code`(result: ${runtimeLib.PathUncheckedResponse}) => Promise<unknown>`,
        },
        { name: "expectedStatuses", type: "string[]" },
        {
          name: "options",
          type: code`${pagingHelperRefkey("BuildPagedAsyncIteratorOptions")}`,
          optional: true,
        },
      ]}
    >
      {code`const itemName = options?.itemName ?? "value";
const nextLinkName = options?.nextLinkName ?? "nextLink";
const nextLinkMethod = options?.nextLinkMethod ?? "GET";
const apiVersion = options?.apiVersion;

async function getPage(pageLink?: string): Promise<{ values: TElement[]; nextPageLink?: string } | undefined> {
  let result: ${runtimeLib.PathUncheckedResponse};
  if (pageLink) {
    const resolvedPageLink = apiVersion
      ? addApiVersionToUrl(pageLink, apiVersion)
      : pageLink;
    result = nextLinkMethod === "POST"
      ? await client.pathUnchecked(resolvedPageLink).post()
      : await client.pathUnchecked(resolvedPageLink).get();
  } else {
    result = await getInitialResponse();
  }

  const statusStr = String(result.status);
  if (!expectedStatuses.includes(statusStr)) {
    throw ${runtimeLib.createRestError}(result);
  }

  const body = await processResponseBody(result);
  const typedBody = body as Record<string, unknown>;
  const values = (typedBody[itemName] as TElement[]) ?? [];
  const nextLink = typedBody[nextLinkName] as string | undefined;

  return { values, nextPageLink: nextLink };
}

function addApiVersionToUrl(urlStr: string, apiVersion: string): string {
  const url = new URL(urlStr);
  if (!url.searchParams.has("api-version")) {
    url.searchParams.set("api-version", apiVersion);
  }
  return url.toString();
}

let currentPage: { values: TElement[]; nextPageLink?: string } | undefined;
let currentIndex = 0;

const iter: ${pagingHelperRefkey("PagedAsyncIterableIterator")}<TElement> = {
  async next(): Promise<IteratorResult<TElement>> {
    if (!currentPage || currentIndex >= currentPage.values.length) {
      const nextPage = await getPage(currentPage?.nextPageLink);
      if (!nextPage || nextPage.values.length === 0) {
        return { value: undefined as any, done: true };
      }
      currentPage = nextPage;
      currentIndex = 0;
    }
    return { value: currentPage.values[currentIndex++], done: false };
  },

  [Symbol.asyncIterator]() {
    return iter;
  },

  byPage(settings?: ${pagingHelperRefkey("PageSettings")}) {
    let nextPageLink: string | undefined = settings?.continuationToken;
    let isFirstPage = true;
    const pageIter: AsyncIterableIterator<TElement[]> = {
      async next(): Promise<IteratorResult<TElement[]>> {
        const page = isFirstPage && !nextPageLink
          ? await getPage()
          : await getPage(nextPageLink);
        isFirstPage = false;
        if (!page || page.values.length === 0) {
          return { value: [] as TElement[], done: true };
        }
        nextPageLink = page.nextPageLink;
        return { value: page.values, done: false };
      },
      [Symbol.asyncIterator]() {
        return pageIter;
      },
    };
    return pageIter;
  },
};

return iter;`}
    </FunctionDeclaration>
  );
}
