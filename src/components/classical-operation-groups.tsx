import { Children, code, For, SourceDirectory } from "@alloy-js/core";
import {
  BarrelFile,
  FunctionDeclaration,
  InterfaceDeclaration,
  InterfaceMember,
  type ParameterDescriptor,
  SourceFile,
} from "@alloy-js/typescript";
import type {
  SdkClientType,
  SdkHttpOperation,
  SdkLroPagingServiceMethod,
  SdkLroServiceMethod,
  SdkPagingServiceMethod,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import { useFlavorContext } from "../context/flavor-context.js";
import { azureCoreLroLib } from "../utils/external-packages.js";
import {
  clientContextRefkey,
  operationGroupFactoryRefkey,
  operationGroupInterfaceRefkey,
  operationOptionsRefkey,
  pagingHelperRefkey,
  publicOperationRefkey,
} from "../utils/refkeys.js";
import { getPagingItemType } from "./public-operation.js";
import { getTypeExpression } from "./type-expression.js";
import {
  getOptionsParamName,
  isRequiredSignatureParameter,
} from "./send-operation.js";

/**
 * Represents a child client (operation group) along with its accumulated
 * prefix path from the root client and a reference to the root client.
 *
 * The prefix path determines the file location under `classic/` and the
 * interface/factory naming. For example, a child client `Widgets` nested
 * under the root has prefixes `["widgets"]`, producing:
 * - File: `classic/widgets/index.ts`
 * - Interface: `WidgetsOperations`
 * - Factory: `_getWidgetsOperations`
 */
interface OperationGroupInfo {
  /** The TCGC child client representing this operation group. */
  client: SdkClientType<SdkHttpOperation>;
  /** Accumulated path of camelCase group names from root to this group. */
  prefixes: string[];
  /** The root-level client, used for the context type reference. */
  rootClient: SdkClientType<SdkHttpOperation>;
}

/**
 * Props for the {@link ClassicalOperationGroupFiles} component.
 */
export interface ClassicalOperationGroupFilesProps {
  /** The root-level TCGC client whose child clients should be rendered. */
  client: SdkClientType<SdkHttpOperation>;
}

/**
 * Orchestrator component that generates all classical operation group files.
 *
 * This component traverses the client hierarchy using BFS and generates a
 * `classic/{path}/index.ts` file for each child client (operation group).
 * Each file contains:
 * - An `XxxOperations` interface with method signatures and nested group refs
 * - A `_getXxxOperations` factory function that binds methods to the context
 *
 * The generated file structure follows the legacy emitter's convention:
 * ```
 * classic/
 *   widgets/
 *     index.ts              # WidgetsOperations + _getWidgetsOperations
 *     parts/
 *       index.ts            # PartsOperations + _getPartsOperations
 * ```
 *
 * If the client has no child clients (operation groups), renders nothing.
 *
 * @param props - The component props containing the root TCGC client type.
 * @returns An Alloy JSX tree with the `classic/` directory structure,
 *          or `undefined` if no operation groups exist.
 */
export function ClassicalOperationGroupFiles(
  props: ClassicalOperationGroupFilesProps,
) {
  const groups = collectOperationGroups(props.client);

  if (groups.length === 0) {
    return undefined;
  }

  return (
    <SourceDirectory path="classic">
      <BarrelFile />
      <For each={groups}>
        {(group) => <ClassicalOperationGroupFile group={group} />}
      </For>
    </SourceDirectory>
  );
}

/**
 * Props for the {@link ClassicalOperationGroupFile} component.
 */
interface ClassicalOperationGroupFileProps {
  /** The operation group info containing the client, prefixes, and root client. */
  group: OperationGroupInfo;
}

/**
 * Renders a single operation group file (`classic/{path}/index.ts`).
 *
 * Each file contains the operations interface and factory function for
 * one level of the client hierarchy. The file path is derived from the
 * accumulated prefixes (e.g., `["widgets", "parts"]` → `widgets/parts/index.ts`).
 *
 * Uses nested `<SourceDirectory>` components for each prefix instead of
 * putting slashes in the SourceFile path. This is required because Alloy
 * computes relative import paths from the nearest parent SourceDirectory,
 * not from slashes in the SourceFile path. Using `<SourceFile path="widgets/index.ts">`
 * would cause imports to be off by one directory level.
 *
 * @param props - Component props containing the operation group info.
 * @returns An Alloy JSX tree for the operation group source file.
 */
function ClassicalOperationGroupFile(props: ClassicalOperationGroupFileProps) {
  const { group } = props;

  const fileContent: Children = (
    <SourceFile path="index.ts">
      <OperationGroupInterface group={group} />
      {"\n\n"}
      <OperationGroupFactory group={group} />
    </SourceFile>
  );

  // Wrap in nested SourceDirectories from innermost to outermost.
  // e.g., prefixes ["widgets", "parts"] produces:
  //   <SourceDirectory path="widgets">
  //     <SourceDirectory path="parts">
  //       <SourceFile path="index.ts">...
  return group.prefixes.reduceRight<Children>(
    (content, prefix) => (
      <SourceDirectory path={prefix}>{content}</SourceDirectory>
    ),
    fileContent,
  );
}

/**
 * Props for the {@link OperationGroupInterface} component.
 */
export interface OperationGroupInterfaceProps {
  /** The operation group info. */
  group: OperationGroupInfo;
}

/**
 * Renders the `XxxOperations` interface for an operation group.
 *
 * The interface defines the shape of the operation group object returned
 * by the factory function. It contains:
 * - Method signatures for each operation in the group
 * - Property references to nested child operation group interfaces
 *
 * Example output:
 * ```typescript
 * export interface WidgetsOperations {
 *   getWidget: (id: string, options?: GetWidgetOptionalParams) => Promise<Widget>;
 *   parts: PartsOperations;
 * }
 * ```
 *
 * @param props - Component props containing the operation group info.
 * @returns An Alloy JSX tree for the interface declaration.
 */
export function OperationGroupInterface(props: OperationGroupInterfaceProps) {
  const { group } = props;
  const interfaceName = buildInterfaceName(group.client);
  const methods = group.client.methods;
  const children = group.client.children ?? [];

  return (
    <InterfaceDeclaration
      name={interfaceName}
      refkey={operationGroupInterfaceRefkey(group.client)}
      export
    >
      <For each={methods} enderPunctuation>
        {(method) => <OperationMethodMember method={method} />}
      </For>
      {children.length > 0 && methods.length > 0 && "\n"}
      <For each={children} enderPunctuation>
        {(child) => (
          <InterfaceMember
            name={camelCase(child.name)}
            type={operationGroupInterfaceRefkey(child)}
          />
        )}
      </For>
    </InterfaceDeclaration>
  );
}

/**
 * Props for the {@link OperationMethodMember} component.
 */
interface OperationMethodMemberProps {
  /** The TCGC service method to render as an interface member. */
  method: SdkServiceMethod<SdkHttpOperation>;
}

/**
 * Renders a single operation method signature as an interface member.
 *
 * The method signature follows the classical client pattern:
 * `methodName: (params..., options?) => ReturnType`
 *
 * The method does NOT include a `context` parameter — that is bound
 * by the factory function's closure.
 *
 * @param props - Component props containing the TCGC service method.
 * @returns An Alloy JSX tree for the interface member.
 */
function OperationMethodMember(props: OperationMethodMemberProps) {
  const { method } = props;
  const paramList = buildMethodParamList(method);
  const returnType = getMethodReturnType(method);

  return (
    <InterfaceMember
      name={method.name}
      type={code`(${paramList}) => ${returnType}`}
    />
  );
}

/**
 * Props for the {@link OperationGroupFactory} component.
 */
export interface OperationGroupFactoryProps {
  /** The operation group info. */
  group: OperationGroupInfo;
}

/**
 * Renders the `_getXxxOperations` factory function for an operation group.
 *
 * The factory function takes the client context as a parameter and returns
 * an object implementing the operations interface. Each operation method
 * in the returned object is a closure that delegates to the corresponding
 * public API function, binding the context as the first argument.
 *
 * Nested operation groups are composed by calling their own factory functions.
 *
 * Example output:
 * ```typescript
 * export function _getWidgetsOperations(
 *   context: TestingContext,
 * ): WidgetsOperations {
 *   return {
 *     getWidget: (id, options) => getWidget(context, id, options),
 *     parts: _getPartsOperations(context),
 *   };
 * }
 * ```
 *
 * @param props - Component props containing the operation group info.
 * @returns An Alloy JSX tree for the factory function declaration.
 */
export function OperationGroupFactory(props: OperationGroupFactoryProps) {
  const { group } = props;
  const functionName = buildFactoryName(group.client);
  const methods = group.client.methods;
  const children = group.client.children ?? [];

  const parameters: ParameterDescriptor[] = [
    { name: "context", type: clientContextRefkey(group.rootClient) },
  ];

  const returnType = operationGroupInterfaceRefkey(group.client);

  return (
    <FunctionDeclaration
      name={functionName}
      refkey={operationGroupFactoryRefkey(group.client)}
      export
      returnType={returnType}
      parameters={parameters}
    >
      {code`return {`}
      {"\n"}
      <For each={buildFactoryEntries(methods, children)} comma hardline>
        {(entry) => entry}
      </For>
      {"\n"}
      {code`};`}
    </FunctionDeclaration>
  );
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Builds the interface name for an operation group.
 *
 * The interface name is the child client's name with "Operations" appended.
 * For example, `Widgets` → `WidgetsOperations`.
 *
 * @param client - The TCGC child client representing the operation group.
 * @returns The interface name string.
 */
function buildInterfaceName(client: SdkClientType<SdkHttpOperation>): string {
  return `${client.name}Operations`;
}

/**
 * Builds the factory function name for an operation group.
 *
 * The factory function name follows the legacy convention:
 * `_get{ClientName}Operations`. For example, `Widgets` → `_getWidgetsOperations`.
 *
 * @param client - The TCGC child client representing the operation group.
 * @returns The factory function name string.
 */
function buildFactoryName(client: SdkClientType<SdkHttpOperation>): string {
  return `_get${client.name}Operations`;
}

/**
 * Builds the parameter list string for a method signature in the interface.
 *
 * Includes required parameters (path, body) and the optional options bag.
 * Does NOT include the `context` parameter since that is bound by the factory.
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the comma-separated parameter list.
 */
function buildMethodParamList(
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  const parts: Children[] = [];

  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param, method)) {
      parts.push(code`${param.name}: ${getTypeExpression(param.type)}`);
    }
  }

  parts.push(code`options?: ${operationOptionsRefkey(method)}`);

  // Use <For> with joiner instead of .join() — Alloy Children objects
  // are not strings, so .join() would produce [object Object].
  return (
    <For each={parts} joiner=", ">
      {(part) => part}
    </For>
  );
}

