// PROTOTYPE JETABLE : baseplate avec manifold-3d (WASM).
import Module from 'manifold-3d';
import {
  PROFILE,
  PROFILE_H,
  PITCH,
  OUTER_R,
  MAGNET,
  QUALITY,
  plateHeight,
  toolLayers,
  pocketLayer,
  roundedRectPoints,
  cellCenters,
  magnetCenters,
  loftMesh,
  assembleBricks,
} from './common.mjs';
import { stlBinary, threeMF } from './export.mjs';

let W; // module wasm initialisé

export async function init(opts) {
  if (!W) {
    W = await Module(opts);
    W.setup();
  }
  return W;
}

// Variantes mesurées. tool: 'hull' = chaîne de booléens 3D (union de hulls entre couches),
// 'loft' = maillage direct à partir des sections 2D.
export const VARIANTS = {
  naive: { tool: 'hull', perCell: true, mode: 'seqForced', label: 'outil recalculé par cellule + soustractions successives (évaluées à chaque pas)' },
  seq: { tool: 'hull', mode: 'seqForced', label: 'outil unique translaté + soustractions successives (évaluées à chaque pas)' },
  seqLazy: { tool: 'hull', mode: 'seqLazy', label: 'outil unique + soustractions successives, arbre CSG paresseux de manifold' },
  batchUnion: { tool: 'hull', mode: 'union', label: 'outil unique + Manifold.union(tableau) puis 1 soustraction' },
  batch: { tool: 'hull', mode: 'compose', label: 'outil unique + Manifold.compose(tableau) puis 1 soustraction' },
  batchLoft: { tool: 'loft', mode: 'compose', label: 'outil loft 2D + compose + 1 soustraction' },
  bricks: { tool: 'loft', mode: 'bricks', label: 'brique de cellule (cube - outil) + union des briques ∩ contour (façon extrabold)' },
  direct: { tool: 'loft', mode: 'direct', label: 'maillage direct par sections 2D (parois lofted + dessus/dessous triangulés), 0 booléen 3D sans aimants' },
  brickMesh: { tool: 'loft', mode: 'brickMesh', label: 'briques assemblées au niveau maillage (copie + soudure des coutures), 0 booléen global' },
  instanced: { tool: 'loft', mode: 'instanced', previewOnly: true, label: 'aperçu : 1 brique + 4 coins, InstancedMesh (pas de maillage global)' },
};

function withArena(fn) {
  const arena = [];
  const k = (m) => (arena.push(m), m);
  try {
    return fn(k);
  } finally {
    for (const m of arena) m.delete();
  }
}

function layers3d(magnets, seg) {
  return toolLayers(magnets).map(([z, d]) => ({ z, pts: pocketLayer(d, seg) }));
}

function toolHull(k, magnets, seg) {
  const L = layers3d(magnets, seg);
  let acc = null;
  for (let i = 0; i < L.length - 1; i++) {
    const pts = [...L[i].pts.map(([x, y]) => [x, y, L[i].z]), ...L[i + 1].pts.map(([x, y]) => [x, y, L[i + 1].z])];
    const h = k(W.Manifold.hull(pts));
    acc = acc ? k(acc.add(h)) : h;
  }
  return acc;
}

function toolLoft(k, magnets, seg) {
  const { pos, tris } = loftMesh(layers3d(magnets, seg));
  return k(new W.Manifold(new W.Mesh({ numProp: 3, vertProperties: pos, triVerts: tris })));
}

function cellTool(k, v, magnets, q) {
  let t = v.tool === 'loft' ? toolLoft(k, magnets, q.corner) : toolHull(k, magnets, q.corner);
  if (!magnets) return t;
  const mb = MAGNET.base;
  const lo = MAGNET.offset - MAGNET.block / 2;
  const hi = PITCH / 2 + 1;
  const block = k(W.Manifold.cube([hi - lo, hi - lo, mb + 2]).translate([lo, lo, -2]));
  const blocks = k(W.Manifold.union([0, 1, 2, 3].map((i) => k(block.rotate([0, 0, 90 * i])))));
  const hole = k(W.Manifold.cylinder(MAGNET.depth + 0.5, MAGNET.d / 2, MAGNET.d / 2, q.hole));
  const holes = k(W.Manifold.union(magnetCenters().map(([x, y]) => k(hole.translate([x, y, mb - MAGNET.depth])))));
  return k(k(t.subtract(blocks)).add(holes));
}

function slab(k, nx, ny, magnets, q) {
  const cs = k(new W.CrossSection([roundedRectPoints(nx * PITCH, ny * PITCH, OUTER_R, q.corner)]));
  return k(W.Manifold.extrude(cs, plateHeight(magnets)));
}

