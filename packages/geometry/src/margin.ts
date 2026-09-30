// Margin of the baseplate: the part between the grid and the outline.
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import type { Margins } from "./layout";
import type { Own } from "./manifold";
import { insetAt } from "./pocket-profile";
import { roundUpToLayer, roundUpToLine } from "./print";
import type { MarginShape } from "./settings";
import { TOOL_OVERSHOOT_MM, gridRect, pocketTool, rect, roundedRect, sectionKey, type GridFrame } from "./shapes";

/** Part of the baseplate, seen from above, that a cut is limited to: [x0, y0, x1, y1]. */
export type CutWindow = readonly [x0: number, y0: number, x1: number, y1: number];

/**
 * Shape of the margin, one variant among those of the margin prototype (#3). Every
 * assembly extrudes the outline, less the variant's holes, to the full height, then removes
 * the pockets and the variant's solid cut: what is left over the margin is the margin.
 * Changing the variant changes neither the grid nor the interface of the engine.
 */
export interface MarginVariant {
  /** The cut of the margin of a baseplate; null when nothing is removed (no margin). */
  prepare(wasm: ManifoldToplevel, own: Own, frame: GridFrame): MarginCut | null;
  /**
   * Number of whole cells of the grid the margin carries on beyond each side of the grid,
   * before what is left of it: cells built exactly as the grid's inner cells, which the cell
   * bricks lay as such (ADR 0004). None when absent: a margin that does not carry the grid on.
   */
  wholeCells?(frame: GridFrame): Record<keyof Margins, number>;
  /**
   * Whether the margin carries the murets of the grid on at their full height, so that a
   * crossing on the edge of the grid is a whole crossing, which can hold a magnet (magnets.ts).
   */
  carriesMurets: boolean;
  /**
   * Rectangles of the margin left empty through its whole height, seen from above, reaching
   * past the outline ([x0, y0, x1, y1]): between the supports of a minimal margin, between the
   * heels of the extended grid. A magnet hole on the edge of the lattice keeps a wall off them
   * (magnets.ts). None when absent.
   */
  emptyAreas?(frame: GridFrame): CutWindow[];
}

/**
 * What a margin variant removes from the slab of the outline, in the baseplate's
 * coordinates: all of it, or only what lies in `window` (a cell brick takes its own
 * neighbourhood only); null when nothing lies there. Both stay outside the grid rectangle,
 * so they never meet a pocket of the grid, and never end on a plane between two cells (the
 * seams of the cell bricks, ADR 0004).
 */
export interface MarginCut {
  /**
   * Holes through the whole height, seen from above: taken off the outline before it is
   * extruded, or off a cell brick with its corner holes (brick-assembly.ts).
   */
  holes(window?: CutWindow): CrossSection | null;
  /**
   * Solid removed from the extruded slab, less its holes; with `overHoles`, from a slab that
   * still has them, and that loses them later (the cell bricks): over the holes too, so that it
   * never has a face on the side of a hole.
   */
  solid(window?: CutWindow, overHoles?: boolean): Manifold | null;
  /**
   * Whether its holes open onto the outline: a cell brick takes them off its slab, before the
   * bottom chamfer moves the foot of the outline, as the boolean assembly takes them off the
   * outline. Cut afterwards, the side of a hole would meet a chamfered corner arc elsewhere.
   */
  holesInSlab?: boolean;
}

/** Height of the frame before rounding to the layer: 10 layers of 0.2 mm (#3). */
const FRAME_HEIGHT_MM = 2;
/** Width of its outer wall and crossbars before rounding to the line: 3 lines of 0.4 mm (#3). */
const FRAME_WALL_MM = 1.2;
/** Fewest lines in a wall or a crossbar: a single extrusion would print badly. */
const FRAME_MIN_LINES = 2;
/**
 * Fewest lines in a support of a minimal margin (#29): until the print of the benches
 * (prototypes/minimal-margin) says otherwise, a support is full height and 3 lines wide at
 * least, since it alone holds its side of the baseplate in the drawer.
 */
const SUPPORT_MIN_LINES = 3;

/**
 * Width of the walls of the margin (the outer wall, the crossbars): 1.2 mm rounded up to a
 * whole number of lines, never fewer than two. It is also the least material left between a
 * magnet hole and the outline.
 */
export function wallWidth(frame: Pick<GridFrame, "lineWidth">): number {
  return roundUpToLine(FRAME_WALL_MM, frame.lineWidth, FRAME_MIN_LINES);
}
/** A hole exactly one wall wide is still a hole: slack for the rounding of the offset. */
const SLIT_TOLERANCE_MM = 1e-3;

/**
 * Width of the foot of a muret: the pocket wall at its widest inset, on both sides of the grid
 * line (5.70 mm for both profiles). A heel of the extended grid, a support of a minimal margin
 * and its piece of outer wall are that wide (#29).
 */
export function footWidth(frame: Pick<GridFrame, "profile">): number {
  return 2 * Math.max(...frame.profile.points.map(([, inset]) => inset));
}

/**
 * What a margin of walls holds besides the grid: crossbars on some grid lines, and the outer
 * wall along the whole outline, or only within some zones; how high and how wide they are.
 */
interface WallLayout {
  /** Height of the walls; the full height of the frame leaves nothing to cut above them. */
  height: number;
  /** Width of the outer wall and of the crossbars. */
  wall: number;
  /** Grid lines across X (0 to `columns`) and across Y (0 to `rows`) that carry a crossbar. */
  columns: readonly number[];
  rows: readonly number[];
  /**
   * Where the outer wall stands, as rectangles of the baseplate seen from above ([x0, y0, x1,
   * y1], reaching past the outline): the wall is what of the outline's band lies in them.
   * Null for a wall along the whole outline.
   */
  zones: readonly CutWindow[] | null;
}

