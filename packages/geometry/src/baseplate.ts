import { BASEPLATE_TYPE_VARIANTS } from "./baseplate-type";
import { assembleWithBooleans } from "./boolean-assembly";
import { assembleWithBricks, canAssembleWithBricks } from "./brick-assembly";
import type { Clickbase } from "./clickbase";
import { clipLayoutOf, clipSlotOf, clipSolid, type ClipLayout } from "./clips";
import { labelsOf } from "./label";
import { layoutOf, type BaseplateLayout, type Margins } from "./layout";
import { loadManifold, withArena } from "./manifold";
import { FLUSH_PROFILE, POCKET_PROFILES } from "./pocket-profile";
import { magnetHolesOf, magnetPositions } from "./magnets";
import { supportAreas } from "./margin";
import { layerCount, type BuildPlate } from "./print";
import { screwHolesOf, screwPositions } from "./screws";
import { clampSettings, type BaseplateSettings } from "./settings";
import type { TriangleMesh } from "./mesh";
import { meshOf, type GridFrame } from "./shapes";
import { latticeOf, splitPlanOf, type PiecePlan, type SplitPlan } from "./split";

export type { BaseplateLayout, ClipLayout, Margins, PiecePlan, SplitPlan, TriangleMesh };

export type Quality = "preview" | "final";

/** Segments per quarter circle for rounded corners (spec v1: 8 in preview, 32 in final). */
const SEGMENTS_PER_QUARTER: Record<Quality, number> = { preview: 8, final: 32 };
/** Segments per hole (spec v1: 16 in preview, 64 in final). */
const SEGMENTS_PER_HOLE: Record<Quality, number> = { preview: 16, final: 64 };

export interface BaseplateStats {
  /** Bounding box of the mesh, in millimetres (width along X, depth along Y). */
  dimensions: { width: number; depth: number; height: number };
  /**
   * Volume of material of the pieces, in mm³, measured on the final mesh (the one exported),
   * never an estimate; the clips are apart (`clipsVolume`). The mass is the app's: it takes the
   * density of the filament, a preference (#31, ADR 0019). Null for the preview, whose coarser
   * mesh is not the one printed.
   */
  volume: number | null;
  /**
   * Height in layers of the layer height: the layers needed to print the whole height. The
   * pocket profile is not rounded to the layer, so the last layer may be partial.
   */
  layers: number;
  /** Number of pieces to print: 1 unless the baseplate is cut for the build plate. */
  pieces: number;
  /** Number of screws that fix the baseplate to the drawer: one per screw hole, none without screws. */
  screws: number;
  /** Number of magnets that hold the baseplate in a sheet-metal drawer: one per magnet hole. */
  magnets: number;
  /**
   * Number of clips to print, which hold the pieces together: one per slot along the cuts,
   * none for a single piece. The edge slots take none: the clips that join two baseplates are
   * downloaded apart (`Baseplate.clip`).
   */
  clips: number;
  /**
   * Volume of material of all the clips to print, in mm³: the volume of one clip measured on
   * its mesh (`Baseplate.clip`) times their number; 0 for a single piece. Null for the preview,
   * like `volume`.
   */
  clipsVolume: number | null;
}

/**
 * How the frame is assembled; both give the same solid (volume within 0.1 mm³).
 * - `"bricks"`: cell bricks joined at the mesh level (ADR 0004), fast on any grid size, but
 *   only when the grid and the whole cells its margin carries on span at least 2 × 2 cells
 *   (a `RangeError` otherwise).
 * - `"boolean"`: grouped booleans over the whole grid, the slower fallback for any grid.
 */
export type AssemblyStrategy = "bricks" | "boolean";

export interface GenerateOptions {
  /** Defaults to `"bricks"` when the grid allows it, `"boolean"` otherwise. */
  strategy?: AssemblyStrategy;
  /**
   * Usable area of the build plate: a baseplate that does not fit on it, as it is or turned
   * a quarter, is cut into pieces that do (split.ts, ADR 0009). It is a local preference of
   * the user, not a baseplate setting, so it is not in the share link. Without it, the
   * baseplate is never cut.
   */
  buildPlate?: BuildPlate | null;
  /**
   * Whether to drill the magnet holes, true by default. They are not a setting (ADR 0012):
   * false is for the benches and tests that measure what the holes take away.
   */
  magnets?: boolean;
  /**
   * Whether to build the margin, true by default. False builds the same baseplate without it:
   * the grid alone, its layout, cut, clips and holes unchanged but for the magnets the margin
   * held. The surplus of a shape of margin, shown under it, is the volume of the baseplate less
   * that of its grid alone (#29).
   */
  margin?: boolean;
  /**
   * Whether to cut the slots of the clips, along the cuts and on the outline, true by default.
   * They are not a setting (ADR 0022): false is for the benches and tests that measure what
   * the slots take away.
   */
  clips?: boolean;
}