/**
 * Computes the return type for an operation method in the interface.
 *
 * The return type matches the public operation function's return type:
 * - Basic operations: `Promise<T>` (or `Promise<void>`)
 * - Paging operations (azure flavor): `PagedAsyncIterableIterator<T>`
 * - LRO operations (azure flavor): `PollerLike<OperationState<T>, T>`
 * - LRO+Paging operations (azure flavor): `PagedAsyncIterableIterator<T>`
 * - Core flavor: always `Promise<T>` regardless of method kind
 *
 * @param method - The TCGC service method.
 * @returns Alloy Children representing the return type expression.
 */
function getMethodReturnType(
  method: SdkServiceMethod<SdkHttpOperation>,
): Children {
  const { flavor } = useFlavorContext();

  // Azure flavor supports paging and LRO-specific return types
  if (flavor !== "core") {
    if (method.kind === "paging" || method.kind === "lropaging") {
      const innerType = getPagingItemType(
        method as
          | SdkPagingServiceMethod<SdkHttpOperation>
          | SdkLroPagingServiceMethod<SdkHttpOperation>,
      );
      return code`${pagingHelperRefkey("PagedAsyncIterableIterator")}<${innerType}>`;
    }
    if (method.kind === "lro") {
      const responseType = method.response.type;
      const innerType = responseType ? getTypeExpression(responseType) : "void";
      return code`${azureCoreLroLib.PollerLike}<${azureCoreLroLib.OperationState}<${innerType}>, ${innerType}>`;
    }
  }

  // Basic operations and core flavor: Promise<T>
  const responseType = method.response.type;
  const innerType = responseType ? getTypeExpression(responseType) : "void";
  return code`Promise<${innerType}>`;
}

