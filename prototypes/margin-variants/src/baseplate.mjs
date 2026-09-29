// PROTOTYPE JETABLE (ticket #3): a baseplate with one margin variant, built with manifold-3d booleans.
// Coordinates: the grid spans [0, nx*42] x [0, ny*42]; the margin extends it on each side.
// +x is the right of the drawer, +y its back ("arrière"), -y its front ("avant").
import Module from 'manifold-3d';

let W; // initialised WASM module

export async function init() {
  if (!W) {
    W = await Module();
    W.setup();
  }
  return W;
}

export const PITCH = 42; // cellule
export const GRID_H = 4.6; // hybrid pocket profile height (ADR 0002)
export const OUTER_R = 4; // outer corner radius of the baseplate
const TOP_R = 4; // pocket corner radius at inset 0 (radius = 4 - inset)

// Hybrid pocket profile (ADR 0002), bottom to top: [z, inset from the cell edge].
const PROFILE = [
  [0.0, 2.85],
  [0.35, 2.85],
  [1.05, 2.15],
  [2.85, 2.15],
  [4.6, 0.4],
];

export const LAYER_H = 0.2; // default layer height (spec)
export const LINE_W = 0.4; // default line width (spec)
export const WALL = 3 * LINE_W; // wall and rib width of the margin elements: 1.2 mm, 3 lines
const OVERLAP = 0.2; // the margin bites into the grid edge muret (flat 0.4 at the top) to fuse with it
export const BRACKET_LEG = 10; // length of a bracket leg along the drawer wall, past the grid line
export const MAX_BRACKET_SPAN = 4 * PITCH; // longer margin strips get intermediate brackets
const QUARTER_SEGMENTS = 32; // final quality (spec): 32 segments per quarter circle

export const VARIANTS = {
  solid: 'Marge pleine (référence)',
  truncated: '1. Cellules tronquées vides',
  brackets: '2. Équerres de coin seules',
  ribbed: '3. Cadre à nervures',
};

// CCW rounded rectangle.
function roundedRect(x0, y0, x1, y1, r) {
  const q = QUARTER_SEGMENTS;
  const centers = [
    [x1 - r, y1 - r],
    [x0 + r, y1 - r],
    [x0 + r, y0 + r],
    [x1 - r, y0 + r],
  ];
  const pts = [];
  for (let c = 0; c < 4; c++)
    for (let i = 0; i <= q; i++) {
      const a = ((c + i / q) * Math.PI) / 2;
      pts.push([centers[c][0] + r * Math.cos(a), centers[c][1] + r * Math.sin(a)]);
    }
  return pts;
}

const rect = (x0, y0, x1, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

export function layoutOf({ nx, ny, left = 0, right = 0, front = 0, back = 0 }) {
  const gx1 = nx * PITCH;
  const gy1 = ny * PITCH;
  return { nx, ny, left, right, front, back, gx1, gy1, X0: -left, X1: gx1 + right, Y0: -front, Y1: gy1 + back };
}

// Direct loft of same-size layers -> closed, oriented indexed mesh.
function loftMesh(layers) {
  const n = layers[0].pts.length;
  const pos = new Float32Array(layers.length * n * 3);
  layers.forEach((L, li) =>
    L.pts.forEach(([x, y], i) => pos.set([x, y, L.z], (li * n + i) * 3)),
  );
  const tris = [];
  for (let li = 0; li < layers.length - 1; li++) {
    const a = li * n;
    const b = (li + 1) * n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tris.push(a + i, a + j, b + j, a + i, b + j, b + i);
    }
  }
  const top = (layers.length - 1) * n;
  for (let i = 1; i < n - 1; i++) tris.push(0, i + 1, i, top, top + i, top + i + 1);
  return { pos, tris: new Uint32Array(tris) };
}

// Solid removed for one cell, centred on 0; overshoots 1 mm below and above to avoid coplanar faces.
function pocketTool(k) {
  const layers = [[-1, 2.85], ...PROFILE.slice(1), [GRID_H + 1, 0.4]].map(([z, d]) => ({
    z,
    pts: roundedRect(-PITCH / 2 + d, -PITCH / 2 + d, PITCH / 2 - d, PITCH / 2 - d, TOP_R - d),
  }));
  const { pos, tris } = loftMesh(layers);
  return k(new W.Manifold(new W.Mesh({ numProp: 3, vertProperties: pos, triVerts: tris })));
}

const cellCenter = (i, j) => [(i + 0.5) * PITCH, (j + 0.5) * PITCH, 0];

