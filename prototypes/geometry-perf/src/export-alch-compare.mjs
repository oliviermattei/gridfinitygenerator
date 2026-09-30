// PROTOTYPE JETABLE : exporte une baseplate 4x4 Gridfinity (profil hybride) et une BaseGrid type ALCH 4x4
// (profil déduit de docs/research/modbox-alexandre-chappel.md, non officiel) pour comparer matière et assise.
// Lancer depuis prototypes/geometry-perf : node src/export-alch-compare.mjs
import { writeFileSync } from 'node:fs';
const base = './';
const E = await import(base + 'engine-manifold.mjs');
const C = await import(base + 'common.mjs');
const X = await import(base + 'export.mjs');
const W = await E.init();

const check = (pos, tris) => {
  const m = new W.Manifold(new W.Mesh({ numProp: 3, vertProperties: pos, triVerts: tris }));
  const b = m.boundingBox();
  const r = { status: m.status(), vol: m.volume(), tri: m.numTri(), size: [0, 1, 2].map((i) => (b.max[i] - b.min[i]).toFixed(2)).join(' x ') };
  m.delete();
  return r;
};

// Ours: 4x4, hybrid profile, no magnets (default)
const gf = E.build({ nx: 4, ny: 4, magnets: false, quality: 'final', variant: 'brickMesh' });
writeFileSync('results/stl/gridfinity-4x4-hybride.stl', Buffer.from(X.stlBinary(gf)));
console.log('gridfinity', check(gf.pos, gf.tris));

// ALCH-type BaseGrid (inferred, unofficial): 55 mm pitch, open frame, 45° frustum pocket per cell
// matching the community foot (45.1 bottom, r 3) + 0.25 clearance, height 4.5 -> 0.4 mm ridge flat.
const P = 55, n = 4, h = 4.5, c = 0.25, r = 3, seg = 32;
const bot = 45.1 + 2 * c;
const lay = (z, s) => ({ z, pts: C.roundedRectPoints(s, s, r, seg) });
const t = C.loftMesh([lay(-1, bot - 2), lay(0, bot), lay(h, bot + 2 * h), lay(h + 1, bot + 2 * h + 2)]);
const tool = new W.Manifold(new W.Mesh({ numProp: 3, vertProperties: t.pos, triVerts: t.tris }));
const slab = W.Manifold.extrude(new W.CrossSection([C.roundedRectPoints(n * P, n * P, 4, seg)]), h);
const cuts = [];
for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cuts.push(tool.translate([(-n / 2 + i + 0.5) * P, (-n / 2 + j + 0.5) * P, 0]));
const g = slab.subtract(W.Manifold.compose(cuts)).getMesh();
const alch = { pos: g.vertProperties, tris: g.triVerts };
writeFileSync('results/stl/alch-type-4x4.stl', Buffer.from(X.stlBinary(alch)));
console.log('alch', check(alch.pos, alch.tris));