/**
 * A margin of walls, the variants 2 and 3 of the margin prototype (#3): an outer wall and
 * crossbars, 2.00 mm high, rounded up to the layer; the wall and crossbars are 1.2 mm wide,
 * rounded up to a whole number of lines, never fewer than two. A crossbar goes along a grid
 * line, in line with the murets, from the grid to the outer wall; the wall on the grid side
 * is the grid's own edge muret. Crossbars on the first and last grid lines lie within the
 * grid's extent, so that each corner of the margin is a closed box; a crossbar on a line the
 * baseplate is cut on (split.ts) is doubled, one on each side of the cut, so that each piece
 * keeps a whole one. A hole narrower than a wall is left full: a margin narrower than two
 * walls (the outer wall and a hole) has no hole. With a bottom chamfer, the outer wall is
 * thicker by the chamfer on its inside, so that its foot stays one wall wide; a hole open onto
 * the outline must be a wall wide past the foot of the chamfer.
 */
function wallMargin(layoutOf: (frame: GridFrame) => WallLayout): MarginVariant {
  return {
    carriesMurets: false,
    prepare(wasm, own, frame) {
      const { margins, cellSize, width, depth, outerRadius, segmentsPerQuarter, profile } = frame;
      if (!hasMargin(frame)) return null;
      const layout = layoutOf(frame);
      const { height, wall } = layout;
      const [x0, y0, x1, y1] = gridRect(frame);
      const top = profile.height + TOOL_OVERSHOOT_MM;
      // Farther than any part of the baseplate; `keep` reaches beyond `bound` on its open sides.
      const far = width + depth;
      const section = (points: [number, number][]) => own(new wasm.CrossSection([points]));

      // Holes of the margin: inside the outer wall, outside the grid and the crossbars.
      const solid: CrossSection[] = [section(rect(x0, y0, x1, y1))];
      const cut = { columns: new Set(frame.cuts.columns), rows: new Set(frame.cuts.rows) };
      for (const i of layout.columns) {
        const [a, b] = band(x0 + i * cellSize, i, frame.columns, wall, cut.columns.has(i));
        solid.push(section(rect(a, -far, b, far)));
      }
      for (const j of layout.rows) {
        const [a, b] = band(y0 + j * cellSize, j, frame.rows, wall, cut.rows.has(j));
        solid.push(section(rect(-far, a, far, b)));
      }
      // The bottom chamfer cuts the outer wall at 45°: its inside moves in by the chamfer, so
      // that its foot stays one wall wide instead of hanging over a hole.
      const outerWall = wall + frame.bottomChamfer;
      const inside = section(roundedRect(width - 2 * outerWall, depth - 2 * outerWall, outerRadius - outerWall, segmentsPerQuarter));
      // Without a wall along the whole outline, the holes open onto the outline between the
      // zones of the wall: they reach past it, so that the outline never lies on their edge.
      let open = inside;
      let foot: CrossSection | null = null;
      if (layout.zones) {
        const o = TOOL_OVERSHOOT_MM;
        open = section(rect(-width / 2 - o, -depth / 2 - o, width / 2 + o, depth / 2 + o));
        const zones = own(wasm.CrossSection.union(layout.zones.map((zone) => section(rect(...zone)))));
        solid.push(own(own(open.subtract(inside)).intersect(zones)));
        // The foot of the outline, set in by the bottom chamfer (slabOf): a hole open onto the
        // outline must reach past the foot, or the chamfer, which moves the foot of the outline
        // in, would fold its bottom onto the grid's edge.
        const chamfer = frame.bottomChamfer;
        foot = section(roundedRect(width - 2 * chamfer, depth - 2 * chamfer, outerRadius - chamfer, segmentsPerQuarter));
      }
      // A hole narrower than a wall (a margin narrower than two walls) would print as a slit:
      // it is left full.
      const pieces = withoutSlits(own, own(open.subtract(own(wasm.CrossSection.union(solid)))), foot, wallWidth(frame));
      const { holes, holesNear } = holeSet(wasm, own, pieces);

      // Above the walls, everything outside the grid on the sides that have a margin, but for
      // the holes, where nothing is left to cut: the cut never has a face on the side of a hole
      // (the grid's edge along a hole between brackets), whose vertices would then differ
      // between two neighbouring bricks.
      const keep = section(
        rect(
          margins.left > 0 ? x0 : -2 * far,
          margins.front > 0 ? y0 : -2 * far,
          margins.right > 0 ? x1 : 2 * far,
          margins.back > 0 ? y1 : 2 * far,
        ),
      );
      const above = (window: CutWindow, overHoles: boolean) => {
        const outside = own(section(rect(...window)).subtract(keep));
        return overHoles ? outside : own(outside.subtract(holesNear(window)));
      };

      const whole: CutWindow = [-far, -far, far, far];
      const nonEmpty = (area: CrossSection) => (area.isEmpty() ? null : area);
      return {
        holes,
        holesInSlab: layout.zones !== null,
        solid(window, overHoles = false) {
          if (height >= profile.height) return null;
          const area = nonEmpty(above(window ?? whole, overHoles));
          return area && own(own(wasm.Manifold.extrude(area, top - height)).translate([0, 0, height]));
        },
      };
    },
  };
}

/**
 * Band of a crossbar along a grid line: centred on an inner line, and inside the grid's extent
 * on the first and last ones; on a cut, one wall on each side of it.
 */
function band(line: number, index: number, count: number, wall: number, cut: boolean): [number, number] {
  if (index === 0) return [line, line + wall];
  if (index === count) return [line - wall, line];
  if (cut) return [line - wall, line + wall];
  return [line - wall / 2, line + wall / 2];
}

/** Every grid line from 0 to `count`. */
const allLines = (count: number) => Array.from({ length: count + 1 }, (_, line) => line);

/**
 * Frame of crossbars (cadre à traverses), variant 3 of the margin prototype (#3), whose
 * prototype calls it "cadre à nervures", the default margin, the cheapest to print that holds
 * along the whole outline (ADR 0006-marge, ADR 0011): an outer wall along the whole outline,
 * tied to the grid by a crossbar on every grid line, 2.00 mm high.
 *
 * Minimal (#29, ADR 0017): its supports only, on each side that has a margin: the crossbars of
 * the first and last grid lines of that side, each with a piece of outer wall at its end, as
 * long as the foot of a muret, inside the grid's extent. They are full height and 3 lines wide
 * at least until the benches are printed. The rest of the margin, corners included, is empty
 * and open onto the drawer.
 */