/**
 * Builds the factory function body entries for methods and nested groups.
 *
 * Creates Children entries for the return object literal:
 * - Methods: `methodName: (params) => publicFunc(context, params)`
 * - Nested groups: `childName: _getChildOperations(context)`
 *
 * @param methods - The service methods on this operation group.
 * @param children - The nested child clients (sub-groups).
 * @returns An array of Children entries for the object literal.
 */
function buildFactoryEntries(
  methods: readonly SdkServiceMethod<SdkHttpOperation>[],
  children: readonly SdkClientType<SdkHttpOperation>[],
): Children[] {
  const entries: Children[] = [];

  for (const method of methods) {
    const argList = buildDelegateArgList(method);
    entries.push(
      code`${method.name}: (${buildFactoryParamList(method)}) => ${publicOperationRefkey(method)}(context, ${argList})`,
    );
  }

  for (const child of children) {
    entries.push(
      code`${camelCase(child.name)}: ${operationGroupFactoryRefkey(child)}(context)`,
    );
  }

  return entries;
}

/**
 * Builds the parameter names list for a method closure in the factory.
 *
 * Only includes the parameter names (not types), since the types are
 * inferred from the interface definition.
 *
 * @param method - The TCGC service method.
 * @returns A comma-separated string of parameter names.
 */
