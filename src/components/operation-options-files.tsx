import { For } from "@alloy-js/core";
import { BarrelFile, SourceFile } from "@alloy-js/typescript";
import { useSdkContext } from "../context/sdk-context.js";
import { useGroupDirectory } from "../context/group-directory-context.js";
import { OperationOptionsDeclaration } from "./operation-options.js";
import {
  collectOperationGroups,
  type OperationGroup,
} from "../utils/operation-groups.js";

/**
 * Orchestrator component that generates `options.ts` files per operation group.
 *
 * The legacy emitter places operation options interfaces (e.g., `GetUserOptionalParams`)
 * in separate `api/{group}/options.ts` files rather than inside `operations.ts`.
 * This component mirrors that structure: one `options.ts` per operation group,
 * each containing all `XxxOptionalParams` interfaces for that group's operations.
 *
 * The generated file structure follows the legacy emitter's convention:
 * ```
 * api/
 *   options.ts                // Root-level operation options
 *   users/
 *     options.ts              // Options for the "users" group
 * ```
 *
 * The options interfaces use the same refkeys as when they were inline in
 * `operations.ts`, so Alloy automatically generates import statements in
 * `operations.ts` pointing to `options.ts`.
 *
 * @returns An Alloy JSX tree containing the `api/` directory with options files,
 *          or `undefined` if no operations exist.
 */
export function OperationOptionsFiles() {
  const { clients } = useSdkContext();

  const groups = collectOperationGroups(clients);

  if (groups.length === 0) {
    return undefined;
  }

  return (
    <>
      <BarrelFile />
      <For each={groups}>
        {(group) => <OperationOptionsGroupFile group={group} />}
      </For>
    </>
  );
}

/**
 * Props for the {@link OperationOptionsGroupFile} component.
 */
interface OperationOptionsGroupFileProps {
  /** The operation group whose options interfaces to render. */
  group: OperationGroup;
}

/**
 * Renders a single `options.ts` file for an operation group.
 *
 * For root-level operations (empty prefix), the file is `options.ts`
 * directly under `api/`. For grouped operations, the content is registered
 * with the {@link GroupDirectoryProvider} so that a single SourceDirectory
 * is shared with other components contributing files to the same group path.
 *
 * Each operation in the group gets one `XxxOptionalParams` interface,
 * separated by blank lines.
 *
 * @param props - Component props containing the operation group.
 * @returns An Alloy JSX tree for the options source file, or `undefined`
 *          when the content is registered with the group directory provider.
 */
function OperationOptionsGroupFile(props: OperationOptionsGroupFileProps) {
  const { group } = props;

  const operationOptionsFile = (
    <SourceFile path="options.ts">
      <For each={group.operations} doubleHardline>
        {(method) => (
          <OperationOptionsDeclaration
            method={method}
            prefixes={group.prefixes}
          />
        )}
      </For>
    </SourceFile>
  );

  if (group.prefixPath) {
    const { registerContent } = useGroupDirectory();
    registerContent(group.prefixPath, () => operationOptionsFile);
    return undefined;
  }

  return operationOptionsFile;
}
