import { SourceFile } from "@alloy-js/core";

const API_EXTRACTOR_CONFIG = JSON.stringify(
  {
    $schema:
      "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
    mainEntryPointFilePath: "./dist/index.d.ts",
    docModel: {
      enabled: true,
    },
    apiReport: {
      enabled: true,
      reportFolder: "./review",
    },
    dtsRollup: {
      enabled: true,
      untrimmedFilePath: "",
      publicTrimmedFilePath: "./types/index.d.ts",
    },
    messages: {
      tsdocMessageReporting: {
        default: {
          logLevel: "none",
        },
      },
      extractorMessageReporting: {
        "ae-missing-release-tag": {
          logLevel: "none",
        },
        "ae-unresolved-link": {
          logLevel: "none",
        },
      },
    },
  },
  null,
  2,
);

/**
 * Generates an api-extractor.json configuration file.
 * Only rendered for Azure flavor packages.
 */
export function ApiExtractorConfig() {
  return (
    <SourceFile path="api-extractor.json" filetype="json">
      {API_EXTRACTOR_CONFIG}
    </SourceFile>
  );
}
