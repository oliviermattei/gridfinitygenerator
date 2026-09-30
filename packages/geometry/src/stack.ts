// Stacked print of the pieces of a cut baseplate (#28, ADR 0016): the pieces printed one on
// top of another in a single run, in one material, a layer of air between two of them.
import type { Baseplate } from "./baseplate";
import type { BaseplateLayout } from "./layout";
import { loadManifold, withArena } from "./manifold";
import type { TriangleMesh } from "./mesh";
import { pieceMesh, PRINT_GAP_MM } from "./pieces";
import type { BaseplateSettings } from "./settings";
import { circle, meshOf, rect } from "./shapes";

/**
 * How a piece lies in a stack: the first one upright (`"none"`), every other one upside
 * down, turned half a turn about the X axis (`"x"`, its back to the front) or the Y axis
 * (`"y"`, its left to the right), so that its murets grow from their flats and every slope
 * prints over the one beneath (Stu142's method).
 */
export type StackFlip = "none" | "x" | "y";

/** A piece in a stack. */
export interface StackedPiece {
  /** Index of the piece in `Baseplate.pieces` and `layout.split.pieces`. */
  index: number;
  /** Number of the piece, engraved under it. */
  number: number;
  flip: StackFlip;
  /** Translation of the piece in the plane after its flip, in millimetres. */
  offset: [dx: number, dy: number];
  /** Height of its bottom in the stack: its rank times the pitch. */
  z: number;
}

export interface StackPlan {
  /** Height from the bottom of a piece to the bottom of the next one: their height and one layer of air. */
  pitch: number;
  /** The stacks, each from its bottom piece up; several when a piece cannot rest on another. */
  stacks: StackedPiece[][];
}

/**
 * Why the pieces cannot be stacked:
 * - `"single-piece"`: the baseplate is not cut;
 * - `"low-margin"`: its margin is a frame or brackets, 2 mm high, which would hang in the air
 *   under a piece upside down (only the truncated cells, full height, are held);
 * - `"tray"`: upside down, the floor of each pocket would bridge the whole pocket, and its
 *   sag would rise towards the foot of the bin, 0.2 mm above it;
 * - `"clickbase"`: the webs that hold the lamellas up in print would print on top of them.
 */
export type StackBlocker = "single-piece" | "low-margin" | "tray" | "clickbase";

/**
 * What to know before printing a stack:
 * - `"layer-height"`: layers thicker than `STACK_MAX_LAYER_MM` trip the empty-layer check of
 *   PrusaSlicer and OrcaSlicer (docs/research/impression-empilee-multimateriaux.md, 2.2);
 * - `"skeleton"`: upside down, the band of a notched muret bridges between two posts.
 */
export type StackWarning = "layer-height" | "skeleton";

/** Thickest layer whose single empty layer passes the empty-layer check of the slicers, in millimetres. */
export const STACK_MAX_LAYER_MM = 0.2;

/** Radius of a mouse ear, the one-layer disc on a corner of a piece that keeps it from lifting, in millimetres. */
export const EAR_RADIUS_MM = 6;
/** Diameter of a pin, the column that ties the ears of a corner through the stack, in millimetres. */
export const PIN_DIAMETER_MM = 0.8;
/** Distance of a pin from the two sides of the corner of its ear, outside the piece, in millimetres. */
const PIN_OFFSET_MM = 1.5;
/** Segments of an ear, and of a pin. */
const EAR_SEGMENTS = 48;
const PIN_SEGMENTS = 12;

/** Slack for coordinates compared on the lattice, in millimetres. */
const EPSILON_MM = 1e-3;

/** Whether the pieces of the baseplate of `settings`, laid out as `layout`, can be stacked, and what to know before. */
export function stackRuleOf(
  settings: Pick<BaseplateSettings, "marginShape" | "baseplateType" | "layerHeight">,
  layout: Pick<BaseplateLayout, "margins" | "split">,
): { blockers: StackBlocker[]; warnings: StackWarning[] } {
  const blockers: StackBlocker[] = [];
  if (layout.split.pieces.length <= 1) blockers.push("single-piece");
  const { left, right, back, front } = layout.margins;
  if (settings.marginShape !== "cells" && left + right + back + front > 0) blockers.push("low-margin");
  if (settings.baseplateType === "tray") blockers.push("tray");
  if (settings.baseplateType === "clickbase") blockers.push("clickbase");
  const warnings: StackWarning[] = [];
  if (settings.layerHeight > STACK_MAX_LAYER_MM + EPSILON_MM) warnings.push("layer-height");
  if (settings.baseplateType === "skeleton") warnings.push("skeleton");
  return { blockers, warnings };
}

