import { describe, it, expect } from "vitest";
import {
  typeRefkey,
  serializerRefkey,
  deserializerRefkey,
  polymorphicTypeRefkey,
  knownValuesRefkey,
  operationOptionsRefkey,
  clientContextRefkey,
  createClientRefkey,
  classicalClientRefkey,
  xmlSerializerRefkey,
  xmlDeserializerRefkey,
  serializationHelperRefkey,
  pagingHelperRefkey,
  pollingHelperRefkey,
} from "../../src/utils/refkeys.js";

/**
 * Tests for refkey helper functions in src/utils/refkeys.ts.
 *
 * These tests validate three critical properties of the refkey system:
 *
 * 1. **Identity (memoization)**: Calling the same helper with the same entity
 *    must always return the exact same refkey object. This ensures that
 *    declarations and references resolve to the same symbol across the
 *    component tree, enabling Alloy's automatic import generation.
 *
 * 2. **Uniqueness (discrimination)**: Different helpers called on the same
 *    entity must return different refkeys. For example, `serializerRefkey(Foo)`
 *    and `deserializerRefkey(Foo)` must be distinct so that the serializer
 *    and deserializer declarations don't collide.
 *
 * 3. **Entity isolation**: The same helper called with different entities
 *    must return different refkeys. `typeRefkey(Foo)` and `typeRefkey(Bar)`
 *    must be distinct.
 *
 * Without these properties, Alloy would generate incorrect imports,
 * self-imports, or missing references — all bugs seen in the legacy emitter.
 */