// Margin area in 2D: the outline minus the grid, biting OVERLAP into the grid on the sides that have a margin.
function marginRegion(k, L, outline) {
  const gx0 = L.left > 0 ? OVERLAP : -1;
  const gx1 = L.right > 0 ? L.gx1 - OVERLAP : L.gx1 + 1;
  const gy0 = L.front > 0 ? OVERLAP : -1;
  const gy1 = L.back > 0 ? L.gy1 - OVERLAP : L.gy1 + 1;
  return k(outline.subtract(k(new W.CrossSection([rect(gx0, gy0, gx1, gy1)]))));
}

const innerOutline = (k, L) =>
  k(new W.CrossSection([roundedRect(L.X0 + WALL, L.Y0 + WALL, L.X1 - WALL, L.Y1 - WALL, OUTER_R - WALL)]));

// Wall of width WALL that follows the whole outline of the baseplate.
const outerRing = (k, L, outline) => k(outline.subtract(innerOutline(k, L)));

// Rib along a grid line, running through the whole baseplate (clipped later to the margin).
// The first and last lines stay inside the grid footprint so that they are full width.
function ribX(k, L, i) {
  const x = i * PITCH;
  const [a, b] = i === 0 ? [0, WALL] : i === L.nx ? [x - WALL, x] : [x - WALL / 2, x + WALL / 2];
  return k(new W.CrossSection([rect(a, L.Y0 - 1, b, L.Y1 + 1)]));
}
function ribY(k, L, j) {
  const y = j * PITCH;
  const [a, b] = j === 0 ? [0, WALL] : j === L.ny ? [y - WALL, y] : [y - WALL / 2, y + WALL / 2];
  return k(new W.CrossSection([rect(L.X0 - 1, a, L.X1 + 1, b)]));
}

// Grid lines that carry an intermediate bracket: evenly spread so that no span exceeds MAX_BRACKET_SPAN.
function midLines(n) {
  const count = Math.ceil((n * PITCH) / MAX_BRACKET_SPAN) - 1;
  return Array.from({ length: Math.max(0, count) }, (_, m) => Math.round((n * (m + 1)) / (count + 1)));
}

const MARGINS = {
  solid(k, L, outline, _tool, h) {
    return k(W.Manifold.extrude(marginRegion(k, L, outline), h));
  },

  // 1. The grid goes on into the margin with truncated cells: same pocket profile, open at the bottom,
  //    closed by an outer wall of width WALL along the outline.
  truncated(k, L, outline, tool, h) {
    const block = k(W.Manifold.extrude(marginRegion(k, L, outline), h));
    const clip = k(k(W.Manifold.extrude(innerOutline(k, L), GRID_H + 4)).translate([0, 0, -2]));
    const cuts = [];
    for (let i = Math.floor(L.X0 / PITCH); i < Math.ceil(L.X1 / PITCH); i++)
      for (let j = Math.floor(L.Y0 / PITCH); j < Math.ceil(L.Y1 / PITCH); j++) {
        if (i >= 0 && i < L.nx && j >= 0 && j < L.ny) continue;
        cuts.push(k(k(tool.translate(cellCenter(i, j))).intersect(clip)));
      }
    return cuts.length ? k(block.subtract(k(W.Manifold.compose(cuts)))) : block;
  },

  // 2. Brackets only: at each corner of the baseplate, an L of outer wall with legs BRACKET_LEG past the
  //    grid lines, tied to the grid by the ribs on the first and last grid lines; intermediate T brackets
  //    on long strips. The rest of the margin is empty.
  brackets(k, L, outline, _tool, h) {
    const ring = outerRing(k, L, outline);
    const zones = [];
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const [x0, x1] = sx > 0 ? [L.gx1 - BRACKET_LEG, L.X1 + 1] : [L.X0 - 1, BRACKET_LEG];
        const [y0, y1] = sy > 0 ? [L.gy1 - BRACKET_LEG, L.Y1 + 1] : [L.Y0 - 1, BRACKET_LEG];
        zones.push(k(new W.CrossSection([rect(x0, y0, x1, y1)])));
      }
    const ribs = [ribX(k, L, 0), ribX(k, L, L.nx), ribY(k, L, 0), ribY(k, L, L.ny)];
    for (const i of midLines(L.nx)) {
      ribs.push(ribX(k, L, i));
      zones.push(k(new W.CrossSection([rect(i * PITCH - BRACKET_LEG, L.Y0 - 1, i * PITCH + BRACKET_LEG, L.Y1 + 1)])));
    }
    for (const j of midLines(L.ny)) {
      ribs.push(ribY(k, L, j));
      zones.push(k(new W.CrossSection([rect(L.X0 - 1, j * PITCH - BRACKET_LEG, L.X1 + 1, j * PITCH + BRACKET_LEG)])));
    }
    const walls = k(ring.intersect(k(W.CrossSection.union(zones))));
    const shape = k(k(W.CrossSection.union([walls, ...ribs])).intersect(marginRegion(k, L, outline)));
    return k(W.Manifold.extrude(shape, h));
  },

  // 3. Ribbed frame: outer wall along the whole outline, tied to the grid by a rib on every grid line
  //    (every 42 mm, in line with the murets). The wall on the grid side is the grid's own edge muret.
  ribbed(k, L, outline, _tool, h) {
    const ribs = [];
    for (let i = 0; i <= L.nx; i++) ribs.push(ribX(k, L, i));
    for (let j = 0; j <= L.ny; j++) ribs.push(ribY(k, L, j));
    const shape = k(k(W.CrossSection.union([outerRing(k, L, outline), ...ribs])).intersect(marginRegion(k, L, outline)));
    return k(W.Manifold.extrude(shape, h));
  },
};

