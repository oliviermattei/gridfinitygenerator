import { defineConfig } from "vitest/config";

// Local performance measurements against the spec v1 targets (`pnpm test:perf`).
// Not part of `pnpm test` nor CI: timings depend on the machine and its load.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.local.test.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
  },
});
