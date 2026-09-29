// Shapes shared by the assembly strategies: outlines, the pocket tool and mesh helpers.
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import type { Margins } from "./layout";
import type { Own } from "./manifold";
import type { PocketProfile } from "./pocket-profile";
import type { ScrewHoles } from "./screws";

/**
 * What an assembly strategy needs to build a baseplate: its grid, its margins and its
 * outline. The outline is centred on the origin; the grid sits in it, shifted by the margins.
 */
export interface GridFrame {
  columns: number;
  rows: number;
  cellSize: number;
  /** Pocket profile of the cells; the frame is as high as it. */
  profile: PocketProfile;
  /**
   * Cells cut to a lower profile than `profile` (the test kit): each one is lowered to the
   * height of its own profile, down to the line between it and its neighbours. Only the
   * boolean assembly builds them; empty for a baseplate.
   */
  lowerCells: readonly LowerCell[];
  margins: Margins;
  /** Size of the outline, grid and margins included. */
  width: number;
  depth: number;
  /** Radius of the rounded outer corners, already limited to the outline. */
  outerRadius: number;
  segmentsPerQuarter: number;
  /** Segments of the circle of a hole (spec v1: 16 in preview, 64 in final), a multiple of 4. */
  segmentsPerHole: number;
  /** Countersunk screw holes on the inner intersections of the grid, null without screws. */
  screws: ScrewHoles | null;
  /** Print settings the thicknesses and widths chosen by the generator follow. */
  layerHeight: number;
  lineWidth: number;
}

/** A cell (i along X, j along Y) cut to a lower pocket profile than the rest of the grid. */
export interface LowerCell {
  i: number;
  j: number;
  profile: PocketProfile;
}

/** Overshoot of cutting tools below and above the frame, to avoid coplanar faces. */
export const TOOL_OVERSHOOT_MM = 1;

/** Grid rectangle in the outline: [x0, y0, x1, y1]. */
export function gridRect({ width, depth, margins }: GridFrame): [x0: number, y0: number, x1: number, y1: number] {
  return [-width / 2 + margins.left, -depth / 2 + margins.front, width / 2 - margins.right, depth / 2 - margins.back];
}

/** Centre of cell (i, j) of the grid (i along X, j along Y). */
export function cellCentre(i: number, j: number, frame: GridFrame): [x: number, y: number] {
  const { cellSize } = frame;
  const [x0, y0] = gridRect(frame);
  return [x0 + (i + 0.5) * cellSize, y0 + (j + 0.5) * cellSize];
}

/** Counter-clockwise rectangle from its corners. */
export function rect(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/** Throws unless manifold reports the solid as closed and valid. */
export function assertNoError(status: string): void {
  if (status !== "NoError") throw new Error(`Baseplate mesh is not manifold: ${status}`);
}

/**
 * Counter-clockwise rounded rectangle centred on the origin, `segmentsPerQuarter` segments
 * per corner; a plain rectangle without radius.
 */
export function roundedRect(width: number, depth: number, radius: number, segmentsPerQuarter: number): [number, number][] {
  if (radius <= 0) return rect(-width / 2, -depth / 2, width / 2, depth / 2);
  const hx = width / 2 - radius;
  const hy = depth / 2 - radius;
  const centres: [number, number][] = [
    [hx, hy],
    [-hx, hy],
    [-hx, -hy],
    [hx, -hy],
  ];
  const points: [number, number][] = [];
  centres.forEach(([cx, cy], corner) => {
    for (let s = 0; s <= segmentsPerQuarter; s++) {
      const angle = ((corner + s / segmentsPerQuarter) * Math.PI) / 2;
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  });
  return points;
}

/**
 * Solid removed for one cell, centred on the origin: a loft of the layers of its profile,
 * the frame's own by default. Below the frame, the first segment of the profile goes on
 * straight (a vertical step stays vertical, a slope widens), so that the bottom of the
 * frame cuts the tool across a face, not along a ring of its edges; above the frame, the
 * tool goes up vertically from the top flat.
 */
export function pocketTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame, profile = frame.profile): Manifold {
  const { cellSize, segmentsPerQuarter } = frame;
  const [first, second] = profile.points;
  const last = profile.points[profile.points.length - 1];
  if (!first || !second || !last) throw new Error("A pocket profile needs at least two points");
  if (second[0] <= first[0]) throw new Error("A pocket profile rises from its first point to its second");
  const slope = (second[1] - first[1]) / (second[0] - first[0]);
  const layers = [
    [first[0] - TOOL_OVERSHOOT_MM, first[1] - slope * TOOL_OVERSHOOT_MM] as const,
    ...profile.points.slice(1),
    [last[0] + TOOL_OVERSHOOT_MM, last[1]] as const,
  ].map(([z, inset]) => ({
    z,
    points: roundedRect(cellSize - 2 * inset, cellSize - 2 * inset, profile.topRadius - inset, segmentsPerQuarter),
  }));
  const { positions, indices } = loft(layers);
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
}

/** Closed mesh through horizontal layers with the same number of CCW points, bottom to top. */
export function loft(layers: { z: number; points: [number, number][] }[]): TriangleMesh {
  const n = layers[0]?.points.length ?? 0;
  const positions = new Float32Array(layers.length * n * 3);
  layers.forEach(({ z, points }, layer) =>
    points.forEach(([x, y], i) => positions.set([x, y, z], (layer * n + i) * 3)),
  );
  const indices: number[] = [];
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const a = layer * n;
    const b = a + n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      indices.push(a + i, a + j, b + j, a + i, b + j, b + i);
    }
  }
  const top = (layers.length - 1) * n;
  for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i, top, top + i, top + i + 1);
  return { positions, indices: new Uint32Array(indices) };
}

/**
 * Copies a manifold out of the WASM heap as an indexed mesh (positions only), so that the
 * buffers outlive the arena. Throws when the solid is not a valid manifold.
 */
export function meshOf(solid: Manifold): TriangleMesh {
  assertNoError(solid.status());
  const { vertProperties, triVerts, numProp } = solid.getMesh();
  return { positions: positionsOnly(vertProperties, numProp), indices: triVerts };
}

function positionsOnly(properties: Float32Array, numProp: number): Float32Array {
  if (numProp === 3) return properties;
  const count = properties.length / numProp;
  const positions = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) positions.set(properties.subarray(v * numProp, v * numProp + 3), v * 3);
  return positions;
}
