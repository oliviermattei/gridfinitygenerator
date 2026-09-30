// Number engraved under each piece of a cut baseplate (#21).
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import type { Own } from "./manifold";
import { insetAt } from "./pocket-profile";
import { roundUpToLayer } from "./print";
import { TOOL_OVERSHOOT_MM, rect, type GridFrame } from "./shapes";
import type { PiecePlan, SplitPlan } from "./split";

/**
 * The number of a piece is engraved in the bottom of a muret, where the piece lies on the
 * bed, so that it prints without support and is read by turning the piece over. It lies in
 * the half of a muret that one cell brick holds (ADR 0004): murets are centred on the seams
 * between bricks, and a half muret is only 2.85 mm wide at the bottom, so the digits are
 * 3 mm high along the muret and stacked, the first one towards +Y. It sits in the middle of a
 * side of a cell, away from the crossings of the murets (screws, magnets); on a side inside
 * the piece when there is one, where no connector goes.
 */

/** Height of a digit, along the muret, in millimetres (spec v1.1). */
export const DIGIT_HEIGHT_MM = 3;
/** Width of a digit, across the muret: it must fit in the half muret with some skin on each side. */
const DIGIT_WIDTH_MM = 1.8;
/** Width of the strokes of the seven-segment digits: wider than a line, so that the slicer resolves them. */
const STROKE_MM = 0.5;
/** Space between two digits of a number. */
export const DIGIT_GAP_MM = 0.8;
/** Depth of the engraving before rounding up to the layer: two layers of 0.2 mm (spec v1.1). */
const DEPTH_MM = 0.4;

/** Side of a cell brick a label lies along, in quarter turns from +X: 0 +X, 1 +Y, 2 −X, 3 −Y. */
export type LabelSide = 0 | 1 | 2 | 3;

/** Where the number of a piece is engraved: the cell whose brick holds it, and the side of that cell. */
export interface Label {
  text: string;
  /** Cell of the lattice (i along X, j along Y). */
  cell: [i: number, j: number];
  side: LabelSide;
}

/**
 * The label of each piece of a cut baseplate, none when the baseplate is a single piece.
 * On the muret line nearest the middle of the piece across X, in its middle row; on a line
 * across Y for a piece one column wide; along a cut for a piece of a single cell.
 */
export function labelsOf(plan: SplitPlan): Label[] {
  if (plan.pieces.length <= 1) return [];
  return plan.pieces.map((piece) => ({ text: String(piece.number), ...placeOf(piece, plan) }));
}

function placeOf({ columns: [i0, i1], rows: [j0, j1] }: PiecePlan, plan: SplitPlan): Omit<Label, "text"> {
  const middle = (first: number, end: number) => first + Math.floor((end - first - 1) / 2);
  // The cell left of (or in front of) the grid line nearest the middle of the piece.
  const beforeMiddleLine = (first: number, end: number) => first + Math.floor((end - first) / 2) - 1;
  if (i1 - i0 >= 2) return { cell: [beforeMiddleLine(i0, i1), middle(j0, j1)], side: 0 };
  if (j1 - j0 >= 2) return { cell: [i0, beforeMiddleLine(j0, j1)], side: 1 };
  // A single cell: along one of its cuts, a half muret like any other.
  const side: LabelSide = plan.columnCuts.includes(i1) ? 0 : plan.rowCuts.includes(j1) ? 1 : plan.columnCuts.includes(i0) ? 2 : 3;
  return { cell: [i0, j0], side };
}

/** Segments of the seven-segment digits, from a (top) clockwise to f, then g (middle). */
const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

/**
 * Rectangles of a segment in the frame of a digit as read, [u0, v0, u1, v1]: u to the right,
 * v up, the digit in [0, W] × [0, H].
 */
function segment(name: string): [number, number, number, number] {
  const [w, h, s] = [DIGIT_WIDTH_MM, DIGIT_HEIGHT_MM, STROKE_MM];
  switch (name) {
    case "a":
      return [0, h - s, w, h];
    case "b":
      return [w - s, h / 2, w, h];
    case "c":
      return [w - s, 0, w, h / 2];
    case "d":
      return [0, 0, w, s];
    case "e":
      return [0, 0, s, h / 2];
    case "f":
      return [0, h / 2, s, h];
    default:
      return [0, (h - s) / 2, w, (h + s) / 2];
  }
}

/** Depth of the engraving: 0.4 mm rounded up to a whole number of layers. */
export function labelDepth(frame: Pick<GridFrame, "layerHeight">): number {
  return roundUpToLayer(DEPTH_MM, frame.layerHeight);
}

/**
 * Solid removed for a label, around the centre of its cell (the origin of its brick): the
 * digits, from below the baseplate up to the depth of the engraving. Seen from above, they
 * are mirrored, so that they read right once the piece is turned over (about its Y axis for
 * a label along ±X). Across the muret, the digits are centred in the half muret at the top of
 * the engraving: never on the seam of the brick, nor in the pocket.
 */
export function labelTool(wasm: ManifoldToplevel, own: Own, frame: GridFrame, { text, side }: Label): Manifold {
  const depth = labelDepth(frame);
  const half = frame.cellSize / 2;
  const halfMuret = insetAt(frame.profile, depth);
  const skin = (halfMuret - DIGIT_WIDTH_MM) / 2;
  if (skin <= 0) throw new Error(`No room for a label in a half muret of ${halfMuret} mm`);
  // Label along +X: across the muret, x from the seam inwards; the digits stacked along Y.
  const right = half - skin; // right edge of the digits as read turned over = their left edge seen from above
  const length = text.length * DIGIT_HEIGHT_MM + (text.length - 1) * DIGIT_GAP_MM;
  const rectangles: [number, number][][] = [];
  [...text].forEach((digit, k) => {
    const top = length / 2 - k * (DIGIT_HEIGHT_MM + DIGIT_GAP_MM);
    for (const name of SEGMENTS[digit] ?? "") {
      const [u0, v0, u1, v1] = segment(name);
      // Turned over about Y, u runs along −X: u = 0 is the right edge seen from above.
      const [x0, x1] = [right - u1, right - u0];
      const [y0, y1] = [top - DIGIT_HEIGHT_MM + v0, top - DIGIT_HEIGHT_MM + v1];
      rectangles.push(turn(rect(x0, y0, x1, y1), side));
    }
  });
  const area: CrossSection = own(wasm.CrossSection.union(rectangles.map((points) => own(new wasm.CrossSection([points])))));
  const bottom = -TOOL_OVERSHOOT_MM;
  return own(own(wasm.Manifold.extrude(area, depth - bottom)).translate([0, 0, bottom]));
}

/** Points turned a number of quarter turns counter-clockwise about the origin. */
function turn(points: [number, number][], quarters: LabelSide): [number, number][] {
  return points.map(([x, y]) => {
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
  });
}
