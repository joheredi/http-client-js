import {
  createNamedContext,
  For,
  shallowReactive,
  SourceDirectory,
  useContext,
  type Children,
  type ComponentContext,
} from "@alloy-js/core";
import { BarrelFile } from "@alloy-js/typescript";

/**
 * Represents a registered file to be rendered inside a group directory.
 */
interface GroupFileRegistration {
  /** Render callback invoked inside the SourceDirectory scope. */
  render: () => Children;
}

/**
 * Tracks all registered files for a single group directory path.
 */
interface GroupDirectoryEntry {
  /** The directory path (e.g., "users", "users/profiles"). */
  path: string;
  /** Reactive array of file registrations. */
  files: GroupFileRegistration[];
}

/**
 * Context value exposed to child components for registering content
 * into shared group directories.
 */
interface GroupDirectoryContextValue {
  /**
   * Registers a render callback to be invoked inside the SourceDirectory
   * for the given prefix path. Multiple components can register content
   * for the same path — all callbacks will be rendered as siblings inside
   * a single SourceDirectory.
   *
   * @param prefixPath - The operation group path (e.g., "users").
   * @param render - A callback that returns JSX to render inside the directory.
   *                 Called within the SourceDirectory's scope, so SourceFile
   *                 children will have correct context for import resolution.
   */
  registerContent(prefixPath: string, render: () => Children): void;
}

const GroupDirectoryCtx: ComponentContext<GroupDirectoryContextValue> =
  createNamedContext("GroupDirectoryContext");

/**
 * Hook to access the group directory registration context.
 *
 * Components call `registerContent(prefixPath, renderFn)` to contribute
 * files to a shared SourceDirectory for the given group path instead of
 * creating their own SourceDirectory.
 *
 * @returns The group directory context value.
 * @throws If called outside a GroupDirectoryProvider.
 */
export function useGroupDirectory(): GroupDirectoryContextValue {
  const ctx = useContext(GroupDirectoryCtx);
  if (!ctx) {
    throw new Error(
      "useGroupDirectory() must be used within a <GroupDirectoryProvider>",
    );
  }
  return ctx;
}

/**
 * Props for the {@link GroupDirectoryProvider} component.
 */
interface GroupDirectoryProviderProps {
  /** Child components that will register content via the context. */
  children?: Children;
}

/**
 * Provider component that coordinates multiple components contributing files
 * to shared operation group directories.
 *
 * Instead of each component creating its own `<SourceDirectory>` for the same
 * group path (which causes duplicate scope contexts in Alloy), this provider
 * creates a single SourceDirectory per unique path. Child components register
 * their content via render callbacks through the context.
 *
 * **Rendering order:** `{props.children}` renders first (synchronously), during
 * which child components call `registerContent()` to populate the reactive
 * arrays. Then the `<For>` iterates the populated entries to render
 * SourceDirectories with all registered content.
 *
 * Each group directory includes a `<BarrelFile />` for re-exports.
 *
 * @example
 * ```tsx
 * <GroupDirectoryProvider>
 *   <OperationFiles />        // calls registerContent("users", () => <SourceFile ...>)
 *   <OperationOptionsFiles /> // calls registerContent("users", () => <SourceFile ...>)
 * </GroupDirectoryProvider>
 * // Renders a single <SourceDirectory path="users"> with both files inside
 * ```
 */
export function GroupDirectoryProvider(props: GroupDirectoryProviderProps) {
  const directoryMap = new Map<string, GroupDirectoryEntry>();
  const entries = shallowReactive<GroupDirectoryEntry[]>([]);

  function registerContent(prefixPath: string, render: () => Children): void {
    let entry = directoryMap.get(prefixPath);
    if (!entry) {
      entry = {
        path: prefixPath,
        files: shallowReactive<GroupFileRegistration[]>([]),
      };
      directoryMap.set(prefixPath, entry);
      entries.push(entry);
    }
    entry.files.push({ render });
  }

  const contextValue: GroupDirectoryContextValue = { registerContent };

  return (
    <GroupDirectoryCtx.Provider value={contextValue}>
      {props.children}
      <SourceDirectory path="groups">
        <For each={entries}>
          {(entry) => (
            <SourceDirectory path={entry.path}>
              <For each={entry.files}>{(file) => file.render()}</For>
              <BarrelFile />
            </SourceDirectory>
          )}
        </For>
      </SourceDirectory>
    </GroupDirectoryCtx.Provider>
  );
}
