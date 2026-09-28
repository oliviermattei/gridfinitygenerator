// PROTOTYPE JETABLE : exécute UN cas de bench dans un processus isolé (mémoire max propre, timeout possible).
// Entrée : JSON en argv[2]. Sortie : une ligne JSON sur stdout.
import { median } from './common.mjs';

const c = JSON.parse(process.argv[2]);
const rss0 = process.memoryUsage().rss;
const E = c.engine === 'manifold' ? await import('./engine-manifold.mjs') : await import('./engine-jscad.mjs');
const tInit0 = performance.now();
await E.init();
const initMs = performance.now() - tInit0;
const v = E.VARIANTS[c.variant];

// échauffement (JIT / WASM) sur 2x2, même configuration
E.build({ ...c, nx: 2, ny: 2 });

const gen = [];
let r;
const t0 = performance.now();
r = E.build(c);
gen.push(performance.now() - t0);
const runs = gen[0] > 5000 ? 1 : gen[0] > 1000 ? 3 : c.quality === 'preview' ? 9 : 7;
for (let i = 1; i < runs; i++) {
  r = null;
  if (globalThis.gc) globalThis.gc();
  const t = performance.now();
  r = E.build(c);
  gen.push(performance.now() - t);
}
const heapAfter = process.memoryUsage().heapUsed;
const out = {
  ...c,
  initMs: +initMs.toFixed(1),
  runs,
  genMs: +median(gen).toFixed(1),
  genMinMs: +Math.min(...gen).toFixed(1),
  numTri: r.numTri,
  status: r.status ?? null,
};

if (!v.previewOnly && c.quality === 'final' && !c.noExport) {
  const ex = (fn) => {
    const ts = [];
    let buf;
    const n = gen[0] > 3000 ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const t = performance.now();
      buf = fn(r);
      ts.push(performance.now() - t);
    }
    return [median(ts), buf.length];
  };
  const [stlMs, stlBytes] = ex(E.exportStl);
  const [mfMs, mfBytes] = ex(E.export3mf);
  Object.assign(out, { stlMs: +stlMs.toFixed(1), stlKB: Math.round(stlBytes / 1024), mfMs: +mfMs.toFixed(1), mfKB: Math.round(mfBytes / 1024) });
}

out.maxRssMB = Math.round(process.resourceUsage().maxRSS / 1024);
out.rss0MB = Math.round(rss0 / 1048576);
out.heapMB = Math.round(heapAfter / 1048576);

// validité manifold (hors chrono) : via manifold-3d pour tout le monde
if (!v.previewOnly && c.validate) {
  const M = await import('./engine-manifold.mjs');
  await M.init();
  if (c.engine === 'manifold' && r.status === 'NoError') out.manifoldOk = true;
  else {
    const tris = r.tris ?? new Uint32Array(r.pos.length / 3).map((_, i) => i);
    const res = M.validateMesh(r.pos, tris);
    out.manifoldOk = res.status === 'NoError';
  }
}
process.stdout.write(JSON.stringify(out) + '\n');
