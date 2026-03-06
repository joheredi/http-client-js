import { For } from "@alloy-js/core";
import { SourceFile } from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useSdkContext } from "../context/sdk-context.js";
import { useGroupDirectory } from "../context/group-directory-context.js";
import { useEmitterOptions } from "../context/emitter-options-context.js";
import {
  DeserializeHeaders,
  DeserializeExceptionHeaders,
} from "./deserialize-headers.js";
import { DeserializeOperation } from "./deserialize-operation.js";
import { PublicOperation } from "./public-operation.js";
import { SendOperation } from "./send-operation.js";
import {
  collectOperationGroups,
  type OperationGroup,
} from "../utils/operation-groups.js";

/**
 * Orchestrator component that organizes all operations into API source files.
 *
 * This component is the top-level coordinator for Phase 3 operation output. It:
 * 1. Collects all clients from the SDK context
 * 2. Traverses the client hierarchy to group operations by their operation
 *    group path (derived from nested client names)
 * 3. Renders each group as an `api/{group}/operations.ts` source file
 *
 * The generated file structure follows the legacy emitter's convention:
 * ```
 * api/
 *   operations.ts           // Root-level operations (no group)
 *   users/
 *     operations.ts         // Operations in the "users" group
 *   users/
 *     profiles/
 *       operations.ts       // Operations in the "users/profiles" group
 * ```
 *
 * Each operations file contains, per operation:
 * - `_xxxSend` function (request builder)
 * - `_xxxDeserialize` function (response processor)
 * - `xxx` function (public API that composes send + deserialize)
 *
 * The `XxxOptionalParams` interfaces are rendered in a separate `options.ts`
 * file by the {@link OperationOptionsFiles} component.
 *
 * If no operations exist in the SDK package, the component renders nothing.
 *
 * @returns An Alloy JSX tree containing the `api/` directory with operation
 *          files, or `undefined` if no operations need to be emitted.
 */
export function OperationFiles() {
  const { clients } = useSdkContext();

  const groups = collectOperationGroups(clients);

  if (groups.length === 0) {
    return undefined;
  }

  return (
      <For each={groups}>{(group) => <OperationGroupFile group={group} />}</For>
  );
}

/**
 * Props for the {@link OperationGroupFile} component.
 */
interface OperationGroupFileProps {
  /** The operation group to render as a source file. */
  group: OperationGroup;
}

/**
 * Renders a single operations file for an operation group.
 *
 * For root-level operations (empty prefix), the file is `operations.ts`
 * directly under `api/`. For grouped operations, the content is registered
 * with the {@link GroupDirectoryProvider} so that a single SourceDirectory
 * is shared with other components contributing files to the same group path.
 *
 * Each operation renders four declarations in order:
 * 1. `OperationOptionsDeclaration` — the options interface
 * 2. `SendOperation` — the private send function
 * 3. `DeserializeOperation` — the private deserialize function
 * 4. `PublicOperation` — the public API function
 *
 * @param props - Component props containing the operation group.
 * @returns An Alloy JSX tree for the operations source file, or `undefined`
 *          when the content is registered with the group directory provider.
 */
function OperationGroupFile(props: OperationGroupFileProps) {
  const { group } = props;

  const operationsFile = <SourceFile path="operations.ts">
        <For each={group.operations} doubleHardline>
          {(method) => (
            <OperationDeclarations
              method={method}
              rootClient={group.rootClient}
            />
          )}
        </For>
      </SourceFile>;

  if (group.prefixPath) {
    const { registerContent } = useGroupDirectory();
    registerContent(group.prefixPath, () => (
      operationsFile
    ));
    return undefined;
  }

  return operationsFile;
}

/**
 * Props for the {@link OperationDeclarations} component.
 */
interface OperationDeclarationsProps {
  /** The TCGC service method to render all declarations for. */
  method: SdkServiceMethod<SdkHttpOperation>;
  /** The root-level client entity, used for the context type reference. */
  rootClient: SdkClientType<SdkHttpOperation>;
}

/**
 * Renders all four declarations for a single operation.
 *
 * The declarations are rendered in the legacy emitter's order:
 * 1. Send function — builds and dispatches the HTTP request
 * 2. Header deserialize functions (if enabled) — extract typed response headers
 * 3. Deserialize function — validates and parses the response
 * 4. Public function — composes send + deserialize for consumers
 *
 * Note: The options interface (`XxxOptionalParams`) is rendered in a separate
 * `options.ts` file by the {@link OperationOptionsFiles} component.
 *
 * Each declaration is separated by a blank line (via Fragment + newlines)
 * to produce readable output.
 *
 * @param props - Component props containing the TCGC service method.
 * @returns An Alloy JSX tree with all operation declarations.
 */
function OperationDeclarations(props: OperationDeclarationsProps) {
  const { method, rootClient } = props;

  return (
    <>
      <SendOperation method={method} rootClient={rootClient} />
      {"\n\n"}
      <HeaderDeserializationBlock method={method} rootClient={rootClient} />
      <DeserializeOperation method={method} />
      {"\n\n"}
      <PublicOperation method={method} rootClient={rootClient} />
    </>
  );
}

/**
 * Renders header deserialization functions (success + exception) with trailing
 * newline separators, or nothing when headers are not applicable.
 *
 * This wrapper ensures proper spacing: each header function is followed by `\n\n`
 * so there's a blank line between it and the next function. When the header
 * components return undefined (feature disabled or no headers), nothing is
 * rendered and no extra blank lines are produced.
 *
 * @param props - Component props containing the TCGC service method.
 * @returns Alloy JSX with header functions and separators, or undefined.
 */
function HeaderDeserializationBlock(props: OperationDeclarationsProps) {
  const { method } = props;
  const { includeHeadersInResponse } = useEmitterOptions();

  if (!includeHeadersInResponse) return undefined;

  const operation = method.operation;
  const hasSuccessHeaders = operation.responses.some(
    (r) => r.headers.length > 0,
  );
  const hasExceptionHeaders = operation.exceptions.some(
    (e) => e.headers.length > 0,
  );

  if (!hasSuccessHeaders && !hasExceptionHeaders) return undefined;

  return (
    <>
      {hasSuccessHeaders && (
        <>
          <DeserializeHeaders method={method} />
          {"\n\n"}
        </>
      )}
      {hasExceptionHeaders && (
        <>
          <DeserializeExceptionHeaders method={method} />
          {"\n\n"}
        </>
      )}
    </>
  );
}

