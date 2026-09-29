import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ["@repo/geometry", "@repo/ui", "@repo/viewer"],
  poweredByHeader: false,
  // Agent instructions live in the root CLAUDE.md: do not generate AGENTS.md/CLAUDE.md here.
  agentRules: false,
};

export default config;
