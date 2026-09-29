// PROTOTYPE JETABLE : mêmes moteurs que le bench Node, exécutés dans un Web Worker (module).
import * as M from '../src/engine-manifold.mjs';
import * as J from '../src/engine-jscad.mjs';
import { median } from '../src/common.mjs';

const t0 = performance.now();
await M.init();
postMessage({ step: 'manifold init (WASM)', ms: +(performance.now() - t0).toFixed(1) });

const cases = [
  ['manifold', M, 'brickMesh', 'preview', 10, true],
  ['manifold', M, 'brickMesh', 'final', 10, true],
  ['manifold', M, 'brickMesh', 'final', 20, true],
  ['manifold', M, 'batch', 'preview', 10, true],
  ['manifold', M, 'batch', 'final', 10, true],
  ['manifold', M, 'batch', 'final', 20, false],
  ['manifold', M, 'batch', 'final', 20, true],
  ['jscad', J, 'batch', 'preview', 10, true],
  ['jscad', J, 'batch', 'final', 10, true],
  ['jscad', J, 'batch', 'final', 20, true],
];
for (const [engine, E, variant, quality, n, magnets] of cases) {
  const c = { nx: n, ny: n, magnets, quality, variant };
  E.build({ ...c, nx: 2, ny: 2 });
  const ts = [];
  let r;
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    r = E.build(c);
    ts.push(performance.now() - t);
    if (ts[0] > 2000) break;
  }
  const t = performance.now();
  const stl = E.exportStl(r);
  const stlMs = performance.now() - t;
  postMessage({ engine, variant, quality, grid: `${n}x${n}`, magnets, genMs: +median(ts).toFixed(1), runs: ts.length, numTri: r.numTri, stlMs: +stlMs.toFixed(1), stlKB: Math.round(stl.length / 1024) });
}
postMessage({ done: true });
