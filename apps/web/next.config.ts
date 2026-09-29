import type { NextConfig } from "next";
import { DEFAULT_LOCALE } from "./lib/i18n";

const config: NextConfig = {
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ["@repo/geometry", "@repo/ui", "@repo/viewer"],
  poweredByHeader: false,
  // Agent instructions live in the root CLAUDE.md: do not generate AGENTS.md/CLAUDE.md here.
  agentRules: false,
  async redirects() {
    // Temporary: language detection on the first visit arrives with #14.
    return [{ source: "/", destination: `/${DEFAULT_LOCALE}/baseplate`, permanent: false }];
  },
};

export default config;
