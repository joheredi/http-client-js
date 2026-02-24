import { code } from "@alloy-js/core";
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
    <SourceFile path="helpers/xmlHelpers.ts">
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
      <InterfaceMember name="xmlOptions" type={serializationHelperRefkey("XmlSerializationOptions")} />
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
      <InterfaceMember name="xmlOptions" type={serializationHelperRefkey("XmlSerializationOptions")} />
      {code`;\n`}
      <InterfaceMember name="deserializer" type="(value: any) => any" optional />
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
      typeParameters={["T"]}
      parameters={[
        { name: "xmlString", type: "string" },
        {
          name: "properties",
          type: code`${serializationHelperRefkey("XmlPropertyDeserializeMetadata")}[]`,
        },
        { name: "rootName", type: "string" },
      ]}
    >
      {code`const parser = new DOMParser();
const doc = parser.parseFromString(xmlString, "application/xml");
const root = doc.documentElement;
return ${serializationHelperRefkey("deserializeXmlObject")}<T>(xmlElementToObject(root), properties);

function xmlElementToObject(el: Element): Record<string, any> {
  const result: Record<string, any> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    result["@" + attr.localName] = attr.value;
  }
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 1) {
      const childEl = child as Element;
      const name = childEl.localName;
      const existing = result[name];
      const value = childEl.children.length > 0 ? xmlElementToObject(childEl) : childEl.textContent;
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
      typeParameters={["T"]}
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
  if (value === undefined || value === null) continue;
  if (prop.type === "object" && prop.deserializer) {
    result[prop.propertyName] = prop.deserializer(value as Record<string, unknown>);
  } else if (prop.type === "array") {
    const arr = Array.isArray(value) ? value : [value];
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
