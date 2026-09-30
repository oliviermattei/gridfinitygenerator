// Clips that hold the pieces of a cut baseplate together (#22, ADR 0010), at the corners (#30,
// ADR 0018), and the edge slots that clip a baseplate to another one (#37, ADR 0022).
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { DIGIT_HEIGHT_MM, DIGIT_GAP_MM, type Label } from "./label";
import type { Own } from "./manifold";
import { roundDownToLayer, roundUpToLayer } from "./print";
import { postReach } from "./skeleton";
import { TOOL_OVERSHOOT_MM, gridRect, insideOutline, loft, type GridFrame } from "./shapes";
import type { Lattice, SplitPlan } from "./split";

/**
 * A clip is a U-shaped staple, printed apart, pushed up from below into the foot of the
 * muret on a cut, astride it: its bridge lies flush with the bottom of the baseplate, and
 * its two legs grip the tooth that each piece keeps against the cut. The slot stays in the
 * foot of the muret, where the pocket wall is vertical (2.15 mm off the cut, from 1.05 to
 * 2.85 mm in the hybrid profile), with 0.8 mm of skin on the pocket side: nothing shows from
 * above, and a seated bin, which reaches the bottom of the baseplate in its pocket (ADR
 * 0006), never meets it.
 *
 * Each junction, the side two neighbouring pieces share along a cut, takes two clips, one at
 * each end, or a single one when it is one or two cells long (ADR 0018). A clip lies against
 * the corner: its slot starts at the crossing that ends the junction, which holds no screw nor
 * magnet, and runs along the first (or last) cell of the junction. From a crossing of two
 * cuts, it starts past the slots along the other cut, which share the corner of each piece;
 * from the edge of the lattice, it starts inwards, past a skin towards the margin, which may
 * be empty there (the holes of a frame of crossbars 2 mm high).
 *
 * A side of the outline without margin, where the grid reaches the edge, takes edge slots
 * (ADR 0022): the baseplate carries its half of a slot there, its tooth and its channel, as a
 * piece does on a cut, so that a clip holds it to another baseplate generated apart, with its
 * own side without margin. Two per side, one at each end, against the corner, or a single one
 * at the first end (front or left) when the side is one or two cells long: the same on the
 * four sides, whatever the cuts, so that two baseplates side by side have theirs face to face.
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
/**
 * Least material left around a slot where it could open onto something else: the margin, the
 * outline, the slot along the other cut at a crossing, the notch of a skeleton. Two lines of
 * 0.4 mm, as the skin on the pocket side (spec v1.1).
 */
const SKIN_MM = 0.8;
/**
 * Start of a slot from the axis of a crossing of two cuts. There, each piece holds in its
 * corner a slot along each cut: two slots starting nearer the axis than their half width would
 * meet. Starting here, their corners keep two lines of skin between them, across the diagonal
 * (√2 · (1.92 − 1.35) = 0.81 mm).
 */
export const CROSSING_START_MM = Math.ceil((SLOT_HALF_WIDTH_MM + SKIN_MM / Math.SQRT2) * 100) / 100;

