import { refkey, type Refkey } from "@alloy-js/core";

/**
 * Creates a refkey for a type declaration (model, enum, union, etc.).
 *
 * This is the base refkey for any type entity. It uniquely identifies
 * the type's declaration node (e.g., an interface or type alias) so that
 * other components can reference it and Alloy auto-generates imports.
 *
 * @param entity - The TCGC type entity (e.g., `SdkModelType`, `SdkEnumType`).
 * @returns A stable refkey for the type declaration.
 */
export function typeRefkey(entity: unknown): Refkey {
  return refkey(entity);
}

/**
 * Creates a refkey for a JSON serializer function that converts a type
 * from its application model to its wire (transport) format.
 *
 * The serializer function transforms typed SDK objects into plain JSON
 * objects suitable for HTTP request bodies.
 *
 * @param entity - The TCGC type entity whose serializer is being referenced.
 * @returns A stable refkey for the serializer function declaration.
 */
export function serializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "serializer");
}

/**
 * Creates a refkey for a JSON deserializer function that converts a type
 * from its wire (transport) format back to the application model.
 *
 * The deserializer function transforms raw JSON response objects into
 * typed SDK model instances.
 *
 * @param entity - The TCGC type entity whose deserializer is being referenced.
 * @returns A stable refkey for the deserializer function declaration.
 */
export function deserializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "deserializer");
}

/**
 * Creates a refkey for a polymorphic union type alias generated for
 * models with discriminator properties.
 *
 * When a model uses a discriminator (e.g., `kind: "cat" | "dog"`),
 * the emitter generates a union type alias that covers all subtypes.
 * This refkey identifies that union alias so serializers can reference it.
 *
 * @param entity - The base TCGC model type that has a discriminator property.
 * @returns A stable refkey for the polymorphic type alias declaration.
 */
export function polymorphicTypeRefkey(entity: unknown): Refkey {
  return refkey(entity, "polymorphicType");
}

/**
 * Creates a refkey for a base model serializer function used as the default
 * fallback in polymorphic switch serializers.
 *
 * When a discriminated model's switch statement encounters an unknown discriminator
 * value, it falls back to serializing just the base model's properties. This refkey
 * identifies that fallback serializer, distinct from the polymorphic switch serializer
 * (which uses `serializerRefkey`).
 *
 * @param entity - The TCGC base model type with a discriminator property.
 * @returns A stable refkey for the base model serializer function declaration.
 */
export function baseSerializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "baseSerializer");
}

/**
 * Creates a refkey for a base model deserializer function used as the default
 * fallback in polymorphic switch deserializers.
 *
 * When a discriminated model's switch statement encounters an unknown discriminator
 * value, it falls back to deserializing just the base model's properties. This refkey
 * identifies that fallback deserializer, distinct from the polymorphic switch deserializer
 * (which uses `deserializerRefkey`).
 *
 * @param entity - The TCGC base model type with a discriminator property.
 * @returns A stable refkey for the base model deserializer function declaration.
 */
export function baseDeserializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "baseDeserializer");
}

/**
 * Creates a refkey for a "known values" enum that stores the literal
 * values of an extensible enum type.
 *
 * Extensible enums in TypeSpec generate two artifacts: a union type
 * (e.g., `type Color = string`) and a known-values enum
 * (e.g., `enum KnownColor { Red = "red" }`). This refkey identifies
 * the known-values enum.
 *
 * @param entity - The TCGC enum type entity.
 * @returns A stable refkey for the known-values enum declaration.
 */
export function knownValuesRefkey(entity: unknown): Refkey {
  return refkey(entity, "knownValues");
}

/**
 * Creates a refkey for an operation's options interface.
 *
 * Each operation gets an options interface (e.g., `GetUserOptionalParams`)
 * that holds optional parameters like headers, query params, and request
 * options. This refkey identifies that interface.
 *
 * @param entity - The TCGC operation or method entity.
 * @returns A stable refkey for the operation options interface declaration.
 */
