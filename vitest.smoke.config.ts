import alloyPlugin from "@alloy-js/rollup-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/smoke/**/*.test.ts", "test/smoke/**/*.test.tsx"],
    passWithNoTests: true,
    testTimeout: 180000,
    hookTimeout: 180000,
    pool: "forks",
  },
  esbuild: {
    jsx: "preserve",
    sourcemap: "both",
  },
  plugins: [alloyPlugin()],
});
