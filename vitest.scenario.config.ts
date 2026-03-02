import alloyPlugin from "@alloy-js/rollup-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/scenarios/**/*.test.ts", "test/scenarios/**/*.test.tsx"],
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