/**
 * Pitch of a stack of pieces `height` high: their height and exactly one layer of air. A gap
 * of one layer holds exactly one of the heights the slicer samples its layers at, whatever
 * the first layer and whether `height` is a whole number of layers: one empty layer between
 * two pieces, never none (they would weld) nor two (the empty-layer check). 4.80 mm for the
 * hybrid profile in layers of 0.2 mm.
 */
export function stackPitch(height: number, layerHeight: number): number {
  return Math.round((height + layerHeight) * 1e6) / 1e6;
}

/** A side of a piece: left, right, front (−Y), back (+Y). */
type Side = "left" | "right" | "front" | "back";

/** A piece as it lies, or would lie, in the plane of a stack. */
interface Placed {
  /** Footprint [x0, y0, x1, y1]. */
  box: [number, number, number, number];
  /** Where the lines of its lattice fall, modulo the cell size: [x, y]. */
  phase: [number, number];
  /** Its sides where the outer wall of a margin stands off the lattice: they must stand on a wall. */
  walls: Record<Side, boolean>;
}

const mod = (value: number, size: number) => ((value % size) + size) % size;
/** Whether `value` is a multiple of `size`, to the slack. */
const onLattice = (value: number, size: number) => Math.min(mod(value, size), size - mod(value, size)) < EPSILON_MM;
const area = ({ box: [x0, y0, x1, y1] }: Placed) => (x1 - x0) * (y1 - y0);

/** The pieces of `layout` as they lie in the baseplate. */
function piecesOf({ columns, rows, cellSize, margins, split }: Pick<BaseplateLayout, "columns" | "rows" | "cellSize" | "margins" | "split">): Placed[] {
  const width = columns * cellSize + margins.left + margins.right;
  const depth = rows * cellSize + margins.back + margins.front;
  const phase: [number, number] = [mod(-width / 2 + margins.left, cellSize), mod(-depth / 2 + margins.front, cellSize)];
  // An outer side whose outline is off the lattice: a margin, and the outer wall of its truncated cells.
  const wall = (at: number, outline: number, grid: number) => Math.abs(at - outline) < EPSILON_MM && !onLattice(at - grid, cellSize);
  return split.pieces.map(({ footprint: box }) => ({
    box,
    phase,
    walls: {
      left: wall(box[0], -width / 2, phase[0]),
      right: wall(box[2], width / 2, phase[0]),
      front: wall(box[1], -depth / 2, phase[1]),
      back: wall(box[3], depth / 2, phase[1]),
    },
  }));
}

/** A piece turned upside down about an axis, before its translation. */
function flipped({ box: [x0, y0, x1, y1], phase: [px, py], walls }: Placed, flip: StackFlip, cellSize: number): Placed {
  if (flip === "x") return { box: [x0, -y1, x1, -y0], phase: [px, mod(-py, cellSize)], walls: { ...walls, front: walls.back, back: walls.front } };
  if (flip === "y") return { box: [-x1, y0, -x0, y1], phase: [mod(-px, cellSize), py], walls: { ...walls, left: walls.right, right: walls.left } };
  return { box: [x0, y0, x1, y1], phase: [px, py], walls };
}

/**
 * The translation along one axis that lays `upper` on `lower`, null when none does: the
 * lattice lines of both on the same lines, `upper` within `lower`, and each wall of `upper`
 * on a wall of `lower`. Among those, the one that centres it best.
 */
