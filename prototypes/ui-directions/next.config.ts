import type { NextConfig } from "next";

const config: NextConfig = {
  // Prototype jetable : on ne bloque pas le dev sur les indicateurs.
  devIndicators: false,
  agentRules: false,
};

export default config;
