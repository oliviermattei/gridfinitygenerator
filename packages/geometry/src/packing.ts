// The rangement of a basket on plates (#42, ADR 0024): rectangles laid on as few plates as the
// search finds, pure (no WASM), so that it runs in a worker of its own and in the tests.
import { PRINT_SPACING_MM } from "./clips";
import type { BuildPlate } from "./print";

/** Room left between two objects that share a plate, in millimetres (as `partPlates`, ADR 0023). */
export const PACKING_GAP_MM = 5;
/** How long the search for a better rangement runs at most, in milliseconds. */
export const PACKING_TIME_LIMIT_MS = 60_000;

/** One object to lay on a plate: its bounding box seen from above, in millimetres. */
export interface PackingItem {
  /** Unique in the problem: what the result names it by. */
  id: string;
  width: number;
  depth: number;
  /**
   * Objects of different keys never share a plate: the rangement decides them (`plateKeyOf`),
   * and they may later carry more (such as the layer height of the print).
   */
  key: string;
}

/** What to lay out: the objects, the plate, and the corner of the plate an object must stay out of. */
export interface PackingProblem {
  items: readonly PackingItem[];
  plate: BuildPlate;
  /**
   * Corner of the bed no object may enter when there is room to keep out of it, from the origin
   * of the bed (front left): `bed_exclude_area` of a Bambu Lab printer (ADR 0023). None by default.
   */
  excludedCorner?: { width: number; depth: number } | null;
  /** Room between two objects, `PACKING_GAP_MM` by default. */
  gap?: number;
}

/** An object where it lies on its plate: its box from the origin of the plate (front left). */
export interface PlacedItem {
  id: string;
  x: number;
  y: number;
  /** Its size on the plate: its width and depth swapped when it is turned. */
  width: number;
  depth: number;
  /** Turned a quarter: its width along the depth of the plate. */
  turned: boolean;
}

/** One plate of the rangement: the key of its objects, and where each one lies. */
export interface PackedPlate {
  key: string;
  items: PlacedItem[];
}

export interface Packing {
  /** The plates, grouped by key in the order the keys first come, the emptiest of each last. */
  plates: PackedPlate[];
  /** Ids of the objects that fit on no plate, even turned. */
  unplaced: string[];
}

/**
 * Why the search ended: the bound reached (the fewest plates possible), its space exhausted
 * without reaching it, stopped from outside, or out of time.
 */
export type PackingStatus = "optimal" | "exhausted" | "stopped" | "timeout";

/** Where the search stands: what it found, the least it may find, how long it has run. */
export interface PackingProgress {
  packing: Packing;
  /** The fewest plates any rangement can take (`packingBound`). */
  bound: number;
  elapsedMs: number;
}

export interface PackingSearch extends PackingProgress {
  status: PackingStatus;
}

export interface PackingSearchOptions {
  /** `PACKING_TIME_LIMIT_MS` by default. */
  timeLimitMs?: number;
  /** The clock, in milliseconds; `performance.now` by default. */
  now?: () => number;
  /** Asked now and then: true ends the search with the best rangement found. */
  shouldStop?: () => boolean;
  /** Told the first rangement, then each better one. */
  onImprove?: (progress: PackingProgress) => void;
}

/** Slack for lengths measured on float32 meshes, as `fitsOnBuildPlate`. */
const FIT_EPSILON_MM = 1e-3;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * An object as the search sees it: grown by the gap along X and Y, on a plate grown by the gap
 * too, so that objects packed edge to edge keep the gap between them and none at the border.
 */
interface Piece {
  index: number;
  id: string;
  w: number;
  h: number;
  area: number;
}

interface Placement {
  piece: Piece;
  x: number;
  y: number;
  turned: boolean;
}

/** A plate being filled, MaxRects: its maximal free rectangles. */
interface Sheet {
  free: Rect[];
  used: number;
  placements: Placement[];
}

const emptySheet = (width: number, depth: number): Sheet => ({ free: [{ x: 0, y: 0, w: width, h: depth }], used: 0, placements: [] });

const contains = (a: Rect, b: Rect) =>
  b.x >= a.x - FIT_EPSILON_MM && b.y >= a.y - FIT_EPSILON_MM && b.x + b.w <= a.x + a.w + FIT_EPSILON_MM && b.y + b.h <= a.y + a.h + FIT_EPSILON_MM;

