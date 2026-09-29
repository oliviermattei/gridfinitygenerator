// PROTOTYPE JETABLE : baseplate avec @jscad/modeling (moteur d'extrabold).
import jscad from '@jscad/modeling';
import stlSerializer from '@jscad/stl-serializer';
import mfSerializer from '@jscad/3mf-serializer';
import {
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
  assembleBricks,
} from './common.mjs';
import { stlBinary, threeMF } from './export.mjs';

const { booleans, geometries, hulls, primitives, transforms, extrusions } = jscad;
const { geom2, geom3 } = geometries;

export async function init() {}

export const VARIANTS = {
  naive: { tool: 'hull', perCell: true, mode: 'seq', label: 'outil recalculé par cellule + soustractions successives' },
  seq: { tool: 'hull', mode: 'seq', label: 'outil unique translaté + soustractions successives' },
  batchUnion: { tool: 'hull', mode: 'union', label: 'outil unique + union(outils) puis 1 soustraction' },
  batch: { tool: 'hull', mode: 'compose', label: 'outil unique + concaténation des polygones (outils disjoints) puis 1 soustraction' },
  batchLoft: { tool: 'loft', mode: 'compose', label: 'outil loft 2D (polygones directs) + concaténation + 1 soustraction' },
  bricks: { tool: 'loft', mode: 'bricks', label: 'brique de cellule (cube - outil) + union des briques ∩ contour (façon extrabold)' },
  brickMesh: { tool: 'loft', mode: 'brickMesh', label: 'briques jscad assemblées au niveau maillage (copie + soudure), 0 booléen global' },
};

// polygones jscad -> maillage indexé (sommets dédoublonnés, triangulation en éventail)
function indexed(g) {
  const map = new Map();
  const pos = [];
  const tris = [];
  const id = (v) => {
    const key = `${Math.round(v[0] * 1e5)},${Math.round(v[1] * 1e5)},${Math.round(v[2] * 1e5)}`;
    let i = map.get(key);
    if (i === undefined) {
      i = pos.length / 3;
      map.set(key, i);
      pos.push(v[0], v[1], v[2]);
    }
    return i;
  };
  for (const p of geom3.toPolygons(g)) {
    const ids = p.vertices.map(id);
    for (let i = 1; i < ids.length - 1; i++) tris.push(ids[0], ids[i], ids[i + 1]);
  }
  return { pos: new Float32Array(pos), tris: new Uint32Array(tris), np: 3 };
}

const layers3d = (magnets, seg) =>
  toolLayers(magnets).map(([z, d]) => pocketLayer(d, seg).map(([x, y]) => [x, y, z]));

function toolHull(magnets, seg) {
  const L = layers3d(magnets, seg);
  const segs = [];
  for (let i = 0; i < L.length - 1; i++) segs.push(hulls.hull(geom3.fromPoints([L[i], L[i + 1]])));
  return booleans.union(segs);
}

// Loft « section par section » : on écrit directement les polygones (quads + 2 couvercles).
function toolLoft(magnets, seg) {
  const L = layers3d(magnets, seg);
  const k = L[0].length;
  const polys = [];
  for (let li = 0; li < L.length - 1; li++) {
    const a = L[li],
      b = L[li + 1];
    for (let i = 0; i < k; i++) {
      const j = (i + 1) % k;
      polys.push([a[i], a[j], b[j], b[i]]);
    }
  }
  polys.push([...L[0]].reverse());
  polys.push(L[L.length - 1]);
  return geom3.fromPoints(polys);
}

function cellTool(v, magnets, q) {
  const t = v.tool === 'loft' ? toolLoft(magnets, q.corner) : toolHull(magnets, q.corner);
  if (!magnets) return t;
  const mb = MAGNET.base;
  const lo = MAGNET.offset - MAGNET.block / 2;
  const hi = PITCH / 2 + 1;
  const s = hi - lo;
  const block = primitives.cuboid({ size: [s, s, mb + 2], center: [lo + s / 2, lo + s / 2, (mb + 2) / 2 - 2] });
  const blocks = [0, 1, 2, 3].map((i) => transforms.rotateZ((i * Math.PI) / 2, block));
  const hole = primitives.cylinder({
    height: MAGNET.depth + 0.5,
    radius: MAGNET.d / 2,
    segments: q.hole,
    center: [0, 0, mb - MAGNET.depth + (MAGNET.depth + 0.5) / 2],
  });
  const holes = magnetCenters().map(([x, y]) => transforms.translate([x, y, 0], hole));
  return booleans.union(booleans.subtract(t, blocks), holes);
}