describe("Refkey Helpers", () => {
  /**
   * Verifies that calling any refkey helper twice with the same entity
   * returns the exact same refkey object (reference equality).
   *
   * This is essential because Alloy's reference resolution relies on
   * object identity to match declarations with references. If the same
   * entity produced different refkeys on each call, references would
   * fail to resolve and imports would be missing.
   */
  it("returns the same refkey for the same entity (identity/memoization)", () => {
    const entity = { name: "TestModel" };

    // Entity-based helpers
    expect(typeRefkey(entity)).toBe(typeRefkey(entity));
    expect(serializerRefkey(entity)).toBe(serializerRefkey(entity));
    expect(deserializerRefkey(entity)).toBe(deserializerRefkey(entity));
    expect(polymorphicTypeRefkey(entity)).toBe(polymorphicTypeRefkey(entity));
    expect(knownValuesRefkey(entity)).toBe(knownValuesRefkey(entity));
    expect(operationOptionsRefkey(entity)).toBe(operationOptionsRefkey(entity));
    expect(clientContextRefkey(entity)).toBe(clientContextRefkey(entity));
    expect(createClientRefkey(entity)).toBe(createClientRefkey(entity));
    expect(classicalClientRefkey(entity)).toBe(classicalClientRefkey(entity));
    expect(xmlSerializerRefkey(entity)).toBe(xmlSerializerRefkey(entity));
    expect(xmlDeserializerRefkey(entity)).toBe(xmlDeserializerRefkey(entity));

    // String-based helpers
    expect(serializationHelperRefkey("buildCsv")).toBe(
      serializationHelperRefkey("buildCsv"),
    );
    expect(pagingHelperRefkey("paginate")).toBe(pagingHelperRefkey("paginate"));
    expect(pollingHelperRefkey("createPoller")).toBe(
      pollingHelperRefkey("createPoller"),
    );
  });

  /**
   * Verifies that different refkey helpers return distinct refkeys for
   * the same entity.
   *
   * This prevents collisions between different artifact types. For example,
   * a model's type declaration (`interface Foo {}`) and its serializer
   * function (`function fooSerializer()`) must have different refkeys
   * so Alloy treats them as separate declarations with separate imports.
   */
  it("returns different refkeys for different discriminators on the same entity", () => {
    const entity = { name: "TestModel" };

    const keys = [
      typeRefkey(entity),
      serializerRefkey(entity),
      deserializerRefkey(entity),
      polymorphicTypeRefkey(entity),
      knownValuesRefkey(entity),
      operationOptionsRefkey(entity),
      clientContextRefkey(entity),
      createClientRefkey(entity),
      classicalClientRefkey(entity),
      xmlSerializerRefkey(entity),
      xmlDeserializerRefkey(entity),
    ];

    // Every refkey should be unique — no duplicates
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  /**
   * Verifies that the same helper returns different refkeys for different
   * entities.
   *
   * This ensures entity isolation — `typeRefkey(ModelA)` and
   * `typeRefkey(ModelB)` must be distinct, otherwise their declarations
   * would be treated as the same symbol and cause reference errors.
   */
  it("returns different refkeys for different entities", () => {
    const entityA = { name: "ModelA" };
    const entityB = { name: "ModelB" };

    expect(typeRefkey(entityA)).not.toBe(typeRefkey(entityB));
    expect(serializerRefkey(entityA)).not.toBe(serializerRefkey(entityB));
    expect(deserializerRefkey(entityA)).not.toBe(deserializerRefkey(entityB));
  });

  /**
   * Verifies that string-based helpers (for named utilities) return
   * different refkeys for different names.
   *
   * These helpers identify static utility functions like
   * `buildCsvCollection` and `serializeRecord`. Each function name
   * must map to a unique refkey.
   */
  it("returns different refkeys for different helper names", () => {
    expect(serializationHelperRefkey("buildCsv")).not.toBe(
      serializationHelperRefkey("serializeRecord"),
    );
    expect(pagingHelperRefkey("paginate")).not.toBe(
      pagingHelperRefkey("getElements"),
    );
    expect(pollingHelperRefkey("createPoller")).not.toBe(
      pollingHelperRefkey("restorePoller"),
    );
  });

  /**
   * Verifies that different helper categories with the same name
   * return different refkeys.
   *
   * This prevents cross-category collisions. A paging helper named
   * "getResult" and a polling helper named "getResult" must have
   * different refkeys because they're entirely different functions.
   */
  it("returns different refkeys for different helper categories with the same name", () => {
    expect(serializationHelperRefkey("convert")).not.toBe(
      pagingHelperRefkey("convert"),
    );
    expect(pagingHelperRefkey("convert")).not.toBe(
      pollingHelperRefkey("convert"),
    );
    expect(serializationHelperRefkey("convert")).not.toBe(
      pollingHelperRefkey("convert"),
    );
  });

  /**
   * Verifies that typeRefkey produces a plain refkey (no discriminator)
   * while serializerRefkey produces a discriminated refkey.
   *
   * This is important because `typeRefkey` is the "identity" refkey for
   * any entity — it's what you pass to a component's `refkey` prop when
   * declaring the type itself. All other helpers add discriminators to
   * differentiate their artifacts from the base type.
   */
  it("typeRefkey returns the base refkey for an entity", () => {
    const entity = { name: "Foo" };
    const baseKey = typeRefkey(entity);

    // typeRefkey should be different from all discriminated variants
    expect(baseKey).not.toBe(serializerRefkey(entity));
    expect(baseKey).not.toBe(deserializerRefkey(entity));
    expect(baseKey).not.toBe(polymorphicTypeRefkey(entity));
    expect(baseKey).not.toBe(xmlSerializerRefkey(entity));
  });

  /**
   * Verifies that XML serializer/deserializer refkeys are distinct from
   * their JSON counterparts.
   *
   * Services that support both JSON and XML content types need separate
   * serializer/deserializer declarations for each format. This test
   * ensures no accidental collision between format-specific artifacts.
   */
  it("XML and JSON serializer refkeys are distinct for the same entity", () => {
    const entity = { name: "XmlModel" };

    expect(serializerRefkey(entity)).not.toBe(xmlSerializerRefkey(entity));
    expect(deserializerRefkey(entity)).not.toBe(xmlDeserializerRefkey(entity));
  });

  /**
   * Verifies that all three client-related refkeys are distinct for the
   * same client entity.
   *
   * A single TCGC client generates three artifacts: the client context
   * (internal state), the factory function (public API), and the classical
   * class wrapper. Each must have its own refkey.
   */
  it("client-related refkeys are all distinct for the same client entity", () => {
    const client = { name: "FooClient" };

    const contextKey = clientContextRefkey(client);
    const factoryKey = createClientRefkey(client);
    const classicalKey = classicalClientRefkey(client);

    expect(contextKey).not.toBe(factoryKey);
    expect(contextKey).not.toBe(classicalKey);
    expect(factoryKey).not.toBe(classicalKey);
  });
});
