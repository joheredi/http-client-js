/**
 * E2E tests for Parameters.Spread — validates TypeSpec spread parameter behavior.
 *
 * Spector spec: parameters/spread
 * Mock server: http://localhost:3002
 *
 * Tests verify that:
 * - Named model spread flattens body parameters into individual function args
 * - Composite requests correctly split across path, header, and body
 * - Alias spread supports multi-parameter and inner model/alias scenarios
 * - Header parameters with wire names like `x-ms-test-header` are normalized
 *   to valid TypeScript identifiers (e.g., `xMsTestHeader`) in the generated API
 */
import { describe, it } from "vitest";
import { SpreadClient } from "../../../generated/parameters/spread/src/index.js";

describe("Parameters.Spread", () => {
  const client = new SpreadClient({
    endpoint: "http://localhost:3002",
    allowInsecureConnection: true,
    retryOptions: { maxRetries: 0 },
  });

  // --- Model group: tests spread of named models ---

  it("should spread named model as request body", async () => {
    // Verifies spread flattens BodyParameter { name: string } into a direct `name` param
    await client.model.spreadAsRequestBody("foo");
  });

  it("should spread composite request only with body", async () => {
    // Verifies spread of a model containing only @body — passes BodyParameter object
    await client.model.spreadCompositeRequestOnlyWithBody({ name: "foo" });
  });

  it("should spread composite request without body", async () => {
    // Verifies spread of model with @path name + @header testHeader, no body
    await client.model.spreadCompositeRequestWithoutBody("foo", "bar");
  });

  it("should spread composite request", async () => {
    // Verifies spread of model with @path, @header, and @body combined
    await client.model.spreadCompositeRequest("foo", "bar", { name: "foo" });
  });

  it("should spread composite request mix", async () => {
    // Verifies spread of model mixing @path, @header, and a regular body property
    await client.model.spreadCompositeRequestMix("foo", "bar", "foo");
  });

  // --- Alias group: tests spread of alias (anonymous) types ---

  it("should spread alias as request body", async () => {
    // Verifies alias spread flattens { name: string } into a direct param
    await client.alias.spreadAsRequestBody("foo");
  });

  it("should spread alias as request parameter", async () => {
    // Verifies alias spread with @path id, @header x-ms-test-header, and body name
    // The header param `x-ms-test-header` becomes `xMsTestHeader` in the TypeScript API
    await client.alias.spreadAsRequestParameter("1", "bar", "foo");
  });

  it("should spread alias with multiple parameters", async () => {
    // Verifies alias spread with 6 parameters: path, header, required+optional body fields
    await client.alias.spreadWithMultipleParameters("1", "bar", "foo", [1, 2], {
      optionalInt: 1,
      optionalStringList: ["foo", "bar"],
    });
  });

  it("should spread alias with inner model parameter", async () => {
    // Verifies alias that spreads an inner model (InnerModel { name: string })
    await client.alias.spreadParameterWithInnerModel("1", "foo", "bar");
  });

  it("should spread alias with inner alias parameter", async () => {
    // Verifies alias that spreads an inner alias (name: string, age: int32)
    await client.alias.spreadParameterWithInnerAlias("1", "foo", 1, "bar");
  });
});