export const CROSSBAR_FRAME: MarginVariant = wallMargin((frame) => {
  const { columns, rows, profile, layerHeight } = frame;
  if (!frame.minimalMargin) {
    return { height: roundUpToLayer(FRAME_HEIGHT_MM, layerHeight), wall: wallWidth(frame), columns: allLines(columns), rows: allLines(rows), zones: null };
  }
  const [x0, y0, x1, y1] = gridRect(frame);
  const far = frame.width + frame.depth;
  const foot = footWidth(frame);
  return {
    height: profile.height,
    wall: roundUpToLine(FRAME_WALL_MM, frame.lineWidth, SUPPORT_MIN_LINES),
    columns: [0, columns],
    rows: [0, rows],
    zones: [
      [x0, -far, x0 + foot, far],
      [x1 - foot, -far, x1, far],
      [-far, y0, far, y0 + foot],
      [-far, y1 - foot, far, y1],
    ],
  };
});

/** Whether the frame has a margin on any side. */
function hasMargin({ margins }: Pick<GridFrame, "margins">): boolean {
  return margins.left > 0 || margins.right > 0 || margins.back > 0 || margins.front > 0;
}

/**
 * The pieces of `area` a wall wide, the others left full: narrower, a hole would print as a
 * slit. A piece is kept when something is left of it, within `foot` (the foot of the outline,
 * set in by the bottom chamfer, for holes open onto the outline), once shrunk by half a wall:
 * a hole open onto the outline must reach a wall past the foot, or the chamfer, which moves
 * the foot of the outline in, would fold its bottom onto the grid's edge.
 */
function withoutSlits(own: Own, area: CrossSection, foot: CrossSection | null, wall: number): CrossSection[] {
  return area
    .decompose()
    .map(own)
    .filter((piece) => {
      const within = foot ? own(piece.intersect(foot)) : piece;
      return !own(within.offset(-(wall / 2 - SLIT_TOLERANCE_MM), "Miter")).isEmpty();
    });
}

/** The holes of a margin, whole or near a cell brick. */
interface HoleSet {
  /** All of them, or those in `window` (`MarginCut.holes`). */
  holes(window?: CutWindow): CrossSection | null;
  /** The pieces that reach into `window`, whole. */
  holesNear(window: CutWindow): CrossSection;
}

function holeSet(wasm: ManifoldToplevel, own: Own, pieces: readonly CrossSection[]): HoleSet {
  const all = own(wasm.CrossSection.compose([...pieces]));
  // A cell brick takes its own neighbourhood only: the holes near it, not all of them, so
  // that a large margin costs each brick no more than a small one.
  const bounds = pieces.map((piece) => piece.bounds());
  const holesNear = (window: CutWindow) =>
    own(
      wasm.CrossSection.compose(
        pieces.filter((_, k) => {
          const { min, max } = bounds[k] as { min: [number, number]; max: [number, number] };
          return max[0] > window[0] && min[0] < window[2] && max[1] > window[1] && min[1] < window[3];
        }),
      ),
    );
  const nonEmpty = (area: CrossSection) => (area.isEmpty() ? null : area);
  return {
    holesNear,
    holes: (window) => nonEmpty(window ? own(holesNear(window).intersect(own(new wasm.CrossSection([rect(...window)])))) : all),
  };
}

/**
 * The margin beyond each side of the grid that has one, from `start` off the grid's edge (the
 * grid's edge by default), reaching past the outline and across the whole baseplate: two of
 * them overlap at a corner between two margins.
 */
function marginAreas(frame: GridFrame, start: Partial<Record<keyof Margins, number>> = {}): CutWindow[] {
  const { margins } = frame;
  const [x0, y0, x1, y1] = gridRect(frame);
  const far = frame.width + frame.depth;
  const areas: CutWindow[] = [];
  if (margins.left > 0) areas.push([-far, -far, Math.min(x0, start.left ?? x0), far]);
  if (margins.right > 0) areas.push([Math.max(x1, start.right ?? x1), -far, far, far]);
  if (margins.front > 0) areas.push([-far, -far, far, Math.min(y0, start.front ?? y0)]);
  if (margins.back > 0) areas.push([-far, Math.max(y1, start.back ?? y1), far, far]);
  return areas;
}

/**
 * Strips kept across the margin: at the X intervals `across` through the back and front
 * margins, at the Y intervals `along` through the left and right ones, from the grid out
 * past the outline.
 */
function stripsOf(frame: GridFrame, across: readonly (readonly [number, number])[], along: readonly (readonly [number, number])[]): CutWindow[] {
  const { margins } = frame;
  const [x0, y0, x1, y1] = gridRect(frame);
  const far = frame.width + frame.depth;
  return [
    ...(margins.back > 0 ? across.map(([a, b]): CutWindow => [a, y1, b, far]) : []),
    ...(margins.front > 0 ? across.map(([a, b]): CutWindow => [a, -far, b, y0]) : []),
    ...(margins.left > 0 ? along.map(([a, b]): CutWindow => [-far, a, x0, b]) : []),
    ...(margins.right > 0 ? along.map(([a, b]): CutWindow => [x1, a, far, b]) : []),
  ];
}

/**
 * The margin kept around its supports (#29): the X and Y intervals of the strips, across the
 * back and front margins and across the left and right ones. The extended grid keeps a muret
 * foot wide on each grid line it carries on to the outline (its heels, in the band of the
 * outer wall), or, minimal, on the first and last lines of each side only; the minimal
 * truncated cells keep the first and last cells of each side, with their two murets.
 */