function slab(nx, ny, magnets, q) {
  const g = geom2.fromPoints(roundedRectPoints(nx * PITCH, ny * PITCH, OUTER_R, q.corner));
  return extrusions.extrudeLinear({ height: plateHeight(magnets) }, g);
}

// équivalent de Manifold.compose : les outils sont disjoints, on concatène leurs polygones
const concat = (gs) => geom3.create(gs.flatMap((g) => geom3.toPolygons(g)));

export function build({ nx, ny, magnets, quality, variant }) {
  const v = VARIANTS[variant];
  const q = QUALITY[quality];
  const centers = cellCenters(nx, ny);
  const plate = slab(nx, ny, magnets, q);
  let result;
  if (v.mode === 'seq') {
    const shared = v.perCell ? null : cellTool(v, magnets, q);
    let p = plate;
    for (const [x, y] of centers) {
      const t = v.perCell ? cellTool(v, magnets, q) : shared;
      p = booleans.subtract(p, transforms.translate([x, y, 0], t));
    }
    result = p;
  } else if (v.mode === 'union' || v.mode === 'compose') {
    const t = cellTool(v, magnets, q);
    const copies = centers.map(([x, y]) => transforms.translate([x, y, 0], t));
    result = booleans.subtract(plate, v.mode === 'union' ? booleans.union(copies) : concat(copies));
  } else if (v.mode === 'bricks') {
    const t = cellTool(v, magnets, q);
    const H = plateHeight(magnets);
    const brick = booleans.subtract(primitives.cuboid({ size: [PITCH, PITCH, H], center: [0, 0, H / 2] }), t);
    const all = booleans.union(centers.map(([x, y]) => transforms.translate([x, y, 0], brick)));
    result = booleans.intersect(all, plate);
  } else if (v.mode === 'brickMesh') {
    const t = cellTool(v, magnets, q);
    const H = plateHeight(magnets);
    const half = PITCH / 2;
    const brick = booleans.subtract(primitives.cuboid({ size: [PITCH, PITCH, H], center: [0, 0, H / 2] }), t);
    const round = extrusions.extrudeLinear({ height: H }, geom2.fromPoints(roundedRectPoints(2 * PITCH, 2 * PITCH, OUTER_R, q.corner)));
    const signs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    const variants = [brick, ...signs.map(([sx, sy]) => booleans.intersect(brick, transforms.translate([-sx * half, -sy * half, 0], round)))].map(indexed);
    const m = assembleBricks(variants, nx, ny);
    return { ...m, geom: null };
  }
  // triangulation en éventail (ce qu'il faut pour l'aperçu three.js)
  const polys = geom3.toPolygons(result);
  let n = 0;
  for (const p of polys) n += p.vertices.length - 2;
  const pos = new Float32Array(n * 9);
  let o = 0;
  for (const p of polys) {
    const vs = p.vertices;
    for (let i = 1; i < vs.length - 1; i++)
      for (const w of [vs[0], vs[i], vs[i + 1]]) {
        pos[o++] = w[0];
        pos[o++] = w[1];
        pos[o++] = w[2];
      }
  }
  return { geom: result, pos, numTri: n, numPoly: polys.length };
}

const toU8 = (parts) => {
  const bufs = parts.map((p) => (p instanceof ArrayBuffer ? new Uint8Array(p) : typeof p === 'string' ? new TextEncoder().encode(p) : new Uint8Array(p.buffer || p)));
  const len = bufs.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const b of bufs) out.set(b, o), (o += b.length);
  return out;
};

export const exportStl = (r) => (r.geom ? jscadStl(r) : stlBinary(r));
export const export3mf = (r) => (r.geom ? jscad3mf(r) : threeMF(r));
const jscadStl = (r) => toU8(stlSerializer.serialize({ binary: true }, r.geom));
const jscad3mf = (r) => toU8(mfSerializer.serialize({ compress: true, unit: 'millimeter' }, r.geom));
