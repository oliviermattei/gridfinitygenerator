import { assembleWithBooleans } from "./boolean-assembly";
import { assembleWithBricks, canAssembleWithBricks } from "./brick-assembly";
import { layoutOf, type BaseplateLayout, type Margins } from "./layout";
import { loadManifold } from "./manifold";
import { FLUSH_PROFILE, POCKET_PROFILES } from "./pocket-profile";
import { layerCount } from "./print";
import { screwHolesOf, screwPositions } from "./screws";
import { clampSettings, type BaseplateSettings } from "./settings";
import type { TriangleMesh } from "./mesh";
import type { GridFrame } from "./shapes";

export type { BaseplateLayout, Margins, TriangleMesh };

export type Quality = "preview" | "final";

/** Segments per quarter circle for rounded corners (spec v1: 8 in preview, 32 in final). */
const SEGMENTS_PER_QUARTER: Record<Quality, number> = { preview: 8, final: 32 };
/** Segments per hole (spec v1: 16 in preview, 64 in final). */
const SEGMENTS_PER_HOLE: Record<Quality, number> = { preview: 16, final: 64 };

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
  /** Number of screws that fix the baseplate to the drawer: one per screw hole, none without screws. */
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
 * Generates a baseplate: a grid of open pockets with the profile of the settings (hybrid by
 * default, ADR 0002, or flush) on a pitch of the cell size, sized for a drawer or by its
 * number of cells, its outline rounded and chamfered at the bottom by the settings, and its margin
 * (a frame of crossbars for now, see margin.ts), with a countersunk screw hole on each inner
 * intersection of the grid when the screws are on (screws.ts, ADR 0006). The settings are
 * first brought into their ranges, and a missing one takes its default (`clampSettings`):
 * without settings, the baseplate of the default drawer. The mesh is always closed; the
 * final mesh, the one that gets exported, is also checked by manifold (`NoError`) before it
 * is returned.
 */
export async function generateBaseplate(
  input: Partial<BaseplateSettings>,
  quality: Quality,
  options: GenerateOptions = {},
): Promise<Baseplate> {
  return buildBaseplate(clampSettings(input), quality, [], options);
}

/**
 * Generates the test kit: a 1 × 2 baseplate whose front cell has the hybrid profile and
 * whose back cell has the flush one, to try how bins seat in each before printing a large
 * baseplate. It is as high as its hybrid cell (4.60 mm); the flush cell is 0.35 mm lower,
 * and the muret between them steps down on the line between the cells. Of the settings, it
 * only takes those that are not about the size, the alignment, the pocket profile or the
 * screws (a 1 × 2 grid has no inner intersection): the cell size, the outer corner radius
 * and the bottom chamfer, so that it tries the pockets and the outline of the baseplate to
 * print, and the print settings.
 */
export async function generateTestKit(input: Partial<BaseplateSettings>, quality: Quality): Promise<Baseplate> {
  const settings = clampSettings({
    ...input,
    sizeMode: "cells",
    columns: 1,
    rows: 2,
    marginWidth: 0,
    marginDepth: 0,
    pocketProfile: "hybrid",
    screws: false,
  });
  return buildBaseplate(settings, quality, [{ i: 0, j: 1, profile: FLUSH_PROFILE }]);
}

/** Builds the baseplate of settings brought into their ranges, some cells cut lower. */
async function buildBaseplate(
  settings: BaseplateSettings,
  quality: Quality,
  lowerCells: GridFrame["lowerCells"],
  options: GenerateOptions = {},
): Promise<Baseplate> {
  const wasm = await loadManifold();
  const cells = layoutOf(settings);
  const { margins } = cells;
  const width = cells.columns * cells.cellSize + margins.left + margins.right;
  const depth = cells.rows * cells.cellSize + margins.back + margins.front;
  const profile = POCKET_PROFILES[settings.pocketProfile];
  const frame: GridFrame = {
    columns: cells.columns,
    rows: cells.rows,
    cellSize: cells.cellSize,
    profile,
    lowerCells,
    margins,
    width,
    depth,
    // Never more than half the smallest side: a single row of cells gets round ends.
    outerRadius: Math.min(settings.outerRadius, width / 2, depth / 2),
    bottomChamfer: settings.bottomChamfer,
    segmentsPerQuarter: SEGMENTS_PER_QUARTER[quality],
    segmentsPerHole: SEGMENTS_PER_HOLE[quality],
    screws: screwHolesOf(settings, profile),
    layerHeight: settings.layerHeight,
    lineWidth: settings.lineWidth,
  };
  const strategy = options.strategy ?? (canAssembleWithBricks(frame) ? "bricks" : "boolean");
  const layout: BaseplateLayout = { ...cells, screws: screwPositions(frame) };
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
      screws: layout.screws.length,
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