// Sum of the loop lengths and the loop count of every printed layer (default layer height).
function layerStats(m) {
  let perimeter = 0;
  let loops = 0;
  for (let n = 0; n < Math.round(GRID_H / LAYER_H); n++) {
    const cs = m.slice((n + 0.5) * LAYER_H);
    for (const poly of cs.toPolygons()) {
      loops++;
      for (let i = 0; i < poly.length; i++) {
        const [ax, ay] = poly[i];
        const [bx, by] = poly[(i + 1) % poly.length];
        perimeter += Math.hypot(bx - ax, by - ay);
      }
    }
    cs.delete();
  }
  return { perimeter, loops };
}

// Length of the first layer's outline lying flat against each drawer wall.
function contactLengths(m, L) {
  const cs = m.slice(LAYER_H / 2);
  const out = { left: 0, right: 0, front: 0, back: 0 };
  const e = 1e-3;
  for (const poly of cs.toPolygons())
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      const len = Math.hypot(bx - ax, by - ay);
      if (Math.abs(ax - L.X0) < e && Math.abs(bx - L.X0) < e) out.left += len;
      if (Math.abs(ax - L.X1) < e && Math.abs(bx - L.X1) < e) out.right += len;
      if (Math.abs(ay - L.Y0) < e && Math.abs(by - L.Y0) < e) out.front += len;
      if (Math.abs(ay - L.Y1) < e && Math.abs(by - L.Y1) < e) out.back += len;
    }
  cs.delete();
  return out;
}

// Builds the baseplate and returns its mesh (copied out of the WASM heap) and its measures.
// variant === null gives the grid alone.
export function buildBaseplate(L, variant, h) {
  const arena = [];
  const k = (m) => (arena.push(m), m);
  try {
    const outline = k(new W.CrossSection([roundedRect(L.X0, L.Y0, L.X1, L.Y1, OUTER_R)]));
    const tool = pocketTool(k);
    const footprint = k(outline.intersect(k(new W.CrossSection([rect(0, 0, L.gx1, L.gy1)]))));
    const pockets = [];
    for (let i = 0; i < L.nx; i++) for (let j = 0; j < L.ny; j++) pockets.push(k(tool.translate(cellCenter(i, j))));
    const grid = k(k(W.Manifold.extrude(footprint, GRID_H)).subtract(k(W.Manifold.compose(pockets))));
    const baseplate = variant ? k(grid.add(MARGINS[variant](k, L, outline, tool, h))) : grid;

    const mesh = baseplate.getMesh();
    const np = mesh.numProp;
    const nv = mesh.vertProperties.length / np;
    const pos = new Float32Array(nv * 3);
    for (let v = 0; v < nv; v++) for (let c = 0; c < 3; c++) pos[3 * v + c] = mesh.vertProperties[v * np + c];
    return {
      pos,
      tris: mesh.triVerts.slice(),
      status: baseplate.status(),
      genus: baseplate.genus(),
      volume: baseplate.volume(),
      gridVolume: grid.volume(),
      layers: layerStats(baseplate),
      contact: contactLengths(baseplate, L),
    };
  } finally {
    for (const m of arena) m.delete();
  }
}

// Rebuilds a Manifold from a mesh read back from a file: this is the closed-mesh check on the export.
export function validateMesh(pos, tris) {
  const mesh = new W.Mesh({ numProp: 3, vertProperties: pos, triVerts: tris });
  mesh.merge();
  try {
    const m = new W.Manifold(mesh);
    const r = { status: m.status(), volume: m.volume(), genus: m.genus() };
    m.delete();
    return r;
  } catch (e) {
    return { status: 'THROW: ' + (e.message || e) };
  }
}
