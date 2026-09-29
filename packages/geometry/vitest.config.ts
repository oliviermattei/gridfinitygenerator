import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The engine must run without a DOM (worker, CLI, MCP server).
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Precise performance measurements run locally only, see vitest.perf.config.ts.
    exclude: ["test/**/*.local.test.ts"],
    // 20 × 20 final meshes are measured by rebuilding them with manifold: give slow CI room.
    testTimeout: 30_000,
  },
});
