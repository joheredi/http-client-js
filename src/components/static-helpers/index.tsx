import { SourceDirectory } from "@alloy-js/core";
import { useFlavorContext } from "../../context/flavor-context.js";
import { SerializationHelpersFile } from "./serialization-helpers.js";
import { PagingHelpersFile } from "./paging-helpers.js";
import { PollingHelpersFile } from "./polling-helpers.js";
import { MultipartHelpersFile } from "./multipart-helpers.js";
import { XmlHelpersFile } from "./xml-helpers.js";
import { BinaryResponseHelpersFile } from "./binary-response-helpers.js";
import { UrlTemplateHelpersFile } from "./url-template-helpers.js";

/**
 * Orchestrator component that renders all static helper source files.
 *
 * Static helpers are utility functions and types that don't depend on
 * any specific TypeSpec service definition. They provide shared runtime
 * support for serialization, paging, polling, and multipart patterns.
 *
 * Each helper file is emitted as a standalone TypeScript source file
 * in the `static-helpers/` directory. Helper declarations are registered with
 * refkeys, enabling Alloy's automatic import resolution when other
 * components reference them.
 *
 * The emitted directory structure:
 * ```
 * static-helpers/
 *   serializationHelpers.ts  — Record serialization, collection builders/parsers
 *   pagingHelpers.ts         — PagedAsyncIterableIterator, buildPagedAsyncIterator
 *   pollingHelpers.ts        — PollerLike, getLongRunningPoller
 *   multipartHelpers.ts      — FileContents type, createFilePartDescriptor
 *   xmlHelpers.ts            — XML serialization/deserialization types and functions
 * ```
 *
 * Paging helpers (`pagingHelpers.ts`) are gated behind Azure flavor because
 * they depend on Azure-specific paging patterns. Core flavor does not emit
 * paging helper types or functions.
 *
 * Polling helpers (`pollingHelpers.ts`) are gated behind Azure flavor because
 * they depend on Azure-specific LRO patterns. Core flavor does not emit
 * polling helper types or functions.
 *
 * @returns An Alloy JSX tree containing all static helper source files.
 */
export function StaticHelpers() {
  const { flavor } = useFlavorContext();
  return (
    <SourceDirectory path="static-helpers">
      <SerializationHelpersFile />
      {flavor === "azure" && <PagingHelpersFile />}
      {flavor === "azure" && <PollingHelpersFile />}
      <MultipartHelpersFile />
      <XmlHelpersFile />
      <BinaryResponseHelpersFile />
      <UrlTemplateHelpersFile />
    </SourceDirectory>
  );
}

export { SerializationHelpersFile } from "./serialization-helpers.js";
export { PagingHelpersFile } from "./paging-helpers.js";
export { PollingHelpersFile } from "./polling-helpers.js";
export { MultipartHelpersFile } from "./multipart-helpers.js";
export { XmlHelpersFile } from "./xml-helpers.js";
export { BinaryResponseHelpersFile } from "./binary-response-helpers.js";
export { UrlTemplateHelpersFile } from "./url-template-helpers.js";
