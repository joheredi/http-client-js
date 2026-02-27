import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "http-client-js",
  diagnostics: {},
});

export const { reportDiagnostic, createDiagnostic } = $lib;