/** One piece of the baseplate, a closed shell of its mesh, in the order of `layout.split.pieces`. */
export interface BaseplatePiece {
  /** Number of the piece, engraved under it when the baseplate is cut. */
  number: number;
  /** First vertex of the piece in the mesh of the baseplate, and the vertex past its last one. */
  vertices: [first: number, end: number];
  /** First triangle of the piece in the mesh of the baseplate, and the triangle past its last one. */
  triangles: [first: number, end: number];
  /** Bounding box of the piece, measured on its mesh, in millimetres. */
  dimensions: BaseplateStats["dimensions"];
  /** Volume of the piece, in mm³, measured on its final mesh; null for the preview. */
  volume: number | null;
}

export interface Baseplate {
  /**
   * The whole baseplate, assembled: every piece in its place, each a closed shell of its own
   * (they touch along the cuts, but share no vertex).
   */
  mesh: TriangleMesh;
  layout: BaseplateLayout;
  stats: BaseplateStats;
  /** Its pieces, a single one when it is not cut. */
  pieces: BaseplatePiece[];
  /**
   * One clip, as it prints (lying on its side, from the origin up), to print `stats.clips`
   * times (`printClips`), or alone, to join the baseplate to another one by their edge slots
   * (`generateClip`, the same). Always there, even without a slot; always checked (`NoError`).
   */
  clip: TriangleMesh;
}

/**
 * Generates a baseplate: a grid of open pockets with the profile of the settings (hybrid by
 * default, ADR 0002, or flush) on a pitch of the cell size, or of pockets on a solid floor
 * for a tray (the type of baseplate, baseplate-type.ts, ADR 0013), sized for a drawer or by its
 * number of cells, its outline rounded and chamfered at the bottom by the settings, and its
 * margin in the shape of the settings (a frame of crossbars by default, truncated cells or
 * the extended grid, whole or reduced to their supports, see margin.ts, ADR 0011 and ADR 0017), with a countersunk screw hole on each inner intersection of the grid when the
 * screws are on (screws.ts, ADR 0006), and a magnet hole under each other crossing of the
 * murets the material holds, always (magnets.ts, ADR 0012). The type of baseplate may also notch
 * the murets (a skeleton, skeleton.ts) or cut lamellas that hold the bins in the pocket walls
 * (CLICKbase, clickbase.ts). With a build plate it does not fit on
 * (`options.buildPlate`), it is cut on grid lines into pieces that do, each with its number
 * engraved underneath (split.ts, label.ts, ADR 0009), and a slot astride the cut at each end
 * of each junction of two pieces, against the corner, for a clip printed apart (clips.ts, ADR
 * 0010 and ADR 0018). Each side of the outline without margin takes edge slots, half of a slot
 * at each end, to clip the baseplate to another one (ADR 0022). The settings are
 * first brought into their ranges, and a missing one takes its default (`clampSettings`):
 * without settings, the baseplate of the default drawer. The mesh of each piece is always
 * closed; the final mesh, the one that gets exported, is also checked by manifold
 * (`NoError`), piece by piece, before it is returned.
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
 * only takes those that are not about the size, the alignment, the pocket profile, the type
 * of baseplate (it is always open) or the screws (a 1 × 2 grid has no inner intersection):
 * the cell size, the outer corner radius
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
    baseplateType: "normal",
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
  const type = BASEPLATE_TYPE_VARIANTS[settings.baseplateType];
  const profile = type.profile(POCKET_PROFILES[settings.pocketProfile], settings.layerHeight);
  const uncut: GridFrame = {
    columns: cells.columns,
    rows: cells.rows,
    cellSize: cells.cellSize,
    profile,
    lowerCells,
    margins,
    marginShape: options.margin === false ? "none" : settings.marginShape,
    minimalMargin: settings.minimalMargin,
    width,
    depth,
    // Never more than half the smallest side: a single row of cells gets round ends.
    outerRadius: Math.min(settings.outerRadius, width / 2, depth / 2),
    bottomChamfer: settings.bottomChamfer,
    segmentsPerQuarter: SEGMENTS_PER_QUARTER[quality],
    segmentsPerHole: SEGMENTS_PER_HOLE[quality],
    screws: screwHolesOf(settings, profile),
    magnets: options.magnets === false || lowerCells.length > 0 ? null : magnetHolesOf(settings),
    cuts: { columns: [], rows: [] },
    clips: null,
    skeleton: type.skeleton(settings.layerHeight),
    clickbase: clickbaseFor(type.clickbase(cells.cellSize, profile, settings.layerHeight), quality),
    layerHeight: settings.layerHeight,
    lineWidth: settings.lineWidth,
  };
  const split = splitPlanOf(uncut, options.buildPlate ?? null);
  const labels = labelsOf(split);
  // The test kit tries the seating of the bins: no slot.
  const clips = clipsOf(options.clips !== false && lowerCells.length === 0, uncut, split, labels);
  // The slots of the clips, under the murets, never show from above: the preview leaves them
  // out, and the lamellas of a CLICKbase whole, for its 100 ms; the final mesh has them (ADR 0018).
  const frame: GridFrame = { ...uncut, cuts: { columns: split.columnCuts, rows: split.rowCuts }, clips: quality === "final" ? clips : null };
  const strategy = options.strategy ?? (canAssembleWithBricks(frame) ? "bricks" : "boolean");
  const layout: BaseplateLayout = {
    ...cells,
    screws: screwPositions(frame),
    magnets: magnetPositions(frame, latticeOf(frame)),
    supports: supportAreas(frame),
    split,
    clips,
  };
  const meshes =
    strategy === "bricks"
      ? assembleWithBricks(wasm, frame, quality === "final", split.pieces, labels)
      : assembleWithBooleans(wasm, frame, split.pieces, labels);
  const { mesh, pieces } = joinPieces(meshes, split.pieces, quality);
  const clip = withArena((own) => meshOf(clipSolid(wasm, own, clipSlotOf(frame))));
  return {
    mesh,
    layout,
    stats: {
      dimensions: dimensionsOf(mesh),
      volume: quality === "final" ? pieces.reduce((sum, piece) => sum + (piece.volume as number), 0) : null,
      layers: layerCount(frame.profile.height, settings.layerHeight),
      pieces: pieces.length,
      screws: layout.screws.length,
      magnets: layout.magnets.length,
      clips: clips?.placements.length ?? 0,
      clipsVolume: quality === "final" ? (clips ? volumeOf(clip) * clips.placements.length : 0) : null,
    },
    pieces,
    clip,
  };
}

/** The lamellas of a CLICKbase for a quality: only their slits in the preview (clickbase.ts). */
function clickbaseFor(clickbase: Clickbase | null, quality: Quality): Clickbase | null {
  return clickbase && quality === "preview" ? { ...clickbase, slitsOnly: true } : clickbase;
}

