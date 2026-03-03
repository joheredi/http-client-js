import { code, namekey } from "@alloy-js/core";
import {
  FunctionDeclaration,
  InterfaceDeclaration,
  InterfaceMember,
  SourceFile,
  TypeDeclaration,
} from "@alloy-js/typescript";
import { serializationHelperRefkey } from "../../utils/refkeys.js";

/**
 * Renders the `helpers/xmlHelpers.ts` source file containing shared type
 * interfaces and utility functions used by XML serializers and deserializers.
 *
 * These are static helpers — they don't depend on TCGC data or any specific
 * service definition. They provide:
 * - `XmlSerializationOptions`: Element/attribute descriptor for XML properties
 * - `XmlPropertyMetadata`: Serialization metadata for each model property
 * - `XmlPropertyDeserializeMetadata`: Deserialization metadata for each model property
 * - `XmlSerializedObject`: Return type for object-level serializers
 * - `serializeToXml`: Converts a model to an XML string using metadata arrays
 * - `deserializeFromXml`: Parses an XML string into a typed model using metadata
 * - `deserializeXmlObject`: Converts a pre-parsed XML object into a typed model
 *
 * Each function/type is registered with a `serializationHelperRefkey` so other
 * components (XML serializers, XML deserializers) can reference them via refkey
 * and Alloy auto-generates import statements.
 *
 * @returns An Alloy JSX tree for the XML helpers source file.
 */
export function XmlHelpersFile() {
  return (
    <SourceFile path="static-helpers/xmlHelpers.ts">
      <XmlSerializationOptionsInterface />
      {"\n\n"}
      <XmlPropertyMetadataInterface />
      {"\n\n"}
      <XmlPropertyDeserializeMetadataInterface />
      {"\n\n"}
      <XmlSerializedObjectType />
      {"\n\n"}
      <SerializeToXmlFunction />
      {"\n\n"}
      <DeserializeFromXmlFunction />
      {"\n\n"}
      <DeserializeXmlObjectFunction />
      {"\n\n"}
      <IsXmlContentTypeFunction />
    </SourceFile>
  );
}

/**
 * Renders the `XmlSerializationOptions` interface that describes how a
 * property maps to XML elements or attributes.
 *
 * This is the core descriptor used in metadata arrays to control
 * XML element naming, attribute serialization, namespace prefixes,
 * and array wrapping behavior.
 */