/** The free rectangles left once `used` is taken: each one it cuts split in up to four, the contained ones dropped. */
function cut(free: readonly Rect[], used: Rect): Rect[] {
  const next: Rect[] = [];
  for (const f of free) {
    const overlaps =
      used.x < f.x + f.w - FIT_EPSILON_MM && used.x + used.w > f.x + FIT_EPSILON_MM && used.y < f.y + f.h - FIT_EPSILON_MM && used.y + used.h > f.y + FIT_EPSILON_MM;
    if (!overlaps) {
      next.push(f);
      continue;
    }
    if (used.x > f.x + FIT_EPSILON_MM) next.push({ x: f.x, y: f.y, w: used.x - f.x, h: f.h });
    if (used.x + used.w < f.x + f.w - FIT_EPSILON_MM) next.push({ x: used.x + used.w, y: f.y, w: f.x + f.w - used.x - used.w, h: f.h });
    if (used.y > f.y + FIT_EPSILON_MM) next.push({ x: f.x, y: f.y, w: f.w, h: used.y - f.y });
    if (used.y + used.h < f.y + f.h - FIT_EPSILON_MM) next.push({ x: f.x, y: used.y + used.h, w: f.w, h: f.y + f.h - used.y - used.h });
  }
  return next.filter((rect, i) => !next.some((other, j) => j !== i && contains(other, rect) && (!contains(rect, other) || j < i)));
}

/** How a candidate position is judged: lower is better. */
type Heuristic = (free: Rect, w: number, h: number, x: number, y: number) => number;

const HEURISTICS: Record<string, Heuristic> = {
  // Best short side fit, best long side fit, best area fit, bottom left (MaxRects, Jylänki 2010).
  shortSide: (f, w, h) => Math.min(f.w - w, f.h - h) * 1e6 + Math.max(f.w - w, f.h - h),
  longSide: (f, w, h) => Math.max(f.w - w, f.h - h) * 1e6 + Math.min(f.w - w, f.h - h),
  area: (f, w, h) => (f.w * f.h - w * h) * 1e3 + Math.min(f.w - w, f.h - h),
  bottomLeft: (_f, _w, h, x, y) => (y + h) * 1e6 + x,
};

interface Candidate {
  x: number;
  y: number;
  turned: boolean;
  score: number;
}

/** Every position of the piece at the corner of a free rectangle, as it is and turned, best first. */
function candidates(sheet: Sheet, piece: Piece, heuristic: Heuristic): Candidate[] {
  const found: Candidate[] = [];
  const orientations: [number, number, boolean][] = [[piece.w, piece.h, false]];
  if (Math.abs(piece.w - piece.h) > FIT_EPSILON_MM) orientations.push([piece.h, piece.w, true]);
  for (const f of sheet.free)
    for (const [w, h, turned] of orientations) {
      if (w > f.w + FIT_EPSILON_MM || h > f.h + FIT_EPSILON_MM) continue;
      if (found.some((c) => c.turned === turned && Math.abs(c.x - f.x) < FIT_EPSILON_MM && Math.abs(c.y - f.y) < FIT_EPSILON_MM)) continue;
      found.push({ x: f.x, y: f.y, turned, score: heuristic(f, w, h, f.x, f.y) });
    }
  return found.sort((a, b) => a.score - b.score);
}

function place(sheet: Sheet, piece: Piece, { x, y, turned }: Candidate): Sheet {
  const [w, h] = turned ? [piece.h, piece.w] : [piece.w, piece.h];
  return { free: cut(sheet.free, { x, y, w, h }), used: sheet.used + piece.area, placements: [...sheet.placements, { piece, x, y, turned }] };
}

/** The pieces of one key, and the plate they go on, grown by the gap. */
interface Group {
  key: string;
  pieces: Piece[];
  width: number;
  depth: number;
  bound: number;
}

/** A rangement of one group: its sheets. */
type Solution = Sheet[];

/** Fewer plates, then the emptiest plate the emptiest (the last one shown). */
function better(a: Solution, b: Solution | null): boolean {
  if (!b) return true;
  if (a.length !== b.length) return a.length < b.length;
  const emptiest = (s: Solution) => Math.min(...s.map((sheet) => sheet.used));
  return emptiest(a) < emptiest(b) - FIT_EPSILON_MM;
}

type Order = (a: Piece, b: Piece) => number;

