import alloyPlugin from "@alloy-js/rollup-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/components/**/*.test.ts",
      "test/components/**/*.test.tsx",
      "test/context/**/*.test.ts",
      "test/context/**/*.test.tsx",
      "test/utils/**/*.test.ts",
      "test/utils/**/*.test.tsx",
    ],
    passWithNoTests: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks",
  },
  esbuild: {
    jsx: "preserve",
    sourcemap: "both",
  },
  plugins: [alloyPlugin()],
});