export function operationOptionsRefkey(entity: unknown): Refkey {
  return refkey(entity, "operationOptions");
}

/**
 * Creates a refkey for a client context object that holds shared client
 * state (endpoint, pipeline, credentials).
 *
 * The client context is a lightweight object created by the factory function
 * and passed to all operation functions. It avoids exposing a class-based
 * client API while sharing state across operations.
 *
 * @param entity - The TCGC client type entity.
 * @returns A stable refkey for the client context type/interface declaration.
 */
export function clientContextRefkey(entity: unknown): Refkey {
  return refkey(entity, "clientContext");
}

/**
 * Creates a refkey for a factory function that instantiates a client context
 * (e.g., `createFooClient`).
 *
 * The factory function is the public entry point for consumers to create
 * a configured client. It sets up the HTTP pipeline and returns a client
 * context object.
 *
 * @param entity - The TCGC client type entity.
 * @returns A stable refkey for the client factory function declaration.
 */
export function createClientRefkey(entity: unknown): Refkey {
  return refkey(entity, "createClient");
}

/**
 * Creates a refkey for a client's optional parameters interface
 * (e.g., `FooClientOptionalParams`).
 *
 * The options interface extends `ClientOptions` from the HTTP runtime and
 * includes optional client-level parameters such as endpoint overrides,
 * API version, and custom parameters with default values.
 *
 * @param entity - The TCGC client type entity.
 * @returns A stable refkey for the client options interface declaration.
 */
export function clientOptionsRefkey(entity: unknown): Refkey {
  return refkey(entity, "clientOptions");
}

/**
 * Creates a refkey for the classical (class-based) client declaration.
 *
 * The classical client wraps the modular client context in a class with
 * methods for each operation. This is the traditional SDK pattern that
 * some consumers prefer over the modular function-based API.
 *
 * @param entity - The TCGC client type entity.
 * @returns A stable refkey for the classical client class declaration.
 */
export function classicalClientRefkey(entity: unknown): Refkey {
  return refkey(entity, "classicalClient");
}

/**
 * Creates a refkey for an XML serializer function that converts a model
 * to an XML string.
 *
 * The XML serializer is the root-level function that produces a complete
 * XML document string. It uses metadata arrays and delegates to the
 * `serializeToXml` static helper.
 *
 * @param entity - The TCGC type entity whose XML serializer is being referenced.
 * @returns A stable refkey for the XML serializer function declaration.
 */
export function xmlSerializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "xmlSerializer");
}

/**
 * Creates a refkey for an XML object serializer function that converts
 * a model to an `XmlSerializedObject` (plain object with XML property names).
 *
 * The object serializer is used for nested model types. Instead of producing
 * an XML string, it returns an object with XML-named keys that can be
 * embedded inside a parent serializer's output.
 *
 * @param entity - The TCGC type entity whose XML object serializer is being referenced.
 * @returns A stable refkey for the XML object serializer function declaration.
 */
export function xmlObjectSerializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "xmlObjectSerializer");
}

/**
 * Creates a refkey for an XML deserializer function that converts an
 * XML string back to a typed model.
 *
 * The XML deserializer is the root-level function that parses a complete
 * XML document string. It uses metadata arrays and delegates to the
 * `deserializeFromXml` static helper.
 *
 * @param entity - The TCGC type entity whose XML deserializer is being referenced.
 * @returns A stable refkey for the XML deserializer function declaration.
 */
export function xmlDeserializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "xmlDeserializer");
}

/**
 * Creates a refkey for an XML object deserializer function that converts
 * a pre-parsed XML object (`Record<string, unknown>`) back to a typed model.
 *
 * The object deserializer is used for nested model types. Instead of parsing
 * an XML string, it takes an already-parsed object and maps XML-named keys
 * back to client-side property names.
 *
 * @param entity - The TCGC type entity whose XML object deserializer is being referenced.
 * @returns A stable refkey for the XML object deserializer function declaration.
 */
export function xmlObjectDeserializerRefkey(entity: unknown): Refkey {
  return refkey(entity, "xmlObjectDeserializer");
}

