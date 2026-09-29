import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The engine must run without a DOM (worker, CLI, MCP server).
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
