// PROTOTYPE JETABLE (#36). Tout est servi par cette origine : public/vendor (OpenCV.js, runtime ORT)
// et public/models (SlimSAM), déposés par `pnpm assets`.
export default {
  optimizeDeps: { exclude: ["manifold-3d", "@huggingface/transformers"] },
  server: { port: 5179 },
  build: { target: "es2022" },
  test: { include: ["bench.test.ts"], testTimeout: 600_000 },
};