/**
 * Creates a refkey for a static serialization helper function.
 *
 * Static helpers are shared utility functions used across multiple
 * serializers (e.g., `buildCsvCollection`, `serializeRecord`,
 * `buildMultiCollection`). They are declared once in a helpers file
 * and referenced by serializers that need them.
 *
 * @param name - The helper function name (e.g., `"buildCsvCollection"`).
 * @returns A stable refkey for the named helper function declaration.
 */
export function serializationHelperRefkey(name: string): Refkey {
  return refkey("serializationHelper", name);
}

/**
 * Creates a refkey for a paging helper function or type.
 *
 * Paging helpers manage paginated responses — iterating pages,
 * extracting elements, building next-page requests. Each helper
 * is identified by name (e.g., `"paginate"`, `"getElements"`).
 *
 * @param name - The paging helper function name.
 * @returns A stable refkey for the named paging helper declaration.
 */
export function pagingHelperRefkey(name: string): Refkey {
  return refkey("pagingHelper", name);
}

/**
 * Creates a refkey for a send function that builds and dispatches an HTTP request.
 *
 * Each operation gets a private `_xxxSend` function that constructs the URL,
 * assembles headers and query parameters, serializes the request body, and
 * calls `context.path(path).verb(options)` to dispatch the request.
 *
 * @param entity - The TCGC operation or method entity.
 * @returns A stable refkey for the send function declaration.
 */
export function sendOperationRefkey(entity: unknown): Refkey {
  return refkey(entity, "sendOperation");
}

/**
 * Creates a refkey for a deserialize function that processes an HTTP response.
 *
 * Each operation gets a private `_xxxDeserialize` function that validates
 * the response status code, throws `createRestError` for unexpected statuses,
 * and deserializes the response body using model deserializer refkeys.
 *
 * @param entity - The TCGC operation or method entity.
 * @returns A stable refkey for the deserialize function declaration.
 */
export function deserializeOperationRefkey(entity: unknown): Refkey {
  return refkey(entity, "deserializeOperation");
}

/**
 * Creates a refkey for a public operation function that wraps the send
 * and deserialize functions into a single callable API.
 *
 * The public operation function is what consumers actually call. For standard
 * operations, it awaits the send function and then deserializes the response.
 * For LRO and paging operations, it wraps with polling/paging helpers.
 *
 * @param entity - The TCGC operation or method entity.
 * @returns A stable refkey for the public operation function declaration.
 */
export function publicOperationRefkey(entity: unknown): Refkey {
  return refkey(entity, "publicOperation");
}

/**
 * Creates a refkey for a `_xxxDeserializeHeaders` function that extracts
 * typed header values from success HTTP responses.
 *
 * This refkey enables the public operation function to reference the
 * header deserializer when `include-headers-in-response` is enabled,
 * so that Alloy can auto-generate the import if the two functions
 * end up in different files.
 *
 * @param entity - The TCGC operation or method entity.
 * @returns A stable refkey for the header deserializer function declaration.
 */
export function deserializeHeadersRefkey(entity: unknown): Refkey {
  return refkey(entity, "deserializeHeaders");
}

/**
 * Creates a refkey for a `_xxxDeserializeExceptionHeaders` function that extracts
 * typed header values from error HTTP responses.
 *
 * This refkey enables the deserialize operation function to reference the
 * exception header deserializer when `include-headers-in-response` is enabled,
 * so that Alloy can auto-generate the import if the two functions
 * end up in different files.
 *
 * @param entity - The TCGC operation or method entity.
 * @returns A stable refkey for the exception header deserializer function declaration.
 */
export function deserializeExceptionHeadersRefkey(entity: unknown): Refkey {
  return refkey(entity, "deserializeExceptionHeaders");
}

/**
 * Creates a refkey for a multipart helper function or type.
 *
 * Multipart helpers manage multipart/form-data request body construction —
 * creating file part descriptors, defining the FileContents type alias, etc.
 * Each helper is identified by name (e.g., `"createFilePartDescriptor"`,
 * `"FileContents"`).
 *
 * @param name - The multipart helper function or type name.
 * @returns A stable refkey for the named multipart helper declaration.
 */
