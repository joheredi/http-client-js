/**
 * E2E tests for Routes — validates URL routing, path/query parameter expansion.
 *
 * Spector spec: routes
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Fixed routes resolve correctly (root and in-interface)
 * - Path parameters work with template-only, explicit, and annotation-only styles
 * - Reserved expansion handles URL encoding correctly (with skipUrlEncoding option)
 * - Simple, path, label, and matrix expansion styles work in standard/explode modes
 * - Query parameters work with template-only, explicit, annotation-only styles
 * - Query expansion and continuation styles work in standard/explode modes
 * - Each expansion style handles primitive, array, and record parameter types
 */
import { describe, expect, it } from "vitest";
import { RoutesClient } from "../../generated/routes/src/index.js";

describe("Routes", () => {
  const client = new RoutesClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
  });

  // --- Fixed routes ---

  it("should handle fixed route in interface", async () => {
    await client.inInterface.fixed();
  });

  it("should handle fixed route at root", async () => {
    await client.fixed();
  });

  // --- Path Parameters ---

  describe("pathParameters", () => {
    it("should handle template-only path parameter", async () => {
      await client.pathParameters.templateOnly("a");
    });

    it("should handle explicit path parameter", async () => {
      await client.pathParameters.explicit("a");
    });

    it("should handle annotation-only path parameter", async () => {
      await client.pathParameters.annotationOnly("a");
    });

    describe("reservedExpansion", () => {
      it("should handle reserved expansion template", async () => {
        await client.pathParameters.reservedExpansion.template("foo/bar baz");
      });

      it("should handle reserved expansion template with skipUrlEncoding=true", async () => {
        await client.pathParameters.reservedExpansion.template("foo/bar baz", {
          requestOptions: { skipUrlEncoding: true },
        });
      });

      it("should fail reserved expansion template with skipUrlEncoding=false", async () => {
        try {
          await client.pathParameters.reservedExpansion.template(
            "foo/bar baz",
            {
              requestOptions: { skipUrlEncoding: false },
            },
          );
          expect.fail("Should have failed because path parameter was encoded");
        } catch (error: any) {
          expect(error.statusCode).toBe(404);
        }
      });

      it("should handle reserved expansion annotation", async () => {
        await client.pathParameters.reservedExpansion.annotation("foo/bar baz");
      });
    });

    describe("simpleExpansion", () => {
      describe("standard", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.simpleExpansion.standard.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.simpleExpansion.standard.array([
            "a",
            "b",
          ]);
        });

        it("should handle record", async () => {
          await client.pathParameters.simpleExpansion.standard.record({
            a: 1,
            b: 2,
          });
        });
      });

      describe("explode", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.simpleExpansion.explode.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.simpleExpansion.explode.array(["a", "b"]);
        });

        it("should handle record", async () => {
          await client.pathParameters.simpleExpansion.explode.record({
            a: 1,
            b: 2,
          });
        });
      });
    });

    describe("pathExpansion", () => {
      describe("standard", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.pathExpansion.standard.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.pathExpansion.standard.array(["a", "b"]);
        });

        it("should handle record", async () => {
          await client.pathParameters.pathExpansion.standard.record({
            a: 1,
            b: 2,
          });
        });
      });

      describe("explode", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.pathExpansion.explode.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.pathExpansion.explode.array(["a", "b"]);
        });

        it("should handle record", async () => {
          await client.pathParameters.pathExpansion.explode.record({
            a: 1,
            b: 2,
          });
        });
      });
    });

    describe("labelExpansion", () => {
      describe("standard", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.labelExpansion.standard.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.labelExpansion.standard.array(["a", "b"]);
        });

        it("should handle record", async () => {
          await client.pathParameters.labelExpansion.standard.record({
            a: 1,
            b: 2,
          });
        });
      });

      describe("explode", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.labelExpansion.explode.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.labelExpansion.explode.array(["a", "b"]);
        });

        it("should handle record", async () => {
          await client.pathParameters.labelExpansion.explode.record({
            a: 1,
            b: 2,
          });
        });
      });
    });

    describe("matrixExpansion", () => {
      describe("standard", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.matrixExpansion.standard.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.matrixExpansion.standard.array([
            "a",
            "b",
          ]);
        });

        it("should handle record", async () => {
          await client.pathParameters.matrixExpansion.standard.record({
            a: 1,
            b: 2,
          });
        });
      });

      describe("explode", () => {
        it("should handle primitive", async () => {
          await client.pathParameters.matrixExpansion.explode.primitive("a");
        });

        it("should handle array", async () => {
          await client.pathParameters.matrixExpansion.explode.array(["a", "b"]);
        });

        it("should handle record", async () => {
          await client.pathParameters.matrixExpansion.explode.record({
            a: 1,
            b: 2,
          });
        });
      });
    });
  });

  // --- Query Parameters ---

  describe("queryParameters", () => {
    it("should handle template-only query parameter", async () => {
      await client.queryParameters.templateOnly("a");
    });

    it("should handle explicit query parameter", async () => {
      await client.queryParameters.explicit("a");
    });

    it("should handle annotation-only query parameter", async () => {
      await client.queryParameters.annotationOnly("a");
    });

    describe("queryExpansion", () => {
      describe("standard", () => {
        it("should handle primitive", async () => {
          await client.queryParameters.queryExpansion.standard.primitive("a");
        });

        it("should handle array", async () => {
          await client.queryParameters.queryExpansion.standard.array([
            "a",
            "b",
          ]);
        });

        it("should handle record", async () => {
          await client.queryParameters.queryExpansion.standard.record({
            a: 1,
            b: 2,
          });
        });
      });

      describe("explode", () => {
        it("should handle primitive", async () => {
          await client.queryParameters.queryExpansion.explode.primitive("a");
        });

        it("should handle array", async () => {
          await client.queryParameters.queryExpansion.explode.array(["a", "b"]);
        });

        it("should handle record", async () => {
          await client.queryParameters.queryExpansion.explode.record({
            a: 1,
            b: 2,
          });
        });
      });
    });

    describe("queryContinuation", () => {
      describe("standard", () => {
        it("should handle primitive", async () => {
          await client.queryParameters.queryContinuation.standard.primitive(
            "a",
          );
        });

        it("should handle array", async () => {
          await client.queryParameters.queryContinuation.standard.array([
            "a",
            "b",
          ]);
        });

        it("should handle record", async () => {
          await client.queryParameters.queryContinuation.standard.record({
            a: 1,
            b: 2,
          });
        });
      });

      describe("explode", () => {
        it("should handle primitive", async () => {
          await client.queryParameters.queryContinuation.explode.primitive("a");
        });

        it("should handle array", async () => {
          await client.queryParameters.queryContinuation.explode.array([
            "a",
            "b",
          ]);
        });

        it("should handle record", async () => {
          await client.queryParameters.queryContinuation.explode.record({
            a: 1,
            b: 2,
          });
        });
      });
    });
  });
});