function shiftAlong(lower: Placed, upper: Placed, axis: 0 | 1, cellSize: number): number | null {
  const [lo, hi] = axis === 0 ? (["left", "right"] as const) : (["front", "back"] as const);
  const [l0, l1] = [lower.box[axis] as number, lower.box[axis + 2] as number];
  const [u0, u1] = [upper.box[axis] as number, upper.box[axis + 2] as number];
  const aligned = (shift: number) => onLattice(upper.phase[axis] + shift - lower.phase[axis], cellSize);
  const [min, max] = [l0 - u0, l1 - u1];
  if (min > max + EPSILON_MM) return null;
  const fixed: number[] = [];
  if (upper.walls[lo]) {
    if (!lower.walls[lo]) return null;
    fixed.push(min);
  }
  if (upper.walls[hi]) {
    if (!lower.walls[hi]) return null;
    fixed.push(max);
  }
  if (fixed.length > 0) {
    const [shift] = fixed as [number];
    return fixed.every((other) => Math.abs(other - shift) < EPSILON_MM) && aligned(shift) ? shift : null;
  }
  // The shifts in the range that align the lattices, and the one closest to centring `upper` on `lower`.
  let first = min + mod(lower.phase[axis] - upper.phase[axis] - min, cellSize);
  if (first - cellSize >= min - EPSILON_MM) first -= cellSize; // the modulo of a multiple, to the slack
  const centre = (l0 + l1 - u0 - u1) / 2;
  let best: number | null = null;
  for (let shift = first; shift <= max + EPSILON_MM; shift += cellSize) {
    if (best === null || Math.abs(shift - centre) < Math.abs(best - centre) - EPSILON_MM) best = shift;
  }
  return best;
}

function translated({ box: [x0, y0, x1, y1], phase: [px, py], walls }: Placed, [dx, dy]: [number, number], cellSize: number): Placed {
  return { box: [x0 + dx, y0 + dy, x1 + dx, y1 + dy], phase: [mod(px + dx, cellSize), mod(py + dy, cellSize)], walls };
}

/**
 * How the pieces of a cut baseplate stack up, from its layout alone (no mesh): Stu142's
 * method, the first piece of each stack upright, every other one upside down on the one
 * beneath, one layer of air between them (`stackPitch`). A piece rests on another only where
 * the other holds it: its lattice on the same lines (its flats on the other's flats or feet),
 * within its footprint, and the outer wall of its margin on the other's. The largest pieces go
 * first; each piece goes on the stack whose top holds it and is the smallest, or starts a new
 * stack. A mirror of a piece about one axis only: the pieces with a margin on two opposite
 * corners of the baseplate cannot all share one stack.
 */
export function stackPlanOf(
  layout: Pick<BaseplateLayout, "columns" | "rows" | "cellSize" | "margins" | "split">,
  height: number,
  layerHeight: number,
): StackPlan {
  const { cellSize, split } = layout;
  const pitch = stackPitch(height, layerHeight);
  const pieces = piecesOf(layout);
  const order = pieces.map((_, index) => index).sort((a, b) => area(pieces[b] as Placed) - area(pieces[a] as Placed) || a - b);
  const stacks: { top: Placed; pieces: StackedPiece[] }[] = [];
  for (const index of order) {
    const piece = pieces[index] as Placed;
    const number = split.pieces[index]?.number ?? index + 1;
    let best: { stack: (typeof stacks)[number]; flip: StackFlip; offset: [number, number] } | null = null;
    for (const stack of stacks)
      for (const flip of ["x", "y"] as const) {
        if (best && area(best.stack.top) <= area(stack.top)) continue;
        const upside = flipped(piece, flip, cellSize);
        const dx = shiftAlong(stack.top, upside, 0, cellSize);
        const dy = shiftAlong(stack.top, upside, 1, cellSize);
        if (dx !== null && dy !== null) best = { stack, flip, offset: [dx, dy] };
      }
    if (best) {
      const { stack, flip, offset } = best;
      stack.pieces.push({ index, number, flip, offset, z: Math.round(stack.pieces.length * pitch * 1e6) / 1e6 });
      stack.top = translated(flipped(piece, flip, cellSize), offset, cellSize);
    } else {
      stacks.push({ top: piece, pieces: [{ index, number, flip: "none", offset: [0, 0], z: 0 }] });
    }
  }
  return { pitch, stacks: stacks.map(({ pieces: stacked }) => stacked) };
}

