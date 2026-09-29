import { BASEPLATE_SETTINGS, type Alignment, type BaseplateSettings } from "./settings";

/** Width of the margin on each side of the grid, in millimetres. */
export interface Margins {
  left: number;
  right: number;
  /** Towards the back of the drawer (+Y). */
  back: number;
  /** Towards the front of the drawer (−Y). */
  front: number;
}

export interface BaseplateLayout {
  columns: number;
  rows: number;
  cellSize: number;
  /** Width of the margin on each side of the grid, in millimetres. */
  margins: Margins;
  /**
   * Centre of each screw hole, in millimetres, in the coordinates of the mesh (the baseplate
   * centred on the origin): the inner intersections of the grid, none without screws.
   */
  screws: [x: number, y: number][];
}

/**
 * Share of the rest that goes to the left and to the back margins for each alignment: a
 * grid pushed to the left leaves the whole rest on its right, a centred one half on each side.
 */
const SHARES: Record<Alignment, { left: number; back: number }> = {
  tl: { left: 0, back: 0 },
  t: { left: 0.5, back: 0 },
  tr: { left: 1, back: 0 },
  l: { left: 0, back: 0.5 },
  c: { left: 0.5, back: 0.5 },
  r: { left: 1, back: 0.5 },
  bl: { left: 0, back: 1 },
  b: { left: 0.5, back: 1 },
  br: { left: 1, back: 1 },
};

/**
 * Margins are laid out to the hundredth of a millimetre: far below what a printer resolves,
 * and no floating-point dust (a margin of 1e-14 mm) reaches the geometry.
 */
const MARGIN_STEP_MM = 0.01;

/** Slack for the floating-point error of a division by the cell size. */
const CELL_EPSILON = 1e-9;

/**
 * Cells and margins of the baseplate (spec v1, layout of the grid), from settings already
 * brought into their ranges.
 * - Drawer mode: the gap is taken off the drawer, then as many whole cells of the cell size
 *   as fit, at least one and at most 24 per axis (the limit of the cells mode, whose grids
 *   the performance targets are set for); the rest is the margin.
 * - Cells mode: the margins in width and depth are added to the grid.
 * The margin of each axis is then spread by the alignment.
 */
export function layoutOf(settings: BaseplateSettings): Omit<BaseplateLayout, "screws"> {
  const { cellSize } = settings;
  let columns: number;
  let rows: number;
  let restX: number;
  let restY: number;
  if (settings.sizeMode === "drawer") {
    const width = settings.drawerWidth - settings.drawerGap;
    const depth = settings.drawerDepth - settings.drawerGap;
    columns = cellsIn(width, cellSize, BASEPLATE_SETTINGS.columns.max);
    rows = cellsIn(depth, cellSize, BASEPLATE_SETTINGS.rows.max);
    // A drawer narrower than one cell still gets that cell, without margin.
    restX = Math.max(0, width - columns * cellSize);
    restY = Math.max(0, depth - rows * cellSize);
  } else {
    columns = settings.columns;
    rows = settings.rows;
    restX = settings.marginWidth;
    restY = settings.marginDepth;
  }
  const share = SHARES[settings.alignment];
  const [left, right] = split(restX, share.left);
  const [back, front] = split(restY, share.back);
  return { columns, rows, cellSize, margins: { left, right, back, front } };
}

function cellsIn(length: number, cellSize: number, max: number): number {
  return Math.min(max, Math.max(1, Math.floor(length / cellSize + CELL_EPSILON)));
}

/** Splits a rest into two margins, `share` of it for the first one, both to the margin step. */
function split(rest: number, share: number): [number, number] {
  const total = toStep(rest);
  const first = toStep(total * share);
  return [first, toStep(total - first)];
}

function toStep(length: number): number {
  return Math.round(length / MARGIN_STEP_MM) / Math.round(1 / MARGIN_STEP_MM);
}