export function build({ nx, ny, magnets, quality, variant }) {
  const v = VARIANTS[variant];
  const q = QUALITY[quality];
  return withArena((k) => {
    const centers = cellCenters(nx, ny);
    let plate = slab(k, nx, ny, magnets, q);
    let result;
    if (v.mode === 'seqForced' || v.mode === 'seqLazy') {
      const shared = v.perCell ? null : cellTool(k, v, magnets, q);
      const first = plate;
      for (const [x, y] of centers) {
        // outil recalculé par cellule : sa propre arène, libérée tout de suite
        const t = v.perCell ? null : shared.translate([x, y, 0]);
        const next = v.perCell
          ? withArena((k2) => plate.subtract(k2(cellTool(k2, v, magnets, q).translate([x, y, 0]))))
          : plate.subtract(t);
        if (t) t.delete();
        if (v.mode === 'seqForced') next.numTri(); // force l'évaluation (comportement « naïf »)
        if (plate !== first) plate.delete();
        plate = next;
      }
      result = k(plate);
    } else if (v.mode === 'union' || v.mode === 'compose') {
      const t = cellTool(k, v, magnets, q);
      const copies = centers.map(([x, y]) => k(t.translate([x, y, 0])));
      const all = k(v.mode === 'union' ? W.Manifold.union(copies) : W.Manifold.compose(copies));
      result = k(plate.subtract(all));
    } else if (v.mode === 'bricks') {
      const t = cellTool(k, v, magnets, q);
      const cube = k(W.Manifold.cube([PITCH, PITCH, plateHeight(magnets)]).translate([-PITCH / 2, -PITCH / 2, 0]));
      const brick = k(cube.subtract(t));
      const all = k(W.Manifold.union(centers.map(([x, y]) => k(brick.translate([x, y, 0])))));
      result = k(all.intersect(plate));
    } else if (v.mode === 'direct') {
      result = directPlate(k, nx, ny, magnets, q);
    } else if (v.mode === 'brickMesh') {
      return brickMesh(k, v, nx, ny, magnets, q);
    } else if (v.mode === 'instanced') {
      // aperçu : 1 brique intérieure + 4 briques de coin, rendues en InstancedMesh (pas de booléen global)
      const t = cellTool(k, v, magnets, q);
      const H = plateHeight(magnets);
      const brick = k(k(W.Manifold.cube([PITCH, PITCH, H]).translate([-PITCH / 2, -PITCH / 2, 0])).subtract(t));
      const hx = (nx / 2 - 0.5) * PITCH,
        hy = (ny / 2 - 0.5) * PITCH;
      const corners = [
        [hx, hy],
        [-hx, hy],
        [-hx, -hy],
        [hx, -hy],
      ].map(([x, y]) => k(k(brick.translate([x, y, 0])).intersect(plate)));
      const meshes = [brick, ...corners].map((m) => {
        const g = m.getMesh();
        return { pos: g.vertProperties.slice(), tris: g.triVerts.slice() };
      });
      const inst = new Float32Array(16 * centers.length);
      centers.forEach(([x, y], i) => inst.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, 0, 1], 16 * i));
      const bt = meshes[0].tris.length / 3;
      const numTri = bt * (centers.length - 4) + meshes.slice(1).reduce((s, m) => s + m.tris.length / 3, 0);
      return { meshes, inst, numTri, status: 'n/a (instances)', pos: null, tris: null };
    }
    const status = result.status();
    const mesh = result.getMesh();
    // copie hors du tas WASM (ce qu'on enverrait au thread principal pour three.js)
    const pos = mesh.numProp === 3 ? mesh.vertProperties.slice() : strip(mesh);
    const tris = mesh.triVerts.slice();
    return { pos, tris, numTri: tris.length / 3, status, genus: result.genus(), volume: result.volume() };
  });
}

// Maillage direct de la partie profilée (z0 -> z0 + 4,6) : murs extérieurs + parois de poches lofted
// + dessus/dessous triangulés (contour + trous) avec W.triangulate. Aucun booléen 3D.
function directUpper(k, nx, ny, z0, q) {
  const H = z0 + PROFILE_H;
  const pos = [];
  const tris = [];
  const ring = (pts, z, cx = 0, cy = 0) => {
    const b = pos.length / 3;
    for (const [x, y] of pts) pos.push(x + cx, y + cy, z);
    return b;
  };
  const outer = roundedRectPoints(nx * PITCH, ny * PITCH, OUTER_R, q.corner);
  const k0 = outer.length;
  const o0 = ring(outer, z0),
    o1 = ring(outer, H);
  for (let i = 0; i < k0; i++) {
    const j = (i + 1) % k0;
    tris.push(o0 + i, o0 + j, o1 + j, o0 + i, o1 + j, o1 + i);
  }
  const layers = PROFILE.map(([z, d]) => ({ z: z + z0, pts: pocketLayer(d, q.corner) }));
  const kk = layers[0].pts.length;
  const bot = [],
    top = [];
  for (const [cx, cy] of cellCenters(nx, ny)) {
    const base = layers.map((L) => ring(L.pts, L.z, cx, cy));
    for (let li = 0; li < base.length - 1; li++) {
      const a = base[li],
        b = base[li + 1];
      for (let i = 0; i < kk; i++) {
        const j = (i + 1) % kk;
        tris.push(a + i, b + j, a + j, a + i, b + i, b + j); // orientation inversée : paroi de trou
      }
    }
    bot.push(base[0]);
    top.push(base[base.length - 1]);
  }
  const cap = (ob, holes, up) => {
    const idx = [];
    const polys = [];
    const poly = (b, n, rev) => {
      const p = [];
      for (let s = 0; s < n; s++) {
        const i = rev ? b + n - 1 - s : b + s;
        idx.push(i);
        p.push([pos[3 * i], pos[3 * i + 1]]);
      }
      polys.push(p);
    };
    poly(ob, k0, false);
    for (const h of holes) poly(h, kk, true);
    for (const [a, b, c] of W.triangulate(polys, 1e-6)) up ? tris.push(idx[a], idx[b], idx[c]) : tris.push(idx[a], idx[c], idx[b]);
  };
  cap(o1, top, true);
  cap(o0, bot, false);
  return k(new W.Manifold(new W.Mesh({ numProp: 3, vertProperties: new Float32Array(pos), triVerts: new Uint32Array(tris) })));
}

