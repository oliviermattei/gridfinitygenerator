// PROTOTYPE JETABLE (#36). Tout est servi par cette origine : public/vendor (OpenCV.js, runtime ORT)
// et public/models (SlimSAM), déposés par `pnpm assets`.
export default {
  optimizeDeps: { exclude: ["manifold-3d", "@huggingface/transformers"] },
  // Page isolée (COOP/COEP) : sans elle, pas de SharedArrayBuffer, donc le WASM d'ORT sur un seul fil.
  server: { port: 5179, headers: { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" } },
  build: { target: "es2022" },
  test: { include: ["bench.test.ts"], testTimeout: 600_000 },
};
