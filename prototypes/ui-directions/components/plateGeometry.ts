// PROTOTYPE JETABLE — approximation Three.js d'une baseplate Gridfinity, assez fidèle pour être lisible :
// dalle à coins arrondis, poches au profil 45° / vertical / 45° (spec : 0,7 / 1,8 / 2,15 mm, rayon 4 → 1,15),
// muret à plat étroit, fond ouvert (sans aimants) ou dalle pleine percée de logements d'aimants et de fraisages.
// Ce n'est PAS le moteur de génération : pas de booléens, pas d'export.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Layout, Settings } from "@/lib/settings";

const SEG = 6; // segments par coin arrondi
const TOP_CUT = 0.4; // plat au sommet des murets (Top Cutoff extrabold)
export const MAGNET_OFFSET = 13; // distance centre de cellule → centre d'aimant (spec 13, extrabold 14)

/** Points d'un rectangle arrondi (sens trigo), nombre de points constant quel que soit le rayon. */
export function roundedRectPoints(hw: number, hd: number, r: number, seg = SEG): [number, number][] {
  const rr = Math.max(0.01, Math.min(r, hw - 0.01, hd - 0.01));
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [hw - rr, hd - rr, 0],
    [-hw + rr, hd - rr, Math.PI / 2],
    [-hw + rr, -hd + rr, Math.PI],
    [hw - rr, -hd + rr, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  }
  return pts;
}

function toPath<T extends THREE.Path>(p: T, pts: [number, number][], ox: number, oy: number, reverse = false) {
  const list = reverse ? [...pts].reverse() : pts;
  list.forEach(([x, y], i) => (i === 0 ? p.moveTo(ox + x, oy + y) : p.lineTo(ox + x, oy + y)));
  p.closePath();
  return p;
}

function circlePath(cx: number, cy: number, r: number, reverse = true) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, reverse);
  return p;
}

/**
 * Entonnoir d'une poche (surfaces intérieures), centré en 0, fond à y = 0.
 * Chaque bande a ses propres sommets : arêtes vives entre pente et vertical, coins lissés.
 */
export function pocketFunnel(cell: number, radius: number, hybrid: boolean) {
  const h = cell / 2;
  // [hauteur, retrait horizontal] du fond vers le haut
  // Hybride : 0,35 mm de muret vertical sous le profil (dégagement, cf. rebuilt BASEPLATE_HEIGHT = 5).
  const lift = hybrid ? 0.35 : 0;
  const rings: [number, number][] = [
    ...(hybrid ? ([[0, 2.85]] as [number, number][]) : []),
    [lift, 2.85],
    [lift + 0.7, 2.15],
    [lift + 2.5, 2.15],
    [lift + 4.65 - TOP_CUT, TOP_CUT],
  ];
  const bands: THREE.BufferGeometry[] = [];
  for (let b = 0; b < rings.length - 1; b++) {
    const [y0, i0] = rings[b];
    const [y1, i1] = rings[b + 1];
    const p0 = roundedRectPoints(h - i0, h - i0, radius - i0);
    const p1 = roundedRectPoints(h - i1, h - i1, radius - i1);
    const n = p0.length;
    const pos: number[] = [];
    for (let k = 0; k < n; k++) pos.push(p0[k][0], y0, -p0[k][1]);
    for (let k = 0; k < n; k++) pos.push(p1[k][0], y1, -p1[k][1]);
    const idx: number[] = [];
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      idx.push(k, n + k, k2, k2, n + k, n + k2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    bands.push(g.toNonIndexed());
  }
  const merged = mergeGeometries(bands)!;
  merged.computeVertexNormals();
  return { geometry: merged, depth: rings[rings.length - 1][0] };
}

export type PlateModel = {
  frame: THREE.BufferGeometry; // dessus + flancs + murets
  floor: THREE.BufferGeometry | null; // dalle pleine (aimants / vis)
  funnel: THREE.BufferGeometry; // une poche, instanciée
  cells: [number, number][]; // centres (x, z)
  magnets: [number, number][];
  screws: [number, number][];
  base: number; // épaisseur de la dalle pleine
  pocketDepth: number;
  height: number;
};

export function buildPlate(s: Settings, l: Layout): PlateModel {
  const c = s.cellSize;
  const r = 4;
  const hybrid = s.profile === "hybrid";
  const { geometry: funnel, depth: pocketDepth } = pocketFunnel(c, r, hybrid);
  const base = s.magnets || s.screws ? 2.8 : 0;

  const x0 = -l.width / 2 + l.marginLeft;
  const z0 = -l.depth / 2 + l.marginBack;
  const cells: [number, number][] = [];
  for (let i = 0; i < l.nx; i++) for (let j = 0; j < l.ny; j++) cells.push([x0 + i * c + c / 2, z0 + j * c + c / 2]);

  // Cadre : contour extérieur moins le haut de chaque poche, extrudé sur la profondeur de poche.
  const outer = roundedRectPoints(l.width / 2, l.depth / 2, Math.max(0.01, s.outerRadius));
  const shape = toPath(new THREE.Shape(), outer, 0, 0);
  const top = roundedRectPoints(c / 2 - TOP_CUT - 0.06, c / 2 - TOP_CUT - 0.06, r - TOP_CUT - 0.06);
  for (const [cx, cz] of cells) shape.holes.push(toPath(new THREE.Path(), top, cx, -cz, true));
  const frame = new THREE.ExtrudeGeometry(shape, { depth: pocketDepth, bevelEnabled: false, curveSegments: 4 });
  frame.rotateX(-Math.PI / 2);
  frame.translate(0, base, 0);

  const magnets: [number, number][] = [];
  const screws: [number, number][] = [];
  let floor: THREE.BufferGeometry | null = null;
  if (base > 0) {
    const fshape = toPath(new THREE.Shape(), outer, 0, 0);
    for (const [cx, cz] of cells) {
      if (s.magnets) {
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const mx = cx + dx * MAGNET_OFFSET, mz = cz + dz * MAGNET_OFFSET;
          magnets.push([mx, mz]);
          fshape.holes.push(circlePath(mx, -mz, s.magnetD / 2 + s.tolerance / 2));
        }
      }
      if (s.screws) {
        screws.push([cx, cz]);
        fshape.holes.push(circlePath(cx, -cz, s.screwHead / 2));
      }
    }
    floor = new THREE.ExtrudeGeometry(fshape, { depth: base, bevelEnabled: false, curveSegments: 18 });
    floor.rotateX(-Math.PI / 2);
  }
  return { frame, floor, funnel, cells, magnets, screws, base, pocketDepth, height: base + pocketDepth };
}
