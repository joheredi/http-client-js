import alloyPlugin from "@alloy-js/rollup-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    passWithNoTests: true,
    testTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        isolate: false,
      },
    },
  },
  esbuild: {
    jsx: "preserve",
    sourcemap: "both",
  },
  plugins: [
    alloyPlugin(),
  ],
});