function keptIntervals(frame: GridFrame): { across: [number, number][]; along: [number, number][] } {
  const { cellSize: c, columns, rows } = frame;
  const [x0, y0, x1, y1] = gridRect(frame);
  const h = footWidth(frame) / 2;
  const around = (line: number): [number, number] => [line - h, line + h];
  if (frame.marginShape === "cells") {
    return {
      across: [[x0 - h, x0 + c + h], [x1 - c - h, x1 + h]],
      along: [[y0 - h, y0 + c + h], [y1 - c - h, y1 + h]],
    };
  }
  if (frame.minimalMargin) return { across: [around(x0), around(x1)], along: [around(y0), around(y1)] };
  const standing = standingLines(frame);
  const lines = (start: number, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => around(start + (from + k) * c));
  return { across: lines(x0, -standing.left, columns + standing.right), along: lines(y0, -standing.front, rows + standing.back) };
}

/**
 * Where the margin may be emptied, as rectangles: the margin areas of a minimal margin, and the
 * band of the outer wall of the extended grid (from the inside of the outer wall out, its
 * rounded corners aside), on each side that has a margin.
 */
function openAreas(frame: GridFrame): CutWindow[] {
  if (frame.minimalMargin || frame.marginShape !== "extended") return marginAreas(frame);
  const { hx, hy } = outerWallOf(frame);
  return marginAreas(frame, { left: -hx, right: hx, front: -hy, back: hy });
}

/**
 * The holes of a margin emptied but for its supports (#29): what of the open areas (`open`,
 * or the margin areas) the strips kept around the supports leave, holes open onto the
 * outline, left full where they would be narrower than a wall past the foot of the chamfer.
 */
function supportHoles(wasm: ManifoldToplevel, own: Own, frame: GridFrame, open: CrossSection, kept: readonly CutWindow[]): HoleSet {
  const { width, depth, outerRadius, segmentsPerQuarter, bottomChamfer: chamfer } = frame;
  const section = (points: [number, number][]) => own(new wasm.CrossSection([points]));
  const area = kept.length === 0 ? open : own(open.subtract(own(wasm.CrossSection.union(kept.map((strip) => section(rect(...strip)))))));
  const foot = section(roundedRect(width - 2 * chamfer, depth - 2 * chamfer, outerRadius - chamfer, segmentsPerQuarter));
  return holeSet(wasm, own, withoutSlits(own, area, foot, wallWidth(frame)));
}

/** The union of rectangles, as a cross-section. */
function areaOf(wasm: ManifoldToplevel, own: Own, rects: readonly CutWindow[]): CrossSection {
  return own(wasm.CrossSection.union(rects.map((window) => own(new wasm.CrossSection([rect(...window)])))));
}

/**
 * The rectangles a margin emptied but for its supports leaves empty, seen from above: the open
 * areas of each side between the strips kept across it (magnets.ts). Near a corner, a strip of
 * the other side may still hold some of it: these rectangles never miss an empty place.
 */
function emptyAreasOf(frame: GridFrame): CutWindow[] {
  const { across, along } = keptIntervals(frame);
  const far = frame.width + frame.depth;
  const gaps = (kept: readonly [number, number][]) => {
    const sorted = [...kept].sort((a, b) => a[0] - b[0]);
    const result: [number, number][] = [];
    let from = -far;
    for (const [a, b] of sorted) {
      if (a > from) result.push([from, a]);
      from = Math.max(from, b);
    }
    result.push([from, far]);
    return result;
  };
  return openAreas(frame).flatMap(([ax0, ay0, ax1, ay1]): CutWindow[] => {
    // A band across the whole baseplate along X is a back or front area: its strips are across it.
    const alongX = ax0 <= -far && ax1 >= far;
    return alongX
      ? gaps(across).map(([a, b]): CutWindow => [a, ay0, b, ay1])
      : gaps(along).map(([a, b]): CutWindow => [ax0, a, ax1, b]);
  });
}

/** Slack for the floating-point error of a width compared with a wall, or of a height with a layer. */
const EPSILON_MM = 1e-9;

/** A cell of the grid carried on into the margin, as the margin cuts it. */
interface TruncatedCell {
  /** Centre of the whole cell, as if the grid went on. */
  centre: [x: number, y: number];
  /** Height of the bottom of its hole, a whole number of layers; 0 for a hole open at the bottom. */
  floor: number;
  /**
   * How the outer wall cuts its pocket: along straight sides, the part of the cell that is
   * kept, around its centre ([x0, y0, x1, y1]); near a rounded corner, "corner"; null when
   * it does not cut it.
   */
  cut: CutWindow | "corner" | null;
  /** A point of its hole: its centre, brought inside the outer wall. */
  anchor: [x: number, y: number];
  /**
   * Sides its pocket is open on, towards the outline (the extended grid): bits of OPEN_LEFT…
   * OPEN_BACK; 0 for a pocket closed on its four sides.
   */
  open: number;
  /** A pocket left out, narrower than a wall inside the band (the extended grid): it cuts nothing. */
  sliver?: boolean;
}

/** Sides of a pocket open towards the outline (`TruncatedCell.open`). */
const OPEN_LEFT = 1;
const OPEN_RIGHT = 2;
const OPEN_FRONT = 4;
const OPEN_BACK = 8;

/**
 * Truncated cells (cellules tronquées), variant 1 of the margin prototype (#3), flush with
 * the grid (#19): the grid goes on into the margin, cell after cell on the same pitch, and
 * the outline cuts it. Each cell of the margin is an empty pocket of the grid's profile,
 * open at the bottom (on the floor of a tray, whose profile has one), cut by an outer wall
 * that follows the whole outline. The murets of
 * the margin are the grid's murets carried on: same profile, same full height, same flat top.
 *
 * The outer wall is 1.2 mm wide, rounded up to a whole number of lines, never fewer than
 * two (the rule of #10); with a bottom chamfer, it is thicker by the chamfer on its inside,
 * so that its foot stays one wall wide.
 *
 * Narrow truncated cells: a hole of the margin is never narrower than a wall, at any height,
 * so that it never prints as a slit. The wall of a pocket slopes, so a truncated cell
 * narrows downwards; below the height where its hole would get narrower than a wall, it is
 * filled, and the hole gets a flat bottom (a floor) on a whole number of layers. A cell
 * whose hole would be less than a layer deep, or narrower than a wall even at the top, is
 * filled whole: its room goes to the outer wall, merged with the muret next to it. Near a
 * corner of the outline, the hole must also hold a disc one wall wide at the height of its floor.
 *
 * Minimal (#29, ADR 0017): on each side that has a margin, only the first and last cells of the
 * grid carried on, closed: their two murets, whole, and their piece of outer wall. The rest of
 * the margin, corners included, is empty through its whole height, and open onto the drawer.
 */
