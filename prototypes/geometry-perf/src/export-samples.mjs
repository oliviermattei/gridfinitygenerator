// PROTOTYPE JETABLE : écrit des STL/3MF de contrôle dans out/ pour validate.py (trimesh).
import { mkdirSync, writeFileSync } from 'node:fs';
import * as M from './engine-manifold.mjs';
import * as J from './engine-jscad.mjs';

await M.init();
mkdirSync('out', { recursive: true });
const plan = [
  ['manifold', M, ['batch', 'direct', 'brickMesh']],
  ['jscad', J, ['batch', 'brickMesh']],
];
const report = [];
for (const [name, E, variants] of plan)
  for (const variant of variants)
    for (const n of [2, 5])
      for (const magnets of [false, true]) {
        const r = E.build({ nx: n, ny: n, magnets, quality: 'final', variant });
        const base = `out/${name}-${variant}-${n}x${n}-${magnets ? 'mag' : 'nomag'}`;
        writeFileSync(base + '.stl', E.exportStl(r));
        writeFileSync(base + '.3mf', E.export3mf(r));
        // validation manifold-3d (fusion des sommets + construction d'un Manifold)
        const tris = r.tris ?? new Uint32Array(r.pos.length / 3).map((_, i) => i);
        const v = M.validateMesh(r.pos, tris);
        report.push({ file: base, numTri: r.numTri, manifold3d: v.status, volume: v.volume, genus: v.genus });
        console.log(base, r.numTri, 'manifold-3d:', v.status, v.volume?.toFixed(1) ?? '', v.genus ?? '');
      }
writeFileSync('out/manifold3d-validation.json', JSON.stringify(report, null, 2));
