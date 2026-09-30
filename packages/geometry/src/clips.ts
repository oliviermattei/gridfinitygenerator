// Clips that hold the pieces of a cut baseplate together (#22, ADR 0010).
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { DIGIT_HEIGHT_MM, DIGIT_GAP_MM, type Label } from "./label";
import type { Own } from "./manifold";
import type { PocketProfile } from "./pocket-profile";
import { roundDownToLayer, roundUpToLayer } from "./print";
import { TOOL_OVERSHOOT_MM, gridRect, type GridFrame } from "./shapes";
import type { Lattice, SplitPlan } from "./split";

/**
 * A clip is a U-shaped staple, printed apart, pushed up from below into the foot of the
 * muret on a cut, astride it: its bridge lies flush with the bottom of the baseplate, and
 * its two legs grip the tooth that each piece keeps against the cut. The slot stays in the
 * foot of the muret, where the pocket wall is vertical (2.15 mm off the cut, from 1.05 to
 * 2.85 mm in the hybrid profile), with 0.8 mm of skin on the pocket side: nothing shows from
 * above, and a seated bin, which reaches the bottom of the baseplate in its pocket (ADR
 * 0006), never meets it. One clip lies in the middle of each side of a cell along a cut; the
 * crossings of the murets (screws, magnets) stay clear.
 *
 * The slot is fixed; the gaps are the clip's own: another gap only takes other clips, never
 * another baseplate.
 */

/** Half the width of the slot on each side of the cut: the vertical pocket wall (2.15 mm) less 0.8 mm of skin. */
const SLOT_HALF_WIDTH_MM = 1.35;
/** Half the tooth between the legs of the clip: what each piece keeps against the cut. */
const TOOTH_HALF_WIDTH_MM = 0.5;
/** Length of the slot along the cut. */
const SLOT_LENGTH_MM = 5;
/** Height of the channel of the bridge under the tooth, before rounding up to the layer. */
const BRIDGE_MM = 0.8;
/** Gap of the clip in its slot on each face across the cut (spec v1.1), at each end along it, and at the top. */
const GAP_ACROSS_MM = 0.1;
const GAP_ALONG_MM = 0.25;
const GAP_UP_MM = 0.2;
/** 45° lead-in at the top of the legs, so that they find the slot and the tooth. */
const LEAD_MM = 0.15;
/** Material left between a slot and the digits of a label engraved on the same side. */
const LABEL_CLEARANCE_MM = 0.5;
/** Space between the clips laid out for the print. */
const PRINT_SPACING_MM = 3;

/** The slot a clip goes in, as the settings shape it; also the size of the clip, less its gaps. */
export interface ClipSlot {
  /** Half the width of the slot on each side of the cut, in millimetres. */
  halfWidth: number;
  /** Half the width of the tooth each piece keeps against the cut, between the legs of the clip. */
  tooth: number;
  /** Length of the slot along the cut. */
  length: number;
  /** Height of the channel of the bridge under the tooth, on a whole number of layers. */
  bridge: number;
  /**
   * Top of the slot: the foot of the upper slope of the pocket, rounded down to the layer
   * (2.80 mm in the hybrid profile with 0.2 mm layers, 2.40 mm in the flush one). Nothing is
   * removed above it, so the baseplate is untouched seen from above.
   */
  top: number;
}

/** Where a clip lies: on a cut, in the middle of the side of a cell, or moved along it. */
export interface ClipPlacement {
  /** The cut it straddles: a column cut (a plane x = constant) or a row cut (y = constant). */
  cut: "column" | "row";
  /** Grid line of the cut, as in `SplitPlan.columnCuts` and `rowCuts`. */
  line: number;
  /** Cell of the lattice along the cut: its row j for a column cut, its column i for a row cut. */
  cell: number;
  /**
   * Shift of the clip along the cut from the middle of the side of the cell, in millimetres,
   * towards +Y on a column cut and +X on a row cut: 0 unless something else lies there (the
   * number engraved under a piece of a single cell).
   */
  offset: number;
  /** Centre of the clip seen from above, in the coordinates of the mesh. */
  centre: [x: number, y: number];
}

/** The clips of a cut baseplate: the slot, and where each clip goes. */
export interface ClipLayout {
  slot: ClipSlot;
  /** One per clip to print, column cuts first, then row cuts, each along its cut. */
  placements: ClipPlacement[];
}

/** The slot of the clips for a pocket profile and a layer height. */
export function clipSlotOf(profile: PocketProfile, layerHeight: number): ClipSlot {
  const foot = profile.points[profile.points.length - 2];
  if (!foot) throw new Error("A pocket profile needs an upper slope");
  return {
    halfWidth: SLOT_HALF_WIDTH_MM,
    tooth: TOOTH_HALF_WIDTH_MM,
    length: SLOT_LENGTH_MM,
    bridge: roundUpToLayer(BRIDGE_MM, layerHeight),
    top: roundDownToLayer(foot[0], layerHeight),
  };
}