export const TRUNCATED_CELLS: MarginVariant = {
  carriesMurets: true,

  prepare(wasm, own, frame) {
    if (!hasMargin(frame)) return null;
    const { hx, hy, innerRadius } = outerWallOf(frame);
    // The inside of the outer wall, to which the pockets of the margin are cut.
    const inside = own(new wasm.CrossSection([roundedRect(2 * hx, 2 * hy, innerRadius, frame.segmentsPerQuarter)]));
    return cutOfCells(wasm, own, frame, truncatedCells(wasm, own, frame, inside), inside);
  },

  wholeCells(frame) {
    const { margins, cellSize } = frame;
    // A minimal margin is mostly empty: its few cells are cut with the bricks along the outline.
    if (frame.minimalMargin) return { left: 0, right: 0, back: 0, front: 0 };
    const { outerWall, innerRadius, topInset } = outerWallOf(frame);
    // A cell of the margin is whole when its pocket stays clear of the outer wall and of its
    // rounded corners, whatever its row or column.
    const whole = (margin: number) =>
      margin > 0 ? Math.max(0, Math.floor((margin - outerWall - innerRadius + topInset) / cellSize + EPSILON_MM)) : 0;
    return { left: whole(margins.left), right: whole(margins.right), back: whole(margins.back), front: whole(margins.front) };
  },

  emptyAreas: (frame) => (frame.minimalMargin ? emptyAreasOf(frame) : []),
};

/** The truncated cells of a margin (TRUNCATED_CELLS), cut to `inside`, the inside of its outer wall. */
function truncatedCells(wasm: ManifoldToplevel, own: Own, frame: GridFrame, inside: CrossSection): TruncatedCell[] {
  const { margins, columns, rows, cellSize, segmentsPerQuarter, profile, layerHeight } = frame;
  const { wall, hx, hy, innerRadius, topInset } = outerWallOf(frame);
  const [x0, y0] = gridRect(frame);

  // Width of the hole of a cell starting at `start` along an axis, at a given inset, between the walls at ±`half`.
  const along = (start: number, inset: number, half: number) =>
    Math.min(start + cellSize - inset, half) - Math.max(start + inset, -half);
  const inCorner = (x: number, y: number) => Math.abs(x) > hx - innerRadius && Math.abs(y) > hy - innerRadius;

  const cells: TruncatedCell[] = [];
  const [firstColumn, endColumn] = [-Math.ceil(margins.left / cellSize), columns + Math.ceil(margins.right / cellSize)];
  const [firstRow, endRow] = [-Math.ceil(margins.front / cellSize), rows + Math.ceil(margins.back / cellSize)];
  for (let i = firstColumn; i < endColumn; i++)
    for (let j = firstRow; j < endRow; j++) {
      if (i >= 0 && i < columns && j >= 0 && j < rows) continue;
      const [left, bottom] = [x0 + i * cellSize, y0 + j * cellSize];
      const holeWidth = (inset: number) => Math.min(along(left, inset, hx), along(bottom, inset, hy));
      // Widest at the top: a cell narrower than a wall there is filled whole.
      if (holeWidth(topInset) < wall - EPSILON_MM) continue;
      const centre: [number, number] = [left + cellSize / 2, bottom + cellSize / 2];
      // The pocket at the top, and whether it reaches a corner of the inside, rounded or
      // sharp: there, its own rounded corner, or the rounded corner of the inside, narrows
      // what is left of it on both axes.
      const xs = [left + topInset, left + cellSize - topInset] as const;
      const ys = [bottom + topInset, bottom + cellSize - topInset] as const;
      const nearCorner = xs.some((x) => ys.some((y) => inCorner(x, y)));
      const straight = xs[0] < -hx || xs[1] > hx || ys[0] < -hy || ys[1] > hy;
      const wideEnough = (z: number) => {
        const inset = insetAt(profile, z);
        if (holeWidth(inset) < wall - EPSILON_MM) return false;
        if (!nearCorner) return true;
        const side = cellSize - 2 * inset;
        const opening = own(own(new wasm.CrossSection([roundedRect(side, side, profile.topRadius - inset, segmentsPerQuarter)])).translate(centre));
        return !own(own(opening.intersect(inside)).offset(-(wall / 2 - SLIT_TOLERANCE_MM), "Miter")).isEmpty();
      };
      const floor = floorOf(profile.height, layerHeight, wideEnough);
      if (floor === null) continue;
      const cut = nearCorner ? "corner" : straight || floor > 0 ? keptPart(frame, centre, 0) : null;
      cells.push({ centre, floor, cut, anchor: [clamp(centre[0], hx), clamp(centre[1], hy)], open: 0 });
    }
  return cells;
}

/**
 * The part of a cell of the margin kept inside the outer wall, around its centre ([x0, y0, x1,
 * y1]): beyond the cell on its closed sides, so that the cut never lies on them, and up to the
 * inside of the outer wall on its sides open towards the outline (`open`).
 */
