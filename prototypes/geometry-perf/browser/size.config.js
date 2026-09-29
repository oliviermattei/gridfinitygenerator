// Mesure de la taille des bundles par moteur : ENGINE=manifold|jscad vite build -c browser/size.config.js
const engine = process.env.ENGINE || 'manifold';
export default {
  build: {
    target: 'es2022',
    outDir: `size/${engine}`,
    emptyOutDir: true,
    minify: true,
    lib: { entry: `src/engine-${engine}.mjs`, formats: ['es'], fileName: engine },
  },
};