/** A stretch of the side of a cell, from its middle along the cut, that a clip must not overlap. */
export type KeepOut = readonly [from: number, to: number];

/**
 * The clips of a baseplate cut along `plan`: one in the middle of each side of a cell of the
 * lattice along each cut, moved along the side when a label is engraved there (only a piece
 * of a single cell has its number on a cut), and left out when the side has no room for it.
 * Each clip keeps clear of the crossings: within the side, less the widest half muret at
 * each end.
 */
export function clipLayoutOf(frame: GridFrame, lattice: Lattice, plan: Pick<SplitPlan, "columnCuts" | "rowCuts">, labels: readonly Label[]): ClipLayout {
  const slot = clipSlotOf(frame.profile, frame.layerHeight);
  const { cellSize } = frame;
  const [x0, y0] = gridRect(frame);
  const reach = cellSize / 2 - (frame.profile.points[0]?.[1] ?? 0);
  const keepOuts = (cells: readonly (readonly [i: number, j: number, side: Label["side"]])[]): KeepOut[] =>
    labels
      .filter(({ cell: [i, j], side }) => cells.some(([a, b, s]) => a === i && b === j && s === side))
      .map(({ text }) => {
        const half = (text.length * DIGIT_HEIGHT_MM + (text.length - 1) * DIGIT_GAP_MM) / 2 + LABEL_CLEARANCE_MM;
        return [-half, half] as const;
      });
  const placements: ClipPlacement[] = [];
  for (const line of plan.columnCuts)
    for (let j = lattice.rows[0]; j < lattice.rows[1]; j++) {
      const offset = placeAlong(keepOuts([[line - 1, j, 0], [line, j, 2]]), reach, slot.length);
      if (offset === null) continue;
      placements.push({ cut: "column", line, cell: j, offset, centre: [x0 + line * cellSize, y0 + (j + 0.5) * cellSize + offset] });
    }
  for (const line of plan.rowCuts)
    for (let i = lattice.columns[0]; i < lattice.columns[1]; i++) {
      const offset = placeAlong(keepOuts([[i, line - 1, 1], [i, line, 3]]), reach, slot.length);
      if (offset === null) continue;
      placements.push({ cut: "row", line, cell: i, offset, centre: [x0 + (i + 0.5) * cellSize + offset, y0 + line * cellSize] });
    }
  return { slot, placements };
}

/**
 * Where a clip of `length` goes along the side of a cell, from its middle: the middle when it
 * is free, otherwise the nearest place past a keep-out (towards + first), within `reach` of
 * the middle; null when there is none.
 */
export function placeAlong(keepOuts: readonly KeepOut[], reach: number, length: number): number | null {
  const half = length / 2;
  const free = (at: number) =>
    at - half >= -reach - 1e-9 && at + half <= reach + 1e-9 && keepOuts.every(([from, to]) => at + half <= from || at - half >= to);
  const candidates = [0, ...keepOuts.flatMap(([from, to]) => [to + half, from - half])];
  const fitting = candidates.filter(free).sort((a, b) => Math.abs(a) - Math.abs(b) || b - a);
  return fitting[0] ?? null;
}

/** Side of a cell brick, in quarter turns from +X: 0 +X, 1 +Y, 2 −X, 3 −Y (as `LabelSide`). */
export type BrickSide = 0 | 1 | 2 | 3;

/**
 * The slots of each cell of the lattice with a clip on a side, by `"i,j"`: the shift of the
 * clip along each side (undefined for a side without one), in the order of `BrickSide`.
 */
export function slotsByCell(layout: ClipLayout | null): Map<string, (number | undefined)[]> {
  const cells = new Map<string, (number | undefined)[]>();
  const add = (i: number, j: number, side: BrickSide, offset: number) => {
    const key = `${i},${j}`;
    const sides = cells.get(key) ?? [undefined, undefined, undefined, undefined];
    sides[side] = offset;
    cells.set(key, sides);
  };
  for (const { cut, line, cell, offset } of layout?.placements ?? []) {
    if (cut === "column") {
      add(line - 1, cell, 0, offset);
      add(line, cell, 2, offset);
    } else {
      add(cell, line - 1, 1, offset);
      add(cell, line, 3, offset);
    }
  }
  return cells;
}