function keptPart(frame: GridFrame, [cx, cy]: [number, number], open: number): CutWindow {
  const { hx, hy } = outerWallOf(frame);
  const reach = frame.cellSize / 2 + TOOL_OVERSHOOT_MM;
  const kept = (at: number, half: number, openLow: boolean, openHigh: boolean): [number, number] => [
    openLow ? -half - at : Math.max(-reach, -half - at),
    openHigh ? half - at : Math.min(reach, half - at),
  ];
  const [kx0, kx1] = kept(cx, hx, (open & OPEN_LEFT) !== 0, (open & OPEN_RIGHT) !== 0);
  const [ky0, ky1] = kept(cy, hy, (open & OPEN_FRONT) !== 0, (open & OPEN_BACK) !== 0);
  return [kx0, ky0, kx1, ky1];
}

/**
 * The cut of a margin of cells carried on from the grid (the truncated cells, the extended
 * grid): the pocket of each cell, stretched past its open sides and cut to `inside`, the
 * inside of the outer wall, and, for a margin emptied but for its supports (minimal, or
 * between the heels of the extended grid), its holes through the whole height. A minimal
 * margin keeps the cells its strips reach only.
 */
function cutOfCells(wasm: ManifoldToplevel, own: Own, frame: GridFrame, all: readonly TruncatedCell[], inside: CrossSection): MarginCut {
  const { cellSize, profile } = frame;
  const opened = frame.minimalMargin || frame.marginShape === "extended";
  const { across, along } = keptIntervals(frame);
  const kept = opened ? stripsOf(frame, across, along) : [];
  let open: CrossSection | null = null;
  if (opened) {
    open = areaOf(wasm, own, marginAreas(frame));
    // The extended grid empties the band of its outer wall only: what of the margin lies outside
    // its inside, rounded corners included.
    if (!frame.minimalMargin) {
      const o = TOOL_OVERSHOOT_MM;
      const outside = own(new wasm.CrossSection([rect(-frame.width / 2 - o, -frame.depth / 2 - o, frame.width / 2 + o, frame.depth / 2 + o)]));
      open = own(open.intersect(own(outside.subtract(inside))));
    }
  }
  const holes = open ? supportHoles(wasm, own, frame, open, kept) : null;
  // The band of the extended grid between its heels is cut with the pockets, in one union; the
  // pockets open towards the outline already empty it, from the bottom up, unless one of them
  // was left out (a sliver) or stands on a floor (a tray).
  const covered = !profile.floor && !all.some(({ sliver }) => sliver);
  const band = holes && !frame.minimalMargin && !covered ? holes : null;
  // Of a margin emptied through its whole height, only the minimal ones have holes in the slab.
  const slabHoles = frame.minimalMargin ? holes : null;
  // The heels of the extended grid: what the strips keep of the band of the outer wall. A pocket
  // of the extended grid is not cut to the band, which would put its cut on the very plane where
  // the band starts (two coincident faces, whose slivers manifold may keep): the heels are taken
  // off it, whose faces it crosses.
  let heels: HoleSet | null = null;
  if (frame.marginShape === "extended" && kept.length > 0) {
    const o = TOOL_OVERSHOOT_MM;
    const outside = own(new wasm.CrossSection([rect(-frame.width / 2 - o, -frame.depth / 2 - o, frame.width / 2 + o, frame.depth / 2 + o)]));
    const area = own(own(outside.subtract(inside)).intersect(areaOf(wasm, own, kept)));
    heels = holeSet(wasm, own, area.decompose().map(own));
  }
  // A minimal margin cuts the pockets of its supports only: the cells its strips reach.
  const half = cellSize / 2;
  const cut = all.filter(({ sliver }) => !sliver);
  const cells = frame.minimalMargin
    ? cut.filter(({ centre: [cx, cy] }) => kept.some(([x0, y0, x1, y1]) => cx + half > x0 && cx - half < x1 && cy + half > y0 && cy - half < y1))
    : cut;

  const o = TOOL_OVERSHOOT_MM;
  // The pocket of a cell, stretched past its open sides beyond the outline (two cells: the last
  // standing muret is less than a cell and a band off it), once per pattern of sides.
  const pockets = new Map<number, Manifold>();
  const pocketOf = (open: number) => {
    const grow = [OPEN_LEFT, OPEN_RIGHT, OPEN_FRONT, OPEN_BACK].map((bit) => (open & bit ? 2 * cellSize : 0)) as [number, number, number, number];
    const pocket = pockets.get(open) ?? pocketTool(wasm, own, frame, profile, grow);
    pockets.set(open, pocket);
    return pocket;
  };
  // The inside of the outer wall, from a floor (from below the frame without one) to above the frame.
  const clips = new Map<number, Manifold>();
  const clipFrom = (floor: number) => {
    const bottom = floor > 0 ? floor : -2 * o;
    const clip = clips.get(floor) ?? own(own(wasm.Manifold.extrude(inside, profile.height + 2 * o - bottom)).translate([0, 0, bottom]));
    clips.set(floor, clip);
    return clip;
  };
  // The cells cut along straight sides repeat along the outline: their tool is cut once per
  // shape, around the origin, and copied.
  const shapes = new Map<string, Manifold>();
  const toolOf = ({ centre, floor, cut, open }: TruncatedCell): Manifold => {
    const pocket = pocketOf(open);
    if (heels) {
      // The heels at the ends of its murets, taken off its pocket once per shape.
      const [cx, cy] = centre;
      const [gl, gr, gf, gb] = [OPEN_LEFT, OPEN_RIGHT, OPEN_FRONT, OPEN_BACK].map((bit) => (open & bit ? 2 * cellSize : o)) as [number, number, number, number];
      const near = heels.holesNear([cx - half - gl, cy - half - gf, cx + half + gr, cy + half + gb]);
      if (near.isEmpty()) return own(pocket.translate([...centre, 0]));
      const key = `${open}:${sectionKey(near, cx, cy)}`;
      let shape = shapes.get(key);
      if (!shape) {
        const prisms = own(own(wasm.Manifold.extrude(own(near.translate([-cx, -cy])), profile.height + 4 * o)).translate([0, 0, -2 * o]));
        shape = own(pocket.subtract(prisms));
        shapes.set(key, shape);
      }
      return own(shape.translate([...centre, 0]));
    }
    if (cut === null) return own(pocket.translate([...centre, 0]));
    if (cut === "corner") return own(own(pocket.translate([...centre, 0])).intersect(clipFrom(floor)));
    const key = [open, ...cut, floor].map((value) => value.toFixed(6)).join(",");
    let shape = shapes.get(key);
    if (!shape) {
      const [x0, y0, x1, y1] = cut;
      const bottom = floor > 0 ? floor : -2 * o;
      const box = own(own(wasm.Manifold.cube([x1 - x0, y1 - y0, profile.height + 2 * o - bottom])).translate([x0, y0, bottom]));
      shape = own(pocket.intersect(box));
      shapes.set(key, shape);
    }
    return own(shape.translate([...centre, 0]));
  };
  const top = profile.height + 2 * o;
  return {
    holes: (window) => slabHoles?.holes(window) ?? null,
    holesInSlab: slabHoles !== null,
    solid(window) {
      // A brick takes the cells of the margin whose hole it holds: a truncated cell lies within
      // the brick of its row or column, whatever its centre, beyond the outline.
      const inWindow = ({ anchor: [x, y] }: TruncatedCell) =>
        !window || (window[0] < x && x < window[2] && window[1] < y && y < window[3]);
      // Each tool stays within its own cell, or its column or row beyond an open side: they
      // never overlap, and compose.
      const tools = cells.filter(inWindow).map(toolOf);
      const pockets = tools.length === 0 ? null : own(wasm.Manifold.compose(tools));
      // The pieces of the band between two heels never cross a seam: a brick takes those near it, whole.
      const pieces = band && (window ? band.holesNear(window) : band.holes());
      if (!pieces || pieces.isEmpty()) return pockets;
      const prisms = own(own(wasm.Manifold.extrude(pieces, top)).translate([0, 0, -o]));
      return pockets ? own(pockets.add(prisms)) : prisms;
    },
  };
}

