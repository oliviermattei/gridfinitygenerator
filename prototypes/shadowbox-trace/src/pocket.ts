// PROTOTYPE JETABLE (#36) : contour en mm -> poche, avec manifold-3d (ADR 0004, aucune dépendance de plus).
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { minAreaRect, type Point } from "./pipeline";

/**
 * Contour de l'objet vu de dessus, dans un repère z vers le haut : y est retourné (sinon la poche
 * serait le miroir de l'outil). `findContours` passe par le centre des pixels de bord : le vrai bord
 * est un demi-pixel plus loin, rendu par `offset`.
 */
export function outlineOf(wasm: ManifoldToplevel, polygons: Point[][], halfPixelMm: number): CrossSection {
  const flipped = polygons.map((ring) => ring.map(([x, y]) => [x, -y] as Point));
  return new wasm.CrossSection(flipped, "EvenOdd").offset(halfPixelMm, "Miter", 2).simplify(1e-3);
}

export interface Measure {
  /** Rectangle d'aire minimale : ce que donne un pied à coulisse, en mm. */
  length: number;
  width: number;
  /** Aire nette (trous déduits), en mm². */
  area: number;
  /** Les 4 coins de ce rectangle, dans le repère du contour. */
  box: Point[];
}

export function measure(outline: CrossSection): Measure {
  const points = outline.toPolygons().flat() as Point[];
  const { length, width, corners } = minAreaRect(points);
  return { length, width, area: outline.area(), box: corners };
}

export interface PocketOptions {
  /** Jeu autour de l'objet, en mm. */
  clearance: number;
  /** Paroi autour de la poche, en mm. */
  wall: number;
  /** Profondeur de la poche, en mm. */
  depth: number;
  /** Fond sous la poche, en mm ; 0 = gabarit ajouré (test d'ajustement rapide et économique). */
  floor: number;
}

/** Bloc rectangulaire creusé de la poche : le gabarit de test d'ajustement. */
export function pocketBlock(wasm: ManifoldToplevel, outline: CrossSection, options: PocketOptions): Manifold {
  const pocket = outline.offset(options.clearance, "Round").simplify(1e-3);
  const { min, max } = pocket.bounds();
  const w = options.wall;
  const height = options.floor + options.depth;
  const body = wasm.CrossSection.square([max[0] - min[0] + 2 * w, max[1] - min[1] + 2 * w]).translate([min[0] - w, min[1] - w]).extrude(height);
  const cut = pocket.extrude(options.depth + 1).translate([0, 0, options.floor]);
  return body.subtract(cut);
}

/** STL binaire. */
export function toStl(manifold: Manifold): Uint8Array<ArrayBuffer> {
  const mesh = manifold.getMesh();
  const triangles = mesh.triVerts.length / 3;
  const buffer = new ArrayBuffer(84 + 50 * triangles);
  const view = new DataView(buffer);
  view.setUint32(80, triangles, true);
  const vertex = (i: number) => [0, 1, 2].map((k) => mesh.vertProperties[i * mesh.numProp + k]);
  for (let t = 0; t < triangles; t++) {
    const [a, b, c] = [0, 1, 2].map((k) => vertex(mesh.triVerts[3 * t + k]));
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...n) || 1;
    const offset = 84 + 50 * t;
    [...n.map((x) => x / length), ...a, ...b, ...c].forEach((x, k) => view.setFloat32(offset + 4 * k, x, true));
  }
  return new Uint8Array(buffer);
}
