// Split of a baseplate into pieces that fit the build plate (#21, ADR 0009).
import type { Margins } from "./layout";
import { marginOf } from "./margin";
import { fitsOnBuildPlate, type BuildPlate } from "./print";
import { gridRect, type GridFrame } from "./shapes";

/**
 * Cells the baseplate is built on, in the indices of the grid (i along X, j along Y,
 * negative before the grid): the grid, and the whole cells its margin carries on beyond
 * each side, built exactly as the grid's inner cells (`MarginVariant.wholeCells`). The cell
 * bricks are laid on it (ADR 0004), and the baseplate is cut on its lines.
 */
export interface Lattice {
  /** First column, and the column past the last one. */
  columns: readonly [first: number, end: number];
  rows: readonly [first: number, end: number];
  /** Margin left beyond the lattice on each side, carried by the cells along that side. */
  rests: Margins;
}

export function latticeOf(frame: GridFrame): Lattice {
  const { columns, rows, cellSize, margins } = frame;
  const whole = marginOf(frame).wholeCells?.(frame) ?? { left: 0, right: 0, back: 0, front: 0 };
  return {
    // 0 − n, not −n: no −0 for a side without whole cells.
    columns: [0 - whole.left, columns + whole.right],
    rows: [0 - whole.front, rows + whole.back],
    rests: {
      left: margins.left - whole.left * cellSize,
      right: margins.right - whole.right * cellSize,
      back: margins.back - whole.back * cellSize,
      front: margins.front - whole.front * cellSize,
    },
  };
}

/** A piece of the baseplate, as the split plan lays it out. */
export interface PiecePlan {
  /**
   * Number of the piece, engraved under it when the baseplate is cut: from 1, row by row
   * from the back left to the front right, as the drawer is seen from above.
   */
  number: number;
  /** Cells of the lattice the piece holds, first and past the last, in the indices of the grid. */
  columns: [first: number, end: number];
  rows: [first: number, end: number];
  /**
   * Footprint of the piece seen from above, in millimetres, in the coordinates of the mesh:
   * its cells, and the margin on its sides on the outline. [x0, y0, x1, y1].
   */
  footprint: [x0: number, y0: number, x1: number, y1: number];
  /** Whether the piece fits on the build plate, as it is or turned a quarter; true without a build plate. */
  fits: boolean;
}

/**
 * How the baseplate is cut for the build plate. The cuts follow grid lines through the whole
 * baseplate, margin included: pieces are rectangles of whole cells, and the margin goes with
 * the pieces along the outline.
 */
export interface SplitPlan {
  /**
   * Grid lines the baseplate is cut on, across X, left to right: line `a` lies between
   * columns `a − 1` and `a` of the grid (negative in the whole cells of the margin before the
   * grid). Empty without a cut.
   */
  columnCuts: number[];
  /** Grid lines the baseplate is cut on, across Y, front to back. */
  rowCuts: number[];
  /**
   * Whether the pieces lie on the build plate turned a quarter: their width (X) along the
   * depth of the build plate. The plan is tried both ways, and this one took fewer pieces.
   */
  turned: boolean;
  /** The pieces, in the order of their numbers; a single one when the baseplate is not cut. */
  pieces: PiecePlan[];
}

/** Slack for float coordinates compared with a build plate, as `fitsOnBuildPlate`. */
const FIT_EPSILON_MM = 1e-3;
/** Slack for comparing two sums of squared lengths. */
const SCORE_EPSILON = 1e-6;

/** The split of one axis: the number of cells of each piece, and the scores the plans are compared by. */
interface AxisPlan {
  /** Number of cells of each piece, in order. */
  spans: number[];
  /** Pieces of a single cell. */
  singles: number;
  /** Sum of the squared lengths of the pieces, in mm²: the lower, the more equal the pieces. */
  balance: number;
}

/**
 * Splits one axis of `count` cells of `cellSize`, `startRest` and `endRest` of margin at its
 * ends, into pieces no longer than `limit`: dynamic programming over the cells
 * (docs/research/gridfinity-baseplate.md A.5), fewest pieces first, then the fewest pieces
 * of a single cell, then the most equal pieces (lowest sum of squared lengths).
 *
 * An axis that cannot be split into pieces that fit is split as well as it can be:
 * - a cell longer than the limit: no split at all, since cutting would not help;
 * - a cell with its margin longer than the limit: the pieces at its ends keep a single cell
 *   and do not fit, the others do.
 */
export function splitAxis(count: number, cellSize: number, startRest: number, endRest: number, limit: number): AxisPlan {
  const length = (start: number, end: number) =>
    (end - start) * cellSize + (start === 0 ? startRest : 0) + (end === count ? endRest : 0);
  const fits = (start: number, end: number) => length(start, end) <= limit + FIT_EPSILON_MM;
  const whole: AxisPlan = { spans: [count], singles: 0, balance: length(0, count) ** 2 };
  if (count <= 1 || fits(0, count) || cellSize > limit + FIT_EPSILON_MM) return whole;
  // A single cell too long with its margin is allowed: nothing shorter holds that margin.
  const allowed = (start: number, end: number) => fits(start, end) || end - start === 1;

  interface Best {
    pieces: number;
    singles: number;
    balance: number;
    from: number;
  }
  const best: (Best | null)[] = [{ pieces: 0, singles: 0, balance: 0, from: -1 }];
  for (let end = 1; end <= count; end++) {
    let chosen: Best | null = null;
    for (let start = 0; start < end; start++) {
      const before = best[start];
      if (!before || !allowed(start, end)) continue;
      const candidate: Best = {
        pieces: before.pieces + 1,
        singles: before.singles + (end - start === 1 ? 1 : 0),
        balance: before.balance + length(start, end) ** 2,
        from: start,
      };
      if (!chosen || better(candidate, chosen)) chosen = candidate;
    }
    best.push(chosen);
  }
  const spans: number[] = [];
  for (let end = count; end > 0; ) {
    const step = best[end] as Best;
    spans.unshift(end - step.from);
    end = step.from;
  }
  const last = best[count] as Best;
  return { spans, singles: last.singles, balance: last.balance };
}