function directPlate(k, nx, ny, magnets, q) {
  if (!magnets) return directUpper(k, nx, ny, 0, q);
  // aimants : partie basse = extrusion d'une section 2D (Clipper), puis 1 union + 1 soustraction groupée
  const mb = MAGNET.base;
  const lo = MAGNET.offset - MAGNET.block / 2;
  const s = PITCH / 2 + 1 - lo;
  const open0 = k(new W.CrossSection([pocketLayer(2.85, q.corner)]));
  const blocks = k(
    W.CrossSection.union([0, 1, 2, 3].map((i) => k(k(W.CrossSection.square([s, s]).translate([lo, lo])).rotate(90 * i)))),
  );
  const open = k(open0.subtract(blocks));
  const opens = k(W.CrossSection.compose(cellCenters(nx, ny).map(([x, y]) => k(open.translate([x, y])))));
  const outer = k(new W.CrossSection([roundedRectPoints(nx * PITCH, ny * PITCH, OUTER_R, q.corner)]));
  const lower = k(W.Manifold.extrude(k(outer.subtract(opens)), mb));
  const hole = k(W.Manifold.cylinder(MAGNET.depth + 0.5, MAGNET.d / 2, MAGNET.d / 2, q.hole));
  const cyl = [];
  for (const [cx, cy] of cellCenters(nx, ny))
    for (const [x, y] of magnetCenters()) cyl.push(k(hole.translate([cx + x, cy + y, mb - MAGNET.depth])));
  const upper = directUpper(k, nx, ny, mb, q);
  return k(k(lower.subtract(k(W.Manifold.compose(cyl)))).add(upper));
}

// Briques assemblées au niveau maillage : 1 brique intérieure + 4 briques de coin calculées par booléens
// (petits), puis copie translatée, suppression des faces internes x/y = ±21 et soudure des sommets de couture.
// Aucun booléen global : coût O(nb de triangles) en JS pur.
function brickMesh(k, v, nx, ny, magnets, q) {
  const H = plateHeight(magnets);
  const half = PITCH / 2;
  const t = cellTool(k, v, magnets, q);
  const brick = k(k(W.Manifold.cube([PITCH, PITCH, H]).translate([-half, -half, 0])).subtract(t));
  // prisme 2x2 cellules arrondi, décalé pour que son coin arrondi tombe sur le coin extérieur de la brique
  const round = k(W.Manifold.extrude(k(new W.CrossSection([roundedRectPoints(2 * PITCH, 2 * PITCH, OUTER_R, q.corner)])), H));
  const signs = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  const variants = [brick, ...signs.map(([sx, sy]) => k(brick.intersect(k(round.translate([-sx * half, -sy * half, 0])))))].map(
    (m) => {
      const g = m.getMesh();
      return { pos: g.vertProperties, tris: g.triVerts, np: g.numProp };
    },
  );
  return { ...assembleBricks(variants, nx, ny), status: 'non validé (voir validate)', volume: undefined };
}

function strip(mesh) {
  const n = mesh.vertProperties.length / mesh.numProp;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) out[3 * i + j] = mesh.vertProperties[i * mesh.numProp + j];
  return out;
}

export const exportStl = (r) => stlBinary(r);
export const export3mf = (r) => threeMF(r);

// Validation manifold d'un maillage externe (ex. sortie jscad) : fusion des sommets puis construction.
export function validateMesh(pos, tris) {
  const mesh = new W.Mesh({ numProp: 3, vertProperties: pos, triVerts: tris });
  mesh.merge();
  try {
    const m = new W.Manifold(mesh);
    const r = { status: m.status(), numTri: m.numTri(), volume: m.volume(), genus: m.genus() };
    m.delete();
    return r;
  } catch (e) {
    return { status: 'THROW: ' + (e.message || e) };
  }
}
