import { createTypeSpecLibrary, type JSONSchemaType } from "@typespec/compiler";

export interface HttpClientJsEmitterOptions {
  "generate-metadata"?: boolean;
  flavor?: string;
  "include-headers-in-response"?: boolean;
  "experimental-extensible-enums"?: boolean;
  "ignore-nullable-on-optional"?: boolean;
  "compatibility-mode"?: boolean;
  "typespec-title-map"?: Record<string, string>;
  "package-name"?: string;
  "package-version"?: string;
}

const EmitterOptionsSchema: JSONSchemaType<HttpClientJsEmitterOptions> = {
  type: "object",
  additionalProperties: true,
  properties: {
    "generate-metadata": {
      type: "boolean",
      nullable: true,
      description:
        "Whether to generate metadata files (package.json, tsconfig.json, README.md, etc.). Defaults to false.",
    },
    flavor: {
      type: "string",
      nullable: true,
      description:
        'SDK flavor. Use "azure" for Azure SDK packages, otherwise defaults to "core".',
    },
    "include-headers-in-response": {
      type: "boolean",
      nullable: true,
      description:
        "Whether to generate header deserialization functions for responses.",
    },
    "experimental-extensible-enums": {
      type: "boolean",
      nullable: true,
      description:
        "Whether to render extensible enums with the KnownXxx pattern.",
    },
    "ignore-nullable-on-optional": {
      type: "boolean",
      nullable: true,
      description:
        "Whether to strip | null from optional properties. Defaults to true for Azure flavor.",
    },
    "compatibility-mode": {
      type: "boolean",
      nullable: true,
      description:
        "Whether to use compatibility mode for additional properties handling. When true, models with additionalProperties extend Record<string, T> directly. When false (default), an explicit additionalProperties bag property is generated.",
    },
    "typespec-title-map": {
      type: "object",
      nullable: true,
      additionalProperties: { type: "string" },
      required: [],
      description: "Map of original client names to desired renamed names.",
    },
    "package-name": {
      type: "string",
      nullable: true,
      description: "Name of the generated package for package.json.",
    },
    "package-version": {
      type: "string",
      nullable: true,
      description:
        "Version of the generated package for package.json. Defaults to 1.0.0-beta.1.",
    },
  },
  required: [],
};

export const $lib = createTypeSpecLibrary({
  name: "http-client-js",
  diagnostics: {},
  emitter: {
    options: EmitterOptionsSchema,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