export function multipartHelperRefkey(name: string): Refkey {
  return refkey("multipartHelper", name);
}

/**
 * Creates a refkey for a polling (long-running operation) helper function or type.
 *
 * Polling helpers manage LRO lifecycle — creating pollers, checking status,
 * extracting final results. Each helper is identified by name
 * (e.g., `"getLroPoller"`, `"restorePoller"`).
 *
 * @param name - The polling helper function name.
 * @returns A stable refkey for the named polling helper declaration.
 */
export function pollingHelperRefkey(name: string): Refkey {
  return refkey("pollingHelper", name);
}

/**
 * Creates a refkey for an operation group's `XxxOperations` interface.
 *
 * Each operation group (represented as a child client in TCGC) gets an
 * interface that defines the available operations and nested group
 * accessors. For example, `WidgetsOperations` would contain method
 * signatures like `getWidget(...)` and nested group properties like
 * `parts: PartsOperations`.
 *
 * @param entity - The TCGC child client type representing the operation group.
 * @returns A stable refkey for the operation group interface declaration.
 */
export function operationGroupInterfaceRefkey(entity: unknown): Refkey {
  return refkey(entity, "operationGroupInterface");
}

/**
 * Creates a refkey for an operation group's `_getXxxOperations` factory function.
 *
 * The factory function creates the operation group object by binding
 * the client context to each operation method and recursively composing
 * nested operation group factories. It is called in the classical client's
 * constructor to initialize readonly operation group properties.
 *
 * @param entity - The TCGC child client type representing the operation group.
 * @returns A stable refkey for the operation group factory function declaration.
 */
export function operationGroupFactoryRefkey(entity: unknown): Refkey {
  return refkey(entity, "operationGroupFactory");
}

/**
 * Creates a refkey for the logger instance exported from `logger.ts`.
 *
 * The logger is a namespaced `AzureLogger` instance created via
 * `createClientLogger()` from `@azure/logger`. It is used throughout
 * Azure-flavored SDKs for structured logging that integrates with the
 * Azure SDK logging infrastructure.
 *
 * @returns A stable refkey for the logger variable declaration.
 */
export function loggerRefkey(): Refkey {
  return refkey("logger");
}

/**
 * Creates a refkey for a flatten serializer helper function.
 *
 * Flatten helpers serialize the flattened properties of a nested model type,
 * reading from the parent model's flat interface and producing the nested
 * wire-format sub-object. For example, `_testPropertiesSerializer(item: Test)`
 * reads `bar` and `baz` from the flat `Test` interface and returns
 * `{ bar: ..., baz: ... }` for the `properties` wire key.
 *
 * @param parentModel - The parent TCGC model that contains the flatten property.
 * @param propSerializedName - The wire name of the flatten property (e.g., "properties").
 * @returns A stable refkey for the flatten serializer helper function declaration.
 */
export function flattenSerializerRefkey(parentModel: unknown, propSerializedName: string): Refkey {
  return refkey(parentModel, "flattenSerializer", propSerializedName);
}

/**
 * Creates a refkey for a flatten deserializer helper function.
 *
 * Flatten deserializer helpers read from the nested wire-format sub-object
 * and return an object with client-side property names that gets spread
 * into the parent model's deserialized result. For example,
 * `_testPropertiesDeserializer(item)` reads `bar` and `baz` from the
 * wire sub-object and returns `{ bar: ..., baz: ... }`.
 *
 * @param parentModel - The parent TCGC model that contains the flatten property.
 * @param propSerializedName - The wire name of the flatten property (e.g., "properties").
 * @returns A stable refkey for the flatten deserializer helper function declaration.
 */
export function flattenDeserializerRefkey(parentModel: unknown, propSerializedName: string): Refkey {
  return refkey(parentModel, "flattenDeserializer", propSerializedName);
}