/** Options of a printed stack. */
export interface StackOptions {
  /** Height of the layers of the print, the thickness of the ears. */
  layerHeight: number;
  /** Width of the lines of the print: how far an ear laps over the outline of its piece. */
  lineWidth: number;
  /** One-layer mouse ears on the corners of the bottom piece of each stack. */
  ears: boolean;
  /**
   * Pins of 0.8 mm through the stack on each corner of its bottom piece the pieces above
   * share, rising through an ear on each of them: they tie the corners down (with the ears).
   */
  pins: boolean;
}

/** One printed stack: its mesh, and the numbers of its pieces from the bottom up. */
export interface PrintedStack {
  mesh: TriangleMesh;
  pieces: number[];
}

/**
 * The pieces of a cut baseplate stacked for the print (`stackPlanOf`), each stack one mesh of
 * a closed shell per piece (and, with the pins, the pieces a pin ties together as one), laid
 * side by side `PRINT_GAP_MM` apart along X, turned a quarter as `printPieces` when the split
 * plan lays the pieces on the build plate that way. The clips are not stacked: `printClips`
 * lays them beside the stacks.
 */
export async function printStacks(
  baseplate: Pick<Baseplate, "mesh" | "layout" | "pieces" | "stats">,
  plan: StackPlan,
  options: StackOptions,
): Promise<PrintedStack[]> {
  const height = baseplate.stats.dimensions.height;
  const anchored = options.ears || options.pins;
  const wasm = anchored ? await loadManifold() : null;
  const stacks = plan.stacks.map((stack) => {
    const meshes = stack.map((piece) => placedMesh(pieceMesh(baseplate, baseplate.pieces[piece.index] as Baseplate["pieces"][number]), piece, height));
    let mesh = joined(meshes);
    if (wasm) {
      const anchors = anchorsOf(baseplate.layout, stack, plan.pitch, options);
      if (anchors.length > 0)
        mesh = withArena((own) => {
          const solid = own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.indices })));
          const tools = anchors.map(({ outline, bottom, top }) =>
            own(own(own(new wasm.CrossSection(outline, "Positive")).extrude(top - bottom)).translate([0, 0, bottom])),
          );
          return meshOf(own(solid.add(own(wasm.Manifold.union(tools)))));
        });
    }
    if (baseplate.layout.split.turned) {
      const { positions } = mesh;
      for (let v = 0; v < positions.length; v += 3) [positions[v], positions[v + 1]] = [-(positions[v + 1] as number), positions[v] as number];
    }
    return { mesh, pieces: stack.map(({ number }) => number) };
  });
  // Side by side along X, their fronts aligned.
  let right = -Infinity;
  let front = Infinity;
  for (const { mesh } of stacks) {
    const [x0, y0, x1] = boundsOf(mesh);
    const dx = right === -Infinity ? 0 : right + PRINT_GAP_MM - x0;
    const dy = front === Infinity ? 0 : front - y0;
    if (front === Infinity) front = y0;
    const { positions } = mesh;
    for (let v = 0; v < positions.length; v += 3) {
      positions[v] = (positions[v] as number) + dx;
      positions[v + 1] = (positions[v + 1] as number) + dy;
    }
    right = x1 + dx;
  }
  return stacks;
}

/** The mesh of a piece where it lies in its stack (a copy of `mesh`, modified in place). */
function placedMesh(mesh: TriangleMesh, { flip, offset: [dx, dy], z }: StackedPiece, height: number): TriangleMesh {
  const { positions } = mesh;
  for (let v = 0; v < positions.length; v += 3) {
    let [x, y, h] = [positions[v] as number, positions[v + 1] as number, positions[v + 2] as number];
    // Half a turn about an axis is a rotation: the triangles stay counter-clockwise.
    if (flip === "x") [y, h] = [-y, height - h];
    else if (flip === "y") [x, h] = [-x, height - h];
    positions[v] = x + dx;
    positions[v + 1] = y + dy;
    positions[v + 2] = h + z;
  }
  return mesh;
}

