// Shapes shared by the assembly strategies: outlines, the pocket tool and mesh helpers.
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { TriangleMesh } from "./mesh";
import type { Own } from "./manifold";
import type { PocketProfile } from "./pocket-profile";

/** What an assembly strategy needs to build the frame of a grid. */
export interface GridFrame {
  columns: number;
  rows: number;
  cellSize: number;
  profile: PocketProfile;
  /** Radius of the rounded outer corners, already limited to the outline. */
  outerRadius: number;
  segmentsPerQuarter: number;
}

/** Overshoot of cutting tools below and above the frame, to avoid coplanar faces. */
export const TOOL_OVERSHOOT_MM = 1;

/** Centre of cell (i, j) of the grid, which is centred on the origin (i along X, j along Y). */
export function cellCentre(i: number, j: number, { columns, rows, cellSize }: GridFrame): [x: number, y: number] {
  return [(i - (columns - 1) / 2) * cellSize, (j - (rows - 1) / 2) * cellSize];
}

/** Throws unless manifold reports the solid as closed and valid. */
export function assertNoError(status: string): void {
  if (status !== "NoError") throw new Error(`Baseplate mesh is not manifold: ${status}`);
}

/** Counter-clockwise rounded rectangle centred on the origin, `segmentsPerQuarter` segments per corner. */
export function roundedRect(width: number, depth: number, radius: number, segmentsPerQuarter: number): [number, number][] {
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

/** Solid removed for one cell, centred on the origin: a loft of the profile's layers. */
export function pocketTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame): Manifold {
  const { profile, cellSize, segmentsPerQuarter } = frame;
  const first = profile.points[0];
  const last = profile.points[profile.points.length - 1];
  if (!first || !last) throw new Error("A pocket profile needs at least one point");
  const layers = [
    [first[0] - TOOL_OVERSHOOT_MM, first[1]] as const,
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
function loft(layers: { z: number; points: [number, number][] }[]): TriangleMesh {
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