/**
 * The clips of a baseplate cut along `split` and its edge slots, null without slots (`on`, the
 * test kit and the benches), or when neither a junction nor a side of the outline has one.
 */
function clipsOf(on: boolean, frame: GridFrame, split: SplitPlan, labels: ReturnType<typeof labelsOf>): ClipLayout | null {
  if (!on) return null;
  const layout = clipLayoutOf(frame, latticeOf(frame), split, labels);
  return layout.placements.length > 0 || layout.edges.length > 0 ? layout : null;
}

/**
 * One clip for the settings, as it prints (lying on its side, from the origin up), checked
 * (`NoError`): the one of `Baseplate.clip`, to print alone, for instance to join two
 * baseplates by their edge slots (ADR 0022). It only depends on the pocket profile, the type
 * of baseplate and the layer height.
 */
export async function generateClip(input: Partial<BaseplateSettings>): Promise<TriangleMesh> {
  const settings = clampSettings(input);
  const wasm = await loadManifold();
  const type = BASEPLATE_TYPE_VARIANTS[settings.baseplateType];
  const profile = type.profile(POCKET_PROFILES[settings.pocketProfile], settings.layerHeight);
  const slot = clipSlotOf({ profile, layerHeight: settings.layerHeight, cellSize: settings.cellSize, skeleton: type.skeleton(settings.layerHeight) });
  return withArena((own) => meshOf(clipSolid(wasm, own, slot)));
}

/** The meshes of the pieces as one mesh, each a range of its vertices and triangles, measured. */
function joinPieces(meshes: readonly TriangleMesh[], plans: readonly PiecePlan[], quality: Quality): Pick<Baseplate, "mesh" | "pieces"> {
  if (meshes.length === 1) {
    const [mesh] = meshes as [TriangleMesh];
    return { mesh, pieces: [pieceOf(mesh, plans[0] as PiecePlan, 0, 0, quality)] };
  }
  const vertexCount = meshes.reduce((sum, { positions }) => sum + positions.length / 3, 0);
  const indexCount = meshes.reduce((sum, { indices }) => sum + indices.length, 0);
  const positions = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);
  let [vertices, written] = [0, 0];
  const pieces = meshes.map((mesh, index) => {
    positions.set(mesh.positions, vertices * 3);
    for (let k = 0; k < mesh.indices.length; k++) indices[written + k] = (mesh.indices[k] as number) + vertices;
    const piece = pieceOf(mesh, plans[index] as PiecePlan, vertices, written / 3, quality);
    vertices += mesh.positions.length / 3;
    written += mesh.indices.length;
    return piece;
  });
  return { mesh: { positions, indices }, pieces };
}

function pieceOf(mesh: TriangleMesh, plan: PiecePlan, firstVertex: number, firstTriangle: number, quality: Quality): BaseplatePiece {
  return {
    number: plan.number,
    vertices: [firstVertex, firstVertex + mesh.positions.length / 3],
    triangles: [firstTriangle, firstTriangle + mesh.indices.length / 3],
    dimensions: dimensionsOf(mesh),
    volume: quality === "final" ? volumeOf(mesh) : null,
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