function XmlSerializationOptionsInterface() {
  return (
    <InterfaceDeclaration
      name="XmlSerializationOptions"
      refkey={serializationHelperRefkey("XmlSerializationOptions")}
      export
    >
      <InterfaceMember name="name" type="string" />
      {code`;\n`}
      <InterfaceMember name="attribute" type="boolean" optional />
      {code`;\n`}
      <InterfaceMember
        name="ns"
        type={code`{ namespace: string; prefix: string }`}
        optional
      />
      {code`;\n`}
      <InterfaceMember name="unwrapped" type="boolean" optional />
      {code`;\n`}
      <InterfaceMember name="itemsName" type="string" optional />
      {code`;\n`}
      <InterfaceMember
        name="itemsNs"
        type={code`{ namespace: string; prefix: string }`}
        optional
      />
      {code`;`}
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `XmlPropertyMetadata` interface used in serialization
 * metadata arrays. Each entry describes how to serialize one property
 * from a model to XML, including the property name, XML options,
 * optional nested serializer, and type/encoding hints.
 */
function XmlPropertyMetadataInterface() {
  return (
    <InterfaceDeclaration
      name="XmlPropertyMetadata"
      refkey={serializationHelperRefkey("XmlPropertyMetadata")}
      export
    >
      <InterfaceMember name="propertyName" type="string" />
      {code`;\n`}
      <InterfaceMember
        name="xmlOptions"
        type={serializationHelperRefkey("XmlSerializationOptions")}
      />
      {code`;\n`}
      <InterfaceMember name="serializer" type="(value: any) => any" optional />
      {code`;\n`}
      <InterfaceMember
        name="type"
        type={code`"array" | "object" | "primitive" | "date" | "bytes" | "dict"`}
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="dateEncoding"
        type={code`"rfc3339" | "rfc7231" | "unixTimestamp"`}
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="bytesEncoding"
        type={code`"base64" | "base64url"`}
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="itemType"
        type={code`"primitive" | "date" | "bytes"`}
        optional
      />
      {code`;`}
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `XmlPropertyDeserializeMetadata` interface used in
 * deserialization metadata arrays. Each entry describes how to deserialize
 * one property from XML to the typed model, including type conversion
 * hints for primitive subtypes.
 */
function XmlPropertyDeserializeMetadataInterface() {
  return (
    <InterfaceDeclaration
      name="XmlPropertyDeserializeMetadata"
      refkey={serializationHelperRefkey("XmlPropertyDeserializeMetadata")}
      export
    >
      <InterfaceMember name="propertyName" type="string" />
      {code`;\n`}
      <InterfaceMember
        name="xmlOptions"
        type={serializationHelperRefkey("XmlSerializationOptions")}
      />
      {code`;\n`}
      <InterfaceMember
        name="deserializer"
        type="(value: any) => any"
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="type"
        type={code`"array" | "object" | "primitive" | "date" | "bytes" | "dict"`}
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="primitiveSubtype"
        type={code`"string" | "number" | "boolean"`}
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="dateEncoding"
        type={code`"rfc3339" | "rfc7231" | "unixTimestamp"`}
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="bytesEncoding"
        type={code`"base64" | "base64url"`}
        optional
      />
      {code`;\n`}
      <InterfaceMember
        name="itemType"
        type={code`"primitive" | "date" | "bytes"`}
        optional
      />
      {code`;`}
    </InterfaceDeclaration>
  );
}

/**
 * Renders the `XmlSerializedObject` type alias representing the return
 * type of XML object serializers. It is a Record of string keys to any
 * values, used as an intermediate representation before converting to
 * an XML string.
 */
function XmlSerializedObjectType() {
  return (
    <TypeDeclaration
      name="XmlSerializedObject"
      refkey={serializationHelperRefkey("XmlSerializedObject")}
      export
    >
      {code`Record<string, any>`}
    </TypeDeclaration>
  );
}

/**
 * Renders the `serializeToXml` function that converts a model object to
 * an XML string using a property metadata array and a root element name.
 *
 * This is the core serialization helper called by all `{name}XmlSerializer`
 * functions. It iterates the metadata array, maps each property to its XML
 * representation, and produces a well-formed XML document string.
 */
function SerializeToXmlFunction() {
  return (
    <FunctionDeclaration
      name="serializeToXml"
      refkey={serializationHelperRefkey("serializeToXml")}
      export
      returnType="string"
      parameters={[
        { name: "item", type: "Record<string, any>" },
        {
          name: "properties",
          type: code`${serializationHelperRefkey("XmlPropertyMetadata")}[]`,
        },
        { name: "rootName", type: "string" },
        {
          name: "rootNs",
          type: "{ namespace: string; prefix: string }",
          optional: true,
        },
      ]}
    >
      {code`const parts: string[] = [];
parts.push('<?xml version="1.0" encoding="UTF-8"?>');
const attrs: string[] = [];
const children: string[] = [];
if (rootNs) {
  attrs.push(\` xmlns:\${rootNs.prefix}="\${rootNs.namespace}"\`);
}
for (const prop of properties) {
  const value = item[prop.propertyName];
  if (value === undefined || value === null) continue;
  const xmlName = prop.xmlOptions.name;
  const ns = prop.xmlOptions.ns;
  const fullName = ns ? \`\${ns.prefix}:\${xmlName}\` : xmlName;
  if (prop.xmlOptions.attribute) {
    attrs.push(\` \${fullName}="\${String(value)}"\`);
  } else if (prop.type === "object" && prop.serializer) {
    const nested = prop.serializer(value);
    children.push(objectToXml(nested, fullName, ns));
  } else if (prop.type === "array") {
    const items = Array.isArray(value) ? value : [value];
    const itemsName = prop.xmlOptions.itemsName || fullName;
    if (prop.xmlOptions.unwrapped) {
      for (const el of items) {
        const serialized = prop.serializer ? objectToXml(prop.serializer(el), itemsName) : \`<\${itemsName}>\${serializeValue(el, prop)}</\${itemsName}>\`;
        children.push(serialized);
      }
    } else {
      const inner = items.map((el: any) => {
        return prop.serializer ? objectToXml(prop.serializer(el), itemsName) : \`<\${itemsName}>\${serializeValue(el, prop)}</\${itemsName}>\`;
      }).join("");
      children.push(\`<\${fullName}>\${inner}</\${fullName}>\`);
    }
  } else if (prop.type === "dict") {
    // Dictionary: serialize each key-value pair as a child element
    const inner = Object.entries(value as Record<string, any>).map(([k, v]) => \`<\${k}>\${String(v)}</\${k}>\`).join("");
    children.push(\`<\${fullName}>\${inner}</\${fullName}>\`);
  } else if (prop.xmlOptions.unwrapped) {
    // Unwrapped text content goes directly as text node (no wrapping element)
    children.push(String(value));
  } else {
    children.push(\`<\${fullName}>\${serializeValue(value, prop)}</\${fullName}>\`);
  }
}
const openTag = rootNs ? \`\${rootNs.prefix}:\${rootName}\` : rootName;
if (children.length === 0) {
  parts.push(\`<\${openTag}\${attrs.join("")}/>\`);
} else {
  parts.push(\`<\${openTag}\${attrs.join("")}>\${children.join("")}</\${openTag}>\`);
}
return parts.join("");

function serializeValue(value: any, prop: ${serializationHelperRefkey("XmlPropertyMetadata")}): string {
  if (prop.type === "date") {
    const d = value instanceof Date ? value : new Date(value);
    if (prop.dateEncoding === "unixTimestamp") return String(Math.floor(d.getTime() / 1000));
    if (prop.dateEncoding === "rfc7231") return d.toUTCString();
    return d.toISOString();
  }
  if (prop.type === "bytes" && prop.bytesEncoding) {
    return typeof value === "string" ? value : btoa(String.fromCharCode(...new Uint8Array(value)));
  }
  return String(value);
}

function objectToXml(obj: Record<string, any>, tagName: string, ns?: { namespace: string; prefix: string }): string {
  const a: string[] = [];
  const c: string[] = [];
  if (ns) {
    a.push(\` xmlns:\${ns.prefix}="\${ns.namespace}"\`);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      c.push(objectToXml(v as Record<string, any>, k));
    } else if (Array.isArray(v)) {
      for (const el of v) {
        if (typeof el === "object" && el !== null) {
          c.push(objectToXml(el as Record<string, any>, k));
        } else {
          c.push(\`<\${k}>\${String(el)}</\${k}>\`);
        }
      }
    } else {
      c.push(\`<\${k}>\${String(v)}</\${k}>\`);
    }
  }
  if (c.length === 0) return \`<\${tagName}\${a.join("")}/>\`;
  return \`<\${tagName}\${a.join("")}>\${c.join("")}</\${tagName}>\`;
}`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `deserializeFromXml` function that parses an XML string
 * and maps it to a typed model using property metadata.
 *
 * This is the core deserialization helper called by all `{name}XmlDeserializer`
 * functions. It uses a simple XML parsing approach and property metadata to
 * convert XML elements and attributes back to typed model properties.
 */
function DeserializeFromXmlFunction() {
  return (
    <FunctionDeclaration
      name="deserializeFromXml"
      refkey={serializationHelperRefkey("deserializeFromXml")}
      export
      returnType="any"
      typeParameters={[{ name: namekey("T", { ignoreNamePolicy: true }) }]}
      parameters={[
        { name: "xmlString", type: "string" },
        {
          name: "properties",
          type: code`${serializationHelperRefkey("XmlPropertyDeserializeMetadata")}[]`,
        },
        { name: "rootName", type: "string" },
      ]}
    >
      {code`const root = parseXmlElement(xmlString.trim());
return ${serializationHelperRefkey("deserializeXmlObject")}<T>(xmlElementToObject(root), properties);

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

function parseXmlElement(xml: string): XmlNode {
  // Skip XML declaration
  let s = xml.replace(/^<\\?xml[^?]*\\?>\\s*/, "");
  return parseElement(s, 0).node;
}

function parseElement(s: string, pos: number): { node: XmlNode; end: number } {
  // Skip whitespace
  while (pos < s.length && /\\s/.test(s[pos])) pos++;
  if (s[pos] !== "<") throw new Error("Expected '<' at " + pos);
  pos++;
  // Read tag name (handle namespace prefix)
  let tag = "";
  while (pos < s.length && !/[\\s/>]/.test(s[pos])) tag += s[pos++];
  // Strip namespace prefix for local name
  const localTag = tag.includes(":") ? tag.split(":").pop()! : tag;

  // Parse attributes
  const attrs: Record<string, string> = {};
  while (pos < s.length) {
    while (pos < s.length && /\\s/.test(s[pos])) pos++;
    if (s[pos] === "/" && s[pos + 1] === ">") {
      pos += 2;
      return { node: { tag: localTag, attrs, children: [], text: "" }, end: pos };
    }
    if (s[pos] === ">") { pos++; break; }
    let aName = "";
    while (pos < s.length && !/[\\s=]/.test(s[pos])) aName += s[pos++];
    while (pos < s.length && /\\s/.test(s[pos])) pos++;
    if (s[pos] === "=") pos++;
    while (pos < s.length && /\\s/.test(s[pos])) pos++;
    const q = s[pos++];
    let aVal = "";
    while (pos < s.length && s[pos] !== q) aVal += s[pos++];
    pos++;
    const localAttr = aName.includes(":") && !aName.startsWith("xmlns") ? aName.split(":").pop()! : aName;
    if (!aName.startsWith("xmlns")) attrs[localAttr] = aVal;
  }

  // Parse children and text
  const children: XmlNode[] = [];
  let text = "";
  while (pos < s.length) {
    if (s[pos] === "<") {
      if (s[pos + 1] === "/") {
        // Closing tag
        const closeEnd = s.indexOf(">", pos);
        pos = closeEnd + 1;
        break;
      } else {
        const child = parseElement(s, pos);
        children.push(child.node);
        pos = child.end;
      }
    } else {
      text += s[pos++];
    }
  }
  return { node: { tag: localTag, attrs, children, text }, end: pos };
}

function xmlElementToObject(node: XmlNode): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(node.attrs)) {
    result["@" + k] = v;
  }
  for (const child of node.children) {
    const name = child.tag;
    const existing = result[name];
    const value = child.children.length > 0 ? xmlElementToObject(child) : child.text;
    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[name] = [existing, value];
      }
    } else {
      result[name] = value;
    }
  }
  // If node has text content and attributes but no children, store text as #text
  if (node.text.trim() && node.children.length === 0 && Object.keys(node.attrs).length > 0) {
    result["#text"] = node.text;
  }
  return result;
}`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `deserializeXmlObject` function that converts a pre-parsed
 * XML object (with XML-named keys) into a typed model using property metadata.
 *
 * This is used for nested model deserialization where the parent has already
 * parsed the XML string and is passing individual element objects to child
 * deserializers.
 */
function DeserializeXmlObjectFunction() {
  return (
    <FunctionDeclaration
      name="deserializeXmlObject"
      refkey={serializationHelperRefkey("deserializeXmlObject")}
      export
      returnType="any"
      typeParameters={[{ name: namekey("T", { ignoreNamePolicy: true }) }]}
      parameters={[
        { name: "xmlObject", type: "Record<string, unknown>" },
        {
          name: "properties",
          type: code`${serializationHelperRefkey("XmlPropertyDeserializeMetadata")}[]`,
        },
      ]}
    >
      {code`const result: Record<string, any> = {};
for (const prop of properties) {
  const xmlName = prop.xmlOptions.name;
  const key = prop.xmlOptions.attribute ? "@" + xmlName : xmlName;
  let value = xmlObject[key];
  // For unwrapped text content, fall back to #text key
  if ((value === undefined || value === null) && prop.xmlOptions.unwrapped && prop.type !== "array") {
    value = xmlObject["#text"];
  }
  if (value === undefined || value === null) continue;
  if (prop.type === "object" && prop.deserializer) {
    result[prop.propertyName] = prop.deserializer(value as Record<string, unknown>);
  } else if (prop.type === "array") {
    // Handle empty wrapper elements (self-closing tags or empty elements produce empty string)
    if (value === "" && prop.xmlOptions.itemsName) {
      result[prop.propertyName] = [];
      continue;
    }
    // For wrapped arrays, extract items from wrapper object using itemsName
    let items: any = value;
    if (prop.xmlOptions.itemsName && !prop.xmlOptions.unwrapped && typeof value === "object" && !Array.isArray(value)) {
      items = (value as any)[prop.xmlOptions.itemsName];
      if (items === undefined || items === null) {
        result[prop.propertyName] = [];
        continue;
      }
    }
    const arr = Array.isArray(items) ? items : [items];
    if (prop.deserializer) {
      result[prop.propertyName] = arr.map((el: any) => prop.deserializer!(el));
    } else {
      result[prop.propertyName] = arr.map((el: any) => deserializePrimitive(el, prop));
    }
  } else if (prop.type === "date") {
    if (prop.dateEncoding === "unixTimestamp") {
      result[prop.propertyName] = new Date(Number(value) * 1000);
    } else {
      result[prop.propertyName] = new Date(String(value));
    }
  } else if (prop.type === "bytes") {
    result[prop.propertyName] = value;
  } else if (prop.type === "dict") {
    // Dictionary: pass through as-is (keys are element names, values are text content)
    result[prop.propertyName] = value;
  } else {
    result[prop.propertyName] = deserializePrimitive(value, prop);
  }
}
return result as T;

function deserializePrimitive(value: any, prop: ${serializationHelperRefkey("XmlPropertyDeserializeMetadata")}): any {
  if (prop.primitiveSubtype === "number") return Number(value);
  if (prop.primitiveSubtype === "boolean") return value === "true" || value === true;
  return String(value);
}`}
    </FunctionDeclaration>
  );
}

/**
 * Renders the `isXmlContentType` function that checks whether a given
 * content-type string indicates XML content.
 *
 * This is used at runtime to detect XML responses and select the correct
 * deserializer (JSON vs XML) in dual-format error/response handling.
 * The check matches `application/xml`, `text/xml`, and `+xml` suffixes
 * (e.g., `application/atom+xml`).
 */
function IsXmlContentTypeFunction() {
  return (
    <FunctionDeclaration
      name="isXmlContentType"
      refkey={serializationHelperRefkey("isXmlContentType")}
      export
      returnType="boolean"
      parameters={[{ name: "contentType", type: "string" }]}
    >
      {code`const normalized = contentType.toLowerCase();
return (
  normalized.includes("application/xml") ||
  normalized.includes("text/xml") ||
  normalized.endsWith("+xml")
);`}
    </FunctionDeclaration>
  );
}
