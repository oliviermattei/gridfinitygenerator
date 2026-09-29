import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([
    // Throwaway prototypes have their own package.json and lockfile.
    "prototypes/**",
    "**/node_modules/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/dist/**",
    "**/coverage/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "**/next-env.d.ts",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "apps/web/" },
      // Explicit version: eslint-plugin-react cannot auto-detect it under ESLint 10.
      react: { version: "19.3" },
    },
  },
  {
    // ADR 0003: the geometry engine stays pure TypeScript, independent of the interface.
    files: ["packages/geometry/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react/*", "react-dom", "react-dom/*", "next", "next/*"],
              message: "The geometry engine must not depend on React or Next.js.",
            },
            {
              group: ["three", "three/*", "@react-three/*", "@repo/ui", "@repo/viewer", "@repo/web"],
              message: "The geometry engine must not depend on the preview or the interface.",
            },
          ],
        },
      ],
    },
  },
  {
    // ADR 0003 and spec v1: the preview receives a mesh and knows nothing about the generator.
    files: ["packages/viewer/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@repo/geometry", "@repo/geometry/*", "manifold-3d", "@repo/web"],
              message: "The 3D preview must not depend on the geometry engine or the app.",
            },
          ],
        },
      ],
    },
  },
]);
