import { code } from "@alloy-js/core";
import { FunctionDeclaration, SourceFile } from "@alloy-js/typescript";
import { urlTemplateHelperRefkey } from "../../utils/refkeys.js";

/**
 * Renders the `static-helpers/urlTemplate.ts` source file containing
 * the RFC 6570 URI Template expansion implementation.
 *
 * The legacy emitter emits `expandUrlTemplate` as a static helper that
 * gets copied into the generated project. This function does NOT exist
 * in `@typespec/ts-http-runtime`, so it must be emitted as part of the
 * generated code.
 *
 * The implementation supports the full RFC 6570 spec including:
 * - Expression operators: `+`, `#`, `.`, `/`, `;`, `?`, `&`
 * - Variable modifiers: `:` (prefix) and `*` (explode)
 * - Value types: strings, numbers, booleans, arrays, objects
 * - Reserved character encoding control via `allowReserved` option
 *
 * The `expandUrlTemplate` function is registered with a
 * `urlTemplateHelperRefkey` so send-operation components can reference
 * it via refkey and Alloy auto-generates import statements.
 *
 * @returns An Alloy JSX tree for the URL template helpers source file.
 */
export function UrlTemplateHelpersFile() {
  return (
    <SourceFile path="static-helpers/urlTemplate.ts">
      <UrlTemplateInternalHelpers />
      {"\n\n"}
      <ExpandUrlTemplate />
      {"\n\n"}
      <NormalizeUnreserved />
    </SourceFile>
  );
}

/**
 * Renders all internal (non-exported) helper functions and types used by
 * `expandUrlTemplate`. These are private to the file — they support the
 * RFC 6570 expansion logic but are not referenced from outside.
 */
function UrlTemplateInternalHelpers() {
  return code`
interface ValueOptions {
  isFirst: boolean;
  op?: string;
  varValue?: any;
  varName?: string;
  modifier?: string;
  reserved?: boolean;
}

export interface UrlTemplateOptions {
  allowReserved?: boolean;
}

function encodeComponent(val: string, reserved?: boolean, op?: string): string {
  return (reserved ?? op === "+") || op === "#"
    ? encodeReservedComponent(val)
    : encodeRFC3986URIComponent(val);
}

function encodeReservedComponent(str: string): string {
  return str
    .split(/(%[0-9A-Fa-f]{2})/g)
    .map((part) => (!/%[0-9A-Fa-f]/.test(part) ? encodeURI(part) : part))
    .join("");
}

function encodeRFC3986URIComponent(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => \`%\${c.charCodeAt(0).toString(16).toUpperCase()}\`
  );
}

function isDefined(val: any): boolean {
  return val !== undefined && val !== null;
}

function getNamedAndIfEmpty(op?: string): [boolean, string] {
  return [
    !!op && [";", "?", "&"].includes(op),
    !!op && ["?", "&"].includes(op) ? "=" : ""
  ];
}

function getFirstOrSep(op?: string, isFirst = false): string {
  if (isFirst) {
    return !op || op === "+" ? "" : op;
  } else if (!op || op === "+" || op === "#") {
    return ",";
  } else if (op === "?") {
    return "&";
  } else {
    return op;
  }
}

function getExpandedValue(option: ValueOptions): string {
  let isFirst = option.isFirst;
  const { op, varName, varValue: value, reserved } = option;
  const vals: string[] = [];
  const [named, ifEmpty] = getNamedAndIfEmpty(op);

  if (Array.isArray(value)) {
    for (const val of value.filter(isDefined)) {
      vals.push(\`\${getFirstOrSep(op, isFirst)}\`);
      if (named && varName) {
        vals.push(\`\${encodeURIComponent(varName)}\`);
        if (val === "") {
          vals.push(ifEmpty);
        } else {
          vals.push("=");
        }
      }
      vals.push(encodeComponent(val, reserved, op));
      isFirst = false;
    }
  } else if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      const val = value[key];
      if (!isDefined(val)) {
        continue;
      }
      vals.push(\`\${getFirstOrSep(op, isFirst)}\`);
      if (key) {
        vals.push(\`\${encodeURIComponent(key)}\`);
        if (named && val === "") {
          vals.push(ifEmpty);
        } else {
          vals.push("=");
        }
      }
      vals.push(encodeComponent(val, reserved, op));
      isFirst = false;
    }
  }
  return vals.join("");
}

function getNonExpandedValue(option: ValueOptions): string | undefined {
  const { op, varName, varValue: value, isFirst, reserved } = option;
  const vals: string[] = [];
  const first = getFirstOrSep(op, isFirst);
  const [named, ifEmpty] = getNamedAndIfEmpty(op);
  if (named && varName) {
    vals.push(encodeComponent(varName, reserved, op));
    if (value === "") {
      if (!ifEmpty) {
        vals.push(ifEmpty);
      }
      return !vals.join("") ? undefined : \`\${first}\${vals.join("")}\`;
    }
    vals.push("=");
  }

  const items = [];
  if (Array.isArray(value)) {
    for (const val of value.filter(isDefined)) {
      items.push(encodeComponent(val, reserved, op));
    }
  } else if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (!isDefined(value[key])) {
        continue;
      }
      items.push(encodeRFC3986URIComponent(key));
      items.push(encodeComponent(value[key], reserved, op));
    }
  }
  vals.push(items.join(","));
  return !vals.join(",") ? undefined : \`\${first}\${vals.join("")}\`;
}

function getVarValue(option: ValueOptions): string | undefined {
  const { op, varName, modifier, isFirst, reserved, varValue: value } = option;

  if (!isDefined(value)) {
    return undefined;
  } else if (["string", "number", "boolean"].includes(typeof value)) {
    let val = value.toString();
    const [named, ifEmpty] = getNamedAndIfEmpty(op);
    const vals: string[] = [getFirstOrSep(op, isFirst)];
    if (named && varName) {
      vals.push(varName);
      if (val === "") {
        vals.push(ifEmpty);
      } else {
        vals.push("=");
      }
    }
    if (modifier && modifier !== "*") {
      val = val.substring(0, parseInt(modifier, 10));
    }
    vals.push(encodeComponent(val, reserved, op));
    return vals.join("");
  } else if (modifier === "*") {
    return getExpandedValue(option);
  } else {
    return getNonExpandedValue(option);
  }
}`;
}

