export default {
  optimizeDeps: { exclude: ['manifold-3d'] },
  worker: { format: 'es' },
  server: { port: 5178, fs: { allow: ['..'] } },
  build: { target: 'es2022' },
};
