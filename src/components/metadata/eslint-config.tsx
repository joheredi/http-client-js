import { SourceFile } from "@alloy-js/core";

const ESLINT_CONFIG = `import azureSdkEslint from "@azure/eslint-plugin-azure-sdk";

export default [
  ...azureSdkEslint.configs.recommended,
  {
    rules: {
      "@azure/azure-sdk/ts-modules-only-named": "warn",
      "@azure/azure-sdk/ts-apiextractor-json-types": "warn",
      "@azure/azure-sdk/ts-package-json-types": "warn",
      "@azure/azure-sdk/ts-package-json-engine-is-present": "warn",
      "tsdoc/syntax": "warn",
    },
  },
];
`;

/**
 * Generates an eslint.config.mjs file with Azure SDK lint rules.
 * Only rendered for Azure flavor packages.
 */
export function EslintConfig() {
  return (
    <SourceFile path="eslint.config.mjs" filetype="text/javascript">
      {ESLINT_CONFIG}
    </SourceFile>
  );
}
