import { code, namekey } from "@alloy-js/core";
import {
  EnumDeclaration,
  EnumMember,
  FunctionDeclaration,
  SourceFile,
  TypeDeclaration,
} from "@alloy-js/typescript";
import { cloudSettingsHelperRefkey } from "../../utils/refkeys.js";

/**
 * Renders the `static-helpers/cloudSettingHelpers.ts` source file containing
 * types and a helper function for Azure cloud environment configuration.
 *
 * The cloud settings helpers provide:
 * - `AzureClouds`: Enum describing Azure cloud environments (Public, China, US Government)
 * - `AzureSupportedClouds`: String literal type derived from the enum
 * - `getArmEndpoint`: Function that resolves a cloud setting to an ARM endpoint URL
 *
 * These are only emitted for ARM (Azure Resource Manager) services.
 * Components reference them via `cloudSettingsHelperRefkey`. Alloy
 * auto-generates imports when these refkeys are used in operation code.
 *
 * The implementation matches the legacy emitter's `cloudSettingHelpers.ts`
 * static helper output.
 *
 * @returns An Alloy JSX tree for the cloud settings helpers source file.
 */
export function CloudSettingsHelpersFile() {
  return (
    <SourceFile path="cloudSettingHelpers.ts" export>
      <AzureCloudsEnum />
      {"\n\n"}
      <AzureSupportedCloudsType />
      {"\n\n"}
      <GetArmEndpointFunction />
    </SourceFile>
  );
}

/**
 * Renders the `AzureClouds` enum describing Azure cloud environments.
 *
 * Values:
 * - `AZURE_PUBLIC_CLOUD` — Azure public cloud (default)
 * - `AZURE_CHINA_CLOUD` — Azure China cloud
 * - `AZURE_US_GOVERNMENT` — Azure US government cloud
 */
function AzureCloudsEnum() {
  return (
    <EnumDeclaration
      name={namekey("AzureClouds", { ignoreNamePolicy: true })}
      refkey={cloudSettingsHelperRefkey("AzureClouds")}
      export
      doc="An enum to describe Azure Cloud environments."
    >
      <EnumMember
        name={namekey("AZURE_PUBLIC_CLOUD", { ignoreNamePolicy: true })}
        jsValue="AZURE_PUBLIC_CLOUD"
        doc="Azure public cloud, which is the default cloud for Azure SDKs."
      />
      {",\n"}
      <EnumMember
        name={namekey("AZURE_CHINA_CLOUD", { ignoreNamePolicy: true })}
        jsValue="AZURE_CHINA_CLOUD"
        doc="Azure China cloud"
      />
      {",\n"}
      <EnumMember
        name={namekey("AZURE_US_GOVERNMENT", { ignoreNamePolicy: true })}
        jsValue="AZURE_US_GOVERNMENT"
        doc="Azure US government cloud"
      />
    </EnumDeclaration>
  );
}

/**
 * Renders the `AzureSupportedClouds` type alias — a template literal type
 * derived from the `AzureClouds` enum values, providing string-based
 * type safety for cloud configuration.
 */
function AzureSupportedCloudsType() {
  return (
    <TypeDeclaration
      name={namekey("AzureSupportedClouds", { ignoreNamePolicy: true })}
      refkey={cloudSettingsHelperRefkey("AzureSupportedClouds")}
      export
      doc="The supported values for cloud setting as a string literal type."
    >
      {code`\`\${${cloudSettingsHelperRefkey("AzureClouds")}}\``}
    </TypeDeclaration>
  );
}

/**
 * Renders the `getArmEndpoint` function that resolves an Azure cloud
 * setting to the corresponding ARM (Azure Resource Manager) endpoint URL.
 *
 * Endpoint mappings:
 * - `AZURE_PUBLIC_CLOUD` → `https://management.azure.com/`
 * - `AZURE_CHINA_CLOUD` → `https://management.chinacloudapi.cn/`
 * - `AZURE_US_GOVERNMENT` → `https://management.usgovcloudapi.net/`
 *
 * Returns `undefined` when no cloud setting is provided, allowing
 * the caller to fall back to a default endpoint.
 */
function GetArmEndpointFunction() {
  return (
    <FunctionDeclaration
      name="getArmEndpoint"
      refkey={cloudSettingsHelperRefkey("getArmEndpoint")}
      export
      returnType="string | undefined"
      parameters={[
        {
          name: "cloudSetting",
          type: cloudSettingsHelperRefkey("AzureSupportedClouds"),
          optional: true,
        },
      ]}
    >
      {code`if (cloudSetting === undefined) {
  return undefined;
}
const cloudEndpoints: Record<keyof typeof ${cloudSettingsHelperRefkey("AzureClouds")}, string> = {
  AZURE_CHINA_CLOUD: "https://management.chinacloudapi.cn/",
  AZURE_US_GOVERNMENT: "https://management.usgovcloudapi.net/",
  AZURE_PUBLIC_CLOUD: "https://management.azure.com/",
};
if (cloudSetting in cloudEndpoints) {
  return cloudEndpoints[cloudSetting];
} else {
  throw new Error(
    \`Unknown cloud setting: \${cloudSetting}. Please refer to the enum AzureClouds for possible values.\`,
  );
}`}
    </FunctionDeclaration>
  );
}