/** The meshes as one, each a shell of its own. */
function joined(meshes: readonly TriangleMesh[]): TriangleMesh {
  if (meshes.length === 1) return meshes[0] as TriangleMesh;
  const positions = new Float32Array(meshes.reduce((sum, mesh) => sum + mesh.positions.length, 0));
  const indices = new Uint32Array(meshes.reduce((sum, mesh) => sum + mesh.indices.length, 0));
  let [vertices, written] = [0, 0];
  for (const mesh of meshes) {
    positions.set(mesh.positions, vertices * 3);
    for (let k = 0; k < mesh.indices.length; k++) indices[written + k] = (mesh.indices[k] as number) + vertices;
    vertices += mesh.positions.length / 3;
    written += mesh.indices.length;
  }
  return { positions, indices };
}

function boundsOf({ positions }: TriangleMesh): [x0: number, y0: number, x1: number, y1: number] {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let v = 0; v < positions.length; v += 3) {
    const [x, y] = [positions[v] as number, positions[v + 1] as number];
    box[0] = Math.min(box[0], x);
    box[1] = Math.min(box[1], y);
    box[2] = Math.max(box[2], x);
    box[3] = Math.max(box[3], y);
  }
  return box;
}

/** A solid added to a stack: an outline extruded from `bottom` to `top`. */
interface Anchor {
  outline: [number, number][][];
  bottom: number;
  top: number;
}

/**
 * The ears and pins of a stack. Each corner of its bottom piece gets an ear; with the pins,
 * so does each piece above that shares the corner, one after another from the bottom, and a
 * pin rises from the build plate through all their ears. An ear is a disc of `EAR_RADIUS_MM`
 * on the corner of the footprint, one layer thick at the bottom of its piece, that laps one
 * line over the outline and keeps off the rest of the piece; the pin stands outside the piece.
 */
function anchorsOf(
  layout: Pick<BaseplateLayout, "columns" | "rows" | "cellSize" | "margins" | "split">,
  stack: readonly StackedPiece[],
  pitch: number,
  options: StackOptions,
): Anchor[] {
  const pieces = piecesOf(layout);
  const boxes = stack.map(({ index, flip, offset }) => translated(flipped(pieces[index] as Placed, flip, layout.cellSize), offset, layout.cellSize).box);
  const [bottom] = boxes as [Placed["box"]];
  const anchors: Anchor[] = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const corner: [number, number] = [sx < 0 ? bottom[0] : bottom[2], sy < 0 ? bottom[1] : bottom[3]];
    let chain = 1;
    if (options.pins)
      while (chain < boxes.length) {
        const box = boxes[chain] as Placed["box"];
        const at: [number, number] = [sx < 0 ? box[0] : box[2], sy < 0 ? box[1] : box[3]];
        if (Math.abs(at[0] - corner[0]) > EPSILON_MM || Math.abs(at[1] - corner[1]) > EPSILON_MM) break;
        chain++;
      }
    for (let k = 0; k < chain; k++) {
      const [x0, y0, x1, y1] = boxes[k] as Placed["box"];
      const inset = options.lineWidth;
      const ear = circle(EAR_RADIUS_MM, EAR_SEGMENTS).map(([x, y]): [number, number] => [x + corner[0], y + corner[1]]);
      // Negative winding: the inner rect (the piece, but a line along its outline) is left out of the disc.
      const keepOff = rect(x0 + inset, y0 + inset, x1 - inset, y1 - inset).reverse();
      const z = (stack[k] as StackedPiece).z;
      anchors.push({ outline: [ear, keepOff], bottom: z, top: z + options.layerHeight });
    }
    if (options.pins && chain > 1) {
      const centre: [number, number] = [corner[0] + sx * PIN_OFFSET_MM, corner[1] + sy * PIN_OFFSET_MM];
      const pin = circle(PIN_DIAMETER_MM / 2, PIN_SEGMENTS).map(([x, y]): [number, number] => [x + centre[0], y + centre[1]]);
      anchors.push({ outline: [pin], bottom: 0, top: (chain - 1) * pitch + options.layerHeight });
    }
  }
  return anchors;
}

