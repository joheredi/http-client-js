import { SourceFile } from "@alloy-js/core";

const VITEST_NODE_CONFIG = `import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "../../../vitest.shared.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      testTimeout: 250000,
    },
  }),
);
`;

const VITEST_BROWSER_CONFIG = `import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "../../../vitest.browser.shared.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      testTimeout: 250000,
    },
  }),
);
`;

const VITEST_ESM_CONFIG = `import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "../../../vitest.esm.shared.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      testTimeout: 250000,
    },
  }),
);
`;

/**
 * Generates vitest configuration files for node, browser, and ESM test runners.
 */
export function VitestConfigs() {
  return (
    <>
      <SourceFile path="vitest.config.ts" filetype="typescript">
        {VITEST_NODE_CONFIG}
      </SourceFile>
      <SourceFile path="vitest.browser.config.ts" filetype="typescript">
        {VITEST_BROWSER_CONFIG}
      </SourceFile>
      <SourceFile path="vitest.esm.config.ts" filetype="typescript">
        {VITEST_ESM_CONFIG}
      </SourceFile>
    </>
  );
}