/**
 * Renders the exported `expandUrlTemplate` function, which is the main
 * entry point for RFC 6570 URI Template expansion.
 *
 * This function is registered with a refkey so that send-operation
 * components can reference it, and Alloy auto-generates the import.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6570
 */
function ExpandUrlTemplate() {
  return (
    <FunctionDeclaration
      name="expandUrlTemplate"
      refkey={urlTemplateHelperRefkey("expandUrlTemplate")}
      export
      returnType="string"
      parameters={[
        { name: "template", type: "string" },
        { name: "context", type: code`Record<string, any>` },
        { name: "option", type: "UrlTemplateOptions", optional: true },
      ]}
    >
      {code`const result = template.replace(/\\{([^{}]+)\\}|([^{}]+)/g, (_, expr, text) => {
  if (!expr) {
    return encodeReservedComponent(text);
  }
  let op;
  if (["+", "#", ".", "/", ";", "?", "&"].includes(expr[0])) {
    op = expr[0];
    expr = expr.slice(1);
  }
  const varList = expr.split(/,/g);
  const innerResult = [];
  for (const varSpec of varList) {
    const varMatch = /([^:*]*)(?::(\\d+)|(\\*))?/.exec(varSpec);
    if (!varMatch || !varMatch[1]) {
      continue;
    }
    const varValue = getVarValue({
      isFirst: innerResult.length === 0,
      op,
      varValue: context[varMatch[1]],
      varName: varMatch[1],
      modifier: varMatch[2] || varMatch[3],
      reserved: option?.allowReserved
    });
    if (varValue) {
      innerResult.push(varValue);
    }
  }
  return innerResult.join("");
});

return normalizeUnreserved(result);`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `normalizeUnreserved` helper that decodes percent-encoded
 * unreserved characters (RFC 3986: `-`, `.`, `~`) after template expansion.
 */
function NormalizeUnreserved() {
  return code`function normalizeUnreserved(uri: string): string {
  return uri.replace(/%([0-9A-Fa-f]{2})/g, (match, hex) => {
    const char = String.fromCharCode(parseInt(hex, 16));
    if (/[.~-]/.test(char)) {
      return char;
    }
    return match;
  });
}`;
}
