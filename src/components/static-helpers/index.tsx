import { SourceDirectory } from "@alloy-js/core";
import { SerializationHelpersFile } from "./serialization-helpers.js";
import { PagingHelpersFile } from "./paging-helpers.js";
import { PollingHelpersFile } from "./polling-helpers.js";
import { MultipartHelpersFile } from "./multipart-helpers.js";
import { XmlHelpersFile } from "./xml-helpers.js";

/**
 * Orchestrator component that renders all static helper source files.
 *
 * Static helpers are utility functions and types that don't depend on
 * any specific TypeSpec service definition. They provide shared runtime
 * support for serialization, paging, polling, and multipart patterns.
 *
 * Each helper file is emitted as a standalone TypeScript source file
 * in the `helpers/` directory. Helper declarations are registered with
 * refkeys, enabling Alloy's automatic import resolution when other
 * components reference them.
 *
 * The emitted directory structure:
 * ```
 * helpers/
 *   serializationHelpers.ts  — Record serialization, collection builders/parsers
 *   pagingHelpers.ts         — PagedAsyncIterableIterator, buildPagedAsyncIterator
 *   pollingHelpers.ts        — PollerLike, getLongRunningPoller
 *   multipartHelpers.ts      — FileContents type, createFilePartDescriptor
 *   xmlHelpers.ts            — XML serialization/deserialization types and functions
 * ```
 *
 * @returns An Alloy JSX tree containing all static helper source files.
 */
export function StaticHelpers() {
  return (
    <>
      <SerializationHelpersFile />
      <PagingHelpersFile />
      <PollingHelpersFile />
      <MultipartHelpersFile />
      <XmlHelpersFile />
    </>
  );
}

export { SerializationHelpersFile } from "./serialization-helpers.js";
export { PagingHelpersFile } from "./paging-helpers.js";
export { PollingHelpersFile } from "./polling-helpers.js";
export { MultipartHelpersFile } from "./multipart-helpers.js";
export { XmlHelpersFile } from "./xml-helpers.js";