const ORDERS: Order[] = [
  (a, b) => b.area - a.area,
  (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.area - a.area,
  (a, b) => b.w + b.h - (a.w + a.h) || b.area - a.area,
  (a, b) => b.w - a.w || b.h - a.h,
  (a, b) => b.h - a.h || b.w - a.w,
  (a, b) => Math.min(b.w, b.h) - Math.min(a.w, a.h) || b.area - a.area,
];

/** MaxRects, each piece on the first plate it fits on (or the plate where it fits best), in this order. */
function greedy(group: Group, order: Order, heuristic: Heuristic, bestFit: boolean): Solution {
  const sheets: Sheet[] = [];
  for (const piece of [...group.pieces].sort(order)) {
    let chosen: { sheet: number; candidate: Candidate } | null = null;
    for (const [index, sheet] of sheets.entries()) {
      const [candidate] = candidates(sheet, piece, heuristic);
      if (!candidate) continue;
      if (!chosen || (bestFit && candidate.score < chosen.candidate.score)) chosen = { sheet: index, candidate };
      if (!bestFit) break;
    }
    if (chosen) sheets[chosen.sheet] = place(sheets[chosen.sheet]!, piece, chosen.candidate);
    else {
      const sheet = emptySheet(group.width, group.depth);
      const [candidate] = candidates(sheet, piece, heuristic);
      sheets.push(place(sheet, piece, candidate!));
    }
  }
  return sheets;
}

/** The best of MaxRects under every order and heuristic: a rangement at once. */
function quickSolution(group: Group): Solution {
  let best: Solution | null = null;
  for (const order of ORDERS)
    for (const heuristic of Object.values(HEURISTICS))
      for (const bestFit of [false, true]) {
        const solution = greedy(group, order, heuristic, bestFit);
        if (better(solution, best)) best = solution;
      }
  return best ?? [];
}

/**
 * The fewest plates the pieces of a group can take: their area over the area of the plate (both
 * grown by the gap, which every object keeps on two sides), and at least one plate for each piece
 * too large to share a plate with another one of them.
 */
function boundOf(pieces: readonly Piece[], width: number, depth: number): number {
  if (pieces.length === 0) return 0;
  const area = pieces.reduce((sum, piece) => sum + piece.area, 0);
  const byArea = Math.ceil(area / (width * depth) - 1e-9);
  const half = Math.max(width, depth) / 2;
  const large = pieces.filter((piece) => Math.min(piece.w, piece.h) > half + FIT_EPSILON_MM).length;
  return Math.max(1, byArea, large);
}

function groupsOf({ items, plate, gap = PACKING_GAP_MM }: PackingProblem): { groups: Group[]; unplaced: string[] } {
  const width = plate.width + gap;
  const depth = plate.depth + gap;
  const groups = new Map<string, Group>();
  const unplaced: string[] = [];
  items.forEach((item, index) => {
    const fits = (w: number, h: number) => w <= plate.width + FIT_EPSILON_MM && h <= plate.depth + FIT_EPSILON_MM;
    if (!fits(item.width, item.depth) && !fits(item.depth, item.width)) {
      unplaced.push(item.id);
      return;
    }
    const w = item.width + gap;
    const h = item.depth + gap;
    let group = groups.get(item.key);
    if (!group) groups.set(item.key, (group = { key: item.key, pieces: [], width, depth, bound: 0 }));
    group.pieces.push({ index, id: item.id, w, h, area: w * h });
  });
  for (const group of groups.values()) group.bound = boundOf(group.pieces, width, depth);
  return { groups: [...groups.values()], unplaced };
}

/** The fewest plates any rangement of the problem can take (the bound the search aims at). */
export function packingBound(problem: PackingProblem): number {
  return groupsOf(problem).groups.reduce((sum, group) => sum + group.bound, 0);
}

/**
 * The objects of a sheet set on the plate: their content centred, then moved out of the excluded
 * corner beside it (along X, else along Y) when one of them enters it and there is room.
 */
function settle(rects: readonly PlacedItem[], plate: BuildPlate, corner: { width: number; depth: number } | null): PlacedItem[] | null {
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const sizeX = Math.max(...rects.map((r) => r.x + r.width)) - minX;
  const sizeY = Math.max(...rects.map((r) => r.y + r.depth)) - minY;
  const left = (plate.width - sizeX) / 2;
  const front = (plate.depth - sizeY) / 2;
  const tries: [number, number][] = [[left, front]];
  if (corner) {
    if (corner.width + sizeX <= plate.width + FIT_EPSILON_MM) tries.push([corner.width, front]);
    if (corner.depth + sizeY <= plate.depth + FIT_EPSILON_MM) tries.push([left, corner.depth]);
  }
  for (const [x, y] of tries) {
    const moved = rects.map((r) => ({ ...r, x: r.x - minX + x, y: r.y - minY + y }));
    if (!corner || moved.every((r) => r.x >= corner.width - FIT_EPSILON_MM || r.y >= corner.depth - FIT_EPSILON_MM)) return moved;
  }
  return null;
}

function rectsOf(sheet: Sheet, items: readonly PackingItem[]): PlacedItem[] {
  return sheet.placements.map(({ piece, x, y, turned }) => {
    const item = items[piece.index]!;
    return { id: item.id, x, y, width: turned ? item.depth : item.width, depth: turned ? item.width : item.depth, turned };
  });
}

/**
 * The objects of a plate where they lie: centred and out of the excluded corner when there is
 * room; packed again around the corner when they fill the plate too much to keep out of it as
 * they are; centred in it otherwise.
 */
function platePlacements(sheet: Sheet, problem: PackingProblem, group: Group): PlacedItem[] {
  const corner = problem.excludedCorner && problem.excludedCorner.width > 0 && problem.excludedCorner.depth > 0 ? problem.excludedCorner : null;
  const rects = rectsOf(sheet, problem.items);
  const settled = settle(rects, problem.plate, corner);
  if (settled) return settled;
  const pieces = sheet.placements.map(({ piece }) => piece);
  for (const order of ORDERS)
    for (const heuristic of Object.values(HEURISTICS)) {
      let around: Sheet | null = { free: cut([{ x: 0, y: 0, w: group.width, h: group.depth }], { x: 0, y: 0, w: corner!.width, h: corner!.depth }), used: 0, placements: [] };
      for (const piece of [...pieces].sort(order)) {
        const [candidate] = candidates(around, piece, heuristic);
        if (!candidate) {
          around = null;
          break;
        }
        around = place(around, piece, candidate);
      }
      if (!around) continue;
      const packed = rectsOf(around, problem.items);
      return settle(packed, problem.plate, corner) ?? packed;
    }
  return settle(rects, problem.plate, null)!;
}

function packingOf(problem: PackingProblem, groups: readonly Group[], solutions: readonly Solution[], unplaced: string[]): Packing {
  const plates = groups.flatMap((group, index) =>
    [...solutions[index]!].sort((a, b) => b.used - a.used).map((sheet) => ({ key: group.key, items: platePlacements(sheet, problem, group) })),
  );
  return { plates, unplaced };
}

/** Thrown out of the search when it is stopped or out of time. */
class Interrupted extends Error {
  constructor(readonly reason: "stopped" | "timeout") {
    super(reason);
  }
}

/** Nodes of the search between two looks at the clock and at `shouldStop`. */
const NODES_PER_CHECK = 256;

/**
 * A rangement of the group on `plates` plates, or null when the search finds none: a depth-first
 * search over the plate and the position of each piece, the largest first, at every corner of
 * the free rectangles of each plate (MaxRects), as it is and turned. It cuts a branch whose
 * pieces left have more area than the plates have room; identical pieces go on plates in order,
 * and a piece opens at most one new plate.
 */
function fitInto(group: Group, plates: number, tick: () => void): Solution | null {
  const pieces = [...group.pieces].sort(ORDERS[0]);
  const capacity = plates * group.width * group.depth;
  const left: number[] = [];
  for (let i = pieces.length - 1, sum = 0; i >= 0; i--) left[i] = sum += pieces[i]!.area;
  const sheets: Sheet[] = [];
  const plateOf: number[] = [];
  let used = 0;
  const same = (a: Piece, b: Piece) => Math.abs(a.w - b.w) < FIT_EPSILON_MM && Math.abs(a.h - b.h) < FIT_EPSILON_MM;

  function descend(i: number): boolean {
    if (i === pieces.length) return true;
    if (left[i]! > capacity - used + FIT_EPSILON_MM) return false;
    const piece = pieces[i]!;
    const first = i > 0 && same(piece, pieces[i - 1]!) ? plateOf[i - 1]! : 0;
    for (let p = first; p < Math.min(sheets.length + 1, plates); p++) {
      const opened = p === sheets.length;
      const sheet = opened ? emptySheet(group.width, group.depth) : sheets[p]!;
      for (const candidate of candidates(sheet, piece, HEURISTICS.shortSide!)) {
        tick();
        sheets[p] = place(sheet, piece, candidate);
        plateOf[i] = p;
        used += piece.area;
        if (descend(i + 1)) return true;
        used -= piece.area;
        if (opened) sheets.pop();
        else sheets[p] = sheet;
      }
    }
    return false;
  }

  return descend(0) ? sheets : null;
}

/**
 * The rangement of the problem on the fewest plates the search finds: MaxRects under several
 * orders at once, then a search that improves it until it reaches the bound (`packingBound`,
 * the fewest plates possible), exhausts its space, is stopped, or runs out of time. Each group
 * of a key is searched apart, since two keys never share a plate.
 */
export function searchPacking(problem: PackingProblem, options: PackingSearchOptions = {}): PackingSearch {
  const now = options.now ?? (() => performance.now());
  const limit = options.timeLimitMs ?? PACKING_TIME_LIMIT_MS;
  const start = now();
  const { groups, unplaced } = groupsOf(problem);
  const solutions = groups.map(quickSolution);
  const bound = groups.reduce((sum, group) => sum + group.bound, 0);
  const progress = (): PackingProgress => ({ packing: packingOf(problem, groups, solutions, unplaced), bound, elapsedMs: now() - start });
  options.onImprove?.(progress());

  let nodes = 0;
  const check = () => {
    if (options.shouldStop?.()) throw new Interrupted("stopped");
    if (now() - start >= limit) throw new Interrupted("timeout");
  };
  const tick = () => {
    if (++nodes % NODES_PER_CHECK === 0) check();
  };
  try {
    check();
    groups.forEach((group, index) => {
      while (solutions[index]!.length > group.bound) {
        const fewer = fitInto(group, solutions[index]!.length - 1, tick);
        if (!fewer) break;
        solutions[index] = fewer;
        options.onImprove?.(progress());
      }
    });
  } catch (error) {
    if (!(error instanceof Interrupted)) throw error;
    return { ...progress(), status: error.reason };
  }
  const optimal = groups.every((group, index) => solutions[index]!.length === group.bound);
  return { ...progress(), status: optimal ? "optimal" : "exhausted" };
}

/** The three rangements of a basket (glossary: Rangement). */
export const PACKING_MODES = ["fewest-plates", "by-category", "one-per-plate"] as const;
export type PackingMode = (typeof PACKING_MODES)[number];

/**
 * The key of an object in a rangement (`PackingItem.key`): one for all in « moins de plateaux »,
 * its category « par catégorie », its own in « un objet par plateau ».
 */
export function plateKeyOf(mode: PackingMode, id: string, category: string): string {
  switch (mode) {
    case "fewest-plates":
      return "plate";
    case "by-category":
      return `category:${category}`;
    case "one-per-plate":
      return `object:${id}`;
  }
}

/** Clips of one source of the basket (a baseplate, or clips alone): the box of one, and how many. */
export interface ClipSource {
  id: string;
  width: number;
  depth: number;
  count: number;
}

/** Every clip of the basket in one object of the rangement: its box, and where each clip lies in it. */
export interface ClipBlock {
  width: number;
  depth: number;
  /** The box of each clip from the front left of the block, with the id of its source, in order. */
  clips: { id: string; x: number; y: number }[];
}

/**
 * The block of all the clips of a basket (ADR 0024): the clips of each shape (the same box) in a
 * near-square grid, as the clips of one baseplate print (`printClips`), `PRINT_SPACING_MM` apart,
 * and the grids side by side along X, aligned on their front. Null without clips.
 */
export function clipBlockOf(sources: readonly ClipSource[]): ClipBlock | null {
  const shapes = new Map<string, { width: number; depth: number; ids: string[] }>();
  for (const { id, width, depth, count } of sources) {
    if (count <= 0) continue;
    const key = `${width.toFixed(3)}×${depth.toFixed(3)}`;
    let shape = shapes.get(key);
    if (!shape) shapes.set(key, (shape = { width, depth, ids: [] }));
    for (let k = 0; k < count; k++) shape.ids.push(id);
  }
  if (shapes.size === 0) return null;
  const clips: ClipBlock["clips"] = [];
  let width = -PRINT_SPACING_MM;
  let depth = 0;
  for (const shape of shapes.values()) {
    const left = width + PRINT_SPACING_MM;
    const columns = Math.max(1, Math.ceil(Math.sqrt(shape.ids.length)));
    const rows = Math.ceil(shape.ids.length / columns);
    shape.ids.forEach((id, k) => clips.push({ id, x: left + (k % columns) * (shape.width + PRINT_SPACING_MM), y: Math.floor(k / columns) * (shape.depth + PRINT_SPACING_MM) }));
    width = left + columns * shape.width + (columns - 1) * PRINT_SPACING_MM;
    depth = Math.max(depth, rows * shape.depth + (rows - 1) * PRINT_SPACING_MM);
  }
  return { width, depth, clips };
}