/** The slot a clip goes in, as the settings shape it; also the size of the clip, less its gaps. */
export interface ClipSlot {
  /** Half the width of the slot on each side of the cut, in millimetres. */
  halfWidth: number;
  /** Half the width of the tooth each piece keeps against the cut, between the legs of the clip. */
  tooth: number;
  /**
   * Length of the slot along the cut: 5 mm, less in a skeleton, where the slot must end under
   * the post of its crossing, two lines of skin short of the notch of the muret (ADR 0018).
   */
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

/** Where a clip lies: on a cut, at one end of a junction, against the corner. */
export interface ClipPlacement {
  /** The cut it straddles: a column cut (a plane x = constant) or a row cut (y = constant). */
  cut: "column" | "row";
  /** Grid line of the cut, as in `SplitPlan.columnCuts` and `rowCuts`. */
  line: number;
  /** Cell of the lattice along the cut: its row j for a column cut, its column i for a row cut. */
  cell: number;
  /**
   * Shift of the clip along the cut from the middle of the side of the cell, in millimetres,
   * towards +Y on a column cut and +X on a row cut: towards the end of the junction the clip
   * lies at.
   */
  offset: number;
  /**
   * Distance of the slot from the axis of the crossing at that end of the junction:
   * `CROSSING_START_MM` from a crossing of two cuts, and 0.8 mm from the edge of the lattice, or
   * more to keep 0.8 mm of material inside the outline over a bottom chamfer.
   */
  start: number;
  /** Centre of the clip seen from above, in the coordinates of the mesh. */
  centre: [x: number, y: number];
}

/**
 * Half a slot on the outline, on a side without margin (ADR 0022): the tooth and the channel
 * the baseplate keeps against its edge, for a clip that holds it to another baseplate. `cut` and
 * `line` are those of the edge of the grid, as if it were a cut: a column line (0 or the number
 * of columns) for the left and right sides, a row line for the front and back ones.
 */
export interface EdgeSlot extends ClipPlacement {
  /** Side of its cell on the outline, as `BrickSide`: 0 right, 1 back, 2 left, 3 front. */
  side: BrickSide;
}

/** The clips of a baseplate: the slot, where each clip goes, and the edge slots. */
export interface ClipLayout {
  slot: ClipSlot;
  /**
   * One per clip to print, column cuts first, then row cuts, each along its cut: none for a
   * baseplate in a single piece.
   */
  placements: ClipPlacement[];
  /**
   * The edge slots, right, back, left then front, each from its first end: none on a side
   * with a margin. They take no clip of their own: those that join two baseplates are
   * downloaded apart.
   */
  edges: EdgeSlot[];
}

/**
 * The slot of the clips of a baseplate: for its pocket profile and layer height, and, in a
 * skeleton, short enough to end under the post of its crossing (skeleton.ts), two lines of
 * skin short of the notch at the top of the slot, when it starts from a crossing of two cuts.
 */
export function clipSlotOf(frame: Pick<GridFrame, "profile" | "layerHeight" | "cellSize" | "skeleton">): ClipSlot {
  const { profile, layerHeight } = frame;
  const foot = profile.points[profile.points.length - 2];
  if (!foot) throw new Error("A pocket profile needs an upper slope");
  const top = roundDownToLayer(foot[0], layerHeight);
  const reach = frame.skeleton ? postReach({ ...frame, skeleton: frame.skeleton }, top) : null;
  // A tenth of a millimetre, down: 4.0 mm in the hybrid profile, 4.1 mm in the flush one.
  const room = reach === null ? SLOT_LENGTH_MM : Math.floor((reach - SKIN_MM - CROSSING_START_MM) * 10 + 1e-6) / 10;
  return {
    halfWidth: SLOT_HALF_WIDTH_MM,
    tooth: TOOTH_HALF_WIDTH_MM,
    length: Math.min(SLOT_LENGTH_MM, room),
    bridge: roundUpToLayer(BRIDGE_MM, layerHeight),
    top,
  };
}

/** A stretch of the side of a cell, from its middle along the cut, that a clip must not overlap. */
export type KeepOut = readonly [from: number, to: number];

/** An end of a junction, where a clip may go: the cell of the junction there, and its side of the crossing. */
interface JunctionEnd {
  /** Cell of the lattice along the cut at that end: its row for a column cut, its column for a row cut. */
  cell: number;
  /** −1 at the first end (front or left), 1 at the last one (back or right): where the crossing lies along the side. */
  towards: -1 | 1;
  /** Whether the crossing at that end is a crossing of two cuts, otherwise the edge of the lattice. */
  crossed: boolean;
}

/**
 * Whether a bottom chamfer leaves an edge slot whole where the leg of a clip grips it: it cuts
 * the tooth under the channel's height, and the tooth's face against the leg under the channel
 * and the tooth together (ADR 0022, `prototypes/edge-slots/`); 1.30 mm with layers of 0.2 mm.
 * A deeper chamfer takes no edge slot.
 */
export function takesEdgeSlots(frame: Pick<GridFrame, "bottomChamfer">, slot: ClipSlot): boolean {
  return frame.bottomChamfer <= slot.bridge + slot.tooth + 1e-9;
}

/**
 * The clips of a baseplate cut along `plan` (ADR 0018), and its edge slots (ADR 0022). Each
 * junction, a run of cells of the lattice along a cut between two crossings of cuts or the
 * edges of the lattice, takes a clip at each end, against the corner; a junction of one or two
 * cells takes a single one, at its end on a crossing of two cuts if it has one (where four
 * pieces meet, the joint gives the most), otherwise at its first end, and at its other end when
 * the first has no room. A clip keeps clear of the number engraved under a piece of a single
 * cell, in the middle of a side on the cut, and a slot never reaches past the middle of the
 * side; an end without room takes no clip. Each side of the outline without margin takes its
 * edge slots by the same rule, over its whole length (`edgeSlotsOf`).
 */
export function clipLayoutOf(frame: GridFrame, lattice: Lattice, plan: Pick<SplitPlan, "columnCuts" | "rowCuts">, labels: readonly Label[]): ClipLayout {
  const slot = clipSlotOf(frame);
  const { cellSize } = frame;
  const half = cellSize / 2;
  const [x0, y0] = gridRect(frame);
  // The top of a skeleton's post over the slot, less the skin: where a slot must end.
  const post = frame.skeleton ? postReach({ ...frame, skeleton: frame.skeleton }, slot.top) : null;
  const limit = Math.min(half, post === null ? Infinity : post - SKIN_MM);
  const labelled = labelKeepOuts(labels);
  // The start of the slot at an end: past the slots along the other cut at a crossing of two
  // cuts; at the edge of the lattice, past the skin, and far enough inside the outline for the
  // skin to stand over a bottom chamfer (`corners`, the corners of the slot on the edge).
  const startAt = (end: JunctionEnd, corners: readonly (readonly [x: number, y: number])[]) =>
    end.crossed
      ? CROSSING_START_MM
      : Math.max(SKIN_MM, SKIN_MM + frame.bottomChamfer - Math.min(...corners.map(([x, y]) => insideOutline(frame, x, y))));
  const placements: ClipPlacement[] = [];
  const along = (
    cut: ClipPlacement["cut"],
    line: number,
    [first, end]: readonly [number, number],
    crossings: readonly number[],
    sides: (cell: number) => readonly (readonly [i: number, j: number, side: Label["side"]])[],
    centre: (cell: number, offset: number) => [number, number],
  ) => {
    const bounds = [first, ...crossings.filter((c) => c > first && c < end), end];
    for (let k = 0; k + 1 < bounds.length; k++) {
      const [a, b] = [bounds[k] as number, bounds[k + 1] as number];
      const ends: [JunctionEnd, JunctionEnd] = [
        { cell: a, towards: -1, crossed: crossings.includes(a) },
        { cell: b - 1, towards: 1, crossed: crossings.includes(b) },
      ];
      const place = (junctionEnd: JunctionEnd): ClipPlacement | null => {
        // The crossing at that end, from the middle of the side of its cell, along the cut.
        const axis = junctionEnd.towards * half;
        const [cx, cy] = centre(junctionEnd.cell, axis);
        const across = (u: number) => (cut === "column" ? [cx + u, cy] : [cx, cy + u]) as [number, number];
        const start = startAt(junctionEnd, [across(-slot.halfWidth), across(slot.halfWidth)]);
        const offset = shiftOf(junctionEnd, start, slot, half, limit, labelled(sides(junctionEnd.cell)));
        return offset === null ? null : { cut, line, cell: junctionEnd.cell, offset, start, centre: centre(junctionEnd.cell, offset) };
      };
      placements.push(...atEnds(ends, b - a >= 3, place));
    }
  };
  for (const line of plan.columnCuts)
    along(
      "column",
      line,
      lattice.rows,
      plan.rowCuts,
      (j) => [
        [line - 1, j, 0],
        [line, j, 2],
      ],
      (j, offset) => [x0 + line * cellSize, y0 + (j + 0.5) * cellSize + offset],
    );
  for (const line of plan.rowCuts)
    along(
      "row",
      line,
      lattice.columns,
      plan.columnCuts,
      (i) => [
        [i, line - 1, 1],
        [i, line, 3],
      ],
      (i, offset) => [x0 + (i + 0.5) * cellSize + offset, y0 + line * cellSize],
    );
  // In the order of the cuts, each along its cut.
  const order = (p: ClipPlacement) => (p.cut === "column" ? 0 : 1);
  placements.sort((p, q) => order(p) - order(q) || p.line - q.line || p.cell - q.cell || p.offset - q.offset);
  return { slot, placements, edges: edgeSlotsOf(frame, lattice, slot, labelled) };
}

/** The stretches of the side of a cell that the digits of a number engraved under it take, by side of the cells given. */
function labelKeepOuts(labels: readonly Label[]) {
  return (cells: readonly (readonly [i: number, j: number, side: Label["side"]])[]): KeepOut[] =>
    labels
      .filter(({ cell: [i, j], side }) => cells.some(([a, b, s]) => a === i && b === j && s === side))
      .map(({ text }) => {
        const extent = (text.length * DIGIT_HEIGHT_MM + (text.length - 1) * DIGIT_GAP_MM) / 2 + LABEL_CLEARANCE_MM;
        return [-extent, extent] as const;
      });
}

/**
 * Shift from the middle of the side of its cell of a slot at an end of a run, `start` from the
 * crossing there: null when it would pass `limit` from the middle, or meet a number.
 */
function shiftOf(end: JunctionEnd, start: number, slot: ClipSlot, half: number, limit: number, keepOuts: readonly KeepOut[]): number | null {
  if (start + slot.length > limit + 1e-9) return null;
  const offset = end.towards * (half - start - slot.length / 2);
  const [from, to] = [offset - slot.length / 2, offset + slot.length / 2];
  return keepOuts.some(([p, q]) => to > p && from < q) ? null : offset;
}

/**
 * The ends of a run of cells that take a slot: both when it is three cells long or more;
 * otherwise a single one, on a crossing of two cuts if it has one, else the first end, and the
 * other one when that has no room.
 */
function atEnds<T>(ends: readonly [JunctionEnd, JunctionEnd], both: boolean, place: (end: JunctionEnd) => T | null): T[] {
  if (both) return ends.flatMap((end) => place(end) ?? []);
  const [preferred, other] = !ends[0].crossed && ends[1].crossed ? [ends[1], ends[0]] : ends;
  const placed = place(preferred) ?? place(other);
  return placed ? [placed] : [];
}

/**
 * The edge slots of a baseplate (ADR 0022): on each side of the outline without margin, where
 * the grid reaches the edge, along the whole side of the lattice, whatever the cuts (the build
 * plate is not in the share link: the same settings give the same edge slots). Each end is a
 * corner of the lattice; the slot starts past the rounded corner of the outline, past the skin
 * over the bottom chamfer of the other side, and past the edge slot of the other side in the
 * same corner (`CROSSING_START_MM`, as at a crossing of two cuts), or, when the other side has
 * a margin, 0.8 mm inside the lattice, as a clip at the edge of the lattice. The muret on the
 * outline is never notched (a skeleton) and holds no magnet: only the middle of the side of
 * the cell limits the slot. None with a deep bottom chamfer (`takesEdgeSlots`).
 */
function edgeSlotsOf(frame: GridFrame, lattice: Lattice, slot: ClipSlot, labelled: ReturnType<typeof labelKeepOuts>): EdgeSlot[] {
  if (!takesEdgeSlots(frame, slot)) return [];
  const { cellSize, margins, outerRadius: radius, bottomChamfer: chamfer } = frame;
  const half = cellSize / 2;
  const [x0, y0] = gridRect(frame);
  const { columns: [i0, i1], rows: [j0, j1], rests } = lattice;
  // Start from a corner of the lattice with `rest` of margin beyond it, on the other side.
  const startAt = (rest: number) =>
    Math.ceil(Math.max(SKIN_MM, rest > 0 ? 0 : CROSSING_START_MM, radius - rest, SKIN_MM + chamfer - rest) * 100 - 1e-6) / 100;
  const sides: [side: BrickSide, margin: number, cut: ClipPlacement["cut"], line: number, run: readonly [number, number], rests: [number, number]][] = [
    [0, margins.right, "column", i1, [j0, j1], [rests.front, rests.back]],
    [1, margins.back, "row", j1, [i0, i1], [rests.left, rests.right]],
    [2, margins.left, "column", i0, [j0, j1], [rests.front, rests.back]],
    [3, margins.front, "row", j0, [i0, i1], [rests.left, rests.right]],
  ];
  return sides.flatMap(([side, margin, cut, line, [first, end], [before, after]]) => {
    if (margin > 0) return [];
    // The cell of the lattice along the side, and its centre shifted along the side.
    const cellOf = (k: number): [number, number, Label["side"]] =>
      cut === "column" ? [side === 0 ? line - 1 : line, k, side] : [k, side === 1 ? line - 1 : line, side];
    const centre = (k: number, offset: number): [number, number] =>
      cut === "column" ? [x0 + line * cellSize, y0 + (k + 0.5) * cellSize + offset] : [x0 + (k + 0.5) * cellSize + offset, y0 + line * cellSize];
    const ends: [JunctionEnd, JunctionEnd] = [
      { cell: first, towards: -1, crossed: false },
      { cell: end - 1, towards: 1, crossed: false },
    ];
    const place = (at: JunctionEnd): EdgeSlot | null => {
      const start = startAt(at.towards < 0 ? before : after);
      const offset = shiftOf(at, start, slot, half, half, labelled([cellOf(at.cell)]));
      return offset === null ? null : { cut, line, cell: at.cell, offset, start, centre: centre(at.cell, offset), side };
    };
    return atEnds(ends, end - first >= 3, place);
  });
}

/** Side of a cell brick, in quarter turns from +X: 0 +X, 1 +Y, 2 −X, 3 −Y (as `LabelSide`). */
export type BrickSide = 0 | 1 | 2 | 3;

/** `slotsByCell` of each layout already asked for: the assemblies and the lamellas ask for each cell. */
const slotsOfLayouts = new WeakMap<ClipLayout, Map<string, (number | undefined)[]>>();

/**
 * The slots of each cell of the lattice with a clip or an edge slot on a side, by `"i,j"`: the
 * shift of the slot along each side (undefined for a side without one), in the order of
 * `BrickSide`. A side holds one slot at most: a junction or a side of the outline of one or
 * two cells takes a single one, and a slot never reaches past the middle of its side.
 */
export function slotsByCell(layout: ClipLayout | null): ReadonlyMap<string, readonly (number | undefined)[]> {
  if (!layout) return new Map();
  const known = slotsOfLayouts.get(layout);
  if (known) return known;
  const cells = new Map<string, (number | undefined)[]>();
  const add = (i: number, j: number, side: BrickSide, offset: number) => {
    const key = `${i},${j}`;
    const sides = cells.get(key) ?? [undefined, undefined, undefined, undefined];
    sides[side] = offset;
    cells.set(key, sides);
  };
  for (const { cut, line, cell, offset } of layout.placements) {
    if (cut === "column") {
      add(line - 1, cell, 0, offset);
      add(line, cell, 2, offset);
    } else {
      add(cell, line - 1, 1, offset);
      add(cell, line, 3, offset);
    }
  }
  // An edge slot is only in the cell inside the outline.
  for (const { cut, line, cell, offset, side } of layout.edges) {
    if (cut === "column") add(side === 0 ? line - 1 : line, cell, side, offset);
    else add(cell, side === 1 ? line - 1 : line, side, offset);
  }
  slotsOfLayouts.set(layout, cells);
  return cells;
}

/**
 * Solid removed from a cell brick, around its centre, for its slot on one side (`BrickSide`),
 * shifted along it by `offset`: the channel of the bridge from below the brick to `bridge`,
 * out past the cut face, and the slot of the leg up to `top`, which leaves the tooth against
 * the cut. The same for every brick with a slot there: the caller computes it once. Built as
 * a single mesh, an L-shaped prism, without a boolean: a large baseplate has a few dozen of them.
 */
export function brickSlotTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame, slot: ClipSlot, side: BrickSide, offset: number): Manifold {
  const half = frame.cellSize / 2;
  const o = TOOL_OVERSHOOT_MM;
  const { halfWidth: w, tooth: t, bridge, top } = slot;
  // Built on the +X side, then turned a quarter per side: along the side, the shift of a clip
  // runs towards +Y or +X, the turned +X side towards −X on the +Y side and −Y on the −X side.
  const along = side === 1 || side === 2 ? -offset : offset;
  // The L across the cut, counter-clockwise as [z, a]: z up, a from the face inwards (a < 0).
  const section: [number, number][] = [
    [-o, -w],
    [top, -w],
    [top, -t],
    [bridge, -t],
    [bridge, o],
    [-o, o],
  ];
  const { positions, indices } = loft([
    { z: along - slot.length / 2, points: section },
    { z: along + slot.length / 2, points: section },
  ]);
  // [z, a, along] to the +X side (x = half + a, y = along, z), a rotation, then turned.
  const placed = new Float32Array(positions.length);
  for (let v = 0; v < positions.length; v += 3) {
    const [z, a, u] = [positions[v] as number, positions[v + 1] as number, positions[v + 2] as number];
    const [x, y] = turn([half + a, u], side);
    placed.set([x, y, z], v);
  }
  return own(new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: placed, triVerts: indices })));
}

/** A point turned a number of quarter turns counter-clockwise about the origin (sides as `BrickSide`). */
function turn([x, y]: readonly [number, number], quarters: BrickSide): [number, number] {
  switch (quarters) {
    case 1:
      return [-y, x];
    case 2:
      return [-x, -y];
    case 3:
      return [y, -x];
    default:
      return [x, y];
  }
}

/**
 * Solid removed from the whole baseplate for its clips, astride each cut, and for its edge
 * slots, astride the outline, whose outer half removes nothing (the boolean assembly).
 */
export function slotTools(wasm: ManifoldToplevel, own: Own, layout: ClipLayout): Manifold {
  const { slot } = layout;
  const o = TOOL_OVERSHOOT_MM;
  const tools = [...layout.placements, ...layout.edges].map(({ cut, centre: [cx, cy] }) => {
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