/**
 * Extended grid (grille prolongée, #29, ADR 0017): the murets of the grid go on into the
 * margin, with their profile and full height, up to the outline, where each one stops on a
 * heel, a full-height block as wide as the foot of the muret and one outer wall deep (1.2 mm
 * rounded up to the line, with the bottom chamfer). There is no outer wall: between the heels,
 * the band of the outer wall is empty, and the cells carried on stay open onto the drawer.
 *
 * A muret parallel to a side stands only when its whole foot lies inside the band: the cell
 * before the last one that stands is open towards the outline, its pocket stretched up to the
 * band, so that the band never cuts a muret along its length into a sliver. Its pocket is cut
 * where it would be narrower than a wall inside the band at the top: the muret keeps a flat
 * face on the band there. Holes open onto the outline, the rest of the band, are never
 * narrower than a wall, and left full where they would be, or where they would not reach a
 * wall past the foot of the chamfer (a margin narrower than the band: no heel, no hole).
 *
 * Minimal: only the murets of the first and last grid lines of each side, whole, with their
 * heels. The rest of the margin, corners included, is empty and open onto the drawer.
 */
export const EXTENDED_GRID: MarginVariant = {
  carriesMurets: true,

  prepare(wasm, own, frame) {
    if (!hasMargin(frame)) return null;
    const { hx, hy, innerRadius } = outerWallOf(frame);
    const inside = own(new wasm.CrossSection([roundedRect(2 * hx, 2 * hy, innerRadius, frame.segmentsPerQuarter)]));
    return cutOfCells(wasm, own, frame, extendedCells(wasm, own, frame, inside), inside);
  },

  wholeCells(frame) {
    if (frame.minimalMargin) return { left: 0, right: 0, back: 0, front: 0 };
    // The cells between standing murets, clear of the rounded corners of the band.
    return standingLines(frame, outerWallOf(frame).innerRadius);
  },

  emptyAreas: emptyAreasOf,
};

/**
 * How many grid lines beyond each side of the grid carry a muret that stands whole inside the
 * band of the outer wall (the extended grid), `clearance` farther from it.
 */
function standingLines(frame: GridFrame, clearance = 0): Record<keyof Margins, number> {
  const { margins, cellSize } = frame;
  const { outerWall } = outerWallOf(frame);
  const reach = footWidth(frame) / 2 + outerWall + clearance;
  const count = (margin: number) => (margin > 0 ? Math.max(0, Math.floor((margin - reach) / cellSize + EPSILON_MM)) : 0);
  return { left: count(margins.left), right: count(margins.right), back: count(margins.back), front: count(margins.front) };
}

