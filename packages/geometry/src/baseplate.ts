import { assembleWithBooleans } from "./boolean-assembly";
import { assembleWithBricks, canAssembleWithBricks } from "./brick-assembly";
import { loadManifold } from "./manifold";
import { HYBRID_PROFILE } from "./pocket-profile";
import { layerCount } from "./print";
import { clampSettings, type BaseplateSettings } from "./settings";
import type { TriangleMesh } from "./mesh";
import type { GridFrame } from "./shapes";

export type { TriangleMesh };

/** Side of a Gridfinity cell in the standard, in millimetres (default cell size). */
export const STANDARD_CELL_SIZE_MM = 42;

/** Outer corner radius of the baseplate (spec default `or`). */
const OUTER_RADIUS_MM = 4;

export type Quality = "preview" | "final";

/** Segments per quarter circle for rounded corners (spec v1: 8 in preview, 32 in final). */
const SEGMENTS_PER_QUARTER: Record<Quality, number> = { preview: 8, final: 32 };

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
  /**
   * Volume of material, in mm³, measured on the final mesh (the one exported): never an
   * estimate, and no mass, which would take an assumed density. Null for the preview,
   * whose coarser mesh is not the one printed.
   */
  volume: number | null;
  /**
   * Height in layers of the layer height: the layers needed to print the whole height. The
   * pocket profile is not rounded to the layer, so the last layer may be partial.
   */
  layers: number;
  /** Number of pieces to print: always 1 in v1, which does not cut for the build plate. */
  pieces: number;
  /** Number of screws that fix the baseplate: none until screw holes arrive (#11). */
  screws: number;
}

/**
 * How the frame is assembled; both give the same solid (volume within 0.1 mm³).
 * - `"bricks"`: cell bricks joined at the mesh level (ADR 0004), fast on any grid size, but
 *   only for grids of at least 2 × 2 cells (a `RangeError` otherwise).
 * - `"boolean"`: grouped booleans over the whole grid, the slower fallback for any grid.
 */
export type AssemblyStrategy = "bricks" | "boolean";

export interface GenerateOptions {
  /** Defaults to `"bricks"` when the grid allows it, `"boolean"` otherwise. */
  strategy?: AssemblyStrategy;
}

export interface Baseplate {
  mesh: TriangleMesh;
  layout: BaseplateLayout;
  stats: BaseplateStats;
}

/**
 * Generates a baseplate: a frame of open pockets with the hybrid profile (ADR 0002),
 * without margin. The settings are first brought into their ranges, and a missing one
 * takes its default (`clampSettings`). The mesh is always closed; the final mesh, the one
 * that gets exported, is also checked by manifold (`NoError`) before it is returned.
 */
export async function generateBaseplate(
  input: Partial<BaseplateSettings>,
  quality: Quality,
  options: GenerateOptions = {},
): Promise<Baseplate> {
  const wasm = await loadManifold();
  const settings = clampSettings(input);
  const layout = layoutOf(settings);
  const width = layout.columns * layout.cellSize;
  const depth = layout.rows * layout.cellSize;
  const frame: GridFrame = {
    columns: layout.columns,
    rows: layout.rows,
    cellSize: layout.cellSize,
    profile: HYBRID_PROFILE,
    outerRadius: Math.min(OUTER_RADIUS_MM, width / 2, depth / 2),
    segmentsPerQuarter: SEGMENTS_PER_QUARTER[quality],
  };
  const strategy = options.strategy ?? (canAssembleWithBricks(frame) ? "bricks" : "boolean");
  const mesh =
    strategy === "bricks" ? assembleWithBricks(wasm, frame, quality === "final") : assembleWithBooleans(wasm, frame);
  return {
    mesh,
    layout,
    stats: {
      dimensions: dimensionsOf(mesh),
      volume: quality === "final" ? volumeOf(mesh) : null,
      layers: layerCount(frame.profile.height, settings.layerHeight),
      pieces: 1,
      screws: 0,
    },
  };
}

/**
 * Loads manifold-3d's WASM ahead of the first generation, for instance while a worker is
 * idle. Optional: `generateBaseplate` loads it on first use.
 */
export async function loadEngine(): Promise<void> {
  await loadManifold();
}

function layoutOf(settings: BaseplateSettings): BaseplateLayout {
  return {
    columns: settings.columns,
    rows: settings.rows,
    cellSize: STANDARD_CELL_SIZE_MM,
    margins: { left: 0, right: 0, back: 0, front: 0 },
  };
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

/**
 * Volume enclosed by a closed mesh (divergence theorem): the sum of the signed volumes of
 * the tetrahedra joining the origin to each triangle, counter-clockwise seen from outside.
 */
function volumeOf({ positions, indices }: TriangleMesh): number {
  const p = positions;
  let sixfold = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * (indices[t] as number);
    const b = 3 * (indices[t + 1] as number);
    const c = 3 * (indices[t + 2] as number);
    const ax = p[a] as number, ay = p[a + 1] as number, az = p[a + 2] as number;
    const bx = p[b] as number, by = p[b + 1] as number, bz = p[b + 2] as number;
    const cx = p[c] as number, cy = p[c + 1] as number, cz = p[c + 2] as number;
    sixfold += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return sixfold / 6;
}
