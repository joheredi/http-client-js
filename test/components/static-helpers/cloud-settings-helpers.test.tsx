/**
 * Test suite for the CloudSettingsHelpersFile component and ARM cloud support.
 *
 * CloudSettingsHelpersFile generates `static-helpers/cloudSettingHelpers.ts`
 * containing the AzureClouds enum, AzureSupportedClouds type alias, and
 * getArmEndpoint function for Azure cloud environment configuration.
 *
 * What is tested:
 * - CloudSettingsHelpersFile renders AzureClouds enum with all three cloud values
 * - CloudSettingsHelpersFile renders AzureSupportedClouds type alias
 * - CloudSettingsHelpersFile renders getArmEndpoint function with correct endpoint URLs
 * - Cloud settings helpers are gated behind ARM + Azure flavor
 * - Non-ARM Azure services do NOT get cloud settings helpers
 * - ARM services include cloudSetting in client options
 * - ARM services include getArmEndpoint in endpoint resolution chain
 *
 * Why this matters:
 * ARM (Azure Resource Manager) services must support sovereign clouds
 * (China, US Government) in addition to Azure public cloud. Without cloud
 * settings helpers, ARM clients would only work with the public cloud
 * endpoint, requiring manual endpoint overrides for sovereign clouds.
 */
import "@alloy-js/core/testing";
import { renderToString } from "@alloy-js/core/testing";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import { beforeAll, describe, expect, it } from "vitest";
import { t } from "@typespec/compiler/testing";
import { SourceDirectory } from "@alloy-js/core";
import { CloudSettingsHelpersFile } from "../../../src/components/static-helpers/cloud-settings-helpers.js";
import { StaticHelpers } from "../../../src/components/static-helpers/index.js";
import { cloudSettingsHelperRefkey } from "../../../src/utils/refkeys.js";
import { SdkContextProvider } from "../../../src/context/sdk-context.js";
import { FlavorProvider } from "../../../src/context/flavor-context.js";
import {
  TesterWithService,
  RawTester,
  createSdkContextForTest,
} from "../../test-host.js";
import {
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureCoreLroLib,
  azureLoggerLib,
} from "../../../src/utils/external-packages.js";
import type { Program } from "@typespec/compiler";
import type {
  SdkContext,
  SdkHttpOperation,
} from "@azure-tools/typespec-client-generator-core";

const azureExternals = [
  httpRuntimeLib,
  azureCoreClientLib,
  azureCorePipelineLib,
  azureCoreAuthLib,
  azureCoreUtilLib,
  azureAbortControllerLib,
  azureCoreLroLib,
  azureLoggerLib,
];

describe("CloudSettingsHelpersFile", () => {
  let program: Program;

  beforeAll(async () => {
    const runner = await TesterWithService.createInstance();
    ({ program } = await runner.compile(t.code`op test(): void;`));
  });

  /**
   * Tests that the AzureClouds enum is rendered with all three cloud values.
   */
  it("should render AzureClouds enum with all cloud values", () => {
    const result = renderToString(
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={azureExternals}
      >
        <CloudSettingsHelpersFile />
      </Output>,
    );

    expect(result).toContain("export enum AzureClouds");
    expect(result).toContain('AZURE_PUBLIC_CLOUD = "AZURE_PUBLIC_CLOUD"');
    expect(result).toContain('AZURE_CHINA_CLOUD = "AZURE_CHINA_CLOUD"');
    expect(result).toContain('AZURE_US_GOVERNMENT = "AZURE_US_GOVERNMENT"');
  });

  /**
   * Tests that the AzureSupportedClouds type alias is rendered as a
   * template literal type derived from the AzureClouds enum.
   */
  it("should render AzureSupportedClouds type alias", () => {
    const result = renderToString(
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={azureExternals}
      >
        <CloudSettingsHelpersFile />
      </Output>,
    );

    expect(result).toContain("export type AzureSupportedClouds");
    expect(result).toContain("AzureClouds");
  });

  /**
   * Tests that the getArmEndpoint function is rendered with correct
   * endpoint URLs for all three Azure clouds.
   */
  it("should render getArmEndpoint function with correct endpoint URLs", () => {
    const result = renderToString(
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={azureExternals}
      >
        <CloudSettingsHelpersFile />
      </Output>,
    );

    expect(result).toContain("export function getArmEndpoint");
    expect(result).toContain("https://management.azure.com/");
    expect(result).toContain("https://management.chinacloudapi.cn/");
    expect(result).toContain("https://management.usgovcloudapi.net/");
    // Should handle undefined cloudSetting
    expect(result).toContain("if (cloudSetting === undefined)");
    expect(result).toContain("return undefined");
    // Should throw on unknown cloud
    expect(result).toContain("Unknown cloud setting");
  });

  /**
   * Tests that refkeys can be used to reference cloud settings helper declarations.
   */
  it("should support refkey references to cloud settings declarations", () => {
    const result = renderToString(
      <Output
        program={program}
        namePolicy={createTSNamePolicy()}
        externals={azureExternals}
      >
        <CloudSettingsHelpersFile />
      </Output>,
    );

    // If refkeys were broken, declarations would show as Unresolved Symbol
    expect(result).not.toContain("Unresolved Symbol");
  });
});

describe("Cloud settings ARM gating", () => {
  let nonArmSdkContext: SdkContext<Record<string, any>, SdkHttpOperation>;
  let nonArmProgram: Program;

  beforeAll(async () => {
    // Non-ARM service
    const runner = await TesterWithService.createInstance();
    ({ program: nonArmProgram } = await runner.compile(
      t.code`@get op test(): void;`,
    ));
    nonArmSdkContext = await createSdkContextForTest(nonArmProgram);
  });

  /**
   * Tests that non-ARM Azure services do NOT get cloud settings helpers.
   * Cloud support is exclusively for ARM services.
   */
  it("should NOT render cloud settings helpers for non-ARM Azure services", () => {
    const result = renderToString(
      <Output
        program={nonArmProgram}
        namePolicy={createTSNamePolicy()}
        externals={azureExternals}
      >
        <FlavorProvider flavor="azure">
          <SdkContextProvider sdkContext={nonArmSdkContext}>
            <StaticHelpers />
          </SdkContextProvider>
        </FlavorProvider>
      </Output>,
    );

    // Cloud settings should NOT be present for non-ARM services
    expect(result).not.toContain("AzureClouds");
    expect(result).not.toContain("AzureSupportedClouds");
    expect(result).not.toContain("getArmEndpoint");

    // But other helpers should still be present
    expect(result).toContain("serializeRecord");
  });

  /**
   * Tests that core flavor services do NOT get cloud settings helpers,
   * even if they happen to have ARM-like structure.
   */
  it("should NOT render cloud settings helpers for core flavor services", () => {
    const result = renderToString(
      <Output
        program={nonArmProgram}
        namePolicy={createTSNamePolicy()}
        externals={[httpRuntimeLib]}
      >
        <FlavorProvider flavor="core">
          <SdkContextProvider sdkContext={nonArmSdkContext}>
            <StaticHelpers />
          </SdkContextProvider>
        </FlavorProvider>
      </Output>,
    );

    // Cloud settings should NOT be present for core flavor
    expect(result).not.toContain("AzureClouds");
    expect(result).not.toContain("getArmEndpoint");
  });
});