/** Fewer pieces, then fewer single cells, then more equal pieces; a tie keeps the first found. */
function better(a: { pieces: number; singles: number; balance: number }, b: { pieces: number; singles: number; balance: number }): boolean {
  if (a.pieces !== b.pieces) return a.pieces < b.pieces;
  if (a.singles !== b.singles) return a.singles < b.singles;
  return a.balance < b.balance - SCORE_EPSILON;
}

/**
 * The split plan of a baseplate for a build plate: each axis split on its own (the pieces
 * form a grid, every cut goes across the whole baseplate), in both orientations of the build
 * plate. The orientation kept has, in order: every piece on the plate, the fewest pieces,
 * the fewest pieces a single cell wide, the most equal pieces (lowest sum of squared areas),
 * and the plate as it is. Without a build plate, a single piece. The build plate is its
 * usable area: no hidden margin is taken off it.
 */
export function splitPlanOf(frame: GridFrame, plate: BuildPlate | null): SplitPlan {
  const lattice = latticeOf(frame);
  const [i0, i1] = lattice.columns;
  const [j0, j1] = lattice.rows;
  const { cellSize } = frame;
  const { rests } = lattice;
  const planFor = (width: number, depth: number, turned: boolean) => {
    const x = splitAxis(i1 - i0, cellSize, rests.left, rests.right, width);
    const y = splitAxis(j1 - j0, cellSize, rests.front, rests.back, depth);
    const plan = layOut(frame, lattice, x.spans, y.spans, turned, plate);
    const [nx, ny] = [x.spans.length, y.spans.length];
    const singles = x.singles * ny + y.singles * nx - x.singles * y.singles;
    const pieceAreas = plan.pieces.map(({ footprint: [a, b, c, d] }) => ((c - a) * (d - b)) ** 2);
    return { plan, fit: plan.pieces.every((piece) => piece.fits), pieces: nx * ny, singles, balance: pieceAreas.reduce((s, v) => s + v, 0) };
  };
  if (!plate) return layOut(frame, lattice, [i1 - i0], [j1 - j0], false, null);
  const plans = [planFor(plate.width, plate.depth, false)];
  if (plate.width !== plate.depth) plans.push(planFor(plate.depth, plate.width, true));
  const [first, second] = plans as [ReturnType<typeof planFor>, ReturnType<typeof planFor> | undefined];
  if (!second) return first.plan;
  if (first.fit !== second.fit) return first.fit ? first.plan : second.plan;
  const balanced = (plan: typeof first) => ({ pieces: plan.pieces, singles: plan.singles, balance: plan.balance });
  return better(balanced(second), balanced(first)) ? second.plan : first.plan;
}

/** The pieces of the spans of each axis, numbered from the back left, with their footprints. */
function layOut(
  frame: GridFrame,
  lattice: Lattice,
  columnSpans: readonly number[],
  rowSpans: readonly number[],
  turned: boolean,
  plate: BuildPlate | null,
): SplitPlan {
  const { width, depth, cellSize } = frame;
  const [x0, y0] = gridRect(frame);
  const bounds = (spans: readonly number[], first: number) => {
    const ranges: [number, number][] = [];
    let at = first;
    for (const span of spans) {
      ranges.push([at, at + span]);
      at += span;
    }
    return ranges;
  };
  const columns = bounds(columnSpans, lattice.columns[0]);
  const rows = bounds(rowSpans, lattice.rows[0]);
  const xOf = (line: number, outer: number, edge: boolean) => (edge ? outer : x0 + line * cellSize);
  const yOf = (line: number, outer: number, edge: boolean) => (edge ? outer : y0 + line * cellSize);
  const pieces: PiecePlan[] = [];
  // Row by row from the back (the last rows) to the front, left to right.
  for (const [r0, r1] of [...rows].reverse())
    for (const [c0, c1] of columns) {
      const footprint: PiecePlan["footprint"] = [
        xOf(c0, -width / 2, c0 === lattice.columns[0]),
        yOf(r0, -depth / 2, r0 === lattice.rows[0]),
        xOf(c1, width / 2, c1 === lattice.columns[1]),
        yOf(r1, depth / 2, r1 === lattice.rows[1]),
      ];
      const [a, b, c, d] = footprint;
      pieces.push({
        number: pieces.length + 1,
        columns: [c0, c1],
        rows: [r0, r1],
        footprint,
        fits: plate === null || fitsOnBuildPlate({ width: c - a, depth: d - b }, plate),
      });
    }
  return {
    columnCuts: columns.slice(1).map(([start]) => start),
    rowCuts: rows.slice(1).map(([start]) => start),
    turned,
    pieces,
  };
}