/**
 * Solid removed from a cell brick, around its centre, for its slot on one side (`BrickSide`),
 * shifted along it by `offset`: the channel of the bridge from below the brick to `bridge`,
 * out past the cut face, and the slot of the leg up to `top`, which leaves the tooth against
 * the cut. The same for every brick with a slot there: the caller computes it once.
 */
export function brickSlotTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame, slot: ClipSlot, side: BrickSide, offset: number): Manifold {
  const half = frame.cellSize / 2;
  const o = TOOL_OVERSHOOT_MM;
  // Across the cut: from the face inwards (a < 0); along it: the shift, towards +Y or +X.
  const box = (a0: number, a1: number, z0: number, z1: number) => {
    const [b0, b1] = [offset - slot.length / 2, offset + slot.length / 2];
    const [x0, x1, y0, y1] =
      side === 0 ? [half + a0, half + a1, b0, b1]
      : side === 2 ? [-half - a1, -half - a0, b0, b1]
      : side === 1 ? [b0, b1, half + a0, half + a1]
      : [b0, b1, -half - a1, -half - a0];
    return own(own(wasm.Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
  };
  const channel = box(-slot.halfWidth, o, -o, slot.bridge);
  const leg = box(-slot.halfWidth, -slot.tooth, -o, slot.top);
  return own(wasm.Manifold.union([channel, leg]));
}

/** Solid removed from the whole baseplate for its clips, astride each cut (the boolean assembly). */
export function slotTools(wasm: ManifoldToplevel, own: Own, layout: ClipLayout): Manifold {
  const { slot } = layout;
  const o = TOOL_OVERSHOOT_MM;
  const tools = layout.placements.map(({ cut, centre: [cx, cy] }) => {
    const box = (a0: number, a1: number, z0: number, z1: number) => {
      const [b0, b1] = [-slot.length / 2, slot.length / 2];
      const [x0, x1, y0, y1] = cut === "column" ? [cx + a0, cx + a1, cy + b0, cy + b1] : [cx + b0, cx + b1, cy + a0, cy + a1];
      return own(own(wasm.Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
    };
    const { halfWidth: w, tooth: t } = slot;
    return own(wasm.Manifold.union([box(-w, w, -o, slot.bridge), box(-w, -t, -o, slot.top), box(t, w, -o, slot.top)]));
  });
  return own(wasm.Manifold.compose(tools));
}

/**
 * Outline of a clip across the cut, [u, v]: u across the cut, v up from the bottom of the
 * baseplate, counter-clockwise. An upside-down U: the bridge at the bottom, flush with the
 * baseplate, the legs up either side of the tooth, their tops chamfered; smaller than the
 * slot by the gaps.
 */
export function clipOutline(slot: ClipSlot): [number, number][] {
  const w = slot.halfWidth - GAP_ACROSS_MM;
  const t = slot.tooth + GAP_ACROSS_MM;
  const [b, h, k] = [slot.bridge - GAP_UP_MM, slot.top - GAP_UP_MM, LEAD_MM];
  return [
    [-w, 0],
    [w, 0],
    [w, h - k],
    [w - k, h],
    [t + k, h],
    [t, h - k],
    [t, b],
    [-t, b],
    [-t, h - k],
    [-t - k, h],
    [-w + k, h],
    [-w, h - k],
  ];
}

/** Length of a clip along the cut: the slot less a gap at each end. */
export function clipLength(slot: ClipSlot): number {
  return slot.length - 2 * GAP_ALONG_MM;
}

/**
 * One clip as it prints: lying on its side, its outline in the plane of the build plate
 * (u along X, v along Y) and its length up, so that each leg is a wall of whole lines,
 * strong where it bends.
 */
export function clipSolid(wasm: ManifoldToplevel, own: Own, slot: ClipSlot): Manifold {
  const outline = own(new wasm.CrossSection([clipOutline(slot)]));
  return own(wasm.Manifold.extrude(outline, clipLength(slot)));
}

/** Width and depth taken by a clip on the build plate, lying on its side. */
function clipFootprint(slot: ClipSlot): [width: number, depth: number] {
  return [2 * (slot.halfWidth - GAP_ACROSS_MM), slot.top - GAP_UP_MM];
}

/**
 * Where each of `count` clips lies on the build plate, from `[x, y]`, in a near-square grid,
 * `PRINT_SPACING_MM` apart: the offsets of their origins (the middle of the bottom of their outline).
 */
export function clipGrid(slot: ClipSlot, count: number, [x, y]: readonly [number, number]): [dx: number, dy: number][] {
  const [width, depth] = clipFootprint(slot);
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  return Array.from({ length: count }, (_, k) => [
    x + width / 2 + (k % columns) * (width + PRINT_SPACING_MM),
    y + Math.floor(k / columns) * (depth + PRINT_SPACING_MM),
  ]);
}
