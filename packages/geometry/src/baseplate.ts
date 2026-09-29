import type { ManifoldToplevel, Manifold } from "manifold-3d";
import { loadManifold, withArena } from "./manifold";
import { HYBRID_PROFILE, type PocketProfile } from "./pocket-profile";

/** Side of a Gridfinity cell in the standard, in millimetres (default cell size). */
export const STANDARD_CELL_SIZE_MM = 42;

/** Allowed number of cells per axis (spec v1). */
export const CELLS_PER_AXIS = { min: 1, max: 24 } as const;

/** Outer corner radius of the baseplate (spec default `or`). */
const OUTER_RADIUS_MM = 4;

/** Overshoot of the pocket tool below and above the frame, to avoid coplanar faces. */
const TOOL_OVERSHOOT_MM = 1;

export type Quality = "preview" | "final";

/** Segments per quarter circle for rounded corners (spec v1: 8 in preview, 32 in final). */
const SEGMENTS_PER_QUARTER: Record<Quality, number> = { preview: 8, final: 32 };

export interface BaseplateSettings {
  /** Number of cells along X (left to right). Rounded, then brought into CELLS_PER_AXIS. */
  columns: number;
  /** Number of cells along Y (front to back). Rounded, then brought into CELLS_PER_AXIS. */
  rows: number;
}

/**
 * Indexed triangle mesh in millimetres, ready to transfer and render. Triangles are
 * counter-clockwise seen from outside. Axes: +X right, +Y back of the drawer, +Z up; the
 * baseplate is centred on the origin in XY and stands on z = 0.
 */
export interface TriangleMesh {
  /** x, y, z per vertex. */
  positions: Float32Array;
  /** Three vertex indices per triangle. */
  indices: Uint32Array;
}

export interface BaseplateLayout {
  columns: number;
  rows: number;
  cellSize: number;
  /** Width of the margin on each side of the grid, in millimetres. */
  margins: { left: number; right: number; back: number; front: number };
}

export interface BaseplateStats {
  /** Bounding box of the mesh, in millimetres (width along X, depth along Y). */
  dimensions: { width: number; depth: number; height: number };
}

export interface Baseplate {
  mesh: TriangleMesh;
  layout: BaseplateLayout;
  stats: BaseplateStats;
}

/**
 * Generates a baseplate: a frame of open pockets with the hybrid profile (ADR 0002),
 * without margin. The mesh is always closed and checked by manifold (`NoError`).
 */
export async function generateBaseplate(settings: BaseplateSettings, quality: Quality): Promise<Baseplate> {
  const wasm = await loadManifold();
  const layout = layoutOf(settings);
  const mesh = buildMesh(wasm, layout, HYBRID_PROFILE, SEGMENTS_PER_QUARTER[quality]);
  return { mesh, layout, stats: { dimensions: dimensionsOf(mesh) } };
}

function cellCount(value: number): number {
  if (Number.isNaN(value)) return CELLS_PER_AXIS.min;
  return Math.min(CELLS_PER_AXIS.max, Math.max(CELLS_PER_AXIS.min, Math.round(value)));
}

function layoutOf(settings: BaseplateSettings): BaseplateLayout {
  return {
    columns: cellCount(settings.columns),
    rows: cellCount(settings.rows),
    cellSize: STANDARD_CELL_SIZE_MM,
    margins: { left: 0, right: 0, back: 0, front: 0 },
  };
}

/**
 * Grouped boolean path (ADR 0004 fallback): the outline slab minus every pocket tool at
 * once. The cell-brick path arrives with #5.
 */
function buildMesh(wasm: ManifoldToplevel, layout: BaseplateLayout, profile: PocketProfile, quarter: number): TriangleMesh {
  const { columns, rows, cellSize } = layout;
  const width = columns * cellSize;
  const depth = rows * cellSize;
  const outerRadius = Math.min(OUTER_RADIUS_MM, width / 2, depth / 2);

  return withArena((own) => {
    const outline = own(new wasm.CrossSection([roundedRect(width, depth, outerRadius, quarter)]));
    const slab = own(wasm.Manifold.extrude(outline, profile.height));
    const tool = pocketTool(wasm, own, profile, cellSize, quarter);
    const tools: Manifold[] = [];
    for (let i = 0; i < columns; i++)
      for (let j = 0; j < rows; j++)
        tools.push(own(tool.translate([(i - (columns - 1) / 2) * cellSize, (j - (rows - 1) / 2) * cellSize, 0])));
    const baseplate = own(slab.subtract(own(wasm.Manifold.compose(tools))));

    const status = baseplate.status();
    if (status !== "NoError") throw new Error(`Baseplate mesh is not manifold: ${status}`);
    // getMesh() copies out of the WASM heap: the buffers outlive the arena.
    const { vertProperties, triVerts, numProp } = baseplate.getMesh();
    return { positions: positionsOnly(vertProperties, numProp), indices: triVerts };
  });
}

/** Solid removed for one cell, centred on the origin: a loft of the profile's layers. */
function pocketTool(
  wasm: ManifoldToplevel,
  own: <D extends { delete(): void }>(object: D) => D,
  profile: PocketProfile,
  cellSize: number,
  quarter: number,
): Manifold {
  const first = profile.points[0];
  const last = profile.points[profile.points.length - 1];
  if (!first || !last) throw new Error("A pocket profile needs at least one point");
  const layers = [
    [first[0] - TOOL_OVERSHOOT_MM, first[1]] as const,
    ...profile.points.slice(1),
    [last[0] + TOOL_OVERSHOOT_MM, last[1]] as const,
  ].map(([z, inset]) => ({
    z,
    points: roundedRect(cellSize - 2 * inset, cellSize - 2 * inset, profile.topRadius - inset, quarter),
  }));
  const { positions, indices } = loft(layers);
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: positions, triVerts: indices })));
}

/** Counter-clockwise rounded rectangle centred on the origin, `quarter` segments per corner. */
function roundedRect(width: number, depth: number, radius: number, quarter: number): [number, number][] {
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
    for (let s = 0; s <= quarter; s++) {
      const angle = ((corner + s / quarter) * Math.PI) / 2;
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  });
  return points;
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

function positionsOnly(properties: Float32Array, numProp: number): Float32Array {
  if (numProp === 3) return properties;
  const count = properties.length / numProp;
  const positions = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) positions.set(properties.subarray(v * numProp, v * numProp + 3), v * 3);
  return positions;
}

function dimensionsOf({ positions }: TriangleMesh): BaseplateStats["dimensions"] {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = positions[i + axis] as number;
      if (value < (min[axis] as number)) min[axis] = value;
      if (value > (max[axis] as number)) max[axis] = value;
    }
  }
  const extent = (axis: number) => (max[axis] as number) - (min[axis] as number);
  return { width: extent(0), depth: extent(1), height: extent(2) };
}