/** The cells of the extended grid in its margin, open on their sides towards the outline beyond the last standing muret. */
function extendedCells(wasm: ManifoldToplevel, own: Own, frame: GridFrame, inside: CrossSection): TruncatedCell[] {
  const { margins, columns, rows, cellSize: c, segmentsPerQuarter, profile } = frame;
  const { wall, hx, hy, innerRadius, topInset } = outerWallOf(frame);
  const standing = standingLines(frame);
  const [x0, y0] = gridRect(frame);
  // The cell beyond the last standing muret of each side that has a margin, open towards it.
  const openLeft = margins.left > 0 ? -standing.left - 1 : null;
  const openRight = margins.right > 0 ? columns + standing.right : null;
  const openFront = margins.front > 0 ? -standing.front - 1 : null;
  const openBack = margins.back > 0 ? rows + standing.back : null;
  const inCorner = (x: number, y: number) => Math.abs(x) > hx - innerRadius && Math.abs(y) > hy - innerRadius;
  const far = frame.width + frame.depth;

  const cells: TruncatedCell[] = [];
  for (let i = openLeft ?? 0; i <= (openRight ?? columns - 1); i++)
    for (let j = openFront ?? 0; j <= (openBack ?? rows - 1); j++) {
      if (i >= 0 && i < columns && j >= 0 && j < rows) continue;
      const open = (i === openLeft ? OPEN_LEFT : 0) | (i === openRight ? OPEN_RIGHT : 0) | (j === openFront ? OPEN_FRONT : 0) | (j === openBack ? OPEN_BACK : 0);
      const [left, bottom] = [x0 + i * c, y0 + j * c];
      // The pocket at the top, stretched past its open sides, then what of it lies inside the band.
      const xs = [open & OPEN_LEFT ? -far : left + topInset, open & OPEN_RIGHT ? far : left + c - topInset] as const;
      const ys = [open & OPEN_FRONT ? -far : bottom + topInset, open & OPEN_BACK ? far : bottom + c - topInset] as const;
      const [kx0, kx1, ky0, ky1] = [Math.max(xs[0], -hx), Math.min(xs[1], hx), Math.max(ys[0], -hy), Math.min(ys[1], hy)];
      const centre: [number, number] = [left + c / 2, bottom + c / 2];
      const anchor: [number, number] = [clamp(centre[0], hx), clamp(centre[1], hy)];
      const sliver = { centre, floor: 0, cut: null, anchor, open, sliver: true };
      // A sliver of pocket inside the band, narrower than a wall: the muret keeps its face on the band.
      if (kx1 - kx0 < wall - EPSILON_MM || ky1 - ky0 < wall - EPSILON_MM) {
        cells.push(sliver);
        continue;
      }
      const nearCorner = xs.some((x) => ys.some((y) => inCorner(x, y)));
      if (nearCorner) {
        // Near a corner, the rounded corner of the inside narrows the pocket on both axes.
        const inset = topInset;
        const [w, d] = [xs[1] - xs[0], ys[1] - ys[0]].map((side) => Math.min(side, 4 * far)) as [number, number];
        const [mx, my] = [(Math.max(xs[0], -2 * far) + Math.min(xs[1], 2 * far)) / 2, (Math.max(ys[0], -2 * far) + Math.min(ys[1], 2 * far)) / 2];
        const opening = own(own(new wasm.CrossSection([roundedRect(w, d, profile.topRadius - inset, segmentsPerQuarter)])).translate([mx, my]));
        if (own(own(opening.intersect(inside)).offset(-(wall / 2 - SLIT_TOLERANCE_MM), "Miter")).isEmpty()) {
          cells.push(sliver);
          continue;
        }
      }
      // Its pocket is not cut to the band: the heels are taken off it (`cutOfCells`).
      cells.push({ centre, floor: 0, cut: null, anchor, open });
    }
  return cells;
}

/**
 * The grid alone (`GridFrame.marginShape` "none"): the whole margin empty through its whole
 * height, but where it would leave a hole narrower than a wall past the foot of the chamfer
 * (as every shape leaves such a margin full). The surplus of each shape of margin is measured
 * from it, the layout and the cut unchanged.
 */
export const BARE_GRID: MarginVariant = {
  carriesMurets: false,
  prepare(wasm, own, frame) {
    if (!hasMargin(frame)) return null;
    const { holes } = supportHoles(wasm, own, frame, areaOf(wasm, own, marginAreas(frame)), []);
    return { holes, holesInSlab: true, solid: () => null };
  },
};

/**
 * The outer wall of the truncated cells: its width, its width at the top with the chamfer,
 * the half sides and the corner radius of its inside, and the inset of the pocket at the top.
 */
function outerWallOf(frame: GridFrame) {
  const wall = wallWidth(frame);
  const outerWall = wall + frame.bottomChamfer;
  return {
    wall,
    outerWall,
    hx: frame.width / 2 - outerWall,
    hy: frame.depth / 2 - outerWall,
    innerRadius: Math.max(0, frame.outerRadius - outerWall),
    topInset: Math.min(...frame.profile.points.map(([, inset]) => inset)),
  };
}

/** `value` brought into [−half, half]. */
function clamp(value: number, half: number): number {
  return Math.min(half, Math.max(-half, value));
}

/**
 * Lowest height, on a whole number of layers, from which the hole of a truncated cell is
 * wide enough up to the top (it only widens upwards); 0 for a hole open at the bottom, null
 * when no hole at least a layer deep is wide enough.
 */
function floorOf(height: number, layerHeight: number, wideEnough: (z: number) => boolean): number | null {
  for (let layers = 0; ; layers++) {
    const z = Math.round(layers * layerHeight * 1e6) / 1e6;
    if (z > height - layerHeight + EPSILON_MM) return null;
    if (wideEnough(z)) return z;
  }
}

/**
 * What a minimal margin keeps, within the outline (`BaseplateLayout.supports`): the strips of
 * its supports, the crossbar and the piece of outer wall of the frame. Null for a whole margin,
 * or the grid alone.
 */
export function supportAreas(frame: GridFrame): [x0: number, y0: number, x1: number, y1: number][] | null {
  if (!frame.minimalMargin || frame.marginShape === "none" || !hasMargin(frame)) return null;
  const [hx, hy] = [frame.width / 2, frame.depth / 2];
  const [x0, y0, x1, y1] = gridRect(frame);
  const foot = footWidth(frame);
  const { across, along } =
    frame.marginShape === "frame"
      ? { across: [[x0, x0 + foot], [x1 - foot, x1]] as [number, number][], along: [[y0, y0 + foot], [y1 - foot, y1]] as [number, number][] }
      : keptIntervals(frame);
  return stripsOf(frame, across, along).flatMap(([a, b, c, d]) => {
    const clipped: [number, number, number, number] = [Math.max(a, -hx), Math.max(b, -hy), Math.min(c, hx), Math.min(d, hy)];
    return clipped[2] > clipped[0] && clipped[3] > clipped[1] ? [clipped] : [];
  });
}

/** The variant of each shape of the margin (`BaseplateSettings.marginShape`, ADR 0011, ADR 0017), and of the grid alone. */
export const MARGIN_VARIANTS: Record<MarginShape | "none", MarginVariant> = {
  frame: CROSSBAR_FRAME,
  cells: TRUNCATED_CELLS,
  extended: EXTENDED_GRID,
  none: BARE_GRID,
};

/** The variant that builds the margin of a frame. */
export function marginOf(frame: GridFrame): MarginVariant {
  return MARGIN_VARIANTS[frame.marginShape];
}
