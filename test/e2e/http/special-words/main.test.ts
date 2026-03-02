import { describe, it } from "vitest";
import { SpecialWordsClient } from "../../generated/special-words/src/index.js";

/**
 * Tests for SpecialWords — validates that the emitter correctly handles reserved words
 * from JavaScript, Python, and other languages as operation names, parameter names,
 * model names, and property names.
 *
 * All operations return void (204 No Content). Success means the mock API recognized
 * the request and responded without error.
 */
describe("SpecialWords", () => {
  const client = new SpecialWordsClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
    retryOptions: { maxRetries: 1 },
  });

  /**
   * Tests that reserved words can be used as operation names.
   * The client exposes each reserved word as a method on the operations group.
   */
  describe("Operations", () => {
    it("should call and", async () => {
      await client.operations.and();
    });
    it("should call as", async () => {
      await client.operations.as();
    });
    it("should call assert", async () => {
      await client.operations.assert();
    });
    it("should call async", async () => {
      await client.operations.async();
    });
    it("should call await", async () => {
      await client.operations.await();
    });
    it("should call break", async () => {
      await client.operations.break();
    });
    it("should call class", async () => {
      await client.operations.class();
    });
    it("should call constructor", async () => {
      await client.operations.constructor();
    });
    it("should call continue", async () => {
      await client.operations.continue();
    });
    it("should call def", async () => {
      await client.operations.def();
    });
    it("should call del", async () => {
      await client.operations.del();
    });
    it("should call elif", async () => {
      await client.operations.elif();
    });
    it("should call else", async () => {
      await client.operations.else();
    });
    it("should call except", async () => {
      await client.operations.except();
    });
    it("should call exec", async () => {
      await client.operations.exec();
    });
    it("should call finally", async () => {
      await client.operations.finally();
    });
    it("should call for", async () => {
      await client.operations.for();
    });
    it("should call from", async () => {
      await client.operations.from();
    });
    it("should call global", async () => {
      await client.operations.global();
    });
    it("should call if", async () => {
      await client.operations.if();
    });
    it("should call import", async () => {
      await client.operations.import();
    });
    it("should call in", async () => {
      await client.operations.in();
    });
    it("should call is", async () => {
      await client.operations.is();
    });
    it("should call lambda", async () => {
      await client.operations.lambda();
    });
    it("should call not", async () => {
      await client.operations.not();
    });
    it("should call or", async () => {
      await client.operations.or();
    });
    it("should call pass", async () => {
      await client.operations.pass();
    });
    it("should call raise", async () => {
      await client.operations.raise();
    });
    it("should call return", async () => {
      await client.operations.return();
    });
    it("should call try", async () => {
      await client.operations.try();
    });
    it("should call while", async () => {
      await client.operations.while();
    });
    it("should call with", async () => {
      await client.operations.with();
    });
    it("should call yield", async () => {
      await client.operations.yield();
    });
  });

  /**
   * Tests that reserved words can be used as query parameter names.
   * Each method accepts the reserved word value as a string parameter.
   */
  describe("Parameters", () => {
    it("should call withAnd", async () => {
      await client.parameters.withAnd("ok");
    });
    it("should call withAs", async () => {
      await client.parameters.withAs("ok");
    });
    it("should call withAssert", async () => {
      await client.parameters.withAssert("ok");
    });
    it("should call withAsync", async () => {
      await client.parameters.withAsync("ok");
    });
    it("should call withAwait", async () => {
      await client.parameters.withAwait("ok");
    });
    it("should call withBreak", async () => {
      await client.parameters.withBreak("ok");
    });
    it("should call withClass", async () => {
      await client.parameters.withClass("ok");
    });
    it("should call withConstructor", async () => {
      await client.parameters.withConstructor("ok");
    });
    it("should call withContinue", async () => {
      await client.parameters.withContinue("ok");
    });
    it("should call withDef", async () => {
      await client.parameters.withDef("ok");
    });
    it("should call withDel", async () => {
      await client.parameters.withDel("ok");
    });
    it("should call withElif", async () => {
      await client.parameters.withElif("ok");
    });
    it("should call withElse", async () => {
      await client.parameters.withElse("ok");
    });
    it("should call withExcept", async () => {
      await client.parameters.withExcept("ok");
    });
    it("should call withExec", async () => {
      await client.parameters.withExec("ok");
    });
    it("should call withFinally", async () => {
      await client.parameters.withFinally("ok");
    });
    it("should call withFor", async () => {
      await client.parameters.withFor("ok");
    });
    it("should call withFrom", async () => {
      await client.parameters.withFrom("ok");
    });
    it("should call withGlobal", async () => {
      await client.parameters.withGlobal("ok");
    });
    it("should call withIf", async () => {
      await client.parameters.withIf("ok");
    });
    it("should call withImport", async () => {
      await client.parameters.withImport("ok");
    });
    it("should call withIn", async () => {
      await client.parameters.withIn("ok");
    });
    it("should call withIs", async () => {
      await client.parameters.withIs("ok");
    });
    it("should call withLambda", async () => {
      await client.parameters.withLambda("ok");
    });
    it("should call withNot", async () => {
      await client.parameters.withNot("ok");
    });
    it("should call withOr", async () => {
      await client.parameters.withOr("ok");
    });
    it("should call withPass", async () => {
      await client.parameters.withPass("ok");
    });
    it("should call withRaise", async () => {
      await client.parameters.withRaise("ok");
    });
    it("should call withReturn", async () => {
      await client.parameters.withReturn("ok");
    });
    it("should call withTry", async () => {
      await client.parameters.withTry("ok");
    });
    it("should call withWhile", async () => {
      await client.parameters.withWhile("ok");
    });
    it("should call withWith", async () => {
      await client.parameters.withWith("ok");
    });
    it("should call withYield", async () => {
      await client.parameters.withYield("ok");
    });
    it("should call withCancellationToken", async () => {
      await client.parameters.withCancellationToken("ok");
    });
  });

  /**
   * Tests that reserved words can be used as model type names.
   * Each method accepts a model instance with a `name` property.
   */
  describe("Models", () => {
    it("should call withAnd", async () => {
      await client.models.withAnd({ name: "ok" });
    });
    it("should call withAs", async () => {
      await client.models.withAs({ name: "ok" });
    });
    it("should call withAssert", async () => {
      await client.models.withAssert({ name: "ok" });
    });
    it("should call withAsync", async () => {
      await client.models.withAsync({ name: "ok" });
    });
    it("should call withAwait", async () => {
      await client.models.withAwait({ name: "ok" });
    });
    it("should call withBreak", async () => {
      await client.models.withBreak({ name: "ok" });
    });
    it("should call withClass", async () => {
      await client.models.withClass({ name: "ok" });
    });
    it("should call withConstructor", async () => {
      await client.models.withConstructor({ name: "ok" });
    });
    it("should call withContinue", async () => {
      await client.models.withContinue({ name: "ok" });
    });
    it("should call withDef", async () => {
      await client.models.withDef({ name: "ok" });
    });
    it("should call withDel", async () => {
      await client.models.withDel({ name: "ok" });
    });
    it("should call withElif", async () => {
      await client.models.withElif({ name: "ok" });
    });
    it("should call withElse", async () => {
      await client.models.withElse({ name: "ok" });
    });
    it("should call withExcept", async () => {
      await client.models.withExcept({ name: "ok" });
    });
    it("should call withExec", async () => {
      await client.models.withExec({ name: "ok" });
    });
    it("should call withFinally", async () => {
      await client.models.withFinally({ name: "ok" });
    });
    it("should call withFor", async () => {
      await client.models.withFor({ name: "ok" });
    });
    it("should call withFrom", async () => {
      await client.models.withFrom({ name: "ok" });
    });
    it("should call withGlobal", async () => {
      await client.models.withGlobal({ name: "ok" });
    });
    it("should call withIf", async () => {
      await client.models.withIf({ name: "ok" });
    });
    it("should call withImport", async () => {
      await client.models.withImport({ name: "ok" });
    });
    it("should call withIn", async () => {
      await client.models.withIn({ name: "ok" });
    });
    it("should call withIs", async () => {
      await client.models.withIs({ name: "ok" });
    });
    it("should call withLambda", async () => {
      await client.models.withLambda({ name: "ok" });
    });
    it("should call withNot", async () => {
      await client.models.withNot({ name: "ok" });
    });
    it("should call withOr", async () => {
      await client.models.withOr({ name: "ok" });
    });
    it("should call withPass", async () => {
      await client.models.withPass({ name: "ok" });
    });
    it("should call withRaise", async () => {
      await client.models.withRaise({ name: "ok" });
    });
    it("should call withReturn", async () => {
      await client.models.withReturn({ name: "ok" });
    });
    it("should call withTry", async () => {
      await client.models.withTry({ name: "ok" });
    });
    it("should call withWhile", async () => {
      await client.models.withWhile({ name: "ok" });
    });
    it("should call withWith", async () => {
      await client.models.withWith({ name: "ok" });
    });
    it("should call withYield", async () => {
      await client.models.withYield({ name: "ok" });
    });
  });

  /**
   * Tests that special property patterns work correctly:
   * - sameAsModel: property named same as its model type
   * - dictMethods: properties named after dict methods (keys, values, items, get)
   * - withList: model containing list-like property patterns
   */
  describe("ModelProperties", () => {
    it("should call sameAsModel", async () => {
      await client.modelProperties.sameAsModel({ sameAsModel: "ok" });
    });

    it("should call dictMethods", async () => {
      await client.modelProperties.dictMethods({
        keys: "ok",
        values: "ok",
        items: "ok",
        get: "ok",
        popitem: "ok",
        clear: "ok",
        update: "ok",
        setdefault: "ok",
        pop: "ok",
        copy: "ok",
      });
    });

    it("should call withList", async () => {
      await client.modelProperties.withList({
        list: "ok",
      });
    });
  });
});