function buildFactoryParamList(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const params: string[] = [];

  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param, method)) {
      params.push(param.name);
    }
  }

  params.push(getOptionsParamName(method));
  return params.join(", ");
}

/**
 * Builds the argument list for delegating to the public API function.
 *
 * Constructs the comma-separated arguments that follow `context` in
 * the delegation call.
 *
 * @param method - The TCGC service method.
 * @returns A comma-separated string of argument names (excluding context).
 */
function buildDelegateArgList(
  method: SdkServiceMethod<SdkHttpOperation>,
): string {
  const args: string[] = [];

  for (const param of method.parameters) {
    if (isRequiredSignatureParameter(param, method)) {
      args.push(param.name);
    }
  }

  args.push(getOptionsParamName(method));
  return args.join(", ");
}

/**
 * Collects all operation groups from the client hierarchy using BFS traversal.
 *
 * Walks the tree of child clients starting from the root and accumulates
 * the prefix path for each group. Only child clients are included —
 * the root client itself is NOT included (its methods are handled by
 * the classical client class directly).
 *
 * @param rootClient - The root-level TCGC client.
 * @returns An array of OperationGroupInfo objects, one per child client.
 */
function collectOperationGroups(
  rootClient: SdkClientType<SdkHttpOperation>,
): OperationGroupInfo[] {
  const groups: OperationGroupInfo[] = [];
  const queue: [string[], SdkClientType<SdkHttpOperation>][] = [];

  // Enqueue direct children of root
  if (rootClient.children) {
    for (const child of rootClient.children) {
      queue.push([[camelCase(child.name)], child]);
    }
  }

  while (queue.length > 0) {
    const [prefixes, client] = queue.shift()!;

    groups.push({ client, prefixes, rootClient });

    // Enqueue grandchildren with extended prefix
    if (client.children) {
      for (const child of client.children) {
        queue.push([[...prefixes, camelCase(child.name)], child]);
      }
    }
  }

  return groups;
}

/**
 * Converts a PascalCase name to camelCase by lowercasing the first character.
 *
 * Used for generating property names and directory paths from client names.
 * For example, `Widgets` → `widgets`, `ProfileSettings` → `profileSettings`.
 *
 * @param name - The PascalCase name to convert.
 * @returns The camelCase version of the name.
 */
function camelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}
